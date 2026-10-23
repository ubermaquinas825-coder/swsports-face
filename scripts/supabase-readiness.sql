-- Read-only inventory for the already prepared Supabase project.
-- No migrations, grants, credentials or customer records are changed/read.
SELECT 'table' AS kind, name AS expected,
  to_regclass('public.' || name) IS NOT NULL AS exists
FROM (VALUES ('user_roles'),('shipping_settings'),('shipping_orders'),('shipping_events'),
  ('bling_connections'),('bling_oauth_states'),('bling_store_settings'),
  ('shipping_recovery_checks'),('shipping_hold_resolutions'),('shipping_label_jobs')) AS expected(name)
UNION ALL
SELECT 'column', name, EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='shipping_orders' AND column_name=name
)
FROM (VALUES ('delivery_address'),('financial_revision'),('appmax_payment_verified_at'),
  ('bling_export_token'),('bling_processing_started_at'),('provider_shipment_id'),('label_url')) AS expected(name)
ORDER BY kind, expected;

SELECT p.proname AS function, p.prosecdef AS security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'claim_appmax_check_v2','commit_appmax_check','renew_appmax_check','defer_appmax_check',
  'claim_bling_export','quarantine_stale_bling_orders','record_bling_recovery','resolve_shipping_order_hold',
  'claim_shipping_label','advance_shipping_label','fail_shipping_label','quarantine_shipping_labels',
  'shipping_label_candidates','shipping_label_schema_ready','flag_shipping_label_preparation'
) ORDER BY p.proname;
