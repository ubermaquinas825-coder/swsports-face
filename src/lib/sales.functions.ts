import { manualShippingHold } from "./manual-shipping-eligibility";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSalesAdmin = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ page: z.number().int().min(0).max(100000), view: z.enum(["all", "pending", "shipping"]).default("all") }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");
    // Explicit projection excludes internal leases, export tokens and provider payloads.
    let query = context.supabase
      .from("shipping_orders")
      .select(
        "id,created_at,delivery_address,items,subtotal_cents,discount_cents,freight_cents,payment_status,payment_link_id,provider_payment_id,appmax_payment_verified_at,shipping_service,shipping_status,tracking_code,provider_shipment_id,quoted_cep,bling_sync_status,bling_sync_error",
        { count: "exact" },
      );
    if (data.view === "pending") query = query.eq("payment_status", "pending");
    if (data.view === "shipping") query = query.eq("payment_status", "approved").in("shipping_status", ["awaiting_payment", "awaiting_label", "awaiting_label_payment"]);
    const result = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(data.page * 50, data.page * 50 + 49);
    if (result.error) throw new Error("Não foi possível carregar os pedidos. Tente novamente.");
    return {
      orders: (result.data ?? []).map((order) => {
        const {
          bling_sync_status: _legacyStatus,
          bling_sync_error: _legacyError,
          ...publicOrder
        } = order;
        return { ...publicOrder, shipping_hold: manualShippingHold(order) };
      }),
      count: result.count ?? 0,
    };
  });
