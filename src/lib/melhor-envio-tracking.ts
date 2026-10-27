export type MelhorEnvioTrackingRecord = {
  id: string;
  status: string | null;
  tracking: string | null;
};

type JsonRecord = Record<string, unknown>;
type TrackingRequester = (ids: string[]) => Promise<unknown>;

const MAX_TRACKING_ID_LENGTH = 200;
const TRACKING_BATCH_SIZE = 20;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeMelhorEnvioTrackingId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_TRACKING_ID_LENGTH) return null;
  // Melhor Envio documents the identifier as a string. Reject only characters that
  // cannot belong to a safe opaque identifier instead of guessing a UUID format.
  const hasControlCharacter = Array.from(normalized).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (/\s/.test(normalized) || hasControlCharacter) return null;
  return normalized;
}

export function sanitizeMelhorEnvioTrackingIds(values: unknown[]): string[] {
  return [...new Set(values.flatMap((value) => {
    const id = normalizeMelhorEnvioTrackingId(value);
    return id ? [id] : [];
  }))];
}

export function isRecoverableTrackingLookupStatus(status: number | null): boolean {
  return status === 400 || status === 404 || status === 422;
}

function requestStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
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
    normalizeMelhorEnvioTrackingId(row["id"]) ??
    normalizeMelhorEnvioTrackingId(row["order_id"]) ??
    normalizeMelhorEnvioTrackingId(row["orderId"]) ??
    normalizeMelhorEnvioTrackingId(row["shipment_id"]) ??
    normalizeMelhorEnvioTrackingId(fallbackId) ??
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

async function requestIndividually(ids: string[], request: TrackingRequester) {
  const records: MelhorEnvioTrackingRecord[] = [];
  let rejected = 0;
  let missing = 0;

  for (const id of ids) {
    try {
      const parsed = normalizeMelhorEnvioTrackingResponse(await request([id]));
      const matching = parsed.find((row) => row.id === id);
      if (matching) records.push(matching);
      else missing += 1;
    } catch (error) {
      if (!isRecoverableTrackingLookupStatus(requestStatus(error))) throw error;
      rejected += 1;
    }
  }

  return { records, rejected, missing };
}

export async function fetchMelhorEnvioTrackingRecords(values: unknown[], request: TrackingRequester) {
  const ids = sanitizeMelhorEnvioTrackingIds(values);
  const invalid = values.filter((value) => normalizeMelhorEnvioTrackingId(value) === null).length;
  const records: MelhorEnvioTrackingRecord[] = [];
  let rejected = 0;
  let missing = 0;

  for (const batch of chunks(ids, TRACKING_BATCH_SIZE)) {
    try {
      const parsed = normalizeMelhorEnvioTrackingResponse(await request(batch));
      const returned = new Map(parsed.map((row) => [row.id, row]));
      for (const id of batch) {
        const found = returned.get(id);
        if (found) records.push(found);
      }
      const absent = batch.filter((id) => !returned.has(id));
      if (absent.length) {
        const fallback = await requestIndividually(absent, request);
        records.push(...fallback.records);
        rejected += fallback.rejected;
        missing += fallback.missing;
      }
    } catch (error) {
      if (!isRecoverableTrackingLookupStatus(requestStatus(error))) throw error;
      // A malformed/stale identifier can make the provider reject a whole batch.
      // Retry only this batch one-by-one so valid shipments still synchronize.
      const fallback = await requestIndividually(batch, request);
      records.push(...fallback.records);
      rejected += fallback.rejected;
      missing += fallback.missing;
    }
  }

  return { ids, records, invalid, rejected, missing };
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
