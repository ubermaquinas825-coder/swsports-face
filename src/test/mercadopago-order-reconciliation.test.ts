import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MercadoPagoManualReviewError,
  MercadoPagoRequestError,
  readMercadoPagoOrder,
  verifyMercadoPagoStoredOrder,
} from "@/lib/mercadopago.server";

const storedOrder = {
  id: "order-1",
  payment_link_id: "mp:remote-1",
  subtotal_cents: 4990,
  discount_cents: 0,
  freight_cents: 1234,
  payment_status: "pending",
  bling_sync_status: "awaiting_payment",
  provider_payment_id: null,
};

beforeEach(() => {
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "ci-test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Mercado Pago order reconciliation", () => {
  it("keeps an incomplete non-final order pending when final payment fields are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "remote-1",
            type: "online",
            external_reference: "order-1",
            status: "created",
            total_amount: "62.24",
            transactions: { payments: [{ id: "payment-1", status: "pending" }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(verifyMercadoPagoStoredOrder(storedOrder)).resolves.toMatchObject({
      state: "pending",
      providerPaymentId: null,
      status: "created",
    });
  });

  it("requires paid totals before accepting a processed payment as approved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "remote-1",
            type: "online",
            external_reference: "order-1",
            status: "processed",
            status_detail: "accredited",
            total_amount: "62.24",
            transactions: {
              payments: [{ id: "payment-1", status: "processed", status_detail: "accredited" }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(verifyMercadoPagoStoredOrder(storedOrder)).rejects.toBeInstanceOf(
      MercadoPagoManualReviewError,
    );
  });

  it("accepts an accredited order when transaction amount matches the gross order even if paid_amount differs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "remote-1",
            type: "online",
            external_reference: "order-1",
            status: "processed",
            status_detail: "accredited",
            total_amount: "62.24",
            total_paid_amount: "59.12",
            transactions: {
              payments: [
                {
                  id: "payment-1",
                  status: "processed",
                  status_detail: "accredited",
                  amount: "62.24",
                  paid_amount: "59.12",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(verifyMercadoPagoStoredOrder(storedOrder)).resolves.toMatchObject({
      state: "approved",
      providerPaymentId: "payment-1",
      status: "processed",
      statusDetail: "accredited",
    });
  });

  it("rejects an accredited order when transaction amount does not compose the expected gross total", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "remote-1",
            type: "online",
            external_reference: "order-1",
            status: "processed",
            status_detail: "accredited",
            total_amount: "62.24",
            total_paid_amount: "59.12",
            transactions: {
              payments: [
                {
                  id: "payment-1",
                  status: "processed",
                  status_detail: "accredited",
                  amount: "60.00",
                  paid_amount: "59.12",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(verifyMercadoPagoStoredOrder(storedOrder)).rejects.toThrow(
      "Pagamento Mercado Pago aprovado com composição de valor divergente",
    );
  });

  it("demotes an expected historical 404 without logging the provider body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-provider-body", { status: 404 })));
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => {});
    const warningLogger = vi.spyOn(console, "warn").mockImplementation(() => {});

    let caught: unknown;
    try {
      await readMercadoPagoOrder("old-order");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MercadoPagoRequestError);
    expect((caught as MercadoPagoRequestError).status).toBe(404);
    expect(errorLogger).not.toHaveBeenCalled();
    expect(warningLogger).toHaveBeenCalledWith("Mercado Pago request handled [404]");
    expect(JSON.stringify(warningLogger.mock.calls)).not.toContain("private-provider-body");
  });

  it("keeps unexpected provider failures as errors without logging the provider body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-500-body", { status: 500 })));
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readMercadoPagoOrder("remote-1")).rejects.toBeInstanceOf(MercadoPagoRequestError);
    expect(logger).toHaveBeenCalledWith("Mercado Pago request failed [500]");
    expect(JSON.stringify(logger.mock.calls)).not.toContain("private-500-body");
  });

  it("rejects a structurally incompatible response without logging its body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "remote-1", secret_echo: "must-not-log" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readMercadoPagoOrder("remote-1")).rejects.toBeInstanceOf(MercadoPagoManualReviewError);
    expect(JSON.stringify(logger.mock.calls)).not.toContain("must-not-log");
  });
});
