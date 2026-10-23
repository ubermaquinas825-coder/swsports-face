import { afterEach, describe, expect, it, vi } from "vitest";
import { RetryableSyncError } from "@/lib/financial-errors";

const { sync } = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/bling-orders.server", () => ({ syncPaidOrders: sync }));
import { Route } from "@/routes/api/public/webhooks/appmax";
import { resetSyncSlot, tryAcquireSyncSlot } from "@/lib/appmax-webhook";

const handler = (Route as unknown as { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const post = (body: unknown) => handler({ request: new Request("https://local.invalid", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }) });
const ok = { checked: 0, exported: 0, errors: [], retryableFailures: 0, recovered: 0 };
afterEach(() => { vi.resetAllMocks(); resetSyncSlot(); });

describe("Appmax webhook", () => {
  it("ignores non-order events", async () => {
    expect((await post({ event: "customer_created", event_type: "customer" })).status).toBe(200);
    expect(sync).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON and envelopes", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post({ foo: 1 })).status).toBe(400);
  });
  it("triggers authenticated sync without forwarding the payload", async () => {
    sync.mockResolvedValue(ok);
    expect((await post({ event: "order_approved", event_type: "order", data: { status: "aprovado" } })).status).toBe(200);
    expect(sync).toHaveBeenCalledWith();
  });
  it("throttles bursts within 3 seconds", () => {
    expect(tryAcquireSyncSlot(10_000)).toBe(true);
    expect(tryAcquireSyncSlot(11_000)).toBe(false);
    expect(tryAcquireSyncSlot(13_001)).toBe(true);
  });
  it("asks Appmax to retry on temporary failures", async () => {
    sync.mockRejectedValue(new RetryableSyncError("x"));
    const r = await post({ event: "order_paid", event_type: "order" });
    expect(r.status).toBe(503);
  });
});
