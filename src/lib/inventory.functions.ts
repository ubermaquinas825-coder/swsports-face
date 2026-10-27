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

const adjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0),
  movementType: z.enum(["opening", "entry", "sale", "adjustment", "return", "cancellation"]),
  reason: z.string().trim().min(3).max(500),
});

async function requireAdmin(context: any) {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");
}

async function requireWritableEnvironment() {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
}

export const getInventoryAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireAdmin(context);
  const [products, movements] = await Promise.all([
    context.supabase.from("erp_products").select("id,sku,slug,name,description,status,cost_price_cents,sale_price_cents,stock_on_hand,minimum_stock,created_at,updated_at").order("name"),
    context.supabase.from("erp_inventory_movements").select("id,product_id,movement_type,quantity_delta,balance_after,reason,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (products.error || movements.error) throw new Error("Não foi possível carregar o estoque.");
  return { products: products.data ?? [], movements: movements.data ?? [] };
});

export const createInventoryProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => productSchema.parse(input)).handler(async ({ context, data }) => {
  await requireWritableEnvironment();
  await requireAdmin(context);
  const result = await context.supabase.rpc("erp_admin_create_product", {
    _sku: data.sku, _slug: data.slug, _name: data.name, _description: data.description,
    _sale_price_cents: data.salePriceCents, _cost_price_cents: data.costPriceCents, _minimum_stock: data.minimumStock,
  });
  if (result.error) throw new Error("Não foi possível cadastrar o produto. Verifique SKU e identificador.");
  return { id: result.data };
});

export const adjustInventoryAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => adjustmentSchema.parse(input)).handler(async ({ context, data }) => {
  await requireWritableEnvironment();
  await requireAdmin(context);
  const result = await context.supabase.rpc("erp_admin_adjust_inventory", {
    _product_id: data.productId, _quantity_delta: data.quantityDelta, _movement_type: data.movementType, _reason: data.reason,
  });
  if (result.error) throw new Error(result.error.message.includes("insufficient_stock") ? "Estoque insuficiente para esta saída." : "Não foi possível movimentar o estoque.");
  return result.data;
});
