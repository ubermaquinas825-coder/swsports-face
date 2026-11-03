import { manualShippingHold } from "./manual-shipping-eligibility";
import { isRecoverableManualReviewJob, type ManualReviewJob, type ManualShippingAttempt } from "./melhor-envio-reset-evidence";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import {
  MelhorEnvioRequestError,
  melhorEnvioRequest,
} from "./melhor-envio.server";
import {
  fetchMelhorEnvioTrackingRecords,
  mapMelhorEnvioStatus,
} from "./melhor-envio-tracking";

const resettableStates = new Set([
  "awaiting_label",
  "awaiting_label_payment",
  "label_issued",
  "logistics_failed",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isPermissionDenied(error: unknown) {
  const value = record(error);
  const code = typeof value?.["code"] === "string" ? value["code"] : null;
  const message = typeof value?.["message"] === "string" ? value["message"] : "";
  return code === "42501" || /permission denied.*shipping_label_jobs/i.test(message);
}

async function loadLabelJob(orderId: string): Promise<ManualReviewJob | null> {
  const result = await supabaseAdmin
    .from("shipping_label_jobs")
    .select("stage,payload,shipment_id,updated_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (result.error)
    throw new Error("Não foi possível conferir a tentativa anterior de etiqueta.");
  return (result.data as ManualReviewJob | null) ?? null;
}

async function loadOrder(orderId: string) {
  const result = await supabaseAdmin
    .from("shipping_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (result.error || !result.data) throw new Error("Não foi possível carregar o pedido.");
  return result.data;
}

async function latestShippingAttempt(orderId: string): Promise<ManualShippingAttempt | null> {
  const result = await supabaseAdmin
    .from("shipping_events")
    .select("provider,kind,created_at")
    .eq("order_id", orderId)
    .in("kind", ["manual_cart", "label"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error("Não foi possível conferir o histórico logístico do pedido.");
  return (result.data as ManualShippingAttempt | null) ?? null;
}

async function previousManualResetAt(orderId: string, job: ManualReviewJob, attempt: ManualShippingAttempt | null) {
  if (!job.shipment_id || attempt?.kind !== "manual_cart" || attempt.provider !== "melhor_envio")
    return null;
  // A retained historical job is safe to reuse only if a *previous completed*
  // administrative reset occurred AFTER that job was last changed and BEFORE the
  // subsequent new Melhor Envio cart attempt. The old job never changes during
  // retained manual retries, so its shipment_id intentionally remains stale.
  const result = await supabaseAdmin
    .from("shipping_events")
    .select("created_at")
    .eq("order_id", orderId)
    .eq("kind", "manual_reset")
    .gt("created_at", job.updated_at)
    .lt("created_at", attempt.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error("Não foi possível validar o histórico da tentativa anterior de etiqueta.");
  return result.data?.created_at ?? null;
}

async function trackingState(shipmentId: string) {
  return fetchMelhorEnvioTrackingRecords([shipmentId], (ids) =>
    melhorEnvioRequest("/api/v2/me/shipment/tracking", {
      method: "POST",
      body: JSON.stringify({ orders: ids }),
    }),
  );
}

async function removeCartItem(shipmentId: string) {
  try {
    await melhorEnvioRequest(`/api/v2/me/cart/${encodeURIComponent(shipmentId)}`, {
      method: "DELETE",
    });
    return "deleted" as const;
  } catch (error) {
    // Melhor Envio documents DELETE /cart/{id} as HTTP 204. The shared request
    // helper currently attempts to parse every successful response as JSON, so a
    // successful 204 reaches this branch as SyntaxError. Keep this handling local
    // to the documented no-content endpoint.
    if (error instanceof SyntaxError) return "deleted" as const;
    if (error instanceof MelhorEnvioRequestError && error.status === 404)
      return "missing" as const;
    throw error;
  }
}

function assertNoIssuedLabel(order: {
  shipping_status: string;
  tracking_code?: string | null;
  label_url?: string | null;
}) {
  if (["ready_to_post", "posted", "delivered"].includes(order.shipping_status))
    throw new Error("Este pedido já avançou para postagem e não pode ser reiniciado automaticamente.");
  if (order.tracking_code || order.label_url)
    throw new Error("Este pedido possui rastreio ou documento de etiqueta. Confira o provedor antes de reiniciar.");
}

export async function resetMelhorEnvioShippingAttempt(orderId: string) {
  assertFinancialOperationsEnabled();

  let order = await loadOrder(orderId);
  const hold = manualShippingHold(order);
  if (hold) throw new Error(hold);
  assertNoIssuedLabel(order);

  if (!order.provider_shipment_id && !resettableStates.has(order.shipping_status))
    return {
      reset: false as const,
      message: "Este pedido não possui uma tentativa de emissão para reiniciar.",
    };

  const previousShipmentId = order.provider_shipment_id ?? null;
  const latestAttempt = await latestShippingAttempt(orderId);
  const attemptProvider = latestAttempt?.provider ?? null;

  if (order.provider_shipment_id && attemptProvider !== "superfrete") {
    const shipmentId = order.provider_shipment_id;
    const tracking = await trackingState(shipmentId);
    const record = tracking.records.find((item) => item.id === shipmentId) ?? null;
    const mapped = mapMelhorEnvioStatus(record?.status);

    if (
      record?.tracking ||
      mapped === "awaiting_label" ||
      mapped === "ready_to_post" ||
      mapped === "posted" ||
      mapped === "delivered"
    ) {
      throw new Error(
        "O Melhor Envio indica que este envio já foi pago, gerado ou postado. O sistema não apagou o vínculo para evitar cobrança ou envio duplicado.",
      );
    }

    try {
      await removeCartItem(shipmentId);
    } catch (error) {
      if (
        error instanceof MelhorEnvioRequestError &&
        [400, 422].includes(error.status)
      ) {
        throw new Error(
          "O Melhor Envio não permitiu remover a tentativa anterior do carrinho. Confira esse envio no provedor antes de reiniciar.",
        );
      }
      throw error;
    }
  }

  // Historical SuperFrete attempts are local-only now: the active runtime and
  // Production credentials were removed. They can be released only when there is
  // no tracking code, label URL or posted/delivered state, all checked above.

  // Re-read after any provider call so a concurrent financial or logistics update
  // cannot be silently overwritten by the reset.
  order = await loadOrder(orderId);
  const currentHold = manualShippingHold(order);
  if (currentHold) throw new Error(currentHold);
  assertNoIssuedLabel(order);

  // shipping_label_jobs intentionally grants service_role SELECT only. A
  // previously verified manual-cart job stays as an inert historical lock;
  // automated workers cannot act on stage=review. A prior successful reset may
  // leave this job holding an older shipment ID while the order references the
  // new Melhor Envio shipment. Recognize that case only with a chronological
  // reset audit trail; never bypass non-manual or unverified jobs.
  let retainedManualJob = false;
  const deletedJob = await supabaseAdmin
    .from("shipping_label_jobs")
    .delete()
    .eq("order_id", orderId);
  if (deletedJob.error) {
    if (!isPermissionDenied(deletedJob.error))
      throw new Error("Não foi possível liberar a tentativa anterior de etiqueta.");
    const existingJob = await loadLabelJob(orderId);
    if (existingJob) {
      const priorResetAt = await previousManualResetAt(orderId, existingJob, latestAttempt);
      if (!isRecoverableManualReviewJob(existingJob, previousShipmentId, latestAttempt, priorResetAt))
        throw new Error("Não foi possível liberar a tentativa anterior de etiqueta. Histórico de revisão divergente; confira o envio com o provedor.");
      retainedManualJob = true;
    }
  }

  const reset = await supabaseAdmin
    .from("shipping_orders")
    .update({
      provider_shipment_id: null,
      shipping_status: "paid",
      tracking_code: null,
      label_url: null,
    })
    .eq("id", orderId)
    .eq("payment_status", "approved")
    .eq("financial_revision", order.financial_revision)
    .eq("shipping_status", order.shipping_status)
    .is("tracking_code", null)
    .is("label_url", null)
    .select("id")
    .maybeSingle();
  if (reset.error || !reset.data)
    throw new Error("O pedido mudou durante a reinicialização. Atualize o painel antes de tentar novamente.");

  const legacy = attemptProvider === "superfrete";
  const event = await supabaseAdmin.from("shipping_events").insert({
    order_id: orderId,
    provider: legacy ? "superfrete" : "melhor_envio",
    kind: "manual_reset",
    state: retainedManualJob
      ? "Tentativa manual anterior removida do provedor e vínculo local reiniciado. O registro histórico de revisão foi preservado por segurança; nenhum pagamento ou etiqueta foi criado pelo reset."
      : legacy
        ? "Tentativa legada SuperFrete sem rastreio/documento liberada por administrador para nova emissão no Melhor Envio."
        : "Tentativa incompleta removida do carrinho e vínculo local reiniciado por administrador. Nenhum pagamento ou etiqueta foi criado pelo reset.",
  });
  if (event.error)
    console.warn("Shipping reset completed but audit event could not be recorded.");

  return {
    reset: true as const,
    message: legacy
      ? "Tentativa antiga liberada. O pedido está pronto para um novo envio pelo Melhor Envio."
      : "Emissão reiniciada. O pedido está liberado para preparar um novo envio.",
  };
}
