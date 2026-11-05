import { useState } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Synthetic sellable SKUs exercise the payment path without enabling unfinished
// real shirt listings or making external provider/database requests.
vi.mock("@/lib/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/products")>();
  const fixture = {
    id: "fixture-shirt-m",
    name: "Camisa de teste — Ref. 01",
    description: "Synthetic test product",
    image: "/fixture-shirt.webp",
    category: "camiseta" as const,
    size: "M",
    priceCents: 7990,
  };
  const large = { ...fixture, id: "fixture-shirt-g", size: "G" };
  return {
    ...actual,
    purchasableProducts: [...actual.purchasableProducts, fixture, large],
    productFor: (id: string) => [fixture, large].find((product) => product.id === id) ?? actual.productFor(id),
  };
});

const { insert, update, settings, quoteProvider } = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), settings: vi.fn(), quoteProvider: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert, update, select: () => ({ eq: () => ({ maybeSingle: settings }) }) }) },
}));
vi.mock("@/lib/melhor-envio.server", () => ({ melhorEnvioRequest: quoteProvider }));

import { CartProvider, useCart } from "@/hooks/use-cart";
import { cartLinesSchema, checkoutCartKey, currentShipping } from "@/lib/checkout";
import { appmaxPaymentLink, quoteFreight } from "@/lib/checkout.server";
import { mercadoPagoPaymentLink } from "@/lib/mercadopago.server";
import { chooseCartPackage, choosePackage, defaultShippingConfig, shippingConfigSchema, validatedTotal } from "@/lib/shipping";
import { ApparelPackagingSettings } from "@/components/ApparelPackagingSettings";
import { testDeliveryAddress } from "./fixtures/delivery-address";

const mixed = [{ id: "gato-divertido", qty: 1 }, { id: "fixture-shirt-m", qty: 2 }];
const option = { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 };
const shirtName = "Camisa de teste — Ref. 01 · Tamanho M";
const expectedItems = [
  { id: "gato-divertido", name: "Balaclava Gato Divertido", qty: 1, unit_price_cents: 4990 },
  { id: "fixture-shirt-m", name: shirtName, qty: 2, unit_price_cents: 7990 },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
  vi.stubEnv("VERCEL_ENV", "production");
  insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "fixture-order" }, error: null }) }) });
  update.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: "fixture-order" }, error: null }) }) }) });
  settings.mockResolvedValue({ data: { config: defaultShippingConfig }, error: null });
  quoteProvider.mockResolvedValue([{ id: 1, name: "PAC", price: 12.34, delivery_time: 3, company: { name: "Correios" } }]);
});

// These are synthetic measurements used only to verify selection and provider
// requests. They must never be copied into the operational store configuration.
const measuredCombination = {
  name: "Synthetic measured parcel", shirtQuantity: 2, balaclavaQuantity: 1,
  weightKg: 0.743, lengthCm: 34, widthCm: 25, heightCm: 7,
};

