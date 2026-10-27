import { describe, expect, it, vi } from "vitest";
import {
  fetchMelhorEnvioTrackingRecords,
  isRecoverableTrackingLookupStatus,
  mapMelhorEnvioStatus,
  normalizeMelhorEnvioTrackingId,
  normalizeMelhorEnvioTrackingResponse,
  sanitizeMelhorEnvioTrackingIds,
  shouldAdvanceShippingStatus,
} from "@/lib/melhor-envio-tracking";

describe("Melhor Envio tracking", () => {
  it("normalizes arrays, single objects and responses keyed by shipment id", () => {
    expect(normalizeMelhorEnvioTrackingResponse([{ id: "a", status: "posted", tracking: "BR1" }])).toEqual([
      { id: "a", status: "posted", tracking: "BR1" },
    ]);
    expect(normalizeMelhorEnvioTrackingResponse({ id: "b", status: "delivered", tracking_code: "BR2" })).toEqual([
      { id: "b", status: "delivered", tracking: "BR2" },
    ]);
    expect(normalizeMelhorEnvioTrackingResponse({ c: { status: "released", tracking: { code: "BR3" } } })).toEqual([
      { id: "c", status: "released", tracking: "BR3" },
    ]);
  });

  it("accepts opaque ids conservatively, trims them and removes duplicates", () => {
    expect(normalizeMelhorEnvioTrackingId("  taBSPkH6e07ICsg2sgj9  ")).toBe("taBSPkH6e07ICsg2sgj9");
    expect(normalizeMelhorEnvioTrackingId("bad id")).toBeNull();
    expect(normalizeMelhorEnvioTrackingId(123)).toBeNull();
    expect(sanitizeMelhorEnvioTrackingIds(["a", " a ", null, "", "b"])).toEqual(["a", "b"]);
  });

  it("fetches one valid tracking id", async () => {
    const request = vi.fn(async (ids: string[]) => ids.map((id) => ({ id, status: "posted" })));
    const result = await fetchMelhorEnvioTrackingRecords(["one"], request);
    expect(result.records).toEqual([{ id: "one", status: "posted", tracking: null }]);
    expect(result.invalid + result.rejected + result.missing).toBe(0);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fetches multiple valid ids in a bounded batch", async () => {
    const request = vi.fn(async (ids: string[]) => ids.map((id) => ({ id, status: "released" })));
    const result = await fetchMelhorEnvioTrackingRecords(["one", "two"], request);
    expect(result.records.map((row) => row.id)).toEqual(["one", "two"]);
    expect(request).toHaveBeenCalledWith(["one", "two"]);
  });

  it("rejects missing and invalid ids before calling the provider", async () => {
    const request = vi.fn(async (ids: string[]) => ids.map((id) => ({ id, status: "posted" })));
    const result = await fetchMelhorEnvioTrackingRecords([null, "", "bad id", " valid ", "valid"], request);
    expect(result.ids).toEqual(["valid"]);
    expect(result.invalid).toBe(3);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("marks an empty provider response as missing without crashing", async () => {
    const request = vi.fn(async () => []);
    const result = await fetchMelhorEnvioTrackingRecords(["one"], request);
    expect(result.records).toEqual([]);
    expect(result.missing).toBe(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("isolates a 422 batch rejection and preserves valid shipments", async () => {
    const request = vi.fn(async (ids: string[]) => {
      if (ids.length > 1) throw Object.assign(new Error("unprocessable"), { status: 422 });
      if (ids[0] === "stale") throw Object.assign(new Error("unprocessable"), { status: 422 });
      return [{ id: ids[0], status: "posted" }];
    });
    const result = await fetchMelhorEnvioTrackingRecords(["valid", "stale"], request);
    expect(result.records.map((row) => row.id)).toEqual(["valid"]);
    expect(result.rejected).toBe(1);
  });

  it("treats an individual 404 as a rejected stale shipment", async () => {
    const request = vi.fn(async () => {
      throw Object.assign(new Error("not found"), { status: 404 });
    });
    const result = await fetchMelhorEnvioTrackingRecords(["stale"], request);
    expect(result.records).toEqual([]);
    expect(result.rejected).toBe(1);
  });

  it("does not fan out a 429 rate limit", async () => {
    const error = Object.assign(new Error("rate limited"), { status: 429 });
    const request = vi.fn(async () => { throw error; });
    await expect(fetchMelhorEnvioTrackingRecords(["one", "two"], request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps timeouts retryable instead of classifying ids as invalid", async () => {
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    const request = vi.fn(async () => { throw timeout; });
    await expect(fetchMelhorEnvioTrackingRecords(["one"], request)).rejects.toBe(timeout);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("recovers a partial batch response by checking only missing ids", async () => {
    const request = vi.fn(async (ids: string[]) => {
      if (ids.length > 1) return [{ id: "one", status: "posted" }];
      return [{ id: ids[0], status: "delivered", tracking: "BR2" }];
    });
    const result = await fetchMelhorEnvioTrackingRecords(["one", "two"], request);
    expect(result.records).toEqual([
      { id: "one", status: "posted", tracking: null },
      { id: "two", status: "delivered", tracking: "BR2" },
    ]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("classifies only validation/not-found statuses as isolatable", () => {
    expect(isRecoverableTrackingLookupStatus(400)).toBe(true);
    expect(isRecoverableTrackingLookupStatus(404)).toBe(true);
    expect(isRecoverableTrackingLookupStatus(422)).toBe(true);
    expect(isRecoverableTrackingLookupStatus(429)).toBe(false);
    expect(isRecoverableTrackingLookupStatus(500)).toBe(false);
  });

  it("maps provider lifecycle states to the ERP lifecycle", () => {
    expect(mapMelhorEnvioStatus("order.pending")).toBe("awaiting_label_payment");
    expect(mapMelhorEnvioStatus("released")).toBe("awaiting_label");
    expect(mapMelhorEnvioStatus("printed")).toBe("ready_to_post");
    expect(mapMelhorEnvioStatus("posted")).toBe("posted");
    expect(mapMelhorEnvioStatus("delivered")).toBe("delivered");
    expect(mapMelhorEnvioStatus("cancelled")).toBe("logistics_failed");
    expect(mapMelhorEnvioStatus("unknown-provider-state")).toBeNull();
  });

  it("never regresses an advanced shipment state", () => {
    expect(shouldAdvanceShippingStatus("ready_to_post", "posted")).toBe(true);
    expect(shouldAdvanceShippingStatus("posted", "awaiting_label_payment")).toBe(false);
    expect(shouldAdvanceShippingStatus("delivered", "posted")).toBe(false);
    expect(shouldAdvanceShippingStatus("posted", "logistics_failed")).toBe(true);
    expect(shouldAdvanceShippingStatus("logistics_failed", "posted")).toBe(false);
  });
});
