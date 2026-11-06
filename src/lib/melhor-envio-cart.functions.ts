import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orderInput = (input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input);

async function requireWritableEnvironment() {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
}

export const prepareMelhorEnvioShipping = createServerFn({ method: "POST" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireWritableEnvironment();
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const { prepareMelhorEnvioCart } = await import("./melhor-envio-cart.server");
    return prepareMelhorEnvioCart(data.orderId);
  });

export const inspectMelhorEnvioShipping = createServerFn({ method: "GET" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireWritableEnvironment();
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const { syncMelhorEnvioTrackingOrder } = await import("./shipping-tracking.server");
    return syncMelhorEnvioTrackingOrder(data.orderId);
  });

export const resetMelhorEnvioShipping = createServerFn({ method: "POST" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireWritableEnvironment();
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const { resetMelhorEnvioShippingAttempt } = await import("./melhor-envio-reset.server");
    return resetMelhorEnvioShippingAttempt(data.orderId);
  });

/**
 * Diagnostic only: never releases a financial hold, purchases postage or changes
 * payment/shipping state. A held order still needs the audited resolution path.
 */
export const checkMelhorEnvioPaymentHold = createServerFn({ method: "POST" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { manualShippingHold, manualShippingReviewReason } = await import("./manual-shipping-eligibility");
    const result = await supabaseAdmin.from("shipping_orders")
      .select("id,payment_status,payment_link_id,provider_payment_id,subtotal_cents,discount_cents,freight_cents,bling_sync_status,bling_sync_error")
      .eq("id", data.orderId).single();
    if (result.error || !result.data) throw new Error("Não foi possível consultar o pedido.");
    const order = result.data;
    const hold = manualShippingHold(order);
    const reason = manualShippingReviewReason(order);
    if (!hold) return { verified: false, message: "Este pedido não apresenta bloqueio de conferência. Atualize a lista de pedidos." };
    if (order.payment_status !== "approved")
      return { verified: false, message: "O pedido não está aprovado. Confira o pagamento antes de emitir a etiqueta." };
    if (!order.payment_link_id?.startsWith("mp:"))
      return { verified: false, message: `O pedido permanece em revisão. Motivo: ${reason ?? hold} Verifique o pagamento na Appmax e registre a resolução por um fluxo auditado.` };

    try {
      const { verifyMercadoPagoStoredOrder } = await import("./mercadopago.server");
      const payment = await verifyMercadoPagoStoredOrder(order);
      const verified = payment.state === "approved" &&
        Boolean(order.provider_payment_id) && payment.providerPaymentId === order.provider_payment_id;
      if (!verified)
        return { verified: false, message: "O Mercado Pago não confirmou o mesmo pagamento aprovado e vinculado ao pedido. A emissão permanece bloqueada." };
      return { verified: true, message: `Pagamento conferido no Mercado Pago. A emissão continua bloqueada até resolver a pendência registrada: ${reason ?? hold} Nenhum status foi alterado.` };
    } catch {
      return { verified: false, message: "Não foi possível confirmar com segurança o pagamento no Mercado Pago. A emissão permanece bloqueada. Confira o pedido diretamente no provedor." };
    }
  });
