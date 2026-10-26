import { describe, expect, it } from "vitest";
import { buildLabelPayload, officialLabelUrl, verifyLabelInfo } from "@/lib/shipping-labels";
import { shippingConfigSchema, defaultShippingConfig } from "@/lib/shipping";
import { testDeliveryAddress } from "./fixtures/delivery-address";

import { sender, labelInput, labelInfo } from "./fixtures/shipping-label";

describe("SuperFrete declaration and label provenance", () => {
  it("uses stored quote dimensions, catalog values and non_commercial declaration", () => {
    const payload = buildLabelPayload(labelInput);
    expect(payload).toMatchObject({
      service: 1,
      volumes: labelInput.service.package,
      options: { non_commercial: true, insurance_value: 49.9 },
      products: [{ name: "Gato divertido", quantity: "1", unitary_value: "49.90" }],
    });
    expect(payload.options).not.toHaveProperty("invoice");
  });
  it("blocks missing quoted dimensions, a changed origin or subtotal, and incomplete J&T phone", () => {
    expect(() => buildLabelPayload({ ...labelInput, service: { id: "1" } })).toThrow();
    expect(() =>
      buildLabelPayload({ ...labelInput, sender: { ...sender, postal_code: "01310100" } }),
    ).toThrow("remetente mudou");
    expect(() => buildLabelPayload({ ...labelInput, subtotalCents: 1 })).toThrow(
      "Itens divergentes",
    );
    expect(() =>
      buildLabelPayload({
        ...labelInput,
        service: { ...labelInput.service, id: "33" },
        address: { ...testDeliveryAddress, phone: "1133334444" },
      }),
    ).toThrow("11 dígitos");
  });
  it("verifies both party addresses, document, price, service, volume and declaration before debiting", () => {
    const info = labelInfo(),
      payload = buildLabelPayload(labelInput);
    expect(verifyLabelInfo(info, info.id, payload, 1234).id).toBe(info.id);
    for (const wrong of [
      { ...info, id: "other" },
      { ...info, price: 99 },
      { ...info, service_id: 2 },
      { ...info, height: 99 },
      { ...info, invoice: "invoice" },
      { ...info, to: { ...info.to, document: "other" } },
      { ...info, to: { ...info.to, postal_code: "01310100" } },
      { ...info, products: [] },
    ]) {
      expect(() => verifyLabelInfo(wrong, info.id, payload, 1234)).toThrow();
    }
  });
  it("accepts address capitalization, accents, whitespace and a formatted CEP without changing their meaning", () => {
    const info = labelInfo();
    info.from.name = info.from.name.toUpperCase();
    info.from.city = "  UBERLANDIA  ";
    info.from.postal_code = "38408-562";
    info.to.address = info.to.address
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    expect(() => verifyLabelInfo(info, info.id, buildLabelPayload(labelInput), 1234)).not.toThrow();
  });
  it("still rejects changed street numbers, complements, recipients and actual addresses", () => {
    const payload = buildLabelPayload(labelInput);
    for (const field of [
      "name",
      "address",
      "district",
      "city",
      "postal_code",
      "location_number",
      "complement",
    ] as const) {
      const info = labelInfo();
      expect(() =>
        verifyLabelInfo(
          { ...info, to: { ...info.to, [field]: "DIFERENTE" } },
          info.id,
          payload,
          1234,
        ),
      ).toThrow("Endereço");
    }
  });
  it.each([
    "http://api.superfrete.com/_etiqueta/pdf/a",
    "https://evil.example/_etiqueta/pdf/a",
    "https://api.superfrete.com.evil.example/_etiqueta/pdf/a",
    "https://evil@api.superfrete.com/_etiqueta/pdf/a",
    "https://api.superfrete.com/other",
    "https://sandbox.superfrete.com/_etiqueta/pdf/a",
  ])("rejects unverified PDF URL %s", (value) => {
    expect(() => officialLabelUrl(value)).toThrow();
  });
  it("accepts official production PDF URLs", () => {
    expect(officialLabelUrl("https://api.superfrete.com/_etiqueta/pdf/a")).toBe(
      "https://api.superfrete.com/_etiqueta/pdf/a",
    );
  });
  it("defaults old settings to disabled and requires complete matching origin before activation", () => {
    const { labelAutomation: _, ...old } = defaultShippingConfig;
    expect(shippingConfigSchema.parse(old).labelAutomation.enabled).toBe(false);
    expect(
      shippingConfigSchema.safeParse({ ...old, labelAutomation: { enabled: true, sender: null } })
        .success,
    ).toBe(false);
    expect(
      shippingConfigSchema.safeParse({
        ...old,
        labelAutomation: { enabled: true, sender: { ...sender, postal_code: "01310100" } },
      }).success,
    ).toBe(false);
  });
});
