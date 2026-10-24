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
    const finish = screen.getByRole("button", { name: "FINALIZAR COMPRA" });
    expect(finish).toBeDisabled();
    expect(screen.getByText(/Pagamento seguro pelo Mercado Pago/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Selecionar frete de teste"));

    expect(finish).toBeEnabled();
    expect(screen.getByText("R$ 12,34")).toBeInTheDocument();
    expect(screen.getByText("R$ 62,24")).toBeInTheDocument();
  });

  it("rejects a stale freight selection that belongs to a different cart", () => {
    render(<CartDrawer />);
    fireEvent.click(screen.getByText("Selecionar frete antigo"));

    expect(screen.getByRole("button", { name: "FINALIZAR COMPRA" })).toBeDisabled();
    expect(screen.getByText("Escolha o frete")).toBeInTheDocument();
  });
});