describe("Exact measured apparel packaging", () => {
  it("keeps legacy configurations valid and retains balaclava-only packaging", () => {
    const legacy = shippingConfigSchema.parse(defaultShippingConfig);
    expect(legacy.apparelPackages).toBeUndefined();
    expect(chooseCartPackage([{ id: "gato-divertido", qty: 3 }], legacy)).toEqual(choosePackage(3, legacy));
    expect(chooseCartPackage(mixed, legacy)).toBeNull();
    expect(chooseCartPackage([{ id: "fixture-shirt-m", qty: 1 }], legacy)).toBeNull();
  });

  it("uses only a matching combination and returns its measured packed weight unchanged", () => {
    const config = { ...defaultShippingConfig, apparelPackages: [measuredCombination] };
    expect(chooseCartPackage(mixed, config)).toEqual(measuredCombination);
    expect(chooseCartPackage([
      { id: "fixture-shirt-m", qty: 1 }, { id: "fixture-shirt-g", qty: 1 }, { id: "gato-divertido", qty: 1 },
    ], config)).toEqual(measuredCombination);
    expect(chooseCartPackage([{ id: "fixture-shirt-m", qty: 1 }, { id: "gato-divertido", qty: 1 }], config)).toBeNull();
    expect(chooseCartPackage([{ id: "fixture-shirt-m", qty: 2 }], config)).toBeNull();
    expect(chooseCartPackage([{ id: "fixture-shirt-m", qty: 2 }, { id: "gato-divertido", qty: 2 }], config)).toBeNull();
  });

  it("rejects unmeasured, fractional, and ambiguous packaging configurations", () => {
    for (const changes of [{ weightKg: 0 }, { lengthCm: 0 }, { widthCm: 0 }, { heightCm: 0 }, { shirtQuantity: 0 }, { shirtQuantity: 1.5 }, { balaclavaQuantity: -1 }]) {
      expect(shippingConfigSchema.safeParse({ ...defaultShippingConfig, apparelPackages: [{ ...measuredCombination, ...changes }] }).success).toBe(false);
    }
    expect(shippingConfigSchema.safeParse({ ...defaultShippingConfig, apparelPackages: [measuredCombination, { ...measuredCombination, name: "Conflicting parcel" }] }).success).toBe(false);
    expect(() => chooseCartPackage([{ id: "unknown-shirt-m", qty: 1 }], defaultShippingConfig)).toThrow("Item inválido");
    expect(() => chooseCartPackage([{ id: "fixture-shirt-m", qty: 1.5 }], defaultShippingConfig)).toThrow("Item inválido");
  });

  it("blocks the external quote until the precise combination has been measured", async () => {
    await expect(quoteFreight("38408562", mixed)).rejects.toThrow("combinação de produtos");
    expect(quoteProvider).not.toHaveBeenCalled();
  });

  it("sends the measured volume and catalog insurance value to the freight provider", async () => {
    settings.mockResolvedValue({ data: { config: { ...defaultShippingConfig, apparelPackages: [measuredCombination] } }, error: null });
    const options = await quoteFreight("38408562", mixed);
    expect(quoteProvider).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(quoteProvider.mock.calls[0]?.[1]?.body);
    const volume = { height: 7, width: 25, length: 34, weight: 0.743 };
    expect(payload.volumes).toEqual([volume]);
    expect(payload.options.insurance_value).toBe(209.7);
    expect(options[0]?.package).toEqual(volume);
  });

  it("requires real measurements for a new admin combination and allows removing it", () => {
    function Editor() {
      const [config, setConfig] = useState(defaultShippingConfig);
      return <><ApparelPackagingSettings config={config} onChange={setConfig} /><output aria-label="Configuração válida">{String(shippingConfigSchema.safeParse(config).success)}</output></>;
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar combinação" }));
    expect(screen.getByRole("spinbutton", { name: "Peso total embalado (kg)" })).toHaveValue(null);
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("false");
    fireEvent.change(screen.getByRole("textbox", { name: "Nome da embalagem" }), { target: { value: "Synthetic test package" } });
    for (const [label, value] of [
      ["Camisetas nesta embalagem (un.)", "2"], ["Balaclavas nesta embalagem (un.)", "1"],
      ["Peso total embalado (kg)", "0.743"], ["Comprimento externo (cm)", "34"],
      ["Largura externa (cm)", "25"], ["Altura externa (cm)", "7"],
    ]) fireEvent.change(screen.getByRole("spinbutton", { name: label! }), { target: { value } });
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("true");
    fireEvent.click(screen.getByRole("button", { name: "Remover combinação 1" }));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("true");
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("SKU prices and shirt sizes in the shared checkout", () => {
  it("calculates mixed products in cents and preserves each size as a separate line", () => {
    expect(validatedTotal(mixed, 0, option.priceCents)).toBe(22204);
    expect(validatedTotal(mixed, 500, option.priceCents)).toBe(21704);
    const sized = [{ id: "fixture-shirt-m", qty: 1 }, { id: "fixture-shirt-g", qty: 1 }];
    expect(cartLinesSchema.safeParse(sized).success).toBe(true);
    expect(cartLinesSchema.safeParse([...sized, sized[0]]).success).toBe(false);
    expect(cartLinesSchema.safeParse([{ id: "fixture-shirt", qty: 1 }]).success).toBe(false);
    const selection = { cep: "38408562", cartKey: checkoutCartKey([sized[0]!]), option };
    expect(currentShipping(selection, [sized[1]!])).toBeNull();
  });

  it("totals per SKU in the persistent cart and ignores unknown SKU additions", () => {
    const { result } = renderHook(useCart, { wrapper: CartProvider });
    act(() => {
      result.current.add("gato-divertido");
      result.current.add("fixture-shirt-m", 2);
      result.current.add("fixture-shirt-g");
      result.current.add("fixture-shirt");
    });
    expect(result.current.count).toBe(4);
    expect(result.current.subtotal).toBe(289.6);
    expect(result.current.items).toHaveLength(3);
    act(() => result.current.setQty("fixture-shirt-m", 1));
    expect(result.current.subtotal).toBe(209.7);
  });

  it("snapshots each SKU price and size and sends the same total to Mercado Pago", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "test-token");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "remote-fixture",
      status: "created",
      checkout_url: "https://www.mercadopago.com.br/checkout/fixture",
    })));
    vi.stubGlobal("fetch", request);
    const result = await mercadoPagoPaymentLink(mixed, "38408562", option, testDeliveryAddress);
    expect(result.totalCents).toBe(22204);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      items: expectedItems,
      subtotal_cents: 20970,
      freight_cents: 1234,
      payment_status: "pending",
    }));
    const payload = JSON.parse(request.mock.calls[0]?.[1]?.body);
    expect(payload.total_amount).toBe("222.04");
    expect(payload.items).toEqual([
      { title: "Balaclava Gato Divertido", quantity: 1, unit_price: "49.90" },
      { title: shirtName, quantity: 2, unit_price: "79.90" },
      { title: "Frete Correios PAC", quantity: 1, unit_price: "12.34" },
    ]);
    expect(update).toHaveBeenCalledExactlyOnceWith({ payment_link_id: "mp:remote-fixture" });
  });

  it("records identical SKU prices and the total in the legacy Appmax path", async () => {
    vi.stubEnv("APPMAX_CLIENT_ID", "fixture-id");
    vi.stubEnv("APPMAX_CLIENT_SECRET", "fixture-secret");
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fixture-token" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: {
        id: "fixture-link", checkout_url: "https://checkout.appmax.com.br/fixture",
      } })));
    vi.stubGlobal("fetch", request);
    const result = await appmaxPaymentLink(mixed, "38408562", option, testDeliveryAddress);
    expect(result.totalCents).toBe(22204);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ items: expectedItems, subtotal_cents: 20970 }));
    const payload = JSON.parse(request.mock.calls[1]?.[1]?.body);
    expect(payload.value).toBe(22204);
    expect(payload.description).toContain(`2x ${shirtName}`);
    expect(update).toHaveBeenCalledExactlyOnceWith({ payment_link_id: "fixture-link" });
  });

  it.each([mercadoPagoPaymentLink, appmaxPaymentLink])("rejects an unsized unknown shirt before provider or database side effects", async (paymentLink) => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(paymentLink([{ id: "fixture-shirt", qty: 1 }], "38408562", option, testDeliveryAddress)).rejects.toThrow("Item inválido");
    expect(request).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
