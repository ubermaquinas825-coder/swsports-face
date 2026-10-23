-- Additive upgrade: keep 0005 immutable. Apply as ONE TRANSACTION with all sync
-- workers drained, so new functions are never exposed with temporary default ACLs.
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.consume_bling_oauth_state(text, text) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.commit_appmax_check(uuid, uuid, text, text, text, boolean) SET search_path = pg_catalog, pg_temp;

ALTER TABLE public.shipping_orders
  ADD COLUMN appmax_check_started_at timestamptz,
  ADD COLUMN appmax_payment_verified_at timestamptz,
  ADD COLUMN appmax_next_check_at timestamptz,
  ADD COLUMN appmax_check_failures integer NOT NULL DEFAULT 0 CHECK (appmax_check_failures >= 0),
  ADD COLUMN bling_processing_started_at timestamptz,
  ADD COLUMN bling_export_token uuid;

-- Only metadata is initialized: do not assume old processing workers are dead.
UPDATE public.shipping_orders SET bling_processing_started_at = clock_timestamp()
WHERE bling_sync_status = 'processing';

CREATE TABLE public.shipping_recovery_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shipping_orders(id),
  financial_revision uuid NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('found', 'not_found', 'ambiguous', 'lookup_failed')),
  bling_order_id bigint,
  observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (order_id, financial_revision),
  CHECK ((outcome = 'found') = (bling_order_id IS NOT NULL))
);
CREATE TABLE public.shipping_hold_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shipping_orders(id),
  actor_id uuid NOT NULL,
  expected_revision uuid NOT NULL,
  applied_revision uuid,
  action text NOT NULL CHECK (action IN ('keep_blocked', 'accept_verified_export')),
  previous_status text NOT NULL,
  previous_reason text,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
  evidence text NOT NULL CHECK (length(btrim(evidence)) BETWEEN 10 AND 1000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (order_id, expected_revision)
);
REVOKE ALL ON public.shipping_recovery_checks, public.shipping_hold_resolutions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.shipping_recovery_checks, public.shipping_hold_resolutions TO authenticated;
ALTER TABLE public.shipping_recovery_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_hold_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_recovery ON public.shipping_recovery_checks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_read_resolutions ON public.shipping_hold_resolutions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.guard_shipping_order_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF OLD.bling_sync_status IN ('blocked', 'reconciliation_required')
     AND NEW.bling_sync_status NOT IN ('blocked', 'reconciliation_required') THEN
    -- A protected authorization record, created by the admin RPC in the same
    -- transaction, is required. A spoofable session GUC is deliberately not used.
    IF NOT (NEW.bling_sync_status = 'synced' AND OLD.payment_status = 'approved'
      AND NEW.payment_status = OLD.payment_status AND OLD.bling_order_id IS NOT NULL
      AND NEW.bling_order_id IS NOT DISTINCT FROM OLD.bling_order_id
      AND EXISTS (SELECT 1 FROM public.shipping_hold_resolutions r
        WHERE r.order_id = OLD.id AND r.expected_revision = OLD.financial_revision
          AND r.action = 'accept_verified_export' AND r.applied_revision IS NULL)) THEN
      RAISE EXCEPTION 'Manual review requires an audited administrative resolution';
    END IF;
  END IF;
  IF (OLD.payment_status IN ('approved', 'failed') AND NEW.payment_status = 'pending')
    OR (OLD.payment_status = 'failed' AND NEW.payment_status = 'approved') THEN
    RAISE EXCEPTION 'Financial state regression requires manual review';
  END IF;
  IF OLD.provider_payment_id IS NOT NULL AND NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id THEN
    RAISE EXCEPTION 'An established payment association requires manual review';
  END IF;
  IF OLD.bling_order_id IS NOT NULL AND NEW.bling_order_id IS DISTINCT FROM OLD.bling_order_id THEN
    RAISE EXCEPTION 'An established ERP association cannot be replaced';
  END IF;
  IF OLD.bling_sync_status = 'processing' AND NEW.bling_sync_status IN ('queued', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Uncertain processing cannot be requeued; use read-only recovery';
  END IF;
  IF NEW.bling_sync_status = 'processing' AND OLD.bling_sync_status <> 'processing' THEN
    IF NEW.bling_export_token IS NULL OR NEW.bling_export_token IS NOT DISTINCT FROM OLD.bling_export_token THEN
      RAISE EXCEPTION 'Legacy export worker: use claim_bling_export';
    END IF;
    NEW.bling_processing_started_at := clock_timestamp();
  END IF;
  IF OLD.bling_sync_status = 'processing' AND NEW.bling_sync_status = 'synced' AND OLD.bling_export_token IS NULL THEN
    RAISE EXCEPTION 'Legacy export completion requires manual recovery';
  END IF;
  NEW.financial_revision := gen_random_uuid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_shipping_order_transition() FROM PUBLIC, anon, authenticated, service_role;

-- Boolean-only pre-0005 workers cannot safely participate in versioned writes.
CREATE OR REPLACE FUNCTION public.claim_appmax_check(_order_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN RAISE EXCEPTION 'Legacy reconciliation worker disabled: upgrade the application'; END;
$$;
REVOKE ALL ON FUNCTION public.claim_appmax_check(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_appmax_check_v2(_order_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE claimed uuid;
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.shipping_orders
  SET appmax_payment_verified_at = NULL, appmax_check_started_at = clock_timestamp(), appmax_check_lock_until = clock_timestamp() + interval '60 seconds'
  WHERE id = _order_id AND payment_link_id IS NOT NULL
    AND (appmax_check_lock_until IS NULL OR appmax_check_lock_until < clock_timestamp())
    AND (appmax_next_check_at IS NULL OR appmax_next_check_at <= clock_timestamp())
  RETURNING financial_revision INTO claimed;
  RETURN claimed;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_appmax_check_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_appmax_check_v2(uuid) TO service_role;

CREATE FUNCTION public.renew_appmax_check(_order_id uuid, _expected_revision uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE renewed uuid;
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.shipping_orders
  SET appmax_check_lock_until = LEAST(appmax_check_started_at + interval '2 minutes', clock_timestamp() + interval '60 seconds')
  WHERE id = _order_id AND financial_revision = _expected_revision
    AND appmax_check_lock_until > clock_timestamp()
    AND appmax_check_started_at > clock_timestamp() - interval '2 minutes'
  RETURNING financial_revision INTO renewed;
  RETURN renewed;
END;
$$;

CREATE FUNCTION public.defer_appmax_check(_order_id uuid, _expected_revision uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.shipping_orders
  SET appmax_checked_at = clock_timestamp(), appmax_check_lock_until = NULL,
    appmax_check_failures = LEAST(appmax_check_failures + 1, 10),
    appmax_next_check_at = clock_timestamp() + make_interval(secs => LEAST(3600, 30 * power(2, LEAST(appmax_check_failures, 7))::integer))
  WHERE id = _order_id AND financial_revision = _expected_revision
    AND appmax_check_lock_until > clock_timestamp();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_appmax_check(
  _order_id uuid, _expected_revision uuid, _payment_state text,
  _provider_payment_id text, _appmax_status text, _inconclusive boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _inconclusive IS NULL
     OR (_payment_state IS NOT NULL AND _payment_state NOT IN ('pending', 'approved', 'failed'))
     OR ((_payment_state IS NULL) <> (_provider_payment_id IS NULL))
     OR (_provider_payment_id IS NOT NULL AND length(_provider_payment_id) = 0)
     OR (_appmax_status IS NULL AND NOT _inconclusive) THEN
    RAISE EXCEPTION 'Invalid reconciliation observation';
  END IF;

  UPDATE public.shipping_orders
  SET appmax_checked_at = clock_timestamp(), appmax_check_lock_until = NULL,
    appmax_check_failures = 0, appmax_next_check_at = NULL,
    appmax_payment_verified_at = CASE WHEN NOT _inconclusive AND _payment_state = 'approved' THEN clock_timestamp() ELSE NULL END,
    appmax_status = CASE WHEN _inconclusive THEN appmax_status ELSE _appmax_status END,
    provider_payment_id = CASE WHEN _inconclusive OR _payment_state IS NULL THEN provider_payment_id ELSE _provider_payment_id END,
    payment_status = CASE WHEN _inconclusive OR _payment_state IS NULL THEN payment_status ELSE _payment_state END,
    bling_sync_status = CASE
      WHEN bling_sync_status IN ('blocked', 'reconciliation_required') THEN bling_sync_status
      WHEN _inconclusive THEN 'reconciliation_required'
      WHEN _payment_state = 'failed' THEN 'blocked'
      WHEN _payment_state = 'approved' AND bling_order_id IS NULL
        AND bling_sync_status = 'awaiting_payment' THEN 'queued'
      ELSE bling_sync_status END,
    bling_sync_error = CASE
      WHEN bling_sync_status IN ('blocked', 'reconciliation_required') THEN bling_sync_error
      WHEN _inconclusive THEN 'Conferência Appmax inconclusiva. Não enviar ou baixar estoque antes da revisão.'
      WHEN _payment_state = 'failed' THEN 'Appmax cancelado/estornado ou contestado; não enviar ou baixar estoque.'
      ELSE bling_sync_error END
  WHERE id = _order_id AND financial_revision = _expected_revision
    AND appmax_check_lock_until > clock_timestamp()
    AND appmax_check_started_at > clock_timestamp() - interval '2 minutes'
    AND (_inconclusive OR (
      -- No observation may downgrade an established financial decision.
      (payment_status = 'pending' OR _payment_state IS NULL OR _payment_state = payment_status
        OR (payment_status = 'approved' AND _payment_state = 'failed'))
      AND (provider_payment_id IS NULL OR _provider_payment_id IS NOT DISTINCT FROM provider_payment_id)
    ));
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.claim_bling_export(_order_id uuid) RETURNS SETOF public.shipping_orders
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  UPDATE public.shipping_orders SET bling_sync_status = 'processing', bling_sync_error = NULL,
    bling_export_token = gen_random_uuid()
  WHERE id = _order_id AND bling_sync_status = 'queued' AND payment_status = 'approved' AND bling_order_id IS NULL
  RETURNING *;
$$;

CREATE FUNCTION public.quarantine_stale_bling_orders() RETURNS SETOF public.shipping_orders
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  WITH stale AS (
    SELECT id FROM public.shipping_orders
    WHERE bling_sync_status = 'processing' AND bling_processing_started_at < clock_timestamp() - interval '10 minutes'
    ORDER BY bling_processing_started_at LIMIT 5 FOR UPDATE SKIP LOCKED
  )
  UPDATE public.shipping_orders o SET bling_sync_status = 'reconciliation_required',
    bling_sync_error = 'Processamento Bling interrompido. Consultar o ERP; nunca recriar automaticamente.'
  FROM stale WHERE o.id = stale.id RETURNING o.*;
$$;

CREATE FUNCTION public.record_bling_recovery(_order_id uuid, _expected_revision uuid, _outcome text, _bling_order_id bigint) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE applied uuid;
BEGIN
  IF _outcome IS NULL OR _outcome NOT IN ('found', 'not_found', 'ambiguous', 'lookup_failed')
    OR ((_outcome = 'found') <> (_bling_order_id IS NOT NULL)) OR _bling_order_id <= 0 THEN
    RAISE EXCEPTION 'Invalid recovery evidence';
  END IF;
  UPDATE public.shipping_orders SET bling_order_id = COALESCE(_bling_order_id, bling_order_id)
  WHERE id = _order_id AND financial_revision = _expected_revision
    AND bling_sync_status IN ('blocked', 'reconciliation_required')
    AND (_bling_order_id IS NULL OR bling_order_id IS NULL OR bling_order_id = _bling_order_id)
  RETURNING financial_revision INTO applied;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.shipping_recovery_checks (order_id, financial_revision, outcome, bling_order_id)
  VALUES (_order_id, applied, _outcome, _bling_order_id);
  RETURN true;
END;
$$;

CREATE FUNCTION public.resolve_shipping_order_hold(_order_id uuid, _expected_revision uuid, _action text, _reason text, _evidence text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE actor uuid := auth.uid(); current_order public.shipping_orders%ROWTYPE; applied uuid; resolution uuid;
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Administrative access required' USING ERRCODE = '42501'; END IF;
  IF _action IS NULL OR _action NOT IN ('keep_blocked', 'accept_verified_export')
    OR _reason IS NULL OR length(btrim(_reason)) NOT BETWEEN 10 AND 1000
    OR _evidence IS NULL OR length(btrim(_evidence)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'An action, reason and evidence reference are required';
  END IF;
  SELECT * INTO current_order FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR current_order.financial_revision IS DISTINCT FROM _expected_revision
    OR current_order.bling_sync_status NOT IN ('blocked', 'reconciliation_required') THEN
    RAISE EXCEPTION 'Order changed or is not held';
  END IF;
  IF _action = 'accept_verified_export' AND (
    current_order.payment_status <> 'approved' OR current_order.provider_payment_id IS NULL
    OR current_order.bling_order_id IS NULL OR current_order.appmax_payment_verified_at IS NULL
    OR current_order.appmax_payment_verified_at < clock_timestamp() - interval '5 minutes'
    OR current_order.appmax_status NOT IN ('aprovado', 'integrado') OR current_order.appmax_status IS NULL
    OR current_order.appmax_check_lock_until > clock_timestamp()
    OR NOT EXISTS (SELECT 1 FROM public.shipping_recovery_checks c WHERE c.order_id = _order_id
      AND c.financial_revision = _expected_revision AND c.outcome = 'found'
      AND c.bling_order_id = current_order.bling_order_id AND c.observed_at > clock_timestamp() - interval '5 minutes')
  ) THEN RAISE EXCEPTION 'Fresh payment and ERP identity evidence required; financial blocks cannot be overridden'; END IF;
  INSERT INTO public.shipping_hold_resolutions (order_id, actor_id, expected_revision, action, previous_status, previous_reason, reason, evidence)
  VALUES (_order_id, actor, _expected_revision, _action, current_order.bling_sync_status, current_order.bling_sync_error, btrim(_reason), btrim(_evidence)) RETURNING id INTO resolution;
  UPDATE public.shipping_orders SET
    bling_sync_status = CASE WHEN _action = 'accept_verified_export' THEN 'synced' ELSE bling_sync_status END,
    bling_sync_error = CASE WHEN _action = 'accept_verified_export' THEN NULL ELSE bling_sync_error END
  WHERE id = _order_id AND financial_revision = _expected_revision RETURNING financial_revision INTO applied;
  UPDATE public.shipping_hold_resolutions SET applied_revision = applied WHERE id = resolution;
  RETURN applied;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_appmax_check(uuid, uuid), public.defer_appmax_check(uuid, uuid),
  public.claim_bling_export(uuid), public.quarantine_stale_bling_orders(),
  public.record_bling_recovery(uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_appmax_check(uuid, uuid), public.defer_appmax_check(uuid, uuid),
  public.claim_bling_export(uuid), public.quarantine_stale_bling_orders(),
  public.record_bling_recovery(uuid, uuid, text, bigint) TO service_role;
REVOKE ALL ON FUNCTION public.resolve_shipping_order_hold(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_shipping_order_hold(uuid, uuid, text, text, text) TO authenticated;
