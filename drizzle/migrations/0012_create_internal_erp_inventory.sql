create table if not exists public.erp_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text unique,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  cost_price_cents integer not null default 0 check (cost_price_cents >= 0),
  sale_price_cents integer not null check (sale_price_cents >= 0),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  image_url text,
  weight_grams integer check (weight_grams is null or weight_grams > 0),
  width_cm numeric(8,2) check (width_cm is null or width_cm > 0),
  height_cm numeric(8,2) check (height_cm is null or height_cm > 0),
  length_cm numeric(8,2) check (length_cm is null or length_cm > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.erp_products(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','entry','sale','adjustment','return','cancellation')),
  quantity_delta integer not null check (quantity_delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (length(btrim(reason)) between 3 and 500),
  reference_type text,
  reference_id text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists erp_products_status_idx on public.erp_products(status);
create index if not exists erp_products_stock_idx on public.erp_products(stock_on_hand);
create index if not exists erp_inventory_movements_product_created_idx on public.erp_inventory_movements(product_id, created_at desc);
create unique index if not exists erp_inventory_movements_reference_uidx on public.erp_inventory_movements(reference_type, reference_id, product_id, movement_type) where reference_type is not null and reference_id is not null;

alter table public.erp_products enable row level security;
alter table public.erp_inventory_movements enable row level security;

revoke all on table public.erp_products from anon, authenticated;
revoke all on table public.erp_inventory_movements from anon, authenticated;
grant select, insert, update, delete on table public.erp_products to service_role;
grant select, insert, update, delete on table public.erp_inventory_movements to service_role;

drop policy if exists erp_products_admin_select on public.erp_products;
create policy erp_products_admin_select on public.erp_products for select to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists erp_inventory_admin_select on public.erp_inventory_movements;
create policy erp_inventory_admin_select on public.erp_inventory_movements for select to authenticated using (public.has_role((select auth.uid()), 'admin'::public.app_role));

grant select on table public.erp_products to authenticated;
grant select on table public.erp_inventory_movements to authenticated;

create or replace function public.set_erp_product_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_erp_product_updated_at() from public, anon, authenticated;

drop trigger if exists erp_products_set_updated_at on public.erp_products;
create trigger erp_products_set_updated_at before update on public.erp_products for each row execute function public.set_erp_product_updated_at();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.adjust_erp_inventory(
  _product_id uuid,
  _quantity_delta integer,
  _movement_type text,
  _reason text,
  _reference_type text default null,
  _reference_id text default null,
  _actor_id uuid default null
)
returns public.erp_inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  _product public.erp_products;
  _movement public.erp_inventory_movements;
begin
  if _quantity_delta = 0 then raise exception 'quantity_delta_must_not_be_zero'; end if;
  if _movement_type not in ('opening','entry','sale','adjustment','return','cancellation') then raise exception 'invalid_movement_type'; end if;
  if length(btrim(coalesce(_reason,''))) < 3 then raise exception 'reason_required'; end if;

  select * into _product from public.erp_products where id = _product_id for update;
  if not found then raise exception 'product_not_found'; end if;
  if _product.stock_on_hand + _quantity_delta < 0 then raise exception 'insufficient_stock'; end if;

  update public.erp_products set stock_on_hand = stock_on_hand + _quantity_delta where id = _product_id returning * into _product;

  insert into public.erp_inventory_movements(product_id,movement_type,quantity_delta,balance_after,reason,reference_type,reference_id,actor_id)
  values (_product_id,_movement_type,_quantity_delta,_product.stock_on_hand,btrim(_reason),nullif(btrim(_reference_type),''),nullif(btrim(_reference_id),''),_actor_id)
  returning * into _movement;

  return _movement;
end;
$$;
revoke all on function private.adjust_erp_inventory(uuid,integer,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function private.adjust_erp_inventory(uuid,integer,text,text,text,text,uuid) to service_role;

comment on table public.erp_products is 'Internal SW Sports ERP product master. Inventory writes are server-only.';
comment on table public.erp_inventory_movements is 'Immutable-style audit history for SW Sports ERP stock movements.';
comment on function private.adjust_erp_inventory(uuid,integer,text,text,text,text,uuid) is 'Atomic server-only inventory adjustment with row locking and audit movement.';
