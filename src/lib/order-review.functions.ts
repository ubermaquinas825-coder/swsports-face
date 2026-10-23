import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orderId = z.object({ id: z.string().uuid() });
export const inspectBlingOrderForReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => orderId.parse(value)).handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const loadHeldOrder = async () => {
      const order = await context.supabase.from("shipping_orders").select("*").eq("id", data.id).single();
      if (order.error || !order.data || !["blocked", "reconciliation_required"].includes(order.data.bling_sync_status)) throw new Error("Pedido indisponível para revisão.");
      return order.data;
    };
    await loadHeldOrder();
    const { reconcileAppmaxOrder } = await import("./payment-reconciliation.server");
    const result = await reconcileAppmaxOrder(data.id);
    if (!result.checked) throw new Error("Conferência financeira indisponível; aguarde a concessão ou o prazo de retentativa.");
    const order = await loadHeldOrder();
    const { inspectHeldBlingOrder } = await import("./bling-recovery.server");
    const inspection = await inspectHeldBlingOrder(order);
    const current = await loadHeldOrder();
    return { ...inspection, revision: current.financial_revision, paymentStatus: current.payment_status };
  });

export const resolveOrderHold = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => orderId.extend({ revision: z.string().uuid(), action: z.enum(["keep_blocked", "accept_verified_export"]),
    reason: z.string().trim().min(10).max(1000), evidence: z.string().trim().min(10).max(1000) }).parse(value))
  .handler(async ({ data, context }) => {
    // Use the authenticated client: the database derives the actor from auth.uid(),
    // rechecks admin membership and records the resolution in the same transaction.
    const result = await context.supabase.rpc("resolve_shipping_order_hold", { _order_id: data.id,
      _expected_revision: data.revision, _action: data.action, _reason: data.reason, _evidence: data.evidence });
    if (result.error || !result.data) throw new Error("Resolução recusada. Atualize a revisão e confira as evidências e os bloqueios financeiros.");
    return { revision: result.data };
  });
