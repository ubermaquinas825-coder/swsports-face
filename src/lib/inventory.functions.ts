import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productSchema = z.object({
  sku: z.string().trim().min(2).max(64),
  slug: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().default(""),
  salePriceCents: z.number().int().min(0).max(100_000_000),
  costPriceCents: z.number().int().min(0).max(100_000_000).default(0),
  minimumStock: z.number().int().min(0).max(1_000_000).default(0),
});

async function requireAdmin(context: any) {
  const role = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");
}

export const getInventoryAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const [products, movements] = await Promise.all([
      context.supabase
        .from("erp_products")
        .select("id,sku,slug,name,description,status,cost_price_cents,sale_price_cents,stock_on_hand,minimum_stock,created_at,updated_at")
        .order("name", { ascending: true }),
      context.supabase
        .from("erp_inventory_movements")
        .select("id,product_id,movement_type,quantity_delta,balance_after,reason,reference_type,reference_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (products.error || movements.error) throw new Error("Não foi possível carregar o estoque.");
    return { products: products.data ?? [], movements: movements.data ?? [] };
  });

export const createInventoryProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const result = await context.supabase.from("erp_products").insert({
      sku: data.sku.toUpperCase(),
      slug: data.slug.toLowerCase(),
      name: data.name,
      description: data.description || null,
      sale_price_cents: data.salePriceCents,
      cost_price_cents: data.costPriceCents,
      minimum_stock: data.minimumStock,
      stock_on_hand: 0,
    }).select("id").single();
    if (result.error) throw new Error("Não foi possível cadastrar o produto. Verifique SKU e identificador.");
    return { id: result.data.id };
  });
