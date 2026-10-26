create or replace function public.erp_admin_create_product(
  _sku text,
  _slug text,
  _name text,
  _description text,
  _sale_price_cents integer,
  _cost_price_cents integer default 0,
  _minimum_stock integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare _id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'admin_required'; end if;
  if length(btrim(coalesce(_sku,''))) < 2 or length(btrim(coalesce(_name,''))) < 2 or length(btrim(coalesce(_slug,''))) < 2 then raise exception 'invalid_product'; end if;
  if _sale_price_cents < 0 or _cost_price_cents < 0 or _minimum_stock < 0 then raise exception 'invalid_values'; end if;
  insert into public.erp_products(sku,slug,name,description,sale_price_cents,cost_price_cents,minimum_stock,stock_on_hand)
  values (upper(btrim(_sku)),lower(btrim(_slug)),btrim(_name),nullif(btrim(_description),''),_sale_price_cents,_cost_price_cents,_minimum_stock,0)
  returning id into _id;
  return _id;
end;
$$;
revoke all on function public.erp_admin_create_product(text,text,text,text,integer,integer,integer) from public, anon;
grant execute on function public.erp_admin_create_product(text,text,text,text,integer,integer,integer) to authenticated;

create or replace function public.erp_admin_adjust_inventory(_product_id uuid,_quantity_delta integer,_movement_type text,_reason text)
returns public.erp_inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'admin_required'; end if;
  return private.adjust_erp_inventory(_product_id,_quantity_delta,_movement_type,_reason,'manual_admin',gen_random_uuid()::text,auth.uid());
end;
$$;
revoke all on function public.erp_admin_adjust_inventory(uuid,integer,text,text) from public, anon;
grant execute on function public.erp_admin_adjust_inventory(uuid,integer,text,text) to authenticated;
