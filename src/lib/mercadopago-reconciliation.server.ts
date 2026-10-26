import {
  MercadoPagoManualReviewError,
  MercadoPagoRequestError,
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
    .not("bling_sync_status", "in", "(blocked,reconciliation_required)")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (pending.error) {
    throw new Error("Não foi possível consultar pagamentos Mercado Pago pendentes.");
  }

  let checked = 0;
  let approved = 0;
  let failed = 0;
  let held = 0;
  const errors: string[] = [];

  async function holdForManualReview(orderId: string, reason: string) {
    const saved = await supabaseAdmin
      .from("shipping_orders")
      .update({
        bling_sync_status: "reconciliation_required",
        bling_sync_error: reason,
      })
      .eq("id", orderId)
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();
    if (saved.error || !saved.data) throw new Error("Não foi possível separar o pedido para conferência manual.");
    held += 1;
  }

  for (const order of pending.data ?? []) {
    const providerOrderId = mercadoPagoOrderIdFromLink(order.payment_link_id);
    if (!providerOrderId) continue;

    checked += 1;
    try {
      const result = await processMercadoPagoWebhook(providerOrderId);
      if (result.found && result.state === "approved") approved += 1;
      if (result.found && result.state === "failed") failed += 1;
    } catch (error) {
      try {
        if (error instanceof MercadoPagoRequestError && error.status === 404) {
          await holdForManualReview(
            order.id,
            "Vínculo Mercado Pago não encontrado durante a reconciliação automática. Conferência manual necessária; o status do pagamento foi preservado.",
          );
          continue;
        }
        if (error instanceof MercadoPagoManualReviewError) {
          await holdForManualReview(
            order.id,
            "Resposta Mercado Pago incompatível com a conferência automática. Conferência manual necessária; o status do pagamento foi preservado.",
          );
          continue;
        }
      } catch {
        errors.push("Um pedido não pôde ser separado para conferência manual.");
        continue;
      }

      // Network errors, authorization failures and provider 5xx remain retryable.
      // Never log provider bodies or order/customer data here.
      console.error("Mercado Pago scheduled reconciliation temporarily unavailable");
      errors.push("Pagamento pendente de nova conferência automática.");
    }
  }

  return { checked, approved, failed, held, errors };
}
