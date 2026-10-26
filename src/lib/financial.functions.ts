import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderTotal } from "@/lib/sales";

type ProductCost = { slug: string; name: string; cost_price_cents: number };
type ItemRecord = Record<string, unknown>;

function itemText(item: ItemRecord, keys: string[]) {
  for (const key of keys) if (typeof item[key] === "string") return String(item[key]);
  return "";
}
function itemQuantity(item: ItemRecord) {
  for (const key of ["quantity", "qty", "quantidade"]) {
    const value = Number(item[key]);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}
function monthKey(value: string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const getFinancialAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");

    const [ordersResult, productsResult] = await Promise.all([
      context.supabase.from("shipping_orders")
        .select("id,created_at,items,subtotal_cents,discount_cents,freight_cents,payment_status")
        .order("created_at", { ascending: false }).limit(5000),
      context.supabase.from("erp_products").select("slug,name,cost_price_cents").eq("status", "active"),
    ]);
    if (ordersResult.error) throw new Error("Não foi possível carregar os dados financeiros.");
    if (productsResult.error) throw new Error("Não foi possível carregar os custos dos produtos.");

    const products = (productsResult.data ?? []) as ProductCost[];
    const costBySlug = new Map(products.map((p) => [p.slug, p.cost_price_cents]));
    const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));
    const monthly = new Map<string, { month: string; orders: number; revenueCents: number; productCostCents: number; units: number }>();
    const byProduct = new Map<string, { slug: string; name: string; units: number; productCostCents: number }>();
    let paidOrders = 0, revenueCents = 0, productCostCents = 0, units = 0, unknownCostUnits = 0;

    for (const order of ordersResult.data ?? []) {
      if (order.payment_status !== "approved") continue;
      paidOrders += 1;
      const revenue = orderTotal(order);
      revenueCents += revenue;
      let orderCost = 0, orderUnits = 0;
      const items = Array.isArray(order.items) ? order.items : [];
      for (const raw of items) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const item = raw as ItemRecord;
        const slug = itemText(item, ["slug", "product_slug", "productSlug", "id"]);
        const quantity = itemQuantity(item);
        if (!quantity) continue;
        orderUnits += quantity; units += quantity;
        const cost = slug ? costBySlug.get(slug) : undefined;
        if (cost === undefined) { unknownCostUnits += quantity; continue; }
        const itemCost = cost * quantity;
        orderCost += itemCost; productCostCents += itemCost;
        const current = byProduct.get(slug) ?? { slug, name: nameBySlug.get(slug) ?? slug, units: 0, productCostCents: 0 };
        current.units += quantity; current.productCostCents += itemCost; byProduct.set(slug, current);
      }
      const key = monthKey(order.created_at);
      const current = monthly.get(key) ?? { month: key, orders: 0, revenueCents: 0, productCostCents: 0, units: 0 };
      current.orders += 1; current.revenueCents += revenue; current.productCostCents += orderCost; current.units += orderUnits; monthly.set(key, current);
    }

    return {
      totals: { paidOrders, revenueCents, averageTicketCents: paidOrders ? Math.round(revenueCents / paidOrders) : 0, productCostCents, grossMarginCents: revenueCents - productCostCents, units, unknownCostUnits },
      monthly: [...monthly.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12),
      products: [...byProduct.values()].sort((a, b) => b.units - a.units),
      costCoverageComplete: unknownCostUnits === 0 && products.every((p) => p.cost_price_cents > 0),
      capped: (ordersResult.data?.length ?? 0) === 5000,
    };
  });
