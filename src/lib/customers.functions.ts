import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderTotal, record, text } from "@/lib/sales";

export type CustomerSummary = {
  key: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  city: string;
  state: string;
  orders: number;
  paidOrders: number;
  paidTotalCents: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export const getCustomersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");

    const result = await context.supabase
      .from("shipping_orders")
      .select("id,created_at,customer_id,delivery_address,subtotal_cents,discount_cents,freight_cents,payment_status")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (result.error) throw new Error("Não foi possível carregar os clientes.");

    const customers = new Map<string, CustomerSummary>();
    for (const order of result.data ?? []) {
      const address = record(order.delivery_address ?? undefined);
      const name = text(address["name"]).trim();
      const email = text(address["email"]).trim().toLowerCase();
      const phone = text(address["phone"]).replace(/\D/g, "");
      const document = text(address["document"]).replace(/\D/g, "");
      const city = text(address["city"]).trim();
      const state = text(address["state"]).trim();
      const key = document ? `doc:${document}` : email ? `email:${email}` : phone ? `phone:${phone}` : order.customer_id ? `customer:${order.customer_id}` : `order:${order.id}`;
      const current = customers.get(key);
      const paid = order.payment_status === "approved";
      const total = paid ? orderTotal(order) : 0;
      if (!current) {
        customers.set(key, {
          key, name: name || "Cliente não identificado", email, phone, document, city, state,
          orders: 1, paidOrders: paid ? 1 : 0, paidTotalCents: total,
          firstOrderAt: order.created_at, lastOrderAt: order.created_at,
        });
        continue;
      }
      current.orders += 1;
      current.paidOrders += paid ? 1 : 0;
      current.paidTotalCents += total;
      if (order.created_at < current.firstOrderAt) current.firstOrderAt = order.created_at;
      if (order.created_at > current.lastOrderAt) current.lastOrderAt = order.created_at;
      if (!current.name || current.name === "Cliente não identificado") current.name = name || current.name;
      if (!current.email) current.email = email;
      if (!current.phone) current.phone = phone;
      if (!current.document) current.document = document;
      if (!current.city) current.city = city;
      if (!current.state) current.state = state;
    }

    const rows = [...customers.values()].sort((a, b) => b.paidTotalCents - a.paidTotalCents || b.lastOrderAt.localeCompare(a.lastOrderAt));
    return {
      customers: rows,
      totals: {
        customers: rows.length,
        recurring: rows.filter((customer) => customer.orders > 1).length,
        paidRevenueCents: rows.reduce((sum, customer) => sum + customer.paidTotalCents, 0),
        paidOrders: rows.reduce((sum, customer) => sum + customer.paidOrders, 0),
      },
      capped: (result.data?.length ?? 0) === 5000,
    };
  });
