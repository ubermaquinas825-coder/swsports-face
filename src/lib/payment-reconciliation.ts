import { z } from "zod";

export const appmaxOrderSchema = z.object({ data: z.object({
  order: z.object({ id: z.number().int().positive(), status: z.string().min(1), total_paid: z.number().int().nonnegative().optional() }),
  payment: z.object({ paid_at: z.string().nullable().optional() }).optional(),
  refund: z.object({ refunded_at: z.string().nullable().optional() }).nullable().optional(),
}) });
const paidStatuses = new Set(["aprovado", "integrado"]);
const failedStatuses = new Set(["cancelado", "estornado", "recusado_por_risco", "chargeback_em_tratativa", "chargeback_em_disputa", "chargeback_perdido"]);
// Accept complete Appmax timestamps, including its timezone-free SQL format.
// Do not infer a timezone or let Date.parse normalize impossible calendar dates.
export function isValidAppmaxPaidAt(value: string | null | undefined): boolean {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0) || hour > 23 || minute > 59 || second > 59) return false;
  const zone = match[7];
  if (zone && zone !== "Z") {
    const hours = Number(zone.slice(1, 3)), minutes = Number(zone.slice(4, 6));
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return false;
  }
  return true;
}
export function evaluateAppmaxPayment(value: unknown, orderId: number, expectedCents: number) {
  const { data } = appmaxOrderSchema.parse(value);
  if (data.order.id !== orderId) throw new Error("A Appmax retornou outro pedido.");
  if (data.refund?.refunded_at || failedStatuses.has(data.order.status)) return { state: "failed" as const, status: data.order.status };
  if (!paidStatuses.has(data.order.status)) return { state: "pending" as const, status: data.order.status };
  if (!isValidAppmaxPaidAt(data.payment?.paid_at) || data.order.total_paid !== expectedCents) throw new Error("Pagamento sem confirmação de data ou valor divergente. Conferência manual necessária.");
  return { state: "approved" as const, status: data.order.status };
}
