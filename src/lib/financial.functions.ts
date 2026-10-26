import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderTotal } from "@/lib/sales";

type ItemRecord = Record<string, unknown>;

function itemText(item: ItemRecord, keys: string[]) {
  for (const key of keys) if (typeof item[key] === "string" && String(item[key]).trim()) return String(item[key]).trim();
  return "";
}
function itemQuantity(item: ItemRecord) {
  for (const key of ["quantity", "qty", "quantidade"]) {
    const value = Number(item[key]);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}
function itemUnitPrice(item: ItemRecord) {
  for (const key of ["unit_price_cents", "unitPriceCents"]) {
    const value = Number(item[key]);
    if (Number.isInteger(value) && value >= 0) return value;
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

    const ordersResult = await context.supabase
      .from("shipping_orders")
      .select("id,created_at,items,subtotal_cents,discount_cents,freight_cents,payment_status")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (ordersResult.error) throw new Error("Não foi possível carregar os dados financeiros.");

    const monthly = new Map<string, { month: string; orders: number; revenueCents: number; units: number }>();
    const byProduct = new Map<string, { slug: string; name: string; units: number; revenueCents: number }>();
    let paidOrders = 0;
    let revenueCents = 0;
    let units = 0;

    for (const order of ordersResult.data ?? []) {
      if (order.payment_status !== "approved") continue;
      paidOrders += 1;
      const revenue = orderTotal(order);
      revenueCents += revenue;
      let orderUnits = 0;
      const items = Array.isArray(order.items) ? order.items : [];
      for (const raw of items) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const item = raw as ItemRecord;
        const slug = itemText(item, ["slug", "product_slug", "productSlug", "id"]);
        const name = itemText(item, ["name", "product_name", "productName"]) || slug || "Produto";
        const quantity = itemQuantity(item);
        if (!quantity) continue;
        const productKey = slug || name;
        const lineRevenue = itemUnitPrice(item) * quantity;
        orderUnits += quantity;
        units += quantity;
        const current = byProduct.get(productKey) ?? { slug: productKey, name, units: 0, revenueCents: 0 };
        current.units += quantity;
        current.revenueCents += lineRevenue;
        byProduct.set(productKey, current);
      }
      const key = monthKey(order.created_at);
      const current = monthly.get(key) ?? { month: key, orders: 0, revenueCents: 0, units: 0 };
      current.orders += 1;
      current.revenueCents += revenue;
      current.units += orderUnits;
      monthly.set(key, current);
    }

    return {
      totals: {
        paidOrders,
        revenueCents,
        averageTicketCents: paidOrders ? Math.round(revenueCents / paidOrders) : 0,
        units,
      },
      monthly: [...monthly.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12),
      products: [...byProduct.values()].sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents),
      capped: (ordersResult.data?.length ?? 0) === 5000,
    };
  });
