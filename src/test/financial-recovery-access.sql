BEGIN;
CREATE FUNCTION pg_temp.check_ok(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END;
$$;
CREATE FUNCTION pg_temp.denied(statement text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: %', label; RETURN;
  END;
  RAISE EXCEPTION 'FAIL: %', label;
END;
$$;
CREATE FUNCTION pg_temp.rejected(statement text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN raise_exception THEN RAISE NOTICE 'PASS: %', label; RETURN;
  END;
  RAISE EXCEPTION 'FAIL: %', label;
END;
$$;

SELECT pg_temp.check_ok((SELECT bool_and(p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp'])
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef), 'all public SECURITY DEFINER functions exclude writable schemas from search_path');
SELECT pg_temp.check_ok((SELECT bool_and(pg_get_userbyid(p.proowner) NOT IN ('anon', 'authenticated', 'service_role'))
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef), 'definer ownership is not delegated to application roles');
-- Model an adversarial overload without granting CREATE to application roles.
-- An explicit enum cast must keep the resolver bound to the trusted helper.
CREATE FUNCTION public.has_role(uuid, text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;

SET LOCAL ROLE anon;
SELECT pg_temp.denied($q$SELECT public.claim_appmax_check_v2(NULL)$q$, 'anon cannot acquire financial leases');
SELECT pg_temp.denied($q$SELECT public.renew_appmax_check(NULL, NULL)$q$, 'anon cannot renew leases');
SELECT pg_temp.denied($q$SELECT public.defer_appmax_check(NULL, NULL)$q$, 'anon cannot defer payments');
SELECT pg_temp.denied($q$SELECT public.commit_appmax_check(NULL, NULL, NULL, NULL, NULL, true)$q$, 'anon cannot commit observations');
SELECT pg_temp.denied($q$SELECT public.claim_bling_export(NULL)$q$, 'anon cannot acquire exports');
SELECT pg_temp.denied($q$SELECT public.quarantine_stale_bling_orders()$q$, 'anon cannot recover exports');
SELECT pg_temp.denied($q$SELECT public.record_bling_recovery(NULL, NULL, 'not_found', NULL)$q$, 'anon cannot forge recovery evidence');
SELECT pg_temp.denied($q$SELECT public.resolve_shipping_order_hold(NULL, NULL, 'keep_blocked', 'reason long enough', 'evidence long enough')$q$, 'anon cannot resolve holds');
SELECT pg_temp.denied($q$SELECT * FROM public.shipping_hold_resolutions$q$, 'anon cannot read audit history');
RESET ROLE;

INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000001'), ('10000000-0000-4000-8000-000000000002');
INSERT INTO public.user_roles (user_id, role) VALUES ('10000000-0000-4000-8000-000000000001', 'admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.denied($q$SELECT public.claim_appmax_check_v2(NULL)$q$, 'ordinary users cannot acquire leases');
SELECT pg_temp.denied($q$SELECT public.renew_appmax_check(NULL, NULL)$q$, 'ordinary users cannot renew leases');
SELECT pg_temp.denied($q$SELECT public.commit_appmax_check(NULL, NULL, NULL, NULL, NULL, true)$q$, 'ordinary users cannot commit payments');
SELECT pg_temp.denied($q$SELECT public.defer_appmax_check(NULL, NULL)$q$, 'ordinary users cannot schedule retries');
SELECT pg_temp.denied($q$SELECT public.claim_bling_export(NULL)$q$, 'ordinary users cannot export');
SELECT pg_temp.denied($q$SELECT public.quarantine_stale_bling_orders()$q$, 'ordinary users cannot quarantine exports');
SELECT pg_temp.denied($q$SELECT public.record_bling_recovery(NULL, NULL, 'found', 42)$q$, 'ordinary users cannot forge ERP evidence');
SELECT pg_temp.denied($q$SELECT public.resolve_shipping_order_hold(NULL, NULL, 'keep_blocked', 'reason long enough', 'evidence long enough')$q$, 'admin membership is verified inside the definer function');
RESET ROLE;

INSERT INTO public.shipping_orders (id, payment_link_id) VALUES ('20000000-0000-4000-8000-000000000001', 'lease-fixture');
SET LOCAL ROLE service_role;
-- A caller-controlled temporary relation must never shadow the real table.
CREATE TEMP TABLE shipping_orders (id uuid, payment_link_id text);
SELECT public.claim_appmax_check_v2('20000000-0000-4000-8000-000000000001') AS lease \gset
SELECT public.renew_appmax_check('20000000-0000-4000-8000-000000000001', :'lease') AS renewed \gset
SELECT pg_temp.check_ok(:'renewed' <> :'lease', 'service role renews with a fresh ownership revision');
SELECT pg_temp.check_ok(NOT public.commit_appmax_check('20000000-0000-4000-8000-000000000001', :'lease', NULL, NULL, 'pendente', false), 'a pre-renewal revision cannot commit');
SELECT pg_temp.check_ok(public.defer_appmax_check('20000000-0000-4000-8000-000000000001', :'renewed'), 'a temporary read failure can be deferred without changing financial state');
SELECT pg_temp.check_ok(public.claim_appmax_check_v2('20000000-0000-4000-8000-000000000001') IS NULL, 'database backoff prevents immediate cron retries');
SELECT pg_temp.check_ok((SELECT count(*) = 0 FROM pg_temp.shipping_orders), 'temporary shadow table is untouched');
SELECT pg_temp.denied($q$SELECT public.claim_appmax_check(NULL)$q$, 'pre-versioned boolean workers are disabled');
SELECT pg_temp.denied($q$INSERT INTO public.shipping_hold_resolutions (order_id,actor_id,expected_revision,action,previous_status,reason,evidence) VALUES (NULL,NULL,NULL,'keep_blocked','blocked','fake reason here','fake evidence here')$q$, 'service role cannot forge admin authorization records');
SELECT pg_temp.denied($q$SELECT public.resolve_shipping_order_hold(NULL, NULL, 'keep_blocked', 'reason long enough', 'evidence long enough')$q$, 'service role cannot impersonate an administrative resolution');
RESET ROLE;
SELECT pg_temp.check_ok((SELECT appmax_check_failures = 1 AND appmax_next_check_at > clock_timestamp() AND payment_status = 'pending' AND bling_sync_status = 'awaiting_payment' FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001'), 'transient errors preserve financial and operational state');

UPDATE public.shipping_orders SET appmax_next_check_at = clock_timestamp() - interval '1 second' WHERE id = '20000000-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
SELECT public.claim_appmax_check_v2('20000000-0000-4000-8000-000000000001') AS lease \gset
SELECT pg_temp.check_ok(public.commit_appmax_check('20000000-0000-4000-8000-000000000001', :'lease', NULL, NULL, 'pendente', false), 'a later successful read commits');
RESET ROLE;
SELECT pg_temp.check_ok((SELECT appmax_check_failures = 0 AND appmax_next_check_at IS NULL FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001'), 'successful observations reset backoff');
SELECT public.claim_appmax_check_v2('20000000-0000-4000-8000-000000000001') AS verification_lease \gset
SELECT pg_temp.check_ok(public.commit_appmax_check('20000000-0000-4000-8000-000000000001', :'verification_lease', 'approved', '101', 'aprovado', false), 'a successful approval records authoritative freshness');
SELECT pg_temp.check_ok((SELECT appmax_payment_verified_at > clock_timestamp() - interval '1 minute' FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001'), 'financial freshness is separate from attempt time');
SELECT public.claim_appmax_check_v2('20000000-0000-4000-8000-000000000001') AS verification_lease \gset
SELECT pg_temp.check_ok((SELECT appmax_payment_verified_at IS NULL FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001'), 'starting another check invalidates old approval evidence');
SELECT pg_temp.check_ok(public.commit_appmax_check('20000000-0000-4000-8000-000000000001', :'verification_lease', NULL, NULL, NULL, true), 'an inconclusive read can record its attempt without confirming payment');
SELECT pg_temp.check_ok((SELECT appmax_checked_at > clock_timestamp() - interval '1 minute' AND appmax_payment_verified_at IS NULL AND payment_status = 'approved' FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001'), 'a fresh failed attempt cannot masquerade as recent financial confirmation');
UPDATE public.shipping_orders SET appmax_check_started_at = clock_timestamp() - interval '121 seconds', appmax_check_lock_until = clock_timestamp() + interval '30 seconds' WHERE id = '20000000-0000-4000-8000-000000000001';
SELECT financial_revision AS capped FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001' \gset
SET LOCAL ROLE service_role;
SELECT pg_temp.check_ok(public.renew_appmax_check('20000000-0000-4000-8000-000000000001', :'capped') IS NULL, 'renewal cannot extend the total two-minute budget');
SELECT pg_temp.check_ok(NOT public.commit_appmax_check('20000000-0000-4000-8000-000000000001', :'capped', 'approved', '101', 'aprovado', false), 'commit also enforces the absolute two-minute budget');
RESET ROLE;
UPDATE public.shipping_orders SET appmax_check_lock_until = clock_timestamp() - interval '1 second' WHERE id = '20000000-0000-4000-8000-000000000001';
SELECT financial_revision AS expired FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000001' \gset
SET LOCAL ROLE service_role;
SELECT pg_temp.check_ok(public.renew_appmax_check('20000000-0000-4000-8000-000000000001', :'expired') IS NULL, 'renewal cannot resurrect an expired lease');
RESET ROLE;

INSERT INTO public.shipping_orders (id, payment_status, provider_payment_id, bling_sync_status, bling_processing_started_at, bling_export_token, appmax_checked_at, appmax_status)
VALUES ('20000000-0000-4000-8000-000000000002', 'approved', '202', 'queued', NULL, NULL, clock_timestamp(), 'aprovado'),
('20000000-0000-4000-8000-000000000003', 'approved', '303', 'processing', clock_timestamp() - interval '15 minutes', gen_random_uuid(), clock_timestamp() - interval '10 minutes', 'aprovado'),
('20000000-0000-4000-8000-000000000004', 'approved', '404', 'queued', NULL, NULL, clock_timestamp(), 'aprovado'),
('20000000-0000-4000-8000-000000000005', 'failed', '505', 'blocked', NULL, NULL, clock_timestamp(), 'estornado');
SET LOCAL ROLE service_role;
SELECT financial_revision AS export_revision FROM public.claim_bling_export('20000000-0000-4000-8000-000000000002') \gset
SELECT pg_temp.check_ok((SELECT count(*) = 0 FROM public.claim_bling_export('20000000-0000-4000-8000-000000000002')), 'only one worker acquires a queued export');
SELECT pg_temp.rejected($q$UPDATE public.shipping_orders SET bling_sync_status = 'queued' WHERE id = '20000000-0000-4000-8000-000000000002'$q$, 'uncertain processing cannot be requeued by direct writes');
SELECT pg_temp.rejected($q$UPDATE public.shipping_orders SET bling_sync_status = 'processing' WHERE id = '20000000-0000-4000-8000-000000000004'$q$, 'legacy direct export acquisition is rejected');
SELECT pg_temp.check_ok((SELECT count(*) = 1 FROM public.quarantine_stale_bling_orders()), 'only old processing orders are quarantined');
SELECT pg_temp.check_ok((SELECT count(*) = 0 FROM public.quarantine_stale_bling_orders()), 'cron retries cannot acquire quarantined orders again');
RESET ROLE;
SELECT pg_temp.check_ok((SELECT bling_sync_status = 'processing' AND bling_processing_started_at > clock_timestamp() - interval '1 minute' AND bling_export_token IS NOT NULL FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000002'), 'active processing is not mistaken for abandoned work');
SET LOCAL ROLE service_role;
WITH completed AS (
  UPDATE public.shipping_orders SET bling_sync_status = 'synced', bling_order_id = 2020
  WHERE id = '20000000-0000-4000-8000-000000000002' AND financial_revision = :'export_revision'
    AND bling_sync_status = 'processing' AND payment_status = 'approved' AND bling_order_id IS NULL RETURNING id
)
SELECT pg_temp.check_ok((SELECT count(*) = 1 FROM completed), 'the new export worker can complete its own unchanged attempt');
RESET ROLE;
SELECT financial_revision AS held FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000003' \gset
SET LOCAL ROLE service_role;
SELECT set_config('sw.allow_hold_release', 'true', true);
SELECT pg_temp.rejected($q$UPDATE public.shipping_orders SET bling_sync_status = 'synced' WHERE id = '20000000-0000-4000-8000-000000000003'$q$, 'a session flag cannot authorize releasing a hold');
SELECT pg_temp.check_ok(public.record_bling_recovery('20000000-0000-4000-8000-000000000003', :'held', 'found', 3030), 'trusted read-only lookup records the existing ERP association');
RESET ROLE;
SELECT financial_revision AS held FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000003' \gset
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT pg_temp.rejected(format('SELECT public.resolve_shipping_order_hold(%L,%L,%L,%L,%L)', '20000000-0000-4000-8000-000000000003', :'held', 'accept_verified_export', 'operator verified order', 'ticket FIN-001 checked'), 'old financial evidence cannot release the hold');
RESET ROLE;
UPDATE public.shipping_orders SET appmax_checked_at = clock_timestamp(), appmax_payment_verified_at = clock_timestamp() WHERE id = '20000000-0000-4000-8000-000000000003';
SELECT financial_revision AS held FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000003' \gset
SET LOCAL ROLE authenticated;
SELECT pg_temp.rejected(format('SELECT public.resolve_shipping_order_hold(%L,%L,%L,%L,%L)', '20000000-0000-4000-8000-000000000003', :'held', 'accept_verified_export', 'operator verified order', 'ticket FIN-001 checked'), 'ERP evidence must match the current revision');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.check_ok(public.record_bling_recovery('20000000-0000-4000-8000-000000000003', :'held', 'found', 3030), 'ERP evidence can be refreshed without creating an order');
RESET ROLE;
SELECT financial_revision AS held FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000003' \gset
SET LOCAL ROLE authenticated;
SELECT public.resolve_shipping_order_hold('20000000-0000-4000-8000-000000000003', :'held', 'accept_verified_export', 'operator verified order', 'ticket FIN-001 checked') AS resolved \gset
SELECT pg_temp.check_ok((SELECT count(*) = 1 FROM public.shipping_hold_resolutions WHERE actor_id = auth.uid() AND applied_revision = :'resolved'), 'admin resolution records actor and applied revision atomically');
SELECT pg_temp.rejected(format('SELECT public.resolve_shipping_order_hold(%L,%L,%L,%L,%L)', '20000000-0000-4000-8000-000000000003', :'held', 'accept_verified_export', 'operator verified order', 'ticket FIN-001 checked'), 'administrative decisions cannot be replayed');
SELECT pg_temp.denied($q$DELETE FROM public.shipping_hold_resolutions$q$, 'administrators cannot erase resolution history');
RESET ROLE;
SELECT pg_temp.check_ok((SELECT payment_status = 'approved' AND provider_payment_id = '303' AND bling_order_id = 3030 AND bling_sync_status = 'synced' FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000003'), 'resolution completes only the already-existing export without changing payment');

SELECT financial_revision AS failed FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000005' \gset
SET LOCAL ROLE service_role;
SELECT pg_temp.check_ok(public.record_bling_recovery('20000000-0000-4000-8000-000000000005', :'failed', 'found', 5050), 'an ERP lookup does not imply financial approval');
RESET ROLE;
SELECT financial_revision AS failed FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000005' \gset
SET LOCAL ROLE authenticated;
SELECT pg_temp.rejected(format('SELECT public.resolve_shipping_order_hold(%L,%L,%L,%L,%L)', '20000000-0000-4000-8000-000000000005', :'failed', 'accept_verified_export', 'operator verified order', 'ticket FIN-002 checked'), 'even an admin cannot approve or release a failed payment');
SELECT public.resolve_shipping_order_hold('20000000-0000-4000-8000-000000000005', :'failed', 'keep_blocked', 'operator retains refund block', 'ticket FIN-002 checked');
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.check_ok((SELECT count(*) = 0 FROM public.shipping_hold_resolutions), 'ordinary users cannot read administrative audit history');
SELECT pg_temp.check_ok((SELECT count(*) = 0 FROM public.shipping_recovery_checks), 'ordinary users cannot read ERP recovery evidence');
RESET ROLE;
SELECT pg_temp.check_ok((SELECT payment_status = 'failed' AND bling_sync_status = 'blocked' FROM public.shipping_orders WHERE id = '20000000-0000-4000-8000-000000000005'), 'acknowledgment leaves financial blocks intact');
ROLLBACK;
