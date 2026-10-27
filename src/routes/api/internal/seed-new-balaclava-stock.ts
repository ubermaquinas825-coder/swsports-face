import { createFileRoute } from "@tanstack/react-router";
import { productFor, UNIT_PRICE } from "@/lib/products";

const TARGET_STOCK = 2000;
const SEED_REFERENCE_TYPE = "production_stock_seed";
const SEED_REFERENCE_ID = "new-balaclavas-2000-2026-10-27";

const targets = [
  { slug: "sorriso-grisalho", sku: "SW-BAL-007" },
  { slug: "grisalho-com-charuto", sku: "SW-BAL-008" },
  { slug: "bigodudo-irreverente", sku: "SW-BAL-009" },
  { slug: "sorriso-rebelde", sku: "SW-BAL-010" },
  { slug: "bigode-branco", sku: "SW-BAL-011" },
  { slug: "grisalho-sorridente", sku: "SW-BAL-012" },
] as const;

type ProductRow = {
  id: string;
  sku: string;
  slug: string | null;
  stock_on_hand: number;
};

async function handleSeed({ request }: { request: Request }) {
  const expectedToken = process.env["PRODUCTION_STOCK_SEED_TOKEN"];
  const suppliedToken = request.headers.get("x-stock-seed-token");

  if (!expectedToken || suppliedToken !== expectedToken) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (process.env["VERCEL_ENV"] !== "production") {
    return Response.json({ ok: false, error: "production_only" }, { status: 409 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const slugs = targets.map((target) => target.slug);
  const skus = targets.map((target) => target.sku);

  const [existingBySlugResult, existingBySkuResult] = await Promise.all([
    supabaseAdmin.from("erp_products").select("id,sku,slug,stock_on_hand").in("slug", slugs),
    supabaseAdmin.from("erp_products").select("id,sku,slug,stock_on_hand").in("sku", skus),
  ]);

  if (existingBySlugResult.error || existingBySkuResult.error) {
    return Response.json({ ok: false, error: "inventory_read_failed" }, { status: 500 });
  }

  const bySlug = new Map(
    ((existingBySlugResult.data ?? []) as ProductRow[]).map((row) => [row.slug, row]),
  );
  const bySku = new Map(
    ((existingBySkuResult.data ?? []) as ProductRow[]).map((row) => [row.sku, row]),
  );

  for (const target of targets) {
    const slugRow = bySlug.get(target.slug);
    const skuRow = bySku.get(target.sku);
    if (!slugRow && skuRow && skuRow.slug !== target.slug) {
      return Response.json(
        { ok: false, error: "sku_conflict", sku: target.sku },
        { status: 409 },
      );
    }
  }

  const results: Array<{ slug: string; sku: string; stock: number; created: boolean }> = [];

  for (const target of targets) {
    let row = bySlug.get(target.slug);
    let created = false;

    if (!row) {
      const catalogProduct = productFor(target.slug);
      if (!catalogProduct) {
        return Response.json({ ok: false, error: "catalog_product_missing", slug: target.slug }, { status: 500 });
      }

      const inserted = await supabaseAdmin
        .from("erp_products")
        .insert({
          sku: target.sku,
          slug: target.slug,
          name: catalogProduct.name,
          description: catalogProduct.description,
          status: "active",
          sale_price_cents: Math.round(UNIT_PRICE * 100),
          cost_price_cents: 0,
          minimum_stock: 0,
          stock_on_hand: 0,
        })
        .select("id,sku,slug,stock_on_hand")
        .single();

      if (inserted.error || !inserted.data) {
        return Response.json({ ok: false, error: "product_create_failed", slug: target.slug }, { status: 500 });
      }
      row = inserted.data as ProductRow;
      created = true;
    }

    const seedMovement = await supabaseAdmin
      .from("erp_inventory_movements")
      .select("id,balance_after")
      .eq("product_id", row.id)
      .eq("movement_type", "adjustment")
      .eq("reference_type", SEED_REFERENCE_TYPE)
      .eq("reference_id", SEED_REFERENCE_ID)
      .maybeSingle();

    if (seedMovement.error) {
      return Response.json({ ok: false, error: "movement_read_failed", slug: target.slug }, { status: 500 });
    }

    if (!seedMovement.data && row.stock_on_hand !== TARGET_STOCK) {
      const delta = TARGET_STOCK - row.stock_on_hand;
      const movement = await supabaseAdmin.from("erp_inventory_movements").insert({
        product_id: row.id,
        movement_type: "adjustment",
        quantity_delta: delta,
        balance_after: TARGET_STOCK,
        reason: "Carga inicial autorizada pelo proprietário: 2.000 unidades para novo modelo.",
        reference_type: SEED_REFERENCE_TYPE,
        reference_id: SEED_REFERENCE_ID,
        actor_id: null,
      });
      if (movement.error) {
        return Response.json({ ok: false, error: "movement_create_failed", slug: target.slug }, { status: 500 });
      }
    }

    if (row.stock_on_hand !== TARGET_STOCK) {
      const updated = await supabaseAdmin
        .from("erp_products")
        .update({ stock_on_hand: TARGET_STOCK })
        .eq("id", row.id)
        .select("id,sku,slug,stock_on_hand")
        .single();
      if (updated.error || !updated.data) {
        return Response.json({ ok: false, error: "stock_update_failed", slug: target.slug }, { status: 500 });
      }
      row = updated.data as ProductRow;
    }

    results.push({ slug: target.slug, sku: row.sku, stock: row.stock_on_hand, created });
  }

  const verify = await supabaseAdmin
    .from("erp_products")
    .select("slug,sku,stock_on_hand")
    .in("slug", slugs)
    .order("slug");

  if (verify.error || (verify.data?.length ?? 0) !== targets.length) {
    return Response.json({ ok: false, error: "verification_failed" }, { status: 500 });
  }
  if ((verify.data ?? []).some((row) => row.stock_on_hand !== TARGET_STOCK)) {
    return Response.json({ ok: false, error: "verification_stock_mismatch" }, { status: 500 });
  }

  return Response.json({ ok: true, targetStock: TARGET_STOCK, products: results }, { status: 200 });
}

export const Route = createFileRoute("/api/internal/seed-new-balaclava-stock")({
  server: { handlers: { POST: handleSeed } },
});
