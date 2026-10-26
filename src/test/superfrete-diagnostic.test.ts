import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { buildLabelPayload } from "@/lib/shipping-labels";
import { labelInfo, labelInput } from "./fixtures/shipping-label";
const { from, provider } = vi.hoisted(() => ({ from: vi.fn(), provider: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/superfrete.server", () => ({ superfreteRequest: provider }));
import { diagnoseSuperfreteShipment } from "@/lib/superfrete-diagnostic.server";
beforeEach(() => {
  from.mockImplementation((table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      single: async () => ({
        error: null,
        data:
          table === "shipping_orders"
            ? { id: "order", provider_shipment_id: "shipment-test", freight_cents: 1234 }
            : { payload: { manual_payment: true, shipment: buildLabelPayload(labelInput) } },
      }),
    };
    return q;
  });
  provider.mockResolvedValue(labelInfo("shipment-test", "pending"));
});
afterEach(() => vi.resetAllMocks());
describe("Read-only SuperFrete diagnostics", () => {
  it("reads the existing shipment and exposes no customer or secret data", async () => {
    const result = await diagnoseSuperfreteShipment("order");
    expect(result).toEqual({
      shipmentId: "shipment-test",
      status: "pending",
      priceCents: 1234,
      problems: [],
    });
    expect(provider.mock.calls).toEqual([["order/info/shipment-test", undefined]]);
    expect(JSON.stringify(result)).not.toContain(labelInput.address.name);
  });
  it("shows structural mismatch field paths without returning raw provider values", async () => {
    provider.mockResolvedValue({
      id: "shipment-test",
      status: "pending",
      private_customer: "private-data",
    });
    const result = await diagnoseSuperfreteShipment("order");
    expect(result.status).toBe("Resposta incompatível");
    expect(result.problems.some((p) => p.includes("price"))).toBe(true);
    expect(JSON.stringify(result)).not.toContain("private-data");
  });
  it("identifies a mismatched saved address without exposing either address", async () => {
    const info = labelInfo();
    info.to.city = "Different";
    provider.mockResolvedValue(info);
    const result = await diagnoseSuperfreteShipment("order");
    expect(result.problems).toContain("Endereço da etiqueta divergente do pedido.");
    expect(JSON.stringify(result)).not.toContain("Different");
  });
  it("does not leak arbitrary errors or provider bodies", async () => {
    provider.mockRejectedValue(new Error("token=private-token"));
    expect(JSON.stringify(await diagnoseSuperfreteShipment("order"))).not.toContain(
      "private-token",
    );
  });
  it("reports only a safe HTTP status for provider refusal", async () => {
    provider.mockRejectedValue(new Error("SuperFrete recusou a operação (HTTP 403)."));
    expect((await diagnoseSuperfreteShipment("order")).problems[0]).toContain("HTTP 403");
  });
});
