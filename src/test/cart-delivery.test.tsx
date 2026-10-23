import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { productFor } from "@/lib/products";
import { testDeliveryAddress } from "./fixtures/delivery-address";

const { checkout } = vi.hoisted(() => ({ checkout: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/checkout.functions", () => ({ createAppmaxCheckout: checkout }));
vi.mock("@/hooks/use-cart", () => ({ useCart: () => ({
  lines: [{ product: productFor("gato-divertido"), qty: 1 }], count: 1, subtotal: 49.9,
  isOpen: true, closeCart: vi.fn(), setQty: vi.fn(), remove: vi.fn(),
}) }));
vi.mock("@/components/ShippingCalculator", () => ({ ShippingCalculator: ({ onSelect }: { onSelect: (selection: unknown) => void }) => (
  <button onClick={() => onSelect({ cep: "38408562", cartKey: "gato-divertido:1", option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 } })}>Selecionar frete de teste</button>
) }));
import { CartDrawer } from "@/components/CartDrawer";

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Cart delivery checkout", () => {
  it("collects the recipient after freight selection and sends the address to the payment handler", async () => {
    checkout.mockRejectedValue(new Error("Pagamento de teste indisponível."));
    const { container } = render(<CartDrawer />);
    expect(screen.getByRole("button", { name: "CONTINUAR PARA APPMAX" })).toBeDisabled();
    fireEvent.click(screen.getByText("Selecionar frete de teste"));
    for (const [name, value] of Object.entries(testDeliveryAddress)) {
      if (name === "postalCode") continue;
      const input = container.querySelector(`[name="${name}"]`);
      if (!input) throw new Error(`Missing delivery field ${name}`);
      fireEvent.change(input, { target: { value } });
    }
    expect(screen.getByLabelText("CEP cotado")).toHaveValue("38408562");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "CONTINUAR PARA APPMAX" }));
    await waitFor(() => expect(checkout).toHaveBeenCalledWith({ data: {
      lines: [{ id: "gato-divertido", qty: 1 }], cep: "38408562", serviceId: "1", quotedPriceCents: 1234,
      deliveryAddress: testDeliveryAddress,
    } }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pagamento de teste indisponível.");
  });
  it("does not request payment when the recipient document is invalid", async () => {
    const { container } = render(<CartDrawer />);
    fireEvent.click(screen.getByText("Selecionar frete de teste"));
    for (const [name, value] of Object.entries({ ...testDeliveryAddress, document: "11111111111" })) {
      if (name === "postalCode") continue;
      fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } });
    }
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "CONTINUAR PARA APPMAX" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("CPF ou CNPJ válido");
    expect(checkout).not.toHaveBeenCalled();
  });
});
