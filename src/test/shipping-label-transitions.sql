BEGIN;
INSERT INTO public.shipping_settings(id,config) VALUES(true,'{"labelAutomation":{"enabled":true}}')
  ON CONFLICT(id) DO UPDATE SET config=excluded.config;

DO $$
DECLARE oid uuid := gen_random_uuid(); rev uuid; tok uuid; stale uuid;
BEGIN
  IF has_table_privilege('authenticated','public.shipping_label_jobs','SELECT')
    OR has_table_privilege('service_role','public.shipping_label_jobs','UPDATE')
    OR has_function_privilege('anon','public.claim_shipping_label(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.advance_shipping_label(uuid,uuid,text,text,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Label privileges leaked';
  END IF;
  INSERT INTO public.shipping_orders(id,payment_status,bling_sync_status,provider_payment_id,delivery_address,appmax_status)
    VALUES(oid,'pending','awaiting_payment',oid::text,'{}','pendente') RETURNING financial_revision INTO rev;
  IF public.claim_shipping_label(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Pending payment claimed'; END IF;
  UPDATE public.shipping_orders SET payment_status='approved',bling_sync_status='synced',appmax_status='aprovado',
    appmax_checked_at=clock_timestamp(),appmax_payment_verified_at=clock_timestamp()-interval '6 minutes'
    WHERE id=oid RETURNING financial_revision INTO rev;
  IF public.claim_shipping_label(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Stale approval claimed'; END IF;
  UPDATE public.shipping_orders SET appmax_payment_verified_at=clock_timestamp() WHERE id=oid RETURNING financial_revision INTO rev;
  tok := public.claim_shipping_label(oid,rev,'{}');
  IF tok IS NULL THEN RAISE EXCEPTION 'Fresh approval not claimed'; END IF;
  SELECT financial_revision INTO rev FROM public.shipping_orders WHERE id=oid;
  IF public.claim_shipping_label(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Duplicate claimed'; END IF;
  IF public.advance_shipping_label(oid,gen_random_uuid(),'creating','created','wrong') THEN RAISE EXCEPTION 'Wrong token accepted'; END IF;
  IF NOT public.advance_shipping_label(oid,tok,'creating','created',oid::text) THEN RAISE EXCEPTION 'Cannot save shipment'; END IF;
  IF public.advance_shipping_label(oid,tok,'creating','created','duplicate') THEN RAISE EXCEPTION 'Replay accepted'; END IF;
  IF NOT public.advance_shipping_label(oid,tok,'created','paying') THEN RAISE EXCEPTION 'Cannot begin payment'; END IF;
  IF NOT public.advance_shipping_label(oid,tok,'paying','paid',NULL,NULL,'TRACK1') THEN RAISE EXCEPTION 'Cannot save payment'; END IF;
  IF NOT public.advance_shipping_label(oid,tok,'paid','printing') THEN RAISE EXCEPTION 'Cannot begin printing'; END IF;
  IF NOT public.advance_shipping_label(oid,tok,'printing','complete',NULL,'https://api.superfrete.com/_etiqueta/pdf/test','TRACK1') THEN RAISE EXCEPTION 'Cannot save PDF'; END IF;
  PERFORM public.fail_shipping_label(oid,tok);
  IF (SELECT stage FROM public.shipping_label_jobs WHERE order_id=oid)<>'complete' THEN RAISE EXCEPTION 'Completed job downgraded'; END IF;
  IF (SELECT shipping_status FROM public.shipping_orders WHERE id=oid)<>'ready_to_post' THEN RAISE EXCEPTION 'Not ready to post'; END IF;

  -- A refund after creation preserves the external id and prevents a debit.
  oid := gen_random_uuid();
  INSERT INTO public.shipping_orders(id,payment_status,bling_sync_status,provider_payment_id,delivery_address,appmax_status,appmax_payment_verified_at)
    VALUES(oid,'approved','synced',oid::text,'{}','aprovado',clock_timestamp()) RETURNING financial_revision INTO rev;
  tok := public.claim_shipping_label(oid,rev,'{}');
  IF NOT public.advance_shipping_label(oid,tok,'creating','created',oid::text) THEN RAISE EXCEPTION 'Cannot create second job'; END IF;
  UPDATE public.shipping_orders SET payment_status='failed',bling_sync_status='blocked' WHERE id=oid;
  IF public.advance_shipping_label(oid,tok,'created','paying') THEN RAISE EXCEPTION 'Refund allowed debit'; END IF;
  IF (SELECT provider_shipment_id FROM public.shipping_orders WHERE id=oid) IS DISTINCT FROM oid::text THEN RAISE EXCEPTION 'Lost shipment identity'; END IF;
  IF (SELECT stage FROM public.shipping_label_jobs WHERE order_id=oid)<>'review' THEN RAISE EXCEPTION 'Refund not held'; END IF;

  -- A dead worker never becomes permission to repeat POST /cart.
  oid := gen_random_uuid();
  INSERT INTO public.shipping_orders(id,payment_status,bling_sync_status,provider_payment_id,delivery_address,appmax_status,appmax_payment_verified_at)
    VALUES(oid,'approved','synced',oid::text,'{}','aprovado',clock_timestamp()) RETURNING financial_revision INTO rev;
  tok := public.claim_shipping_label(oid,rev,'{}');
  UPDATE public.shipping_label_jobs SET created_at=clock_timestamp()-interval '6 minutes' WHERE order_id=oid;
  PERFORM public.quarantine_shipping_labels();
  SELECT financial_revision INTO rev FROM public.shipping_orders WHERE id=oid;
  IF public.claim_shipping_label(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Dead worker re-created shipment'; END IF;
  IF public.advance_shipping_label(oid,tok,'creating','created','late') THEN RAISE EXCEPTION 'Dead worker continued'; END IF;
  RAISE NOTICE 'PASS: label stages, ownership, approval freshness, refund, privilege isolation, duplicate and stale-worker protection';
END;
$$;
ROLLBACK;
