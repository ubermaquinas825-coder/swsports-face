import { afterEach, describe, expect, it, vi } from "vitest";
const { prepare, inspect, role } = vi.hoisted(() => ({
  prepare: vi.fn(),
  inspect: vi.fn(),
  role: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/superfrete-cart.server", () => ({ prepareSuperfreteCart: prepare }));
vi.mock("@/lib/superfrete-diagnostic.server", () => ({ diagnoseSuperfreteShipment: inspect }));
import {
  prepareSuperfreteShipping,
  inspectSuperfreteShipping,
} from "@/lib/superfrete-cart.functions";
const invoke = () =>
  (prepareSuperfreteShipping as unknown as (args: unknown) => Promise<unknown>)({
    data: { orderId: "order-id" },
    context: { userId: "admin-id", supabase: { rpc: role } },
  });
afterEach(() => vi.resetAllMocks());
describe("SuperFrete preparation access", () => {
  it.each([
    { data: false, error: null },
    { data: null, error: new Error("role failed") },
  ])("blocks unauthorized roles before creating a shipment", async (value) => {
    role.mockResolvedValue(value);
    await expect(invoke()).rejects.toThrow("administrativo");
    expect(prepare).not.toHaveBeenCalled();
  });
  it("rejects unauthorized diagnostic access before requesting provider data", async () => {
    role.mockResolvedValue({ data: false, error: null });
    await expect(
      (inspectSuperfreteShipping as unknown as (args: unknown) => Promise<unknown>)({
        data: { orderId: "order" },
        context: { userId: "user", supabase: { rpc: role } },
      }),
    ).rejects.toThrow("administrativo");
    expect(inspect).not.toHaveBeenCalled();
  });
  it("allows only the verified admin to prepare the selected order", async () => {
    role.mockResolvedValue({ data: true, error: null });
    prepare.mockResolvedValue({ shipmentId: "shipment" });
    await expect(invoke()).resolves.toEqual({ shipmentId: "shipment" });
    expect(prepare).toHaveBeenCalledWith("order-id");
  });
});
