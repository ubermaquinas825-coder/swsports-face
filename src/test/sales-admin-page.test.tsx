import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { response } = vi.hoisted(() => ({
  response: {
    data: undefined as unknown,
    isPending: false,
    isError: false,
    error: { message: "Acesso exclusivo para administradores." },
    isFetching: false,
    refetch: vi.fn(),
  },
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => response, useQueryClient: () => ({}) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/lib/sales.functions", () => ({ getSalesAdmin: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { SalesAdmin } from "@/routes/_authenticated/admin";
beforeEach(() => {
  response.isError = false;
  response.data = {
    count: 1,
    orders: [
      {
        id: "test-order",
        created_at: "2026-10-26T12:00:00Z",
        delivery_address: {
          name: "Maria Silva",
          phone: "11999999999",
          email: "maria@example.test",
          document: "12345678900",
          street: "Rua das Flores",
          number: "15",
          district: "Centro",
          city: "São Paulo",
          state: "SP",
          postalCode: "01001000",
        },
        items: [{ id: "gato", name: "Balaclava Gato", qty: 2, unit_price_cents: 5000 }],
        subtotal_cents: 10000,
        discount_cents: 1000,
        freight_cents: 2000,
        payment_status: "approved",
        payment_link_id: "mp:123",
        appmax_payment_verified_at: "2026-10-26T12:05:00Z",
        shipping_status: "awaiting_label",
        shipping_service: { name: "PAC", company: "Correios" },
        tracking_code: "AB123BR",
        bling_sync_status: "synced",
      },
    ],
  };
});
describe("Administrative sales page", () => {
  it("opens buyer, delivery and product details without inventing payment dates", () => {
    render(<SalesAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Ver pedido test-order" }));
    expect(screen.getByText("maria@example.test")).toBeInTheDocument();
    expect(screen.getByText("11999999999")).toBeInTheDocument();
    expect(screen.getByText("Rua das Flores, 15")).toBeInTheDocument();
    expect(screen.getByText("Balaclava Gato")).toBeInTheDocument();
    expect(screen.getByText("Mercado Pago")).toBeInTheDocument();
    expect(screen.getByText("Data exata não registrada no histórico atual")).toBeInTheDocument();
    expect(screen.getByText("AB123BR")).toBeInTheDocument();
  });
  it("filters out orders that do not match the customer search", () => {
    render(<SalesAdmin />);
    fireEvent.change(screen.getByPlaceholderText("Cliente, telefone, pedido ou produto"), {
      target: { value: "outro cliente" },
    });
    expect(screen.queryByRole("button", { name: "Ver pedido test-order" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Nenhum pedido corresponde aos filtros desta página."),
    ).toBeInTheDocument();
  });
  it("does not display cached customer details on access failure", () => {
    response.isError = true;
    render(<SalesAdmin />);
    expect(screen.getByRole("alert")).toHaveTextContent("Acesso exclusivo");
    expect(screen.queryByText("Maria Silva")).not.toBeInTheDocument();
  });
});
