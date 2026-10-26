import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { RetryableSyncError } from "./financial-errors";
import { melhorEnvioRequest } from "./melhor-envio.server";
import {
  mapMelhorEnvioStatus,
  normalizeMelhorEnvioTrackingResponse,
  shouldAdvanceShippingStatus,
  type MelhorEnvioTrackingRecord,
} from "./melhor-envio-tracking";

const TRACKING_STATES = [
  "awaiting_label_payment",
  "awaiting_label",
  "label_issued",
  "ready_to_post",
  "posted",
];

type ShippingOrder = {
  id: string;
  provider_shipment_id: string | null;
  shipping_status: string;
  tracking_code: string | null;
};

type SyncResult = {
  checked: number;
  updated: number;
  errors: string[];
};

async function requestTracking(ids: string[]) {
  return melhorEnvioRequest("/api/v2/me/shipment/tracking", {
    method: "POST",
    body: JSON.stringify({ orders: ids }),
  });
}

function matchingRecord(records: MelhorEnvioTrackingRecord[], shipmentId: string) {
  return records.find((row) => row.id === shipmentId) ?? null;
}

async function persistTracking(order: ShippingOrder, provider: MelhorEnvioTrackingRecord) {
  const mapped = mapMelhorEnvioStatus(provider.status);
  const patch: { shipping_status?: string; tracking_code?: string } = {};
  if (mapped && shouldAdvanceShippingStatus(order.shipping_status, mapped)) patch.shipping_status = mapped;
  if (provider.tracking && provider.tracking !== order.tracking_code) patch.tracking_code = provider.tracking;
  if (!Object.keys(patch).length) {
    return {
      updated: false,
      status: order.shipping_status,
      tracking: provider.tracking ?? order.tracking_code,
    };
  }

  const saved = await supabaseAdmin
    .from("shipping_orders")
    .update(patch)
    .eq("id", order.id)
    .eq("provider_shipment_id", order.provider_shipment_id)
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data) throw new Error("Não foi possível atualizar o rastreamento do pedido.");

  const finalStatus = patch.shipping_status ?? order.shipping_status;
  const event = await supabaseAdmin.from("shipping_events").insert({
    order_id: order.id,
    provider: "melhor_envio",
    kind: "tracking",
    state: `Rastreamento sincronizado: ${provider.status ?? "status disponível"} → ${finalStatus}.`,
  });
  if (event.error) console.error("Melhor Envio tracking event persistence failed");

  return {
    updated: true,
    status: finalStatus,
    tracking: patch.tracking_code ?? order.tracking_code,
  };
}

async function synchronizeRows(rows: ShippingOrder[], failFast: boolean): Promise<SyncResult> {
  const ids = rows.flatMap((row) => (row.provider_shipment_id ? [row.provider_shipment_id] : []));
  if (!ids.length) return { checked: 0, updated: 0, errors: [] };

  let raw: unknown;
  try {
    raw = await requestTracking(ids);
  } catch (error) {
    if (failFast) throw error;
    return { checked: rows.length, updated: 0, errors: ["Rastreamento pendente de conferência."] };
  }
  const records = normalizeMelhorEnvioTrackingResponse(raw);
  let updated = 0;
  const errors: string[] = [];

  for (const order of rows) {
    if (!order.provider_shipment_id) continue;
    const provider = matchingRecord(records, order.provider_shipment_id);
    if (!provider) {
      errors.push("Um envio não retornou estado de rastreamento.");
      continue;
    }
    try {
      if ((await persistTracking(order, provider)).updated) updated += 1;
    } catch (error) {
      if (failFast) throw error;
      errors.push("Um rastreamento não pôde ser atualizado.");
    }
  }
  return { checked: rows.length, updated, errors };
}

export async function syncMelhorEnvioTracking(): Promise<SyncResult> {
  const result = await supabaseAdmin
    .from("shipping_orders")
    .select("id,provider_shipment_id,shipping_status,tracking_code")
    .not("provider_shipment_id", "is", null)
    .in("shipping_status", TRACKING_STATES)
    .order("created_at", { ascending: true })
    .limit(50);
  if (result.error) throw new RetryableSyncError("Não foi possível consultar os envios para rastreamento.");
  return synchronizeRows((result.data ?? []) as ShippingOrder[], false);
}

export async function syncMelhorEnvioTrackingOrder(orderId: string) {
  const result = await supabaseAdmin
    .from("shipping_orders")
    .select("id,provider_shipment_id,shipping_status,tracking_code")
    .eq("id", orderId)
    .single();
  if (result.error || !result.data) throw new Error("Não foi possível carregar o envio.");
  const order = result.data as ShippingOrder;
  if (!order.provider_shipment_id) throw new Error("Este pedido ainda não possui envio vinculado.");

  const raw = await requestTracking([order.provider_shipment_id]);
  const provider = matchingRecord(normalizeMelhorEnvioTrackingResponse(raw), order.provider_shipment_id);
  if (!provider) throw new Error("O Melhor Envio não retornou o rastreamento deste envio.");
  const saved = await persistTracking(order, provider);
  return {
    status: provider.status ?? saved.status,
    shippingStatus: saved.status,
    priceCents: null as number | null,
    tracking: saved.tracking,
    problems: [] as string[],
    updated: saved.updated,
  };
}
