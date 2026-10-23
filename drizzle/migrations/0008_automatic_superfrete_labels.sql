-- One durable attempt per store order. Ambiguous attempts are never auto-replayed.
CREATE TABLE public.shipping_label_jobs (
  order_id uuid PRIMARY KEY REFERENCES public.shipping_orders(id),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  revision uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('creating','created','paying','paid','printing','complete','review')),
  payload jsonb NOT NULL,
  shipment_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_label_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_label_jobs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.shipping_label_jobs TO service_role;

CREATE FUNCTION public.claim_shipping_label(_order_id uuid, _revision uuid, _payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE o public.shipping_orders; claimed uuid;
BEGIN
  SELECT * INTO o FROM public.shipping_orders WHERE id = _order_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR o.financial_revision IS DISTINCT FROM _revision OR o.payment_status <> 'approved'
    OR o.bling_sync_status <> 'synced' OR o.provider_payment_id IS NULL
    OR (o.appmax_status IS NULL OR o.appmax_status NOT IN ('aprovado','integrado'))
    OR o.appmax_payment_verified_at IS NULL OR o.appmax_payment_verified_at < clock_timestamp() - interval '5 minutes'
    OR o.delivery_address IS NULL OR o.provider_shipment_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.shipping_label_jobs WHERE order_id = _order_id)
    OR NOT EXISTS (SELECT 1 FROM public.shipping_settings WHERE id AND config #>> '{labelAutomation,enabled}' = 'true')
  THEN RETURN NULL; END IF;
  UPDATE public.shipping_orders SET shipping_status = 'awaiting_label' WHERE id = _order_id RETURNING * INTO o;
  INSERT INTO public.shipping_label_jobs(order_id,revision,stage,payload)
    VALUES (_order_id,o.financial_revision,'creating',_payload) RETURNING token INTO claimed;
  RETURN claimed;
END;
$$;

CREATE FUNCTION public.advance_shipping_label(_order_id uuid, _token uuid, _from text, _to text,
  _shipment_id text DEFAULT NULL, _url text DEFAULT NULL, _tracking text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE j public.shipping_label_jobs; o public.shipping_orders; safe boolean;
BEGIN
  -- Consistent lock order with claim and stale recovery: order, then job.
  SELECT * INTO o FROM public.shipping_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO j FROM public.shipping_label_jobs WHERE order_id = _order_id FOR UPDATE;
  IF NOT FOUND OR j.token IS DISTINCT FROM _token OR j.stage IS DISTINCT FROM _from THEN RETURN false; END IF;
  IF NOT ((_from = 'creating' AND _to = 'created') OR (_from = 'created' AND _to = 'paying')
    OR (_from = 'paying' AND _to = 'paid') OR (_from = 'paid' AND _to = 'printing')
    OR (_from = 'printing' AND _to = 'complete')) THEN RAISE EXCEPTION 'Invalid label transition'; END IF;
  safe := coalesce(o.financial_revision = j.revision AND o.payment_status = 'approved' AND o.bling_sync_status = 'synced'
    AND o.appmax_status IN ('aprovado','integrado') AND o.appmax_payment_verified_at >= clock_timestamp() - interval '5 minutes'
    AND j.created_at >= clock_timestamp() - interval '3 minutes'
    AND EXISTS (SELECT 1 FROM public.shipping_settings WHERE id AND config #>> '{labelAutomation,enabled}' = 'true'), false);
  IF _to = 'created' THEN
    IF _shipment_id IS NULL OR length(_shipment_id) = 0 OR o.provider_shipment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid shipment association';
    END IF;
    UPDATE public.shipping_label_jobs SET shipment_id = _shipment_id WHERE order_id = _order_id;
    -- Retain a known external id even when financial changes prevent payment.
    UPDATE public.shipping_orders SET provider_shipment_id = _shipment_id, shipping_status = 'awaiting_label_payment'
      WHERE id = _order_id RETURNING * INTO o;
  ELSIF _to = 'paid' AND safe THEN
    UPDATE public.shipping_orders SET shipping_status = 'label_issued', tracking_code = _tracking
      WHERE id = _order_id RETURNING * INTO o;
  ELSIF _to = 'complete' AND safe THEN
    IF _url IS NULL OR _url !~ '^https://' OR _tracking IS NULL OR length(_tracking) = 0 THEN
      RAISE EXCEPTION 'Missing label document or tracking';
    END IF;
    UPDATE public.shipping_orders SET shipping_status = 'ready_to_post', label_url = _url, tracking_code = _tracking
      WHERE id = _order_id RETURNING * INTO o;
    INSERT INTO public.shipping_events(order_id,provider,kind,state)
      VALUES (_order_id,'superfrete','label','Etiqueta paga e pronta para impressão e postagem.');
  END IF;
  UPDATE public.shipping_label_jobs SET stage = CASE WHEN safe THEN _to ELSE 'review' END,
    revision = o.financial_revision, updated_at = clock_timestamp() WHERE order_id = _order_id;
  IF NOT safe THEN
    UPDATE public.shipping_orders SET shipping_status = 'logistics_failed' WHERE id = _order_id;
    INSERT INTO public.shipping_events(order_id,provider,kind,state) VALUES (_order_id,'superfrete','label','Revisão necessária: pedido alterado durante emissão.');
  END IF;
  RETURN safe;
END;
$$;

CREATE FUNCTION public.fail_shipping_label(_order_id uuid, _token uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE;
  UPDATE public.shipping_label_jobs SET stage = 'review', updated_at = clock_timestamp()
    WHERE order_id = _order_id AND token = _token AND stage NOT IN ('review','complete');
  IF FOUND THEN
    UPDATE public.shipping_orders SET shipping_status = 'logistics_failed' WHERE id = _order_id;
    INSERT INTO public.shipping_events(order_id,provider,kind,state) VALUES
      (_order_id,'superfrete','label','Conferir etiqueta e saldo na SuperFrete antes de qualquer nova tentativa.');
  END IF;
END;
$$;

CREATE FUNCTION public.quarantine_shipping_labels() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE j record; inspected integer := 0;
BEGIN
  FOR j IN SELECT o.id, l.token FROM public.shipping_orders o JOIN public.shipping_label_jobs l ON l.order_id = o.id
    WHERE l.stage NOT IN ('review','complete') AND l.created_at < clock_timestamp() - interval '5 minutes'
    ORDER BY l.created_at LIMIT 5 FOR UPDATE OF o SKIP LOCKED
  LOOP
    PERFORM public.fail_shipping_label(j.id,j.token);
    inspected := inspected + 1;
  END LOOP;
  RETURN inspected;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_shipping_label(uuid,uuid,jsonb),
  public.advance_shipping_label(uuid,uuid,text,text,text,text,text),
  public.fail_shipping_label(uuid,uuid), public.quarantine_shipping_labels() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_shipping_label(uuid,uuid,jsonb),
  public.advance_shipping_label(uuid,uuid,text,text,text,text,text),
  public.fail_shipping_label(uuid,uuid), public.quarantine_shipping_labels() TO service_role;

CREATE FUNCTION public.shipping_label_candidates() RETURNS SETOF public.shipping_orders
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT o.* FROM public.shipping_orders o
  WHERE o.payment_status = 'approved' AND o.bling_sync_status = 'synced'
    AND o.delivery_address IS NOT NULL AND o.provider_shipment_id IS NULL
    AND o.shipping_status <> 'logistics_failed'
    AND jsonb_typeof(o.shipping_service -> 'package') = 'object'
    AND o.shipping_service ? 'originCep'
    AND NOT EXISTS (SELECT 1 FROM public.shipping_label_jobs j WHERE j.order_id = o.id)
  ORDER BY o.created_at LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.shipping_label_candidates() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_label_candidates() TO service_role;

CREATE FUNCTION public.flag_shipping_label_preparation(_order_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.shipping_orders WHERE id = _order_id FOR UPDATE;
  UPDATE public.shipping_orders SET shipping_status = 'logistics_failed'
    WHERE id = _order_id AND provider_shipment_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.shipping_label_jobs j WHERE j.order_id = _order_id);
  IF FOUND THEN
    INSERT INTO public.shipping_events(order_id,provider,kind,state)
    VALUES (_order_id,'superfrete','label','Dados, valor do frete ou integração pendentes de conferência antes da emissão.');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.flag_shipping_label_preparation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_shipping_label_preparation(uuid) TO service_role;

CREATE FUNCTION public.shipping_label_schema_ready() RETURNS boolean LANGUAGE sql
SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.shipping_label_schema_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_label_schema_ready() TO service_role;
