-- Keep all public SECURITY DEFINER functions on the repository's hardened search_path policy.
-- ERP functions qualify every application object explicitly, so only pg_catalog/pg_temp are needed.

alter function public.erp_admin_create_product(text,text,text,text,integer,integer,integer)
  set search_path = pg_catalog, pg_temp;

alter function public.erp_admin_adjust_inventory(uuid,integer,text,text)
  set search_path = pg_catalog, pg_temp;

alter function public.apply_paid_order_inventory(uuid)
  set search_path = pg_catalog, pg_temp;

alter function private.adjust_erp_inventory(uuid,integer,text,text,text,text,uuid)
  set search_path = pg_catalog, pg_temp;

alter function private.apply_paid_order_inventory(uuid)
  set search_path = pg_catalog, pg_temp;
