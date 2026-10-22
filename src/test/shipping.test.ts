import { describe, expect, it } from "vitest";
import { cepSchema, choosePackage, defaultShippingConfig, labelEligibility, quoteUnavailable, validatedTotal } from "@/lib/shipping";
describe("Shipping preparation", () => {
  it("rejects invalid destination ZIP codes", () => { expect(cepSchema.safeParse("123").success).toBe(false); expect(cepSchema.safeParse("00000-000").success).toBe(false); expect(cepSchema.parse("38408-562")).toBe("38408562"); });
  it("does not return imaginary quotes", () => { expect(quoteUnavailable().status).toBe("unavailable"); expect(quoteUnavailable().options).toEqual([]); });
  it("uses the confirmed one-unit package", () => { expect(choosePackage(1, defaultShippingConfig)).toMatchObject({ weightKg: 0.15, lengthCm: 20, widthCm: 15, heightCm: 10 }); });
  it("blocks multiple units without actual weights and capacity", () => { expect(choosePackage(3, defaultShippingConfig)).toBeNull(); });
  it("sums real weights without multiplying dimensions", () => { const config = { ...defaultShippingConfig, productWeightKg: 0.1, packages: [{ ...defaultShippingConfig.packages[0], capacity: 3, packagingWeightKg: 0.05 }] }; expect(choosePackage(3, config)).toMatchObject({ weightKg: 0.35, lengthCm: 20, widthCm: 15, heightCm: 10 }); });
  it("computes total from catalog price minus discount plus shipping", () => { expect(validatedTotal([{ id: "gato-divertido", qty: 2 }], 500, 1200)).toBe(10680); expect(() => validatedTotal([{ id: "fake", qty: 1 }], 0, 0)).toThrow(); });
  it("blocks label requests for pending payments", () => { expect(labelEligibility("pending", null, true)).toBe("awaiting_payment"); });
  it("requires authorization even after approved payment", () => { expect(labelEligibility("approved", null, false)).toBe("integration_unavailable"); expect(labelEligibility("approved", null, true)).toBe("ready"); });
  it("does not re-request an existing shipment", () => { expect(labelEligibility("approved", "shipment-1", true)).toBe("already_requested"); });
});