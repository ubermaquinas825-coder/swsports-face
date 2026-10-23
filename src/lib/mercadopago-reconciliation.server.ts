import {
  mercadoPagoOrderIdFromLink,
  processMercadoPagoWebhook,
} from "./mercadopago.server";

export async function reconcilePendingMercadoPagoOrders(limit = 10) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pending = await supabaseAdmin
    .from("shipping_orders")
    .select("id,payment_link_id")
    .eq("payment_status", "pending")
    .like("payment_link_id", "mp:%")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pending.error) {
    throw new Error("Não foi possível consultar pagamentos Mercado Pago pendentes.");
  }

  let checked = 0;
  let approved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const order of pending.data ?? []) {
    const providerOrderId = mercadoPagoOrderIdFromLink(order.payment_link_id);
    if (!providerOrderId) continue;

    checked += 1;
    try {
      const result = await processMercadoPagoWebhook(providerOrderId);
      if (result.found && result.state === "approved") approved += 1;
      if (result.found && result.state === "failed") failed += 1;
    } catch (error) {
      console.error(
        "Mercado Pago scheduled reconciliation failed",
        order.id,
        error instanceof Error ? error.message : "unknown_error",
      );
      errors.push(`Pedido ${order.id}: não foi possível confirmar o Mercado Pago agora.`);
    }
  }

  return { checked, approved, failed, errors };
}
