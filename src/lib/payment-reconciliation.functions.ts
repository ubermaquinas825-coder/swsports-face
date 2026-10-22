import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkAppmaxPayments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const orders = await context.supabase.from("shipping_orders").select("id").not("payment_link_id", "is", null).order("appmax_checked_at", { ascending: true, nullsFirst: true }).limit(3);
  if (orders.error) throw new Error("Não foi possível consultar os pedidos.");
  const { reconcileAppmaxOrder } = await import("./payment-reconciliation.server");
  let checked = 0;
  for (const order of orders.data ?? []) if ((await reconcileAppmaxOrder(order.id)).checked) checked++;
  return { checked };
});