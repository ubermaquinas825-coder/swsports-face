import { describe, expect, it, vi, afterEach } from "vitest";
const insert = vi.fn(); const update = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ insert, update }) } }));
import { appmaxPaymentLink, authenticateAppmax } from "@/lib/checkout.server";
describe("Pending checkout persistence", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("records R$49.90 plus freight and keeps payment/Bling pending even after Appmax returns a checkout link", async () => {
    vi.stubEnv("APPMAX_CLIENT_ID", "test-id"); vi.stubEnv("APPMAX_CLIENT_SECRET", "test-secret");
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "test-order" }, error: null }) }) });
    update.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: "test-order" }, error: null }) }) }) });
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }))).mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "test-link", checkout_url: "https://checkout.appmax.com.br/test" } })));
    vi.stubGlobal("fetch", request);
    await appmaxPaymentLink([{ id: "gato-divertido", qty: 1 }], "38408562", { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ subtotal_cents: 4990, freight_cents: 1234, quoted_cep: "38408562", payment_status: "pending", bling_sync_status: "awaiting_payment" }));
    expect(update).toHaveBeenCalledExactlyOnceWith({ payment_link_id: "test-link" });
    expect(JSON.parse(request.mock.calls[1]?.[1]?.body)).toMatchObject({ value: 6224, allow_multiple_sales: false });
  });
  it("checks Appmax credentials without inserting orders or creating links", async () => {
    vi.stubEnv("APPMAX_CLIENT_ID", "test-id"); vi.stubEnv("APPMAX_CLIENT_SECRET", "test-secret");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: "test-token" })));
    vi.stubGlobal("fetch", request);
    await authenticateAppmax();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("https://auth.appmax.com.br/oauth2/token");
    expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it("does not log Appmax error responses that may echo secrets", async () => {
    vi.stubEnv("APPMAX_CLIENT_ID", "test-id"); vi.stubEnv("APPMAX_CLIENT_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive-error-body", { status: 401 })));
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try { await expect(authenticateAppmax()).rejects.toThrow("401"); expect(logger).toHaveBeenCalledWith("Appmax request failed [401]"); expect(JSON.stringify(logger.mock.calls)).not.toContain("sensitive-error-body"); }
    finally { logger.mockRestore(); }
  });
  it("flags an ambiguous payment-link failure for reconciliation, without confirming payment", async () => {
    vi.stubEnv("APPMAX_CLIENT_ID", "test-id"); vi.stubEnv("APPMAX_CLIENT_SECRET", "test-secret");
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "test-order" }, error: null }) }) });
    update.mockReturnValue({ eq: async () => ({ error: null }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }))).mockRejectedValueOnce(new Error("Timeout")));
    await expect(appmaxPaymentLink([{ id: "gato-divertido", qty: 1 }], "38408562", { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 })).rejects.toThrow("Nenhum pagamento foi confirmado");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ bling_sync_status: "reconciliation_required" }));
    expect(update.mock.calls.some(([row]) => row.payment_status === "approved")).toBe(false);
  });
});