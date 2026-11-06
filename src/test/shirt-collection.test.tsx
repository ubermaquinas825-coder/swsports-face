import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/products")>();
  const model = {
    ...actual.shirtModels[0]!,
    id: "fixture-model",
    image: "/fixture-shirt.webp",
    gallery: [
      { src: "/fixture-front.webp", alt: "Camisa de teste vista de frente", label: "Frente" },
      { src: "/fixture-back.webp", alt: "Camisa de teste vista de costas", label: "Costas" },
    ],
    sizes: ["M", "G"],
    checkoutReady: true,
  };
  const variants = model.sizes.map((size) => actual.shirtVariantFor(model, size)!);
  return {
    ...actual,
    shirtModels: [model, { ...actual.shirtModels[1]!, image: null, gallery: [], checkoutReady: false }],
    productFor: (id: string) => variants.find((variant) => variant.id === id) ?? actual.productFor(id),
  };
});

import { ShirtCollection } from "@/components/ShirtCollection";
import { CartProvider, useCart } from "@/hooks/use-cart";

function CartStatus() {
  const { items, subtotal, isOpen } = useCart();
  return <output data-testid="cart-status">{JSON.stringify({ items, subtotal, isOpen })}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Shirt selection in the shared cart", () => {
  it("opens size selection from the buy action for an enabled model", () => {
    render(<CartProvider><ShirtCollection /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "COMPRAR AGORA" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Selecione um tamanho para adicionar ao carrinho.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ESCOLHA UM TAMANHO" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    expect(screen.getByRole("button", { name: "ADICIONAR AO CARRINHO" })).toBeEnabled();
  });

  it("requires a size, adds the selected SKU at R$ 79,90, and opens the cart", async () => {
    render(<CartProvider><ShirtCollection /><CartStatus /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 02" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ESCOLHA UM TAMANHO" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "G" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ADICIONAR AO CARRINHO" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(JSON.parse(screen.getByTestId("cart-status").textContent!)).toEqual({
      items: [{ id: "fixture-model-g", qty: 1 }], subtotal: 79.9, isOpen: true,
    });
  });

  it("shows confirmed sizes but keeps a model unavailable until operational data and photos are confirmed", () => {
    render(<CartProvider><ShirtCollection /><CartStatus /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 03" }));
    expect(screen.getByRole("button", { name: "EM BREVE" })).toBeDisabled();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual(["P", "M", "G", "GG", "XG", "XGG"]);
    expect(screen.queryByRole("radio", { name: "PP" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    expect(screen.getByRole("button", { name: "EM BREVE" })).toBeDisabled();
    expect(within(screen.getByRole("dialog")).queryByRole("img")).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("cart-status").textContent!).items).toEqual([]);
  });

  it("switches between original front and back gallery images using named controls", () => {
    render(<CartProvider><ShirtCollection /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 02" }));
    expect(screen.getByRole("img", { name: "Camisa de teste vista de frente" })).toHaveAttribute("src", "/fixture-front.webp");
    fireEvent.click(screen.getByRole("button", { name: "Ver foto: Costas" }));
    expect(screen.getByRole("img", { name: "Camisa de teste vista de costas" })).toHaveAttribute("src", "/fixture-back.webp");
    expect(screen.getByRole("button", { name: "Ver foto: Costas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ver foto: Frente" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the confirmed piece measurements and marks PP unavailable on reference 03", async () => {
    render(<CartProvider><ShirtCollection /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 03" }));
    fireEvent.click(screen.getByText("Tabela de medidas"));
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("row", { name: "PP Indisponível 49 66" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: "XGG 62 84" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("DrySport")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Unissex")).toBeInTheDocument();
  });

  it("does not display an unverified size table for reference 02", () => {
    render(<CartProvider><ShirtCollection /></CartProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 02" }));
    expect(screen.queryByText("Tabela de medidas")).not.toBeInTheDocument();
    expect(screen.getByText("Slim")).toBeInTheDocument();
  });

  it("returns keyboard focus to the model that opened the details", async () => {
    render(<CartProvider><ShirtCollection /></CartProvider>);
    const opener = screen.getByRole("button", { name: "Ver detalhes de Camisa iFood Entregador — Ref. 02" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
