import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productFor } from "@/lib/products";

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => ({ lines: [{ product: productFor("gato-divertido"), qty: 1 }], subtotal: 49.9 }),
}));
vi.mock("@/lib/checkout.functions", () => ({ createMercadoPagoCheckout: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import { Route } from "@/routes/checkout";

const CheckoutPage = Route.options.component!;
const manualMessage = "Não foi possível preencher o endereço automaticamente. Complete os campos manualmente.";

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.setItem("swsports-checkout-shipping-v1", JSON.stringify({
    cep: "38408562", cartKey: "gato-divertido:1",
    option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 },
  }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("optional address autocomplete", () => {
  it("releases payment after 8 seconds and ignores a late provider response", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CheckoutPage />);

    expect(screen.getByText("Buscando endereço...")).toBeInTheDocument();
    screen.getAllByRole("button", { name: "REALIZAR PAGAMENTO" }).forEach((button) => expect(button).toBeDisabled());

    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].signal.aborted).toBe(true);
    expect(screen.getByText(manualMessage)).toBeInTheDocument();
    screen.getAllByRole("button", { name: "REALIZAR PAGAMENTO" }).forEach((button) => expect(button).toBeEnabled());

    const street = screen.getByRole("textbox", { name: "Rua / avenida" });
    fireEvent.change(street, { target: { value: "Rua preenchida manualmente" } });
    await act(async () => {
      resolveResponse({ ok: true, json: async () => ({ logradouro: "Resposta atrasada", localidade: "Outra cidade", uf: "SP" }) } as Response);
    });
    expect(street).toHaveValue("Rua preenchida manualmente");
    expect(screen.getByText(manualMessage)).toBeInTheDocument();
  });

  it("fills a successful address and releases payment immediately", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ logradouro: "Rua Álvares de Azevedo", bairro: "Carajás", localidade: "Uberlândia", uf: "MG" }),
    }));
    await act(async () => { render(<CheckoutPage />); });
    expect(screen.getByRole("textbox", { name: "Rua / avenida" })).toHaveValue("Rua Álvares de Azevedo");
    expect(screen.getByText("Endereço localizado. Confira o número e os dados pessoais.")).toBeInTheDocument();
    screen.getAllByRole("button", { name: "REALIZAR PAGAMENTO" }).forEach((button) => expect(button).toBeEnabled());
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.queryByText(manualMessage)).not.toBeInTheDocument();
  });

  it("offers manual entry immediately on provider failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
    await act(async () => { render(<CheckoutPage />); });
    expect(screen.getByText(manualMessage)).toBeInTheDocument();
    screen.getAllByRole("button", { name: "REALIZAR PAGAMENTO" }).forEach((button) => expect(button).toBeEnabled());
  });

  it("aborts the lookup when leaving checkout", () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<CheckoutPage />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const signal = fetchMock.mock.calls[0]![1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
