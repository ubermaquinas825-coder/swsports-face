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
ROLLBACK;
