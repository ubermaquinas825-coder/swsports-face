// This exact error is raised before any Bling API request. It is an ERP setup
// failure, not an ambiguous export/payment result. Never broaden to substrings.
export const LEGACY_SETUP_FAILURE = "Envio ao Bling falhou: Vínculos Bling não configurados.";
export type ManualShippingState = {
  payment_status: string;
  bling_sync_status: string;
  bling_sync_error?: string | null;
  payment_link_id?: string | null;
};
export function hasLegacySetupHold(order: ManualShippingState): boolean {
  return (
    order.payment_status === "approved" &&
    order.payment_link_id?.startsWith("mp:") === true &&
    order.bling_sync_status === "reconciliation_required" &&
    order.bling_sync_error === LEGACY_SETUP_FAILURE
  );
}
export function manualShippingHold(order: ManualShippingState): string | null {
  if (order.payment_status !== "approved")
    return "O pagamento deste pedido ainda não está aprovado.";
  if (order.bling_sync_status === "processing")
    return "O pedido tem um processamento anterior pendente de conferência.";
  if (
    ["blocked", "reconciliation_required"].includes(order.bling_sync_status) &&
    !hasLegacySetupHold(order)
  )
    return "Pedido em revisão: resolva a pendência de conferência antes de enviar.";
  return null;
}

/** Admin-only explanation of an existing hold. Never changes financial or shipment state. */
export function manualShippingReviewReason(order: ManualShippingState): string | null {
  if (!manualShippingHold(order) || order.payment_status !== "approved") return null;
  if (order.bling_sync_status === "processing") {
    return "Existe um processamento anterior que precisa ser conferido antes de gerar outro envio.";
  }
  if (!["blocked", "reconciliation_required"].includes(order.bling_sync_status)) return null;
  const reason = order.bling_sync_error?.replace(/\s+/g, " ").trim();
  return reason ? reason.slice(0, 350) : "O pedido foi marcado para revisão, mas o motivo não foi registrado. Confira o histórico financeiro antes de liberar o envio.";
}
