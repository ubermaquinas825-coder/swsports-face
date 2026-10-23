import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sender, labelInput, labelInfo } from "./fixtures/shipping-label";
import { defaultShippingConfig } from "@/lib/shipping";

const { from, rpc, provider, reconcile } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), provider: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from, rpc } }));
vi.mock("@/lib/superfrete.server", () => ({ superfreteRequest: provider }));
vi.mock("@/lib/payment-reconciliation.server", () => ({ reconcileAppmaxOrder: reconcile }));
import { issueShippingLabel, syncShippingLabels } from "@/lib/shipping-labels.server";

let claimed: boolean;
let state: string;
let order: Record<string, unknown>;
const config = { ...defaultShippingConfig, labelAutomation: { enabled: true, sender } };

beforeEach(() => {
  claimed = false; state = "";
  vi.stubEnv("LOVABLE_API_KEY", "test"); vi.stubEnv("UDC_SUPERFRETE_API_KEY", "test");
  order = { id: labelInput.orderId, financial_revision: "rev", payment_status: "approved", bling_sync_status: "synced",
    provider_shipment_id: null, quoted_cep: labelInput.cep, freight_cents: 1234, discount_cents: 0,
    delivery_address: labelInput.address, shipping_service: labelInput.service, items: labelInput.items, subtotal_cents: 4990 };
  from.mockImplementation((table: string) => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { config }, error: null }), single: async () => ({ data: order, error: null }) };
    if (!["shipping_settings", "shipping_orders"].includes(table)) throw new Error("Unexpected table");
    return q;
  });
  reconcile.mockResolvedValue({ checked: true });
  rpc.mockImplementation(async (name: string, args: Record<string, string>) => {
    if (name === "claim_shipping_label") {
      if (claimed) return { data: null, error: null };
      claimed = true; state = "creating"; return { data: "ownership-token", error: null };
    }
    if (name === "advance_shipping_label") {
      if (state !== args["_from"]) return { data: false, error: null };
      state = args["_to"]!; return { data: true, error: null };
    }
    if (name === "fail_shipping_label") { state = "review"; return { data: null, error: null }; }
    throw new Error("Unexpected RPC");
  });
  provider.mockImplementation(async (path: string) => {
    if (path === "calculator") return [{ id: 1, price: 12.34 }];
    if (path === "cart") return { id: "shipment-test", price: 12.34, status: "pending" };
    if (path.startsWith("order/info/")) return labelInfo("shipment-test", state === "paying" ? "released" : "pending");
    if (path === "checkout") return { success: true, purchase: { status: "paid", orders: [{ id: "shipment-test", tracking: "TRACK1" }] } };
    if (path === "tag/print") return { url: "https://api.superfrete.com/_etiqueta/pdf/test" };
    throw new Error("Unexpected provider operation");
  });
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe("Automatic labels with simulated providers", () => {
  it("confirms payment, creates once, verifies contents, debits once and saves official PDF", async () => {
    await expect(issueShippingLabel(labelInput.orderId)).resolves.toEqual({ issued: true });
    expect(reconcile).toHaveBeenCalledWith(labelInput.orderId);
    expect(provider.mock.calls.map(([path]) => path)).toEqual(["calculator", "cart", "order/info/shipment-test", "checkout", "order/info/shipment-test", "tag/print"]);
    expect(state).toBe("complete");
    expect(rpc).toHaveBeenLastCalledWith("advance_shipping_label", expect.objectContaining({ _to: "complete", _url: "https://api.superfrete.com/_etiqueta/pdf/test", _tracking: "TRACK1" }));
  });
  it("allows only one side-effect sequence across concurrent workers", async () => {
    const results = await Promise.all([issueShippingLabel(labelInput.orderId), issueShippingLabel(labelInput.orderId)]);
    expect(results.filter((result) => result.issued)).toHaveLength(1);
    expect(provider.mock.calls.filter(([path]) => path === "cart")).toHaveLength(1);
    expect(provider.mock.calls.filter(([path]) => path === "checkout")).toHaveLength(1);
  });
  it.each(["pending", "failed"])("does not create an external shipment for %s payment", async (status) => {
    order["payment_status"] = status;
    await expect(issueShippingLabel(labelInput.orderId)).resolves.toEqual({ issued: false });
    expect(provider).not.toHaveBeenCalled();
  });
  it("does not emit if reconciliation is busy or a protected hold exists", async () => {
    reconcile.mockResolvedValueOnce({ checked: false });
    expect(await issueShippingLabel(labelInput.orderId)).toEqual({ issued: false });
    order["bling_sync_status"] = "reconciliation_required";
    expect(await issueShippingLabel(labelInput.orderId)).toEqual({ issued: false });
    expect(provider).not.toHaveBeenCalled();
  });
  it("does not create or pay when the freight price changes", async () => {
    provider.mockResolvedValueOnce([{ id: 1, price: 99 }]);
    await expect(issueShippingLabel(labelInput.orderId)).rejects.toThrow("preço do frete mudou");
    expect(provider).toHaveBeenCalledTimes(1); expect(rpc).not.toHaveBeenCalled();
  });
  it("never repeats creation after an ambiguous timeout", async () => {
    const normal = provider.getMockImplementation()!;
    provider.mockImplementation((path: string, ...args: unknown[]) => path === "cart" ? Promise.reject(new Error("Timeout")) : normal(path, ...args));
    await expect(issueShippingLabel(labelInput.orderId)).rejects.toThrow("Emissão interrompida");
    expect(state).toBe("review");
    expect(await issueShippingLabel(labelInput.orderId)).toEqual({ issued: false });
    expect(provider.mock.calls.filter(([path]) => path === "cart")).toHaveLength(1);
    expect(provider.mock.calls.some(([path]) => path === "checkout")).toBe(false);
  });
  it("does not debit a label with divergent recipient data", async () => {
    const normal = provider.getMockImplementation()!;
    provider.mockImplementation((path: string, ...args: unknown[]) => path.startsWith("order/info/") ? Promise.resolve({ ...labelInfo(), to: { ...labelInfo().to, postal_code: "01310100" } }) : normal(path, ...args));
    await expect(issueShippingLabel(labelInput.orderId)).rejects.toThrow("Emissão interrompida");
    expect(state).toBe("review"); expect(provider.mock.calls.some(([path]) => path === "checkout")).toBe(false);
  });
  it("never repeats a failed or ambiguous wallet debit", async () => {
    const normal = provider.getMockImplementation()!;
    provider.mockImplementation((path: string, ...args: unknown[]) => path === "checkout" ? Promise.reject(new Error("Saldo insuficiente ou timeout")) : normal(path, ...args));
    await expect(issueShippingLabel(labelInput.orderId)).rejects.toThrow("Emissão interrompida");
    expect(state).toBe("review");
    expect(await issueShippingLabel(labelInput.orderId)).toEqual({ issued: false });
    expect(provider.mock.calls.filter(([path]) => path === "checkout")).toHaveLength(1);
  });
  it("does not touch the new migration or any provider while disabled", async () => {
    from.mockImplementation(() => {
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { config: defaultShippingConfig }, error: null }) }; return q;
    });
    expect(await syncShippingLabels()).toEqual({ issued: 0, errors: [] });
    expect(rpc).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });
  it("stops before database or providers during financial maintenance", async () => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
    await expect(issueShippingLabel(labelInput.orderId)).rejects.toThrow("manutenção");
    await expect(syncShippingLabels()).rejects.toThrow("manutenção");
    expect(from).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });
});
