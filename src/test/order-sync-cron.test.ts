import { afterEach, describe, expect, it, vi } from "vitest";

const { sync, authenticate } = vi.hoisted(() => ({ sync: vi.fn(), authenticate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/bling-orders.server", () => ({ syncPaidOrders: sync }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: authenticate }));
import { Route } from "@/routes/api/public/cron/sync-orders";

// The router factory above exposes the handler without starting a server.
const handler = (Route as unknown as { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
afterEach(() => vi.resetAllMocks());
describe("Order synchronization cron", () => {
  it("returns non-success for partial failures without exposing internal errors", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockResolvedValue({ checked: 1, exported: 0, errors: ["database write failed"] });
    const response = await handler({ request: new Request("https://local.invalid/api/public/cron/sync-orders", { method: "POST" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ checked: 1, exported: 0, failures: 1 });
  });
  it("does not convert a database exception into successful counters", async () => {
    authenticate.mockResolvedValue(null); sync.mockRejectedValue(new Error("database read failed"));
    await expect(handler({ request: new Request("https://local.invalid", { method: "POST" }) })).rejects.toThrow("database read failed");
  });
  it("returns success when the cycle completes without failures", async () => {
    authenticate.mockResolvedValue(null); sync.mockResolvedValue({ checked: 0, exported: 0, errors: [] });
    expect((await handler({ request: new Request("https://local.invalid", { method: "POST" }) })).status).toBe(200);
  });
  it("preserves cron authentication before any synchronization", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await handler({ request: new Request("https://local.invalid", { method: "POST" }) })).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
});
