import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { productFor } from "@/lib/products";

vi.mock("@/hooks/use-cart", () => ({ useCart: () => ({
  lines: [{ product: productFor("gato-divertido"), qty: 1 }], count: 1, subtotal: 49.9,
  isOpen: true, closeCart: vi.fn(), setQty: vi.fn(), remove: vi.fn(),
}) }));
vi.mock("@/components/ShippingCalculator", () => ({ ShippingCalculator: ({ onSelect }: { onSelect: (selection: unknown) => void }) => (
  <div>
    <button onClick={() => onSelect({ cep: "38408562", cartKey: "gato-divertido:1", option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 } })}>Selecionar frete de teste</button>
    <button onClick={() => onSelect({ cep: "38408562", cartKey: "outro-produto:1", option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 } })}>Selecionar frete antigo</button>
  </div>
) }));
import { CartDrawer } from "@/components/CartDrawer";

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Cart delivery handoff", () => {
  it("requires a current freight selection before sending the customer to Mercado Pago checkout", () => {
    render(<CartDrawer />);

    const blockedCheckout = screen.getByRole("button", { name: "ESCOLHA O FRETE PARA CONTINUAR" });
    expect(blockedCheckout).toBeDisabled();
    expect(screen.getByText(/pagamento seguro no Mercado Pago/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Selecionar frete de teste"));

    const enabledCheckout = screen.getByRole("button", { name: "CONTINUAR PARA PAGAMENTO" });
    expect(enabledCheckout).toBeEnabled();
    expect(screen.getByText("R$ 12,34")).toBeInTheDocument();
    expect(screen.getByText("R$ 62,24")).toBeInTheDocument();
  });

  it("rejects a stale freight selection that belongs to a different cart", () => {
    render(<CartDrawer />);
    fireEvent.click(screen.getByText("Selecionar frete antigo"));

    expect(screen.getByRole("button", { name: "ESCOLHA O FRETE PARA CONTINUAR" })).toBeDisabled();
    expect(screen.getByText("Calcule e escolha acima")).toBeInTheDocument();
  });
});
