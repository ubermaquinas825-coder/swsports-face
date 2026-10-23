import { RetryableSyncError } from "@/lib/financial-errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSyncSlot } from "@/lib/appmax-webhook";

const { sync } = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/bling-orders.server", () => ({ syncPaidOrders: sync }));
import { Route } from "@/routes/api/public/webhooks/appmax";

const handler = (Route as unknown as { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const post = (body: unknown) => new Request("https://local.invalid/api/public/webhooks/appmax", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const paid = { event: "order_approved", event_type: "order", data: { order_id: 3531, status: "aprovado", total: 49.9 } };

beforeEach(() => { resetSyncSlot(); sync.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("Appmax payment webhook", () => {
  it("ignores a non-order event without touching the providers", async () => {
    const response = await handler({ request: post({ event: "customer_created", event_type: "customer", data: {} }) });
    expect(response.status).toBe(200);
    expect(sync).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON without reconciling", async () => {
    const response = await handler({ request: post("not json at all") });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, code: "INVALID_JSON" });
    expect(sync).not.toHaveBeenCalled();
  });

  it("rejects an envelope without an event type without reconciling", async () => {
    const response = await handler({ request: post({ data: { order_id: 1 } }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, code: "INVALID_ENVELOPE" });
    expect(sync).not.toHaveBeenCalled();
  });

  it("reconciles once for a paid notification and never forwards its contents", async () => {
    sync.mockResolvedValue({ checked: 1, exported: 1, errors: [], retryableFailures: 0, recovered: 0 });
    const response = await handler({ request: post(paid) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith();
  });

  it("collapses the burst of notifications from one sale into a single pass", async () => {
    sync.mockResolvedValue({ checked: 1, exported: 1, errors: [], retryableFailures: 0, recovered: 0 });
    expect((await handler({ request: post(paid) })).status).toBe(200);
    expect((await handler({ request: post({ event: "order_paid_by_pix", event_type: "order", data: { order_id: 3531 } }) })).status).toBe(200);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("asks Appmax to redeliver when a provider is temporarily unavailable", async () => {
    sync.mockRejectedValue(new RetryableSyncError("Appmax indisponível"));
    const response = await handler({ request: post(paid) });
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toEqual({ ok: false, code: "RETRY_LATER" });
  });

  it("asks for redelivery when a pass reports only temporary failures", async () => {
    sync.mockResolvedValue({ checked: 0, exported: 0, errors: ["provider timeout"], retryableFailures: 1, recovered: 0 });
    const response = await handler({ request: post(paid) });
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("does not ask Appmax to redeliver a sale that needs a human decision", async () => {
    sync.mockResolvedValue({ checked: 1, exported: 0, errors: ["conferência manual necessária"], retryableFailures: 0, recovered: 0 });
    const response = await handler({ request: post(paid) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers the provider inside its five-second delivery budget", async () => {
    vi.useFakeTimers();
    sync.mockReturnValue(new Promise<never>(() => {}));
    const pending = handler({ request: post(paid) });
    await vi.advanceTimersByTimeAsync(4_000);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("keeps maintenance mode ahead of any reconciliation", async () => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
    const response = await handler({ request: post(paid) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ maintenance: true });
    expect(sync).not.toHaveBeenCalled();
  });
});
