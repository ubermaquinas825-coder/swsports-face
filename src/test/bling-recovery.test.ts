import { afterEach, describe, expect, it, vi } from "vitest";
const { rpc, token } = vi.hoisted(() => ({ rpc: vi.fn(), token: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
vi.mock("@/lib/bling.server", () => ({ getBlingAccessToken: token }));
import { inspectHeldBlingOrder, recoverStaleBlingOrders } from "@/lib/bling-recovery.server";
import { RetryableSyncError } from "@/lib/financial-errors";

const order = { id: "local", financial_revision: "held-revision" } as Parameters<typeof inspectHeldBlingOrder>[0];
const json = (body: unknown) => new Response(JSON.stringify(body));
function setup(responses: Response[]) {
  rpc.mockResolvedValue({ data: true, error: null }); token.mockResolvedValue("fixture-token");
  const fetcher = vi.fn(); responses.forEach((response) => fetcher.mockResolvedValueOnce(response));
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
describe("Read-only Bling processing recovery", () => {
  it("records exactly one existing ERP order after verifying its detailed store reference", async () => {
    const fetcher = setup([json({ data: [{ id: 42 }] }), json({ data: { id: 42, numeroLoja: "local" } })]);
    await expect(inspectHeldBlingOrder(order)).resolves.toEqual({ outcome: "found", blingId: 42 });
    expect(rpc).toHaveBeenCalledWith("record_bling_recovery", { _order_id: "local", _expected_revision: "held-revision", _outcome: "found", _bling_order_id: 42 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [, options] of fetcher.mock.calls) expect(options.method).toBe("GET");
  });
  it.each([
    [[], "not_found"], [[{ id: 42 }, { id: 43 }], "ambiguous"],
  ])("never recreates a missing or ambiguous order: %j", async (rows, outcome) => {
    const fetcher = setup([json({ data: rows })]);
    await expect(inspectHeldBlingOrder(order)).resolves.toEqual({ outcome, blingId: null });
    expect(fetcher).toHaveBeenCalledOnce(); expect(fetcher.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(rpc).toHaveBeenCalledWith("record_bling_recovery", expect.objectContaining({ _outcome: outcome, _bling_order_id: null }));
  });
  it("does not associate a provider result with a different store reference", async () => {
    setup([json({ data: [{ id: 42 }] }), json({ data: { id: 42, numeroLoja: "another-order" } })]);
    await expect(inspectHeldBlingOrder(order)).resolves.toEqual({ outcome: "ambiguous", blingId: null });
  });
  it("records lookup failures without releasing the hold or retrying creation", async () => {
    const fetcher = setup([new Response("private-error", { status: 503 })]);
    await expect(inspectHeldBlingOrder(order)).resolves.toEqual({ outcome: "lookup_failed", blingId: null });
    expect(fetcher).toHaveBeenCalledOnce(); expect(JSON.stringify(rpc.mock.calls)).not.toContain("private-error");
  });
  it("cannot record recovery over a newer financial or operational revision", async () => {
    setup([json({ data: [] })]); rpc.mockResolvedValue({ data: false, error: null });
    await expect(inspectHeldBlingOrder(order)).rejects.toThrow("sem sobrescrever");
  });
  it("reports quarantine database failures as retryable without provider calls", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db unavailable" } });
    await expect(recoverStaleBlingOrders()).rejects.toBeInstanceOf(RetryableSyncError); expect(token).not.toHaveBeenCalled();
  });
  it("returns manual review after quarantining and discovering an existing order", async () => {
    const fetcher = setup([json({ data: [{ id: 42 }] }), json({ data: { id: 42, numeroLoja: "local" } })]);
    rpc.mockResolvedValueOnce({ data: [order], error: null }).mockResolvedValueOnce({ data: true, error: null });
    const result = await recoverStaleBlingOrders();
    expect(result.inspected).toBe(1); expect(result.errors[0]).toContain("resolução administrativa");
    expect(fetcher.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });
});
