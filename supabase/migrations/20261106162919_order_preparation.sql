create table public.order_preparation (
  order_id uuid primary key references public.shipping_orders(id) on delete cascade,
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);
alter table public.order_preparation enable row level security;
revoke all on public.order_preparation from public, anon, authenticated;
grant select, insert, update on public.order_preparation to authenticated;
create policy order_preparation_admin_read on public.order_preparation
for select to authenticated using (public.has_role((select auth.uid()), 'admin'));
create policy order_preparation_admin_insert on public.order_preparation
for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin') and updated_by = (select auth.uid())
);
create policy order_preparation_admin_update on public.order_preparation
for update to authenticated using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin') and updated_by = (select auth.uid()));
