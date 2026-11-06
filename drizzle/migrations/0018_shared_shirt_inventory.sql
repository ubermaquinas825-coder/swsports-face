-- Shirt sizes remain distinct order SKUs while sharing one stock balance per
-- model. This changes no balances and performs no provider/network operations.
create or replace function private.apply_paid_order_inventory(_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  _order public.shipping_orders;
  _line jsonb;
  _product public.erp_products;
  _id text;
  _slug text;
  _qty_text text;
  _qty bigint;
  _total bigint;
  _totals jsonb := '{}'::jsonb;
  _missing_slug text;
  _locked_count integer := 0;
begin
  select * into _order
  from public.shipping_orders
  where id = _order_id
  for update;

  if not found then raise exception 'order_not_found'; end if;
  if _order.payment_status <> 'approved'
     or nullif(btrim(_order.provider_payment_id), '') is null then
    raise exception 'payment_not_approved';
  end if;

  -- The order lock serializes callbacks. Every product movement is committed in
  -- the same transaction, so a prior movement means the whole debit completed.
  if exists (
    select 1 from public.erp_inventory_movements
    where reference_type = 'paid_order' and reference_id = _order_id::text
  ) then
    return false;
  end if;

  if jsonb_typeof(_order.items) is distinct from 'array' then
    raise exception 'order_items_invalid';
  end if;
  if jsonb_array_length(_order.items) = 0 then
    raise exception 'order_items_invalid';
  end if;

  -- Validate every line before locking/debiting stock. Only an explicit shirt
  -- variant can point at one of the three shared shirt inventory products.
  for _line in select value from jsonb_array_elements(_order.items)
  loop
    if jsonb_typeof(_line) is distinct from 'object'
       or jsonb_typeof(_line->'id') is distinct from 'string' then
      raise exception 'order_item_invalid';
    end if;
    -- Existing order snapshots allowed integer strings through ->> and regex.
    -- Preserve that historical representation only for literal-ID legacy lines;
    -- new shared-stock snapshots always use validated JSON integer numbers.
    if jsonb_typeof(_line->'qty') is distinct from 'number'
       and ((_line ? 'inventory_slug') or jsonb_typeof(_line->'qty') is distinct from 'string') then
      raise exception 'order_item_invalid';
    end if;
    _id := _line->>'id';
    _qty_text := _line->>'qty';
    if length(_id) = 0 or length(_id) > 100 or _id <> btrim(_id)
       or length(_qty_text) > 10 or _qty_text !~ '^[1-9][0-9]*$' then
      raise exception 'order_item_invalid';
    end if;
    -- Ten decimal digits fit bigint; reject values outside the stock column's
    -- integer range before any integer cast or cumulative addition.
    _qty := _qty_text::bigint;
    if _qty > 2147483647 then raise exception 'order_quantity_overflow'; end if;

    if _line ? 'inventory_slug' then
      if jsonb_typeof(_line->'inventory_slug') is distinct from 'string' then
        raise exception 'inventory_mapping_invalid';
      end if;
      _slug := _line->>'inventory_slug';
      if _slug in ('camisa-ifood-ref-01', 'camisa-ifood-ref-02') then
        if _id !~ ('^' || _slug || '-(pp|p|m|g|gg|xg|xgg)$') then
          raise exception 'inventory_mapping_invalid';
        end if;
      elsif _slug = 'camisa-ifood-ref-03' then
        if _id !~ '^camisa-ifood-ref-03-(p|m|g|gg|xg|xgg)$' then
          raise exception 'inventory_mapping_invalid';
        end if;
      else
        raise exception 'inventory_mapping_invalid';
      end if;
    else
      -- Legacy balaclavas retain the original literal ID lookup. A shirt SKU
      -- without the new field can still address an old per-size stock record,
      -- but an unsized/unknown shirt can never debit a shared model implicitly.
      _slug := _id;
      if _id like 'camisa-ifood-ref-%'
         and _id !~ '^camisa-ifood-ref-((01|02)-(pp|p|m|g|gg|xg|xgg)|03-(p|m|g|gg|xg|xgg))$' then
        raise exception 'inventory_mapping_invalid';
      end if;
    end if;

    _total := coalesce((_totals->>_slug)::bigint, 0) + _qty;
    if _total > 2147483647 then raise exception 'order_quantity_overflow'; end if;
    _totals := jsonb_set(_totals, array[_slug], to_jsonb(_total), true);
  end loop;

  -- Multiple sizes of one model are grouped before locking. Lock every matched
  -- product in the same UUID order and verify all balances before any mutation.
  for _product in
    select p.*
    from public.erp_products p
    join jsonb_each_text(_totals) t on t.key = p.slug
    order by p.id
    for update of p
  loop
    _locked_count := _locked_count + 1;
    if _product.stock_on_hand < (_totals->>_product.slug)::bigint then
      raise exception 'insufficient_stock:%', _product.slug;
    end if;
  end loop;

  if _locked_count <> (select count(*) from jsonb_each_text(_totals)) then
    select t.key into _missing_slug
    from jsonb_each_text(_totals) t
    left join public.erp_products p on p.slug = t.key
    where p.id is null
    order by t.key
    limit 1;
    -- A row inserted between commands also requires a retry: it was not part
    -- of the stable lock set acquired above.
    raise exception 'erp_product_not_found:%', coalesce(_missing_slug, 'catalog_changed_retry');
  end if;

  for _product in
    select p.*
    from public.erp_products p
    join jsonb_each_text(_totals) t on t.key = p.slug
    order by p.id
  loop
    perform private.adjust_erp_inventory(
      _product.id,
      -((_totals->>_product.slug)::integer),
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

-- Preserve the existing server-only public wrapper and hardened access policy.
revoke all on function private.apply_paid_order_inventory(uuid) from public, anon, authenticated;
grant execute on function private.apply_paid_order_inventory(uuid) to service_role;
revoke all on function public.apply_paid_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.apply_paid_order_inventory(uuid) to service_role;

comment on function private.apply_paid_order_inventory(uuid) is
  'Atomically debits each stock product once per verified paid order; shirt size variants share an explicitly validated model balance.';
