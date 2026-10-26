BEGIN;
DO $$
DECLARE oid uuid:=gen_random_uuid(); rev uuid; tok uuid;
BEGIN
  INSERT INTO public.shipping_orders(id,payment_status,bling_sync_status,provider_payment_id,delivery_address)
  VALUES(oid,'approved','synced',oid::text,'{}') RETURNING financial_revision INTO rev;
  tok:=public.claim_manual_shipping_cart(oid,rev,'{}');
  IF tok IS NULL THEN RAISE EXCEPTION 'Manual preparation rejected'; END IF;
  SELECT financial_revision INTO rev FROM public.shipping_orders WHERE id=oid;
  IF public.claim_manual_shipping_cart(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Duplicate manual cart'; END IF;
  IF public.claim_shipping_label(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Automatic claim collided with manual cart'; END IF;
  IF public.advance_shipping_label(oid,tok,'created','paying') THEN RAISE EXCEPTION 'Manual cart permitted automatic debit'; END IF;
  IF NOT public.complete_manual_shipping_cart(oid,tok,'manual-test') THEN RAISE EXCEPTION 'Cannot associate cart'; END IF;
  IF (SELECT shipping_status FROM public.shipping_orders WHERE id=oid)<>'awaiting_label_payment' THEN RAISE EXCEPTION 'Incorrect manual cart status'; END IF;
  IF public.complete_manual_shipping_cart(oid,tok,'another-id') THEN RAISE EXCEPTION 'External identity replaced'; END IF;
  IF has_function_privilege('authenticated','public.claim_manual_shipping_cart(uuid,uuid,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Unprivileged role can claim'; END IF;
  RAISE NOTICE 'PASS: manual carts exclude duplicate/automatic attempts, retain identity and await manual payment';
END; $$;
DO $$
DECLARE oid uuid:=gen_random_uuid(); rev uuid; tok uuid;
BEGIN
  INSERT INTO public.shipping_orders(id,payment_link_id,payment_status,bling_sync_status,bling_sync_error,provider_payment_id,delivery_address)
  VALUES(oid,'mp:manual-test','approved','reconciliation_required','Envio ao Bling falhou: Vínculos Bling não configurados.',oid::text,'{}') RETURNING financial_revision INTO rev;
  tok:=public.claim_manual_shipping_cart(oid,rev,'{}');
  IF tok IS NULL THEN RAISE EXCEPTION 'Known pre-API ERP failure blocked manual shipping'; END IF;
  IF NOT public.complete_manual_shipping_cart(oid,tok,'manual-erp-test') THEN RAISE EXCEPTION 'Cannot link manual ERP setup shipment'; END IF;
  IF (SELECT shipping_status FROM public.shipping_orders WHERE id=oid)<>'awaiting_label_payment' THEN RAISE EXCEPTION 'Manual shipment not awaiting payment'; END IF;
  IF (SELECT bling_sync_status FROM public.shipping_orders WHERE id=oid)<>'reconciliation_required' THEN RAISE EXCEPTION 'ERP hold was cleared'; END IF;
  oid:=gen_random_uuid();
  INSERT INTO public.shipping_orders(id,payment_link_id,payment_status,bling_sync_status,bling_sync_error,provider_payment_id,delivery_address)
  VALUES(oid,'mp:ambiguous-test','approved','reconciliation_required','Envio ao Bling falhou: timeout',oid::text,'{}') RETURNING financial_revision INTO rev;
  IF public.claim_manual_shipping_cart(oid,rev,'{}') IS NOT NULL THEN RAISE EXCEPTION 'Ambiguous ERP failure admitted'; END IF;
  RAISE NOTICE 'PASS: exact pre-API ERP setup failure admitted, ambiguous failures blocked, ERP hold preserved';
END; $$;
ROLLBACK;
