import type { Json } from "@/integrations/supabase/types";

export function record(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
export function text(value: Json | undefined): string {
  return typeof value === "string" ? value : "";
}
export function orderTotal(order: {
  subtotal_cents: number;
  discount_cents: number;
  freight_cents: number | null;
}) {
  return order.subtotal_cents - order.discount_cents + (order.freight_cents ?? 0);
}
export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function dateTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Não registrado";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
export const paymentLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  approved: "Pago",
  failed: "Pagamento recusado ou revertido",
};
