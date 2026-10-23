-- Deploy before the application code. Existing rows receive generated revisions;
-- this migration makes no provider calls and changes no existing payment decision.
ALTER TABLE public.shipping_orders
  ADD COLUMN financial_revision uuid NOT NULL DEFAULT gen_random_uuid();

-- Rotate on every write, including admin changes and lease acquisition. Legacy
-- writers also invalidate snapshots; holds cannot be released by normal updates.
CREATE FUNCTION public.guard_shipping_order_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.bling_sync_status IN ('blocked', 'reconciliation_required')
     AND NEW.bling_sync_status NOT IN ('blocked', 'reconciliation_required') THEN
    RAISE EXCEPTION 'Manual review must be resolved through a separate audited workflow';
  END IF;
  IF (OLD.payment_status IN ('approved', 'failed') AND NEW.payment_status = 'pending')
     OR (OLD.payment_status = 'failed' AND NEW.payment_status = 'approved') THEN
    RAISE EXCEPTION 'Financial state regression requires manual review';
  END IF;
  IF OLD.provider_payment_id IS NOT NULL
     AND NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id THEN
    RAISE EXCEPTION 'An established payment association requires manual review';
  END IF;
  NEW.financial_revision := gen_random_uuid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_shipping_order_transition() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER shipping_order_transition_guard BEFORE UPDATE ON public.shipping_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_shipping_order_transition();

-- The returned revision is the ownership token. No ownership is inferred from
-- a boolean result or a later read that may belong to another worker.
CREATE FUNCTION public.claim_appmax_check_v2(_order_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed uuid;
BEGIN
  UPDATE public.shipping_orders
  SET appmax_check_lock_until = clock_timestamp() + interval '60 seconds'
  WHERE id = _order_id AND payment_link_id IS NOT NULL
    AND (appmax_check_lock_until IS NULL OR appmax_check_lock_until < clock_timestamp())
  RETURNING financial_revision INTO claimed;
  RETURN claimed;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_appmax_check_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_appmax_check_v2(uuid) TO service_role;

CREATE FUNCTION public.commit_appmax_check(
  _order_id uuid, _expected_revision uuid, _payment_state text,
  _provider_payment_id text, _appmax_status text, _inconclusive boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _inconclusive IS NULL
     OR (_payment_state IS NOT NULL AND _payment_state NOT IN ('pending', 'approved', 'failed'))
     OR ((_payment_state IS NULL) <> (_provider_payment_id IS NULL))
     OR (_provider_payment_id IS NOT NULL AND length(_provider_payment_id) = 0)
     OR (_appmax_status IS NULL AND NOT _inconclusive) THEN
    RAISE EXCEPTION 'Invalid reconciliation observation';
  END IF;

  UPDATE public.shipping_orders
  SET appmax_checked_at = clock_timestamp(), appmax_check_lock_until = NULL,
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
    AND (_inconclusive OR (
      -- No observation may downgrade an established financial decision.
      (payment_status = 'pending' OR _payment_state IS NULL OR _payment_state = payment_status
        OR (payment_status = 'approved' AND _payment_state = 'failed'))
      AND (provider_payment_id IS NULL OR _provider_payment_id IS NOT DISTINCT FROM provider_payment_id)
    ));
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.commit_appmax_check(uuid, uuid, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_appmax_check(uuid, uuid, text, text, text, boolean) TO service_role;
