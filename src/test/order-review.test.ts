import { afterEach, describe, expect, it, vi } from "vitest";
const { reconcile, inspect, rpc, single } = vi.hoisted(() => ({ reconcile: vi.fn(), inspect: vi.fn(), rpc: vi.fn(), single: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/payment-reconciliation.server", () => ({ reconcileAppmaxOrder: reconcile }));
vi.mock("@/lib/bling-recovery.server", () => ({ inspectHeldBlingOrder: inspect }));
import { inspectBlingOrderForReview, resolveOrderHold } from "@/lib/order-review.functions";
const context = { userId: "admin", supabase: { rpc, from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } };
const inspectHandler = inspectBlingOrderForReview as unknown as (input: { context: typeof context; data: { id: string } }) => Promise<unknown>;
const resolveHandler = resolveOrderHold as unknown as (input: { context: typeof context; data: { id: string; revision: string; action: string; reason: string; evidence: string } }) => Promise<unknown>;
afterEach(() => vi.resetAllMocks());
describe("Administrative hold review boundary", () => {
  it("rejects non-admin callers before any provider access", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(inspectHandler({ context, data: { id: "order" } })).rejects.toThrow("administrativo");
    expect(reconcile).not.toHaveBeenCalled(); expect(inspect).not.toHaveBeenCalled();
  });
  it("does not inspect unrelated orders without a hold", async () => {
    rpc.mockResolvedValue({ data: true, error: null }); single.mockResolvedValue({ data: { bling_sync_status: "queued" }, error: null });
    await expect(inspectHandler({ context, data: { id: "order" } })).rejects.toThrow("indisponível para revisão");
    expect(reconcile).not.toHaveBeenCalled();
  });
  it("requires a completed financial check before refreshing ERP evidence", async () => {
    rpc.mockResolvedValue({ data: true, error: null }); single.mockResolvedValue({ data: { bling_sync_status: "blocked" }, error: null }); reconcile.mockResolvedValue({ checked: false });
    await expect(inspectHandler({ context, data: { id: "order" } })).rejects.toThrow("Conferência financeira indisponível");
    expect(inspect).not.toHaveBeenCalled();
  });
  it("returns the current revision after inspection without resolving automatically", async () => {
    rpc.mockResolvedValue({ data: true, error: null }); reconcile.mockResolvedValue({ checked: true });
    single.mockResolvedValue({ data: { bling_sync_status: "blocked", payment_status: "approved", financial_revision: "fresh" }, error: null });
    inspect.mockResolvedValue({ outcome: "found", blingId: 42 });
    await expect(inspectHandler({ context, data: { id: "order" } })).resolves.toEqual({ outcome: "found", blingId: 42, revision: "fresh", paymentStatus: "approved" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("uses the authenticated RPC and never supplies an actor chosen by the client", async () => {
    rpc.mockResolvedValue({ data: "applied", error: null });
    await expect(resolveHandler({ context, data: { id: "order", revision: "expected", action: "keep_blocked", reason: "reviewed reason", evidence: "ticket FIN-1" } })).resolves.toEqual({ revision: "applied" });
    expect(rpc).toHaveBeenCalledWith("resolve_shipping_order_hold", { _order_id: "order", _expected_revision: "expected", _action: "keep_blocked", _reason: "reviewed reason", _evidence: "ticket FIN-1" });
    expect(reconcile).not.toHaveBeenCalled(); expect(inspect).not.toHaveBeenCalled();
  });
  it("does not present a rejected resolution as successful", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "stale evidence" } });
    await expect(resolveHandler({ context, data: { id: "order", revision: "old", action: "accept_verified_export", reason: "reviewed reason", evidence: "ticket FIN-1" } })).rejects.toThrow("Resolução recusada");
  });
});
