-- Make automatic SuperFrete label authorization provider-aware.
-- Mercado Pago orders are re-verified by application code immediately before
-- claiming a label. Legacy Appmax orders keep their existing fresh-evidence checks.

CREATE OR REPLACE FUNCTION public.claim_shipping_label(_order_id uuid, _revision uuid, _payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  o public.shipping_orders;
  claimed uuid;
  payment_evidence boolean;
BEGIN
  SELECT * INTO o FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;

  payment_evidence := CASE
    WHEN o.payment_link_id LIKE 'mp:%' THEN o.provider_payment_id IS NOT NULL
    ELSE o.appmax_status IN ('aprovado','integrado')
      AND o.appmax_payment_verified_at IS NOT NULL
      AND o.appmax_payment_verified_at >= clock_timestamp() - interval '5 minutes'
  END;

  IF o.financial_revision IS DISTINCT FROM _revision
    OR o.payment_status <> 'approved'
    OR o.bling_sync_status <> 'synced'
    OR o.provider_payment_id IS NULL
    OR NOT coalesce(payment_evidence, false)
    OR o.delivery_address IS NULL
    OR o.provider_shipment_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.shipping_label_jobs WHERE order_id = _order_id)
    OR NOT EXISTS (
      SELECT 1 FROM public.shipping_settings
      WHERE id AND config #>> '{labelAutomation,enabled}' = 'true'
    )
  THEN
    RETURN NULL;
  END IF;

  UPDATE public.shipping_orders
  SET shipping_status = 'awaiting_label'
  WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.shipping_label_jobs(order_id, revision, stage, payload)
  VALUES (_order_id, o.financial_revision, 'creating', _payload)
  RETURNING token INTO claimed;

  RETURN claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_shipping_label(
  _order_id uuid,
  _token uuid,
  _from text,
  _to text,
  _shipment_id text DEFAULT NULL,
  _url text DEFAULT NULL,
  _tracking text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  j public.shipping_label_jobs;
  o public.shipping_orders;
  safe boolean;
  payment_evidence boolean;
BEGIN
  SELECT * INTO o FROM public.shipping_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT * INTO j FROM public.shipping_label_jobs WHERE order_id = _order_id FOR UPDATE;
  IF NOT FOUND OR j.token IS DISTINCT FROM _token OR j.stage IS DISTINCT FROM _from THEN
    RETURN false;
  END IF;

  IF NOT (
    (_from = 'creating' AND _to = 'created')
    OR (_from = 'created' AND _to = 'paying')
    OR (_from = 'paying' AND _to = 'paid')
    OR (_from = 'paid' AND _to = 'printing')
    OR (_from = 'printing' AND _to = 'complete')
  ) THEN
    RAISE EXCEPTION 'Invalid label transition';
  END IF;

  payment_evidence := CASE
    WHEN o.payment_link_id LIKE 'mp:%' THEN o.provider_payment_id IS NOT NULL
    ELSE o.appmax_status IN ('aprovado','integrado')
      AND o.appmax_payment_verified_at IS NOT NULL
      AND o.appmax_payment_verified_at >= clock_timestamp() - interval '5 minutes'
  END;

  safe := coalesce(
    o.financial_revision = j.revision
    AND o.payment_status = 'approved'
    AND o.bling_sync_status = 'synced'
    AND payment_evidence
    AND j.created_at >= clock_timestamp() - interval '3 minutes'
    AND EXISTS (
      SELECT 1 FROM public.shipping_settings
      WHERE id AND config #>> '{labelAutomation,enabled}' = 'true'
    ),
    false
  );

  IF _to = 'created' THEN
    IF _shipment_id IS NULL OR length(_shipment_id) = 0 OR o.provider_shipment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid shipment association';
    END IF;
    UPDATE public.shipping_label_jobs SET shipment_id = _shipment_id WHERE order_id = _order_id;
    UPDATE public.shipping_orders
    SET provider_shipment_id = _shipment_id, shipping_status = 'awaiting_label_payment'
    WHERE id = _order_id
    RETURNING * INTO o;
  ELSIF _to = 'paid' AND safe THEN
    UPDATE public.shipping_orders
    SET shipping_status = 'label_issued', tracking_code = _tracking
    WHERE id = _order_id
    RETURNING * INTO o;
  ELSIF _to = 'complete' AND safe THEN
    IF _url IS NULL OR _url !~ '^https://' OR _tracking IS NULL OR length(_tracking) = 0 THEN
      RAISE EXCEPTION 'Missing label document or tracking';
    END IF;
    UPDATE public.shipping_orders
    SET shipping_status = 'ready_to_post', label_url = _url, tracking_code = _tracking
    WHERE id = _order_id
    RETURNING * INTO o;
    INSERT INTO public.shipping_events(order_id, provider, kind, state)
    VALUES (_order_id, 'superfrete', 'label', 'Etiqueta paga e pronta para impressão e postagem.');
  END IF;

  UPDATE public.shipping_label_jobs
  SET stage = CASE WHEN safe THEN _to ELSE 'review' END,
      revision = o.financial_revision,
      updated_at = clock_timestamp()
  WHERE order_id = _order_id;

  IF NOT safe THEN
    UPDATE public.shipping_orders SET shipping_status = 'logistics_failed' WHERE id = _order_id;
    INSERT INTO public.shipping_events(order_id, provider, kind, state)
    VALUES (_order_id, 'superfrete', 'label', 'Revisão necessária: pedido alterado durante emissão.');
  END IF;

  RETURN safe;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_shipping_label(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_shipping_label(uuid,uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_shipping_label(uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_shipping_label(uuid,uuid,text,text,text,text,text) TO service_role;
