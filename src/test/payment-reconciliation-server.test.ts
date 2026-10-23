import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaseLostError, RetryableSyncError } from "@/lib/financial-errors";
const { rpc, single, commit, renew, defer, authenticate } = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), commit: vi.fn(), renew: vi.fn(), defer: vi.fn(), authenticate: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc, from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } }));
vi.mock("@/lib/checkout.server", () => ({ authenticateAppmax: authenticate }));
import { reconcileAppmaxOrder } from "@/lib/payment-reconciliation.server";
const order = { id: "local", payment_link_id: "link", provider_payment_id: null, subtotal_cents: 4990, discount_cents: 0, freight_cents: 1474, financial_revision: "lease-revision" };
const membership = (ids = [12]) => new Response(JSON.stringify({ data: ids.map((id) => ({ order: { id } })), meta: { total_pages: 1 } }));
const approved = (id: number, paid_at = "2026-10-22 20:00:00") => new Response(JSON.stringify({ data: { order: { id, status: "aprovado", total_paid: 6464 }, payment: { paid_at } } }));
function setup() {
  let generation = 0;
  authenticate.mockResolvedValue("test-token");
  renew.mockImplementation(async () => ({ data: `renewed-${++generation}`, error: null }));
  commit.mockResolvedValue({ data: true, error: null }); defer.mockResolvedValue({ data: true, error: null });
  rpc.mockImplementation(async (name: string, args: unknown) => {
    if (name === "claim_appmax_check_v2") return { data: "lease-revision", error: null };
    if (name === "renew_appmax_check") return renew(args);
    if (name === "commit_appmax_check") return commit(args);
    if (name === "defer_appmax_check") return defer(args);
    throw new Error(`Unexpected RPC ${name}`);
  });
  single.mockResolvedValue({ data: order, error: null });
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Appmax reconciliation safety", () => {
  it("does not run concurrent checks when the database lease is held", async () => {
    rpc.mockResolvedValue({ data: null, error: null }); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await reconcileAppmaxOrder("local")).toEqual({ checked: false }); expect(fetcher).not.toHaveBeenCalled(); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("uses saved link membership and the latest renewed revision to commit", async () => {
    setup(); const fetcher = vi.fn().mockResolvedValueOnce(membership()).mockResolvedValueOnce(approved(12)); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).resolves.toEqual({ checked: true, status: "aprovado" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.appmax.com.br/v1/payment-link/link/orders?page=1");
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.appmax.com.br/v1/orders/12");
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ _expected_revision: "renewed-4", _provider_payment_id: "12", _payment_state: "approved", _inconclusive: false }));
    expect(renew.mock.calls.map(([args]) => args._expected_revision)).toEqual(["lease-revision", "renewed-1", "renewed-2", "renewed-3"]);
  });
  it("holds multiple approved orders rather than exporting twice", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(membership([12, 13])).mockResolvedValueOnce(approved(12)).mockResolvedValueOnce(approved(13)));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Mais de um pedido pago");
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ _inconclusive: true, _payment_state: null, _expected_revision: "renewed-4" }));
  });
  it("does not confirm payment on an authorization/API contract failure", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-error", { status: 403 })));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("403");
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ _inconclusive: true }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("private-error");
  });
  it("reports a claim database error before calling Appmax", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("iniciar a conferência"); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([false, null])("does not report a rejected commit (%s) as checked", async (data) => {
    setup(); commit.mockResolvedValue({ data, error: null }); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(membership([])));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Conferência não aplicada"); expect(commit).toHaveBeenCalledTimes(1);
  });
  it("does not retry writes after an uncertain commit database error", async () => {
    setup(); commit.mockResolvedValue({ data: null, error: { message: "write failed" } }); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(membership([])));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("salvar a conferência"); expect(commit).toHaveBeenCalledTimes(1); expect(defer).not.toHaveBeenCalled();
  });
  it("refuses to use a snapshot from another lease", async () => {
    setup(); single.mockResolvedValue({ data: { ...order, financial_revision: "newer" }, error: null });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).rejects.toBeInstanceOf(LeaseLostError); expect(fetcher).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
  });
  it("reports failure to persist manual review", async () => {
    setup(); commit.mockResolvedValue({ data: null, error: { message: "write failed" } }); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-error", { status: 403 })));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("registrar a revisão manual");
  });
  it("does not approve malformed paid_at", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(membership()).mockResolvedValueOnce(approved(12, "invalid")));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("data ou valor divergente"); expect(commit).toHaveBeenCalledWith(expect.objectContaining({ _inconclusive: true, _payment_state: null }));
  });
  it("renews between slow reads exceeding the initial 60-second lease", async () => {
    setup(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    let lastRenewal = Date.now(); let generation = 0;
    renew.mockImplementation(async () => {
      if (Date.now() - lastRenewal >= 60000) return { data: null, error: null };
      lastRenewal = Date.now(); return { data: `slow-${++generation}`, error: null };
    });
    let call = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      vi.setSystemTime(Date.now() + 9000);
      const index = call++;
      if (index === 0) return membership([12, 13, 14, 15, 16, 17, 18]);
      if (index === 1) return approved(12);
      return new Response(JSON.stringify({ data: { order: { id: 11 + index, status: "pendente" } } }));
    }));
    await expect(reconcileAppmaxOrder("local")).resolves.toEqual({ checked: true, status: "aprovado" });
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ _expected_revision: "slow-10" }));
  });
  it("stops before the next provider call if renewal loses ownership", async () => {
    setup(); renew.mockResolvedValueOnce({ data: "first-renewal", error: null }).mockResolvedValueOnce({ data: null, error: null });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).rejects.toBeInstanceOf(LeaseLostError);
    expect(fetcher).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expect(defer).not.toHaveBeenCalled();
  });
  it.each([429, 503])("defers temporary HTTP %s without creating a manual financial hold", async (status) => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-body", { status })));
    await expect(reconcileAppmaxOrder("local")).rejects.toBeInstanceOf(RetryableSyncError);
    expect(defer).toHaveBeenCalledWith(expect.objectContaining({ _expected_revision: "renewed-2" })); expect(commit).not.toHaveBeenCalled();
  });
  it("does not hide failure to persist retry backoff", async () => {
    setup(); defer.mockResolvedValue({ data: null, error: { message: "db unavailable" } }); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network unavailable")));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("agendar nova conferência"); expect(commit).not.toHaveBeenCalled();
  });
  it("bounds total runtime and safely defers an incomplete observation", async () => {
    setup(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => { vi.setSystemTime(Date.now() + 111000); return membership(); }));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("orçamento de tempo"); expect(commit).not.toHaveBeenCalled(); expect(defer).toHaveBeenCalledOnce();
  });
});
