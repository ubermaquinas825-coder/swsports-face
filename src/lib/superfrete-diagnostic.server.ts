import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { superfreteRequest } from "./superfrete.server";
import { labelInfoSchema, verifyLabelInfo, type LabelPayload } from "./shipping-labels";
import { z } from "zod";

const knownStatuses = new Set([
  "pending",
  "released",
  "paid",
  "posted",
  "delivered",
  "canceled",
  "cancelled",
  "expired",
]);
const safeReasons = new Set([
  "Etiqueta divergente do pedido.",
  "Endereço da etiqueta divergente do pedido.",
  "Complemento ou número divergente.",
  "Documento do destinatário divergente.",
  "Volume da etiqueta divergente.",
  "Declaração de conteúdo divergente.",
]);

// GET only. Returns an allowlisted projection, never provider bodies, addresses,
// tokens, saved payloads or arbitrary remote error messages. No writes or retries.
export async function diagnoseSuperfreteShipment(orderId: string) {
  const order = await supabaseAdmin
    .from("shipping_orders")
    .select("id,provider_shipment_id,freight_cents")
    .eq("id", orderId)
    .single();
  if (order.error || !order.data?.provider_shipment_id)
    throw new Error("Pedido sem envio vinculado para consultar.");
  const shipmentId = order.data.provider_shipment_id;
  let raw: unknown;
  try {
    raw = await superfreteRequest(`order/info/${encodeURIComponent(shipmentId)}`, undefined);
  } catch (error) {
    const match =
      error instanceof Error
        ? error.message.match(/^SuperFrete recusou a operação \(HTTP (\d{3})\)\.$/)
        : null;
    return {
      shipmentId,
      status: "Não consultado",
      priceCents: null,
      problems: [
        match
          ? `A API SuperFrete recusou a consulta (HTTP ${match[1]}).`
          : "Não foi possível consultar a API SuperFrete. Verifique a conexão e as credenciais no servidor.",
      ],
    };
  }
  const result = labelInfoSchema.safeParse(raw);
  if (!result.success) {
    const issues = [
      ...new Set(
        result.error.issues.map((issue) => `${issue.path.join(".") || "resposta"} (${issue.code})`),
      ),
    ].slice(0, 15);
    return {
      shipmentId,
      status: "Resposta incompatível",
      priceCents: null,
      problems: ["A API retornou dados diferentes do formato esperado pelo site.", ...issues],
    };
  }
  const info = result.data;
  const problems: string[] = [];
  if (info.id !== shipmentId) problems.push("A API retornou outro identificador de envio.");
  const job = await supabaseAdmin
    .from("shipping_label_jobs")
    .select("payload")
    .eq("order_id", orderId)
    .single();
  if (job.error) problems.push("Não foi possível ler os dados salvos da preparação.");
  else {
    const stored = z
      .object({
        manual_payment: z.literal(true),
        shipment: z
          .object({
            from: z.object({}).passthrough(),
            to: z.object({}).passthrough(),
            volumes: z.object({}).passthrough(),
            options: z.object({}).passthrough(),
            products: z.array(z.unknown()),
            service: z.number(),
          })
          .passthrough(),
      })
      .safeParse(job.data.payload);
    if (!stored.success || order.data.freight_cents === null)
      problems.push("Os dados salvos da preparação estão incompletos para comparar o envio.");
    else {
      try {
        verifyLabelInfo(
          raw,
          shipmentId,
          stored.data.shipment as unknown as LabelPayload,
          order.data.freight_cents,
        );
      } catch (error) {
        problems.push(
          error instanceof Error && safeReasons.has(error.message)
            ? error.message
            : "Não foi possível comparar todos os dados salvos com a resposta da SuperFrete.",
        );
      }
    }
  }
  return {
    shipmentId,
    status: knownStatuses.has(info.status) ? info.status : "Estado não reconhecido",
    priceCents: Math.round(info.price * 100),
    problems,
  };
}
