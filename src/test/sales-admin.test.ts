import { beforeEach, describe, expect, it, vi } from "vitest";
import { dateTime, orderTotal } from "@/lib/sales";
const { rpc, from, range } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), range: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getSalesAdmin } from "@/lib/sales.functions";
const invoke = (page = 0) =>
  (getSalesAdmin as unknown as (args: unknown) => Promise<unknown>)({
    data: { page },
    context: { userId: "user", supabase: { rpc, from } },
  });
beforeEach(() => vi.resetAllMocks());
describe("Sales administration", () => {
  it.each([
    { data: false, error: null },
    { data: null, error: new Error("role lookup failed") },
  ])("refuses customer data when admin authorization fails", async (result) => {
    rpc.mockResolvedValue(result);
    await expect(invoke()).rejects.toThrow("administradores");
    expect(from).not.toHaveBeenCalled();
  });
  it("loads the requested page only after admin authorization", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range };
    from.mockReturnValue(query);
    range.mockResolvedValue({ data: [{ id: "order" }], count: 51, error: null });
    await expect(invoke(1)).resolves.toEqual({ orders: [{ id: "order", shipping_hold: "O pagamento deste pedido ainda não está aprovado." }], count: 51 });
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "user", _role: "admin" });
    expect(range).toHaveBeenCalledWith(50, 99);
    expect(query.select.mock.calls[0]?.[0]).not.toContain("bling_export_token");
  });
  it("does not disguise a database error as an empty order list", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    from.mockReturnValue({ select: () => ({ order: () => ({ order: () => ({ range }) }) }) });
    range.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(invoke()).rejects.toThrow("Não foi possível carregar");
  });
  it("includes freight and discounts in order totals", () => {
    expect(orderTotal({ subtotal_cents: 10000, discount_cents: 1500, freight_cents: 2200 })).toBe(
      10700,
    );
  });
  it("does not manufacture dates for historical payments", () => {
    expect(dateTime(null)).toBe("Não registrado");
    expect(dateTime("invalid")).toBe("Não registrado");
  });
});
