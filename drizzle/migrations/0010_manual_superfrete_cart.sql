-- Manual cart preparation shares the automatic pipeline's unique order lock.
-- stage=review deliberately excludes these jobs from automated payments/recovery.
CREATE FUNCTION public.claim_manual_shipping_cart(_order_id uuid, _revision uuid, _payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE o public.shipping_orders; claimed uuid;
BEGIN
  SELECT * INTO o FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR o.financial_revision IS DISTINCT FROM _revision
    OR o.payment_status <> 'approved' OR o.provider_payment_id IS NULL
    OR o.bling_sync_status IN ('blocked','reconciliation_required','processing')
    OR o.delivery_address IS NULL OR o.provider_shipment_id IS NOT NULL
    OR o.shipping_status IN ('logistics_failed','posted','delivered')
    OR EXISTS (SELECT 1 FROM public.shipping_label_jobs WHERE order_id = _order_id)
  THEN RETURN NULL; END IF;
  UPDATE public.shipping_orders SET shipping_status='awaiting_label' WHERE id=_order_id RETURNING * INTO o;
  INSERT INTO public.shipping_label_jobs(order_id,revision,stage,payload)
    VALUES (_order_id,o.financial_revision,'review',jsonb_build_object('manual_payment',true,'shipment',_payload))
    RETURNING token INTO claimed;
  RETURN claimed;
END;
$$;

CREATE FUNCTION public.complete_manual_shipping_cart(_order_id uuid, _token uuid, _shipment_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE o public.shipping_orders; j public.shipping_label_jobs;
BEGIN
  SELECT * INTO o FROM public.shipping_orders WHERE id=_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO j FROM public.shipping_label_jobs WHERE order_id=_order_id FOR UPDATE;
  IF NOT FOUND OR j.token IS DISTINCT FROM _token OR j.stage <> 'review'
    OR j.payload->>'manual_payment' IS DISTINCT FROM 'true' OR j.shipment_id IS NOT NULL
    OR o.provider_shipment_id IS NOT NULL OR _shipment_id IS NULL OR length(_shipment_id)=0
  THEN RETURN false; END IF;
  -- Preserve the external identity even if a concurrent financial change needs review.
  UPDATE public.shipping_label_jobs SET shipment_id=_shipment_id,updated_at=clock_timestamp() WHERE order_id=_order_id;
  UPDATE public.shipping_orders SET provider_shipment_id=_shipment_id,
    shipping_status=CASE WHEN payment_status='approved' AND bling_sync_status NOT IN ('blocked','reconciliation_required')
      AND financial_revision=j.revision THEN 'awaiting_label_payment' ELSE 'logistics_failed' END
    WHERE id=_order_id;
  INSERT INTO public.shipping_events(order_id,provider,kind,state)
    VALUES (_order_id,'superfrete','manual_cart','Envio preparado para revisão e pagamento manual na SuperFrete. Nenhum débito efetuado pelo site.');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_manual_shipping_cart(uuid,uuid,jsonb),public.complete_manual_shipping_cart(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_manual_shipping_cart(uuid,uuid,jsonb),public.complete_manual_shipping_cart(uuid,uuid,text) TO service_role;
