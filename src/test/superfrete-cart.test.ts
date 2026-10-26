import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { sender, labelInput, labelInfo } from "./fixtures/shipping-label";
import { defaultShippingConfig } from "@/lib/shipping";
const { from, rpc, provider, verify } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  provider: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from, rpc } }));
vi.mock("@/lib/superfrete.server", () => ({
  superfreteConfigured: () => true,
  superfreteRequest: provider,
}));
vi.mock("@/lib/mercadopago.server", () => ({
  mercadoPagoOrderIdFromLink: () => "mp-order",
  verifyMercadoPagoStoredOrder: verify,
}));
vi.mock("@/lib/payment-reconciliation.server", () => ({ reconcileAppmaxOrder: vi.fn() }));
import { prepareSuperfreteCart } from "@/lib/superfrete-cart.server";
let order: Record<string, unknown>;
let reserved: boolean;
beforeEach(() => {
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
  reserved = false;
  order = {
    id: labelInput.orderId,
    financial_revision: "rev",
    payment_status: "approved",
    bling_sync_status: "synced",
    payment_link_id: "mp:order",
    provider_payment_id: "payment",
    provider_shipment_id: null,
    quoted_cep: labelInput.cep,
    freight_cents: 1234,
    discount_cents: 0,
    delivery_address: labelInput.address,
    shipping_service: labelInput.service,
    items: labelInput.items,
    subtotal_cents: 4990,
    shipping_status: "awaiting_label",
  };
  from.mockImplementation((table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      update: vi.fn(() => q),
      single: async () => ({
        data:
          table === "shipping_settings"
            ? { config: { ...defaultShippingConfig, labelAutomation: { enabled: false, sender } } }
            : order,
        error: null,
      }),
    };
    return q;
  });
  verify.mockResolvedValue({ state: "approved", providerPaymentId: "payment" });
  rpc.mockImplementation(async (name: string) => {
    if (name === "claim_manual_shipping_cart") {
      if (reserved) return { data: null, error: null };
      reserved = true;
      return { data: "token", error: null };
    }
    order["provider_shipment_id"] = "shipment-test";
    order["shipping_status"] = "awaiting_label_payment";
    return { data: true, error: null };
  });
  provider.mockImplementation(async (path: string) => {
    if (path === "calculator") return [{ id: 1, price: 12.34 }];
    if (path === "cart") return { id: "shipment-test", status: "pending", price: 12.34 };
    if (path === "order/info/shipment-test") return labelInfo("shipment-test", "pending");
    throw new Error("Forbidden payment operation");
  });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("Manual SuperFrete preparation", () => {
  it("creates a verified cart without calling checkout or paying", async () => {
    await expect(prepareSuperfreteCart(labelInput.orderId)).resolves.toMatchObject({
      shipmentId: "shipment-test",
      dashboardUrl: "https://web.superfrete.com/",
    });
    expect(provider.mock.calls.map(([path]) => path)).toEqual([
      "calculator",
      "cart",
      "order/info/shipment-test",
    ]);
    expect(provider).toHaveBeenCalledWith(
      "cart",
      sender.email,
      expect.objectContaining({
        to: expect.objectContaining({ name: labelInput.address.name }),
        products: expect.any(Array),
      }),
    );
  });
  it("prepares an independently verified MP order without clearing the ERP setup hold", async () => {
    order["bling_sync_status"] = "reconciliation_required";
    order["bling_sync_error"] = "Envio ao Bling falhou: Vínculos Bling não configurados.";
    await expect(prepareSuperfreteCart(labelInput.orderId)).resolves.toMatchObject({
      shipmentId: "shipment-test",
    });
    expect(verify).toHaveBeenCalled();
    expect(order["bling_sync_status"]).toBe("reconciliation_required");
  });
  it("rejects a refunded MP payment even when the ERP hold is only missing setup", async () => {
    order["bling_sync_status"] = "reconciliation_required";
    order["bling_sync_error"] = "Envio ao Bling falhou: Vínculos Bling não configurados.";
    verify.mockResolvedValue({ state: "failed" });
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow(
      "Pagamento não confirmado",
    );
    expect(provider).not.toHaveBeenCalled();
  });
  it("blocks unpaid orders before provider requests", async () => {
    order["payment_status"] = "pending";
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow("aprovado");
    expect(provider).not.toHaveBeenCalled();
  });
  it("blocks maintenance before any database access", async () => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow("manutenção");
    expect(from).not.toHaveBeenCalled();
  });
  it("does not create a shipment when the current freight differs", async () => {
    provider.mockResolvedValue([{ id: 1, price: 99 }]);
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow("valor do frete mudou");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("never repeats cart creation after an ambiguous timeout", async () => {
    provider.mockImplementation(async (path: string) => {
      if (path === "calculator") return [{ id: 1, price: 12.34 }];
      throw new Error("timeout");
    });
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow(
      "Preparação interrompida",
    );
    await expect(prepareSuperfreteCart(labelInput.orderId)).rejects.toThrow(
      "já existe uma tentativa",
    );
    expect(provider.mock.calls.filter(([path]) => path === "cart")).toHaveLength(1);
  });
});
