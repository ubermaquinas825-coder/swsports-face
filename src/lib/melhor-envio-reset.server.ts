import { manualShippingHold } from "./manual-shipping-eligibility";
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

async function loadOrder(orderId: string) {
  const result = await supabaseAdmin
    .from("shipping_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (result.error || !result.data) throw new Error("Não foi possível carregar o pedido.");
  return result.data;
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
    throw new Error("Este pedido possui rastreio ou documento de etiqueta. Confira o Melhor Envio antes de reiniciar.");
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

  if (order.provider_shipment_id) {
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

  // Re-read after the provider call so a concurrent financial or logistics update
  // cannot be silently overwritten by the reset.
  order = await loadOrder(orderId);
  const currentHold = manualShippingHold(order);
  if (currentHold) throw new Error(currentHold);
  assertNoIssuedLabel(order);

  const deletedJob = await supabaseAdmin
    .from("shipping_label_jobs")
    .delete()
    .eq("order_id", orderId);
  if (deletedJob.error)
    throw new Error("Não foi possível liberar a tentativa anterior de etiqueta.");

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
    .select("id")
    .maybeSingle();
  if (reset.error || !reset.data)
    throw new Error("O pedido mudou durante a reinicialização. Atualize o painel antes de tentar novamente.");

  const event = await supabaseAdmin.from("shipping_events").insert({
    order_id: orderId,
    provider: "melhor_envio",
    kind: "manual_reset",
    state:
      "Tentativa incompleta removida do carrinho e vínculo local reiniciado por administrador. Nenhum pagamento ou etiqueta foi criado pelo reset.",
  });
  if (event.error)
    console.warn("Melhor Envio reset completed but audit event could not be recorded.");

  return {
    reset: true as const,
    message: "Emissão reiniciada. O pedido está liberado para preparar um novo envio.",
  };
}
