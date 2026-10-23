-- Synthetic records in the isolated container created by test-financial-db.sh.
BEGIN;
CREATE FUNCTION pg_temp.assert_ok(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END;
$$;
CREATE FUNCTION pg_temp.rejects(statement text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'PASS: %', label;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: %', label;
END;
$$;

INSERT INTO public.shipping_orders (id, payment_link_id, bling_sync_status)
VALUES ('00000000-0000-4000-8000-000000000001', 'fixture-link', 'awaiting_payment');
SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS lease \gset
SELECT pg_temp.assert_ok(public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') IS NULL, 'a live lease excludes a second worker');
SELECT pg_temp.assert_ok(public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'approved', '101', 'aprovado', false), 'a current approval commits');
SELECT pg_temp.assert_ok((SELECT payment_status = 'approved' AND bling_sync_status = 'queued' AND provider_payment_id = '101' AND financial_revision <> :'lease'::uuid AND appmax_check_lock_until IS NULL FROM public.shipping_orders), 'approval queues once, releases lease and rotates revision');
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'failed', '101', 'estornado', false), 'a completed lease cannot be replayed');

SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS lease \gset
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'pending', '101', 'pendente', false), 'approved cannot regress to pending');
SELECT pg_temp.assert_ok(public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'failed', '101', 'estornado', false), 'a current refund blocks the order');
SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS lease \gset
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'approved', '101', 'aprovado', false), 'failed cannot be automatically reapproved');
SELECT pg_temp.assert_ok(public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', NULL, NULL, NULL, true), 'an inconclusive observation records review safely');
SELECT pg_temp.assert_ok((SELECT payment_status = 'failed' AND bling_sync_status = 'blocked' AND bling_sync_error LIKE 'Appmax cancelado%' FROM public.shipping_orders), 'inconclusive observation preserves existing block and reason');

TRUNCATE public.shipping_label_jobs, public.shipping_orders, public.shipping_events, public.shipping_recovery_checks, public.shipping_hold_resolutions;
INSERT INTO public.shipping_orders (id, payment_link_id, bling_sync_status, bling_sync_error)
VALUES ('00000000-0000-4000-8000-000000000001', 'fixture-link', 'reconciliation_required', 'owner hold');
SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS lease \gset
SELECT pg_temp.assert_ok(public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'approved', '101', 'aprovado', false), 'financial approval can be recorded under manual review');
SELECT pg_temp.assert_ok((SELECT payment_status = 'approved' AND bling_sync_status = 'reconciliation_required' AND bling_sync_error = 'owner hold' FROM public.shipping_orders), 'manual review is never automatically queued or cleared');
SELECT pg_temp.rejects($q$UPDATE public.shipping_orders SET bling_sync_status = 'queued'$q$, 'legacy writes cannot clear manual review');
SELECT pg_temp.rejects($q$UPDATE public.shipping_orders SET payment_status = 'pending'$q$, 'legacy writes cannot downgrade approved payment');
SELECT pg_temp.rejects($q$UPDATE public.shipping_orders SET provider_payment_id = '999'$q$, 'an established payment association cannot be replaced');

SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS lease \gset
UPDATE public.shipping_orders SET bling_sync_error = 'newer owner decision';
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', 'failed', '101', 'estornado', false), 'an older success cannot overwrite an admin change');
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'lease', NULL, NULL, NULL, true), 'an older error cannot overwrite an admin change');
SELECT pg_temp.assert_ok((SELECT payment_status = 'approved' AND bling_sync_error = 'newer owner decision' FROM public.shipping_orders), 'newer payment and operational state remain intact');

UPDATE public.shipping_orders SET appmax_check_lock_until = clock_timestamp() - interval '1 second';
SELECT financial_revision AS expired FROM public.shipping_orders \gset
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'expired', 'failed', '101', 'estornado', false), 'an expired lease cannot commit even with a matching revision');
SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000001') AS newer \gset
SELECT pg_temp.assert_ok(NOT public.commit_appmax_check('00000000-0000-4000-8000-000000000001', :'expired', NULL, NULL, NULL, true), 'an expired worker cannot clear a replacement lease');
SELECT pg_temp.assert_ok((SELECT financial_revision = :'newer'::uuid AND appmax_check_lock_until > clock_timestamp() FROM public.shipping_orders), 'replacement lease is preserved');

INSERT INTO public.shipping_orders (id, payment_link_id, bling_sync_status, bling_sync_error)
VALUES ('00000000-0000-4000-8000-000000000002', 'blocked-fixture', 'blocked', 'operational hold');
SELECT public.claim_appmax_check_v2('00000000-0000-4000-8000-000000000002') AS blocked_lease \gset
SELECT pg_temp.assert_ok(public.commit_appmax_check('00000000-0000-4000-8000-000000000002', :'blocked_lease', 'approved', '102', 'aprovado', false), 'approval can be observed on an operationally blocked order');
SELECT pg_temp.assert_ok((SELECT payment_status = 'approved' AND bling_sync_status = 'blocked' AND bling_sync_error = 'operational hold' FROM public.shipping_orders WHERE id = '00000000-0000-4000-8000-000000000002'), 'approval preserves operational block and its reason');

TRUNCATE public.shipping_label_jobs, public.shipping_orders, public.shipping_events, public.shipping_recovery_checks, public.shipping_hold_resolutions;
INSERT INTO public.shipping_orders (id, payment_link_id, payment_status, provider_payment_id, bling_sync_status)
VALUES ('00000000-0000-4000-8000-000000000001', 'fixture-link', 'approved', '101', 'processing');
SELECT financial_revision AS export_revision FROM public.shipping_orders \gset
UPDATE public.shipping_orders SET bling_sync_status = 'blocked', bling_sync_error = 'refund hold';
WITH stale_write AS (
  UPDATE public.shipping_orders SET bling_sync_status = 'synced', bling_order_id = 42
  WHERE financial_revision = :'export_revision' AND bling_sync_status = 'processing'
    AND payment_status = 'approved' AND bling_order_id IS NULL RETURNING id
)
SELECT pg_temp.assert_ok((SELECT count(*) = 0 FROM stale_write), 'stale export completion cannot overwrite a newer hold');
SELECT pg_temp.rejects($q$UPDATE public.shipping_orders SET bling_sync_status = 'synced', bling_order_id = 42$q$, 'legacy export completion cannot clear a block');

SELECT pg_temp.assert_ok(NOT has_function_privilege('anon', 'public.claim_appmax_check_v2(uuid)', 'EXECUTE'), 'anonymous callers cannot claim a lease');
SELECT pg_temp.assert_ok(NOT has_function_privilege('authenticated', 'public.commit_appmax_check(uuid,uuid,text,text,text,boolean)', 'EXECUTE'), 'authenticated callers cannot commit financial observations');
SELECT pg_temp.assert_ok(has_function_privilege('service_role', 'public.commit_appmax_check(uuid,uuid,text,text,text,boolean)', 'EXECUTE'), 'only trusted service role can commit observations');
ROLLBACK;
