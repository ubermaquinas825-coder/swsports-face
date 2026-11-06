-- Owner-confirmed launch data: 1,000 units shared across sizes per reference,
-- 180 g per shirt (without packaging), same measured packages as the store.
-- Run only against the inspected SW Sports database. Existing products and
-- balances are never reset; opening movements remain in the audit ledger.
begin;

do $$
declare
  _reference text;
  _product_id uuid;
  _config jsonb;
  _packages jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('swsports-shirt-catalog-launch'));

  select config into _config from public.shipping_settings where id = true for update;
  if not found then raise exception 'shipping_settings_missing'; end if;
  if (_config->>'productWeightKg')::numeric is distinct from 0.1 then
    raise exception 'balaclava_weight_changed_review_before_launch';
  end if;
  _packages := _config->'packages';
  if jsonb_typeof(_packages) is distinct from 'array' or jsonb_array_length(_packages) <> 2 then
    raise exception 'shipping_packages_changed_review_before_launch';
  end if;
  if (select count(distinct (p->>'capacity')::integer) from jsonb_array_elements(_packages) p) <> 2 then
    raise exception 'shipping_package_capacities_changed_review_before_launch';
  end if;
  if exists (
    select 1 from jsonb_array_elements(_packages) p
    where (p->>'lengthCm')::numeric is distinct from 22
       or (p->>'widthCm')::numeric is distinct from 15
       or (p->>'heightCm')::numeric is distinct from 10
       or (p->>'packagingWeightKg')::numeric is distinct from 0.005
       or (p->>'capacity')::integer not in (1, 10)
  ) then
    raise exception 'shipping_package_measurements_changed_review_before_launch';
  end if;

  foreach _reference in array array['01','02','03'] loop
    _product_id := null;
    insert into public.erp_products (sku, slug, name, description, sale_price_cents, weight_grams, image_url)
    values (
      'SW-CAM-IF-' || _reference,
      'camisa-ifood-ref-' || _reference,
      'Camisa iFood Entregador — Ref. ' || _reference,
      'Manga longa, tecido DrySport e proteção UV 50+. Estoque compartilhado entre tamanhos.',
      7990, 180,
      '/products/camisetas/ref-' || _reference || '-frente.png'
    )
    on conflict (slug) do nothing
    returning id into _product_id;

    if _product_id is not null then
      perform private.adjust_erp_inventory(
        _product_id, 1000, 'opening',
        'Estoque inicial compartilhado por modelo autorizado pelo proprietário em 05/11/2026.',
        'catalog_initialization', 'camisetas-ifood-20261105', null
      );
    end if;
  end loop;

  -- Preserve every other setting; only add the explicitly authorized apparel rule.
  update public.shipping_settings
  set config = jsonb_set(_config, '{apparelShipping}', jsonb_build_object(
    'productWeightKg', 0.18,
    'packages', _packages
  ), true), updated_at = now()
  where id = true;
end;
$$;

select slug, stock_on_hand, sale_price_cents, weight_grams
from public.erp_products where slug in ('camisa-ifood-ref-01','camisa-ifood-ref-02','camisa-ifood-ref-03')
order by slug;

commit;
