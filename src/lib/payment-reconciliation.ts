import { z } from "zod";

export const appmaxOrderSchema = z.object({ data: z.object({
  order: z.object({ id: z.number().int().positive(), status: z.string().min(1), total_paid: z.number().int().nonnegative().optional() }),
  payment: z.object({ paid_at: z.string().nullable().optional() }).optional(),
  refund: z.object({ refunded_at: z.string().nullable().optional() }).nullable().optional(),
}) });
const paidStatuses = new Set(["aprovado", "integrado"]);
const failedStatuses = new Set(["cancelado", "estornado", "recusado_por_risco", "chargeback_em_tratativa", "chargeback_em_disputa", "chargeback_perdido"]);
export function evaluateAppmaxPayment(value: unknown, orderId: number, expectedCents: number) {
  const { data } = appmaxOrderSchema.parse(value);
  if (data.order.id !== orderId) throw new Error("A Appmax retornou outro pedido.");
  if (data.refund?.refunded_at || failedStatuses.has(data.order.status)) return { state: "failed" as const, status: data.order.status };
  if (!paidStatuses.has(data.order.status)) return { state: "pending" as const, status: data.order.status };
  if (!data.payment?.paid_at || data.order.total_paid !== expectedCents) throw new Error("Pagamento sem confirmação de data ou valor divergente. Conferência manual necessária.");
  return { state: "approved" as const, status: data.order.status };
}