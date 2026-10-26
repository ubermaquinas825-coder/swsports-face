import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { melhorEnvioConnectionStatus } from "./melhor-envio.server";
import { isFinancialMaintenanceEnabled } from "./financial-maintenance.server";
import { orderTotal } from "./sales";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function quantity(item: JsonRecord) {
  for (const key of ["qty", "quantity", "quantidade"]) {
    const value = Number(item[key]);
    if (Number.isFinite(value) && value > 0) return Math.floor(value);
  }
  return 0;
}
function unitPrice(item: JsonRecord) {
  for (const key of ["unit_price_cents", "unitPriceCents"]) {
    const value = Number(item[key]);
    if (Number.isInteger(value) && value >= 0) return value;
  }
  return 0;
}
function productKey(item: JsonRecord) {
  return text(item["id"]) || text(item["slug"]) || text(item["product_slug"]) || text(item["name"]) || "produto";
}
function productName(item: JsonRecord) {
  return text(item["name"]) || text(item["product_name"]) || productKey(item);
}
function customerKey(addressValue: unknown) {
  const address = record(addressValue);
  const email = text(address["email"]).toLocaleLowerCase("pt-BR");
  if (email) return `email:${email}`;
  const phone = text(address["phone"]).replace(/\D/g, "");
  return phone ? `phone:${phone}` : null;
}

export const getManagementReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");

    const [ordersResult, productsResult, settingsResult, connection] = await Promise.all([
      context.supabase
        .from("shipping_orders")
        .select("id,created_at,delivery_address,items,subtotal_cents,discount_cents,freight_cents,payment_status,shipping_status,tracking_code,provider_shipment_id")
        .order("created_at", { ascending: false })
        .limit(5000),
      context.supabase
        .from("erp_products")
        .select("id,sku,slug,name,status,stock_on_hand,minimum_stock")
        .eq("status", "active")
        .order("name"),
      context.supabase.from("shipping_settings").select("id").eq("id", true).maybeSingle(),
      melhorEnvioConnectionStatus().catch(() => ({ connected: false as const, environment: "production" })),
    ]);
    if (ordersResult.error) throw new Error("Não foi possível carregar os pedidos para os relatórios.");
    if (productsResult.error) throw new Error("Não foi possível carregar o estoque para os relatórios.");
    if (settingsResult.error) throw new Error("Não foi possível verificar a configuração logística.");

    const orders = ordersResult.data ?? [];
    const products = productsResult.data ?? [];
    const customers = new Map<string, number>();
    const topProducts = new Map<string, { key: string; name: string; units: number; revenueCents: number }>();
    let paidOrders = 0;
    let pendingOrders = 0;
    let paidRevenueCents = 0;
    let unitsSold = 0;

    const logistics = {
      awaitingPreparation: 0,
      awaitingLabelPayment: 0,
      awaitingLabel: 0,
      readyToPost: 0,
      posted: 0,
      delivered: 0,
      logisticsFailed: 0,
      postedWithoutTracking: 0,
    };

    for (const order of orders) {
      if (order.payment_status === "pending") pendingOrders += 1;
      const key = customerKey(order.delivery_address);
      if (key) customers.set(key, (customers.get(key) ?? 0) + 1);

      if (order.payment_status === "approved") {
        paidOrders += 1;
        paidRevenueCents += orderTotal(order);
        const items = Array.isArray(order.items) ? order.items : [];
        for (const raw of items) {
          const item = record(raw);
          const qty = quantity(item);
          if (!qty) continue;
          unitsSold += qty;
          const key = productKey(item);
          const current = topProducts.get(key) ?? { key, name: productName(item), units: 0, revenueCents: 0 };
          current.units += qty;
          current.revenueCents += qty * unitPrice(item);
          topProducts.set(key, current);
        }
      }

      if (order.payment_status === "approved" && order.shipping_status === "awaiting_payment") logistics.awaitingPreparation += 1;
      if (order.shipping_status === "awaiting_label_payment") logistics.awaitingLabelPayment += 1;
      if (["awaiting_label", "label_issued"].includes(order.shipping_status)) logistics.awaitingLabel += 1;
      if (order.shipping_status === "ready_to_post") logistics.readyToPost += 1;
      if (order.shipping_status === "posted") logistics.posted += 1;
      if (order.shipping_status === "delivered") logistics.delivered += 1;
      if (order.shipping_status === "logistics_failed") logistics.logisticsFailed += 1;
      if (order.shipping_status === "posted" && !order.tracking_code) logistics.postedWithoutTracking += 1;
    }

    const lowStock = products
      .filter((product) => product.stock_on_hand <= product.minimum_stock)
      .map((product) => ({
        sku: product.sku,
        name: product.name,
        stockOnHand: product.stock_on_hand,
        minimumStock: product.minimum_stock,
      }));

    const maintenanceEnabled = isFinancialMaintenanceEnabled();
    const health = {
      melhorEnvioConnected: connection.connected,
      mercadoPagoConfigured: Boolean(process.env["MERCADOPAGO_ACCESS_TOKEN"] && process.env["MERCADOPAGO_WEBHOOK_SECRET"]),
      cronConfigured: Boolean(process.env["CRON_SECRET"] && process.env["CRON_SECRET"]!.length >= 32),
      shippingConfigured: Boolean(settingsResult.data),
      inventoryConfigured: products.length > 0,
      maintenanceEnabled,
    };

    return {
      totals: {
        totalOrders: orders.length,
        paidOrders,
        pendingOrders,
        paidRevenueCents,
        averageTicketCents: paidOrders ? Math.round(paidRevenueCents / paidOrders) : 0,
        unitsSold,
        uniqueCustomers: customers.size,
        repeatCustomers: [...customers.values()].filter((count) => count > 1).length,
      },
      logistics,
      topProducts: [...topProducts.values()].sort((a, b) => b.units - a.units || b.revenueCents - a.revenueCents).slice(0, 10),
      lowStock,
      health: {
        ...health,
        operationalReady:
          health.melhorEnvioConnected &&
          health.mercadoPagoConfigured &&
          health.cronConfigured &&
          health.shippingConfigured &&
          health.inventoryConfigured &&
          !health.maintenanceEnabled,
      },
      capped: orders.length === 5000,
    };
  });
