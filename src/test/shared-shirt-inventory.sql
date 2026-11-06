-- Run after migration 0018, in an isolated database or BEFORE creating the real
-- shirt stock masters. This fixture refuses to alter any existing shirt master.
-- All product/order identities are random; every fixture write is rolled back.
BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '2s';

DO $$
DECLARE
  p01 uuid := gen_random_uuid();
  p02 uuid := gen_random_uuid();
  p03 uuid := gen_random_uuid();
  plegacy uuid := gen_random_uuid();
  oid uuid := gen_random_uuid();
  pending_oid uuid := gen_random_uuid();
  unverified_oid uuid := gen_random_uuid();
  insufficient_oid uuid := gen_random_uuid();
  invalid_oid uuid;
  prefix text := 'shared-stock-fixture-' || gen_random_uuid()::text;
  legacy_slug text := 'legacy-stock-fixture-' || gen_random_uuid()::text;
  stocks_before integer[];
  stocks_after integer[];
  invalid_items jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.erp_products WHERE slug IN (
    'camisa-ifood-ref-01', 'camisa-ifood-ref-02', 'camisa-ifood-ref-03'
  )) THEN
    RAISE EXCEPTION 'Fixture requires isolated/empty shirt master slugs; existing products were not modified';
  END IF;

  INSERT INTO public.erp_products(id,sku,slug,name,sale_price_cents,stock_on_hand)
  VALUES
    (p01,prefix||'-01','camisa-ifood-ref-01','Synthetic shared shirt 01',7990,1000),
    (p02,prefix||'-02','camisa-ifood-ref-02','Synthetic shared shirt 02',7990,1000),
    (p03,prefix||'-03','camisa-ifood-ref-03','Synthetic shared shirt 03',7990,1000),
    (plegacy,prefix||'-legacy',legacy_slug,'Synthetic legacy balaclava',4990,10);

  INSERT INTO public.shipping_orders(id,payment_status,provider_payment_id,items,subtotal_cents)
  VALUES(oid,'approved',prefix||'-paid',jsonb_build_array(
    jsonb_build_object('id','camisa-ifood-ref-01-m','inventory_slug','camisa-ifood-ref-01','name','Synthetic 01 M','qty',2,'unit_price_cents',7990),
    jsonb_build_object('id','camisa-ifood-ref-01-g','inventory_slug','camisa-ifood-ref-01','name','Synthetic 01 G','qty',3,'unit_price_cents',7990),
    jsonb_build_object('id','camisa-ifood-ref-02-xg','inventory_slug','camisa-ifood-ref-02','name','Synthetic 02 XG','qty',1,'unit_price_cents',7990),
    jsonb_build_object('id','camisa-ifood-ref-03-p','inventory_slug','camisa-ifood-ref-03','name','Synthetic 03 P','qty',4,'unit_price_cents',7990),
    jsonb_build_object('id',legacy_slug,'name','Synthetic legacy','qty','2','unit_price_cents',4990)
  ),89880);

  IF public.apply_paid_order_inventory(oid) IS NOT TRUE THEN RAISE EXCEPTION 'First approved debit rejected'; END IF;
  IF (SELECT stock_on_hand FROM public.erp_products WHERE id=p01) <> 995
     OR (SELECT stock_on_hand FROM public.erp_products WHERE id=p02) <> 999
     OR (SELECT stock_on_hand FROM public.erp_products WHERE id=p03) <> 996
     OR (SELECT stock_on_hand FROM public.erp_products WHERE id=plegacy) <> 8 THEN
    RAISE EXCEPTION 'Shared or legacy balance is incorrect';
  END IF;
  IF (SELECT count(*) FROM public.erp_inventory_movements WHERE reference_type='paid_order' AND reference_id=oid::text) <> 4 THEN
    RAISE EXCEPTION 'Expected exactly one debit per stock master, including legacy';
  END IF;
  IF (SELECT count(*) FROM public.erp_inventory_movements WHERE reference_id=oid::text AND product_id=p01 AND quantity_delta=-5) <> 1 THEN
    RAISE EXCEPTION 'M and G did not aggregate into one stock movement';
  END IF;
  IF public.apply_paid_order_inventory(oid) IS NOT FALSE THEN RAISE EXCEPTION 'Repeated callback was not idempotent'; END IF;
  IF (SELECT stock_on_hand FROM public.erp_products WHERE id=p01) <> 995 THEN RAISE EXCEPTION 'Repeated callback debited twice'; END IF;
  RAISE NOTICE 'PASS: three shared model balances, M/G aggregation, legacy integer-string lookup and idempotence';

  INSERT INTO public.shipping_orders(id,payment_status,provider_payment_id,items)
  VALUES
    (pending_oid,'pending',null,'[{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":1}]'),
    (unverified_oid,'approved',null,'[{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":1}]');
  BEGIN
    PERFORM public.apply_paid_order_inventory(pending_oid);
    RAISE EXCEPTION 'Pending payment was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'payment_not_approved' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.apply_paid_order_inventory(unverified_oid);
    RAISE EXCEPTION 'Missing provider evidence was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'payment_not_approved' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: pending and unverified payments cannot change inventory';

  SELECT array_agg(stock_on_hand ORDER BY id) INTO stocks_before
  FROM public.erp_products WHERE id IN (p01,p02,p03,plegacy);
  INSERT INTO public.shipping_orders(id,payment_status,provider_payment_id,items)
  VALUES(insufficient_oid,'approved',prefix||'-insufficient','[
    {"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":1},
    {"id":"camisa-ifood-ref-02-g","inventory_slug":"camisa-ifood-ref-02","qty":1000}
  ]');
  BEGIN
    PERFORM public.apply_paid_order_inventory(insufficient_oid);
    RAISE EXCEPTION 'Insufficient inventory was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'insufficient_stock:camisa-ifood-ref-02' THEN RAISE; END IF;
  END;
  SELECT array_agg(stock_on_hand ORDER BY id) INTO stocks_after
  FROM public.erp_products WHERE id IN (p01,p02,p03,plegacy);
  IF stocks_after IS DISTINCT FROM stocks_before
     OR EXISTS(SELECT 1 FROM public.erp_inventory_movements WHERE reference_id=insufficient_oid::text) THEN
    RAISE EXCEPTION 'Insufficient order left a partial debit';
  END IF;
  RAISE NOTICE 'PASS: insufficient shared stock leaves every product and movement unchanged';

  FOR invalid_items IN SELECT value FROM jsonb_array_elements('[
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-02","qty":1}],
    [{"id":"camisa-ifood-ref-03-pp","inventory_slug":"camisa-ifood-ref-03","qty":1}],
    [{"id":"unrelated-product","inventory_slug":"camisa-ifood-ref-01","qty":1}],
    [{"id":"camisa-ifood-ref-04-m","inventory_slug":"camisa-ifood-ref-04","qty":1}],
    [{"id":"camisa-ifood-ref-01","qty":1}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":null,"qty":1}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":0}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":-1}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":1.5}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":"1"}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":null}],
    [{"id":"legacy-invalid-fraction","qty":"1.5"}],
    [{"id":"legacy-missing-qty"}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":2147483648}],
    [{"id":"camisa-ifood-ref-01-m","inventory_slug":"camisa-ifood-ref-01","qty":2147483647},{"id":"camisa-ifood-ref-01-g","inventory_slug":"camisa-ifood-ref-01","qty":1}]
  ]'::jsonb)
  LOOP
    invalid_oid := gen_random_uuid();
    INSERT INTO public.shipping_orders(id,payment_status,provider_payment_id,items)
    VALUES(invalid_oid,'approved',invalid_oid::text,invalid_items);
    BEGIN
      PERFORM public.apply_paid_order_inventory(invalid_oid);
      RAISE EXCEPTION 'Invalid inventory line was accepted';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT IN ('inventory_mapping_invalid','order_item_invalid','order_quantity_overflow') THEN RAISE; END IF;
    END;
    IF EXISTS(SELECT 1 FROM public.erp_inventory_movements WHERE reference_id=invalid_oid::text) THEN
      RAISE EXCEPTION 'Invalid inventory line created a movement';
    END IF;
  END LOOP;
  SELECT array_agg(stock_on_hand ORDER BY id) INTO stocks_after
  FROM public.erp_products WHERE id IN (p01,p02,p03,plegacy);
  IF stocks_after IS DISTINCT FROM stocks_before THEN RAISE EXCEPTION 'Invalid lines altered stock'; END IF;
  RAISE NOTICE 'PASS: invalid mappings, unavailable PP, malformed quantities and overflow are rejected atomically';

  IF has_function_privilege('anon','public.apply_paid_order_inventory(uuid)','EXECUTE')
     OR has_function_privilege('authenticated','public.apply_paid_order_inventory(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.apply_paid_order_inventory(uuid)','EXECUTE')
     OR has_function_privilege('authenticated','private.apply_paid_order_inventory(uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.apply_paid_order_inventory(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Inventory function grants are unsafe';
  END IF;
  RAISE NOTICE 'PASS: shared inventory remains callable only through privileged server access';
END;
$$;
ROLLBACK;
