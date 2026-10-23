import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { database, request, authenticate } = vi.hoisted(() => ({ database: vi.fn(), request: vi.fn(), authenticate: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: database, rpc: database } }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: authenticate }));

import { createAppmaxCheckout } from "@/lib/checkout.functions";
import { saveShippingConfig, verifyShippingIntegrations, requestShippingQuote } from "@/lib/shipping.functions";
import { startBlingOAuth, renewBlingOAuth, testBlingProducts } from "@/lib/bling.functions";
import { getBlingInventory, loadBlingWarehouses, saveBlingInventory, discoverBlingCatalog, testBlingInventory } from "@/lib/bling-inventory.functions";
import { checkAppmaxPayments } from "@/lib/payment-reconciliation.functions";
import { inspectBlingOrderForReview, resolveOrderHold } from "@/lib/order-review.functions";
import { appmaxPaymentLink } from "@/lib/checkout.server";
import { exportOrderToBling, syncPaidOrders } from "@/lib/bling-orders.server";
import { reconcileAppmaxOrder } from "@/lib/payment-reconciliation.server";
import { inspectHeldBlingOrder, recoverStaleBlingOrders } from "@/lib/bling-recovery.server";
import { Route as cron } from "@/routes/api/public/cron/sync-orders";
import { Route as oauthStart } from "@/routes/api/public/bling/start";
import { Route as oauthCallback } from "@/routes/api/public/bling/callback";
import { Route as appmaxWebhook } from "@/routes/api/public/webhooks/appmax";

// Exercise handlers directly with simulated auth. Separate existing tests cover
// authentication/authorization; this suite proves the maintenance side-effect fence.
const invoke = (fn: unknown) => (fn as (input: unknown) => Promise<unknown>)({ data: {}, context: { userId: "admin", supabase: { from: database, rpc: database } } });
type RouteConfig = { server: { handlers: Record<string, (input: { request: Request }) => Promise<Response>> } };
const invokeRoute = (route: unknown, method: string) => (route as RouteConfig).server.handlers[method]!({ request: new Request("https://local.invalid/", { method }) });

beforeEach(() => {
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
  database.mockImplementation(() => { throw new Error("Unexpected database access"); });
  request.mockImplementation(() => { throw new Error("Unexpected provider request"); });
  vi.stubGlobal("fetch", request);
  authenticate.mockResolvedValue(null);
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Maintenance fences before database/provider side effects", () => {
  const functions = { createAppmaxCheckout, saveShippingConfig, verifyShippingIntegrations, requestShippingQuote,
    startBlingOAuth, renewBlingOAuth, testBlingProducts, loadBlingWarehouses, saveBlingInventory,
    discoverBlingCatalog, testBlingInventory, checkAppmaxPayments, inspectBlingOrderForReview, resolveOrderHold };
  it.each(Object.entries(functions))("blocks server function %s", async (_name, fn) => {
    await expect(invoke(fn)).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ["checkout persistence", () => appmaxPaymentLink([], "", {} as Parameters<typeof appmaxPaymentLink>[2])],
    ["batch synchronization", () => syncPaidOrders()],
    ["single export", () => exportOrderToBling("order")],
    ["payment reconciliation", () => reconcileAppmaxOrder("order")],
    ["held order inspection", () => inspectHeldBlingOrder({} as Parameters<typeof inspectHeldBlingOrder>[0])],
    ["stale order recovery", () => recoverStaleBlingOrders()],
  ] as const)("blocks direct core entry %s", async (_name, operation) => {
    await expect(operation()).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });

  it.each([["cron", cron, "POST"], ["OAuth start", oauthStart, "GET"], ["OAuth callback", oauthCallback, "GET"], ["Appmax webhook", appmaxWebhook, "POST"]] as const)("returns maintenance for %s without side effects", async (_name, route, method) => {
    const response = await invokeRoute(route, method);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ maintenance: true });
    expect(database).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });

  it("still authenticates cron before returning its maintenance status", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await invokeRoute(cron, "POST")).status).toBe(401);
    expect(database).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });

  it("keeps authorized administrative settings reads available", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const from = vi.fn().mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) });
    await expect((getBlingInventory as unknown as (input: unknown) => Promise<unknown>)({ context: { userId: "admin", supabase: { rpc, from } } })).resolves.toBeDefined();
    expect(from).toHaveBeenCalledWith("bling_store_settings");
    expect(request).not.toHaveBeenCalled();
  });
});
