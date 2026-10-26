-- Idempotent inventory deduction for confirmed paid orders.
-- Server-only: payment provider reconciliation calls this after independently verifying payment.

create or replace function private.apply_paid_order_inventory(_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _order public.shipping_orders;
  _line jsonb;
  _product public.erp_products;
  _slug text;
  _qty integer;
begin
  select * into _order
  from public.shipping_orders
  where id = _order_id
  for update;

  if not found then raise exception 'order_not_found'; end if;
  if _order.payment_status <> 'approved' or _order.provider_payment_id is null then
    raise exception 'payment_not_approved';
  end if;

  -- One sale movement per order/product makes retries harmless.
  if exists (
    select 1 from public.erp_inventory_movements
    where reference_type = 'paid_order' and reference_id = _order_id::text
  ) then
    return false;
  end if;

  if jsonb_typeof(_order.items) <> 'array' or jsonb_array_length(_order.items) = 0 then
    raise exception 'order_items_invalid';
  end if;

  -- Lock all referenced products in stable order before changing any balance.
  for _product in
    select p.*
    from public.erp_products p
    join (
      select distinct elem->>'id' as slug
      from jsonb_array_elements(_order.items) elem
    ) x on x.slug = p.slug
    order by p.id
    for update of p
  loop
    null;
  end loop;

  for _line in select value from jsonb_array_elements(_order.items)
  loop
    _slug := nullif(btrim(_line->>'id'), '');
    if _slug is null or coalesce(_line->>'qty','') !~ '^[1-9][0-9]*$' then
      raise exception 'order_item_invalid';
    end if;
    _qty := (_line->>'qty')::integer;

    select * into _product from public.erp_products where slug = _slug for update;
    if not found then raise exception 'erp_product_not_found:%', _slug; end if;
    if _product.stock_on_hand < _qty then raise exception 'insufficient_stock:%', _slug; end if;

    perform private.adjust_erp_inventory(
      _product.id,
      -_qty,
      'sale',
      'Baixa automática por pedido pago ' || _order_id::text,
      'paid_order',
      _order_id::text,
      null
    );
  end loop;

  return true;
end;
$$;

revoke all on function private.apply_paid_order_inventory(uuid) from public, anon, authenticated;
grant execute on function private.apply_paid_order_inventory(uuid) to service_role;

create or replace function public.apply_paid_order_inventory(_order_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.apply_paid_order_inventory(_order_id);
$$;

revoke all on function public.apply_paid_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.apply_paid_order_inventory(uuid) to service_role;

comment on function private.apply_paid_order_inventory(uuid) is 'Atomically deducts ERP stock once for an already-approved order.';
comment on function public.apply_paid_order_inventory(uuid) is 'Server-only wrapper for idempotent paid-order inventory deduction.';