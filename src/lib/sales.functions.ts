import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSalesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ page: z.number().int().min(0).max(100000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (role.error || !role.data) throw new Error("Acesso exclusivo para administradores.");
    // Explicit projection excludes internal leases, export tokens and provider payloads.
    const result = await context.supabase
      .from("shipping_orders")
      .select(
        "id,created_at,delivery_address,items,subtotal_cents,discount_cents,freight_cents,payment_status,payment_link_id,provider_payment_id,appmax_payment_verified_at,shipping_service,shipping_status,tracking_code,provider_shipment_id,quoted_cep,bling_sync_status",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(data.page * 50, data.page * 50 + 49);
    if (result.error) throw new Error("Não foi possível carregar os pedidos. Tente novamente.");
    return { orders: result.data ?? [], count: result.count ?? 0 };
  });
