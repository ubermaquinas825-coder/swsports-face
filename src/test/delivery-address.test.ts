import { describe, expect, it } from "vitest";
import { deliveryAddressSchema, validateDeliveryAddress, validTaxDocument } from "@/lib/delivery-address";
import { testDeliveryAddress } from "./fixtures/delivery-address";

describe("Delivery data before payment", () => {
  it("normalizes formatting and accepts the quoted CEP", () => {
    expect(validateDeliveryAddress({ ...testDeliveryAddress, document: "529.982.247-25", phone: "(11) 99999-9999", postalCode: "38408-562", name: " Destinatário Teste " }, "38408562"))
      .toEqual(testDeliveryAddress);
  });
  it("rejects a delivery CEP different from the purchased freight", () => {
    expect(() => validateDeliveryAddress({ ...testDeliveryAddress, postalCode: "01310100" }, "38408562")).toThrow("mesmo usado no cálculo");
  });
  it.each(["11111111111", "12345678901", "52998224724", "11222333000180", "", "123"])("rejects invalid tax document %s", (value) => {
    expect(validTaxDocument(value)).toBe(false);
  });
  it("accepts valid CPF and CNPJ check digits", () => {
    expect(validTaxDocument("529.982.247-25")).toBe(true);
    expect(validTaxDocument("11.222.333/0001-81")).toBe(true);
  });
  it.each(["name", "document", "email", "phone", "postalCode", "street", "number", "district", "city", "state"])("requires %s", (key) => {
    expect(deliveryAddressSchema.safeParse({ ...testDeliveryAddress, [key]: "" }).success).toBe(false);
  });
  it("rejects an invalid state and excessive untrusted input", () => {
    expect(deliveryAddressSchema.safeParse({ ...testDeliveryAddress, state: "ZZ" }).success).toBe(false);
    expect(deliveryAddressSchema.safeParse({ ...testDeliveryAddress, complement: "x".repeat(101) }).success).toBe(false);
  });
  it("discards unknown fields instead of persisting client claims", () => {
    expect(deliveryAddressSchema.parse({ ...testDeliveryAddress, payment_status: "approved", provider_shipment_id: "fake" })).toEqual(testDeliveryAddress);
  });
});
