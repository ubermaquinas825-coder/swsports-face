import { describe, expect, it } from "vitest";
import {
  mapMelhorEnvioStatus,
  normalizeMelhorEnvioTrackingResponse,
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
