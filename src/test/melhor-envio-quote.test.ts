import { describe, expect, it } from "vitest";
import { normalizeMelhorEnvioQuoteResponse } from "@/lib/melhor-envio-quote";

describe("Melhor Envio quote response normalization", () => {
  it("keeps an array response unchanged", () => {
    const response = [{ id: 1 }, { id: 2 }];
    expect(normalizeMelhorEnvioQuoteResponse(response)).toEqual(response);
  });

  it("wraps a single service object in an array", () => {
    const response = { id: 1, custom_price: "18.90" };
    expect(normalizeMelhorEnvioQuoteResponse(response)).toEqual([response]);
  });

  it("rejects non-object responses", () => {
    expect(() => normalizeMelhorEnvioQuoteResponse(null)).toThrow(
      "O Melhor Envio retornou uma cotação inválida.",
    );
    expect(() => normalizeMelhorEnvioQuoteResponse("invalid")).toThrow(
      "O Melhor Envio retornou uma cotação inválida.",
    );
  });
});
