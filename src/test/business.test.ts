import { describe, expect, it } from "vitest";
import { business } from "@/lib/business";
import { WHATSAPP_NUMBER } from "@/lib/products";

describe("Public business information", () => {
  it("uses the address from the matching Google listing", () => {
    expect(business.address).toBe("Rua Álvares de Azevedo, 994 — Carajás");
    expect(business.city).toBe("Uberlândia — MG");
    expect(business.postalCode).toBe("38408-562");
  });
  it("preserves the listing's weekday and weekend hours", () => {
    expect(business.hours).toEqual([
      { days: "Segunda a sexta", time: "08:30 às 18:00" },
      { days: "Sábado", time: "09:00 às 12:00" },
      { days: "Domingo", time: "Fechado" },
    ]);
  });
  it("keeps the owner's sales number despite the listing's alternate website link", () => {
    expect(WHATSAPP_NUMBER).toBe("5534984350833");
  });
});