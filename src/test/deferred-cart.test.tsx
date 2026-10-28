import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "@/hooks/use-cart";
import { DeferredCartDrawer } from "@/components/DeferredCartDrawer";

const loaded = vi.hoisted(() => vi.fn());
const failure = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/components/CartDrawer", async (importOriginal) => {
  loaded();
  const original = await importOriginal<typeof import("@/components/CartDrawer")>();
  return { CartDrawer: () => {
    if (failure.enabled) throw new Error("Cart chunk failed");
    return <original.CartDrawer />;
  } };
});
vi.mock("@/components/ShippingCalculator", () => ({
  ShippingCalculator: ({ onSelect }: { onSelect: (value: unknown) => void }) => (
    <button onClick={() => onSelect({ cep: "38408562", cartKey: "gato-divertido:1", option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 } })}>Escolher frete</button>
  ),
}));

function Storefront() {
  const cart = useCart();
  return <>
    <button onClick={() => { cart.add("gato-divertido"); cart.openCart(); }}>Comprar</button>
    <button onClick={cart.openCart}>Abrir carrinho</button>
    <DeferredCartDrawer />
  </>;
}

afterEach(() => { cleanup(); failure.enabled = false; vi.restoreAllMocks(); });

it("defers checkout until the cart opens, and retains freight when closed and reopened", async () => {
  localStorage.clear();
  render(<CartProvider><Storefront /></CartProvider>);
  expect(loaded).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("Comprar"));
  await waitFor(() => expect(screen.getByText("Escolher frete")).toBeInTheDocument());
  expect(loaded).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText("Escolher frete"));
  expect(screen.getByRole("button", { name: "CONTINUAR PARA PAGAMENTO" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Fechar carrinho" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Abrir carrinho"));
  expect(screen.getByRole("button", { name: "CONTINUAR PARA PAGAMENTO" })).toBeEnabled();
  expect(screen.getByText("R$ 62,24")).toBeInTheDocument();
  expect(loaded).toHaveBeenCalledOnce();
});

it("keeps the storefront usable when the deferred cart fails, with a reload recovery", async () => {
  localStorage.clear();
  failure.enabled = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<CartProvider><Storefront /></CartProvider>);
  fireEvent.click(screen.getByText("Comprar"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir o carrinho");
  expect(screen.getByRole("button", { name: "Recarregar" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Comprar" })).toBeInTheDocument();
});
