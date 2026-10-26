export type MelhorEnvioTrackingRecord = {
  id: string;
  status: string | null;
  tracking: string | null;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function trackingCode(value: JsonRecord): string | null {
  const direct = text(value["tracking"]) ?? text(value["tracking_code"]);
  if (direct) return direct;
  const nested = record(value["tracking"]);
  return nested ? text(nested["code"]) ?? text(nested["tracking_code"]) : null;
}

function statusText(value: JsonRecord): string | null {
  const direct = text(value["status"]);
  if (direct) return direct;
  const nested = record(value["status"]);
  return nested ? text(nested["status"]) ?? text(nested["name"]) : null;
}

function trackingRecord(value: unknown, fallbackId?: string): MelhorEnvioTrackingRecord | null {
  const row = record(value);
  if (!row) return null;
  const id =
    text(row["id"]) ??
    text(row["order_id"]) ??
    text(row["orderId"]) ??
    text(row["shipment_id"]) ??
    fallbackId ??
    null;
  if (!id) return null;
  return { id, status: statusText(row), tracking: trackingCode(row) };
}

export function normalizeMelhorEnvioTrackingResponse(raw: unknown): MelhorEnvioTrackingRecord[] {
  if (Array.isArray(raw)) return raw.flatMap((value) => {
    const parsed = trackingRecord(value);
    return parsed ? [parsed] : [];
  });

  const root = record(raw);
  if (!root) return [];
  const direct = trackingRecord(root);
  if (direct && (direct.status || direct.tracking || "id" in root || "order_id" in root)) return [direct];

  const data = root["data"];
  if (Array.isArray(data)) return normalizeMelhorEnvioTrackingResponse(data);
  const dataRecord = record(data);
  if (dataRecord) {
    const nested = Object.entries(dataRecord).flatMap(([id, value]) => {
      const parsed = trackingRecord(value, id);
      return parsed ? [parsed] : [];
    });
    if (nested.length) return nested;
  }

  return Object.entries(root).flatMap(([id, value]) => {
    const parsed = trackingRecord(value, id);
    return parsed ? [parsed] : [];
  });
}

const statusAliases: Record<string, string> = {
  pending: "awaiting_label_payment",
  created: "awaiting_label_payment",
  cart: "awaiting_label_payment",
  pending_payment: "awaiting_label_payment",
  waiting_payment: "awaiting_label_payment",
  released: "awaiting_label",
  paid: "awaiting_label",
  purchased: "awaiting_label",
  generated: "ready_to_post",
  printed: "ready_to_post",
  ready: "ready_to_post",
  ready_to_post: "ready_to_post",
  posted: "posted",
  in_transit: "posted",
  in_transit_to_receiver: "posted",
  delivered: "delivered",
  cancelled: "logistics_failed",
  canceled: "logistics_failed",
  undelivered: "logistics_failed",
  suspended: "logistics_failed",
  failed: "logistics_failed",
};

export function mapMelhorEnvioStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase().replace(/^order\./, "").replace(/[\s-]+/g, "_");
  return statusAliases[normalized] ?? null;
}

const statusRank: Record<string, number> = {
  awaiting_payment: 0,
  paid: 1,
  awaiting_label_payment: 2,
  awaiting_label: 3,
  label_issued: 4,
  ready_to_post: 5,
  posted: 6,
  delivered: 7,
};

export function shouldAdvanceShippingStatus(current: string, next: string): boolean {
  if (current === next) return false;
  if (current === "delivered" || current === "logistics_failed") return false;
  if (next === "logistics_failed") return current !== "delivered";
  const currentRank = statusRank[current];
  const nextRank = statusRank[next];
  if (nextRank === undefined) return false;
  if (currentRank === undefined) return true;
  return nextRank > currentRank;
}
