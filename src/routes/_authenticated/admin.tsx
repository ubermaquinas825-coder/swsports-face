import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkPayments } from "@/lib/payment-reconciliation.functions";
import { useState } from "react";
import { LogOut, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetails } from "@/components/OrderDetails";
import { Input } from "@/components/ui/input";
import { getSalesAdmin } from "@/lib/sales.functions";
import { dateTime, money, orderTotal, paymentLabels, record, text } from "@/lib/sales";
import { shippingStates } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Vendas e pedidos | SW Sports" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SalesAdmin,
});

export function SalesAdmin() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();
  const check = useServerFn(checkPayments);
  const [checkingPayments, setCheckingPayments] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["sales-admin", page],
    queryFn: () => getSalesAdmin({ data: { page } }),
    retry: false,
    gcTime: 0,
  });
  const orders = query.data?.orders ?? [];
  const filtered = orders.filter((order) => {
    const a = record(order.delivery_address);
    const haystack = [
      order.id,
      text(a["name"]),
      text(a["email"]),
      text(a["phone"]),
      text(a["document"]),
      text(a["city"]),
      order.tracking_code,
      JSON.stringify(order.items),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    return (
      (status === "all" || order.payment_status === status) &&
      haystack.includes(search.trim().toLocaleLowerCase("pt-BR"))
    );
  });
  const order = orders.find((o) => o.id === selected);
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand">SW SPORTS · ADMINISTRATIVO</p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold">
              <ShoppingBag /> Vendas e pedidos
            </h1>
            <p className="mt-2 text-muted-foreground">
              Acompanhe seus clientes, pagamentos e entregas.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={checkingPayments}
              onClick={async () => {
                setCheckingPayments(true);
                setPaymentMessage("");
                try {
                  const result = await check();
                  setPaymentMessage(
                    `${result.checked} pagamento(s) conferido(s). ${result.errors.length ? "Alguns pagamentos exigem nova conferência." : "Conferência concluída."}`,
                  );
                  await qc.invalidateQueries({ queryKey: ["sales-admin"] });
                } catch (error) {
                  setPaymentMessage(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível conferir os pagamentos.",
                  );
                } finally {
                  setCheckingPayments(false);
                }
              }}
            >
              {checkingPayments ? "Conferindo…" : "Conferir pagamentos"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/frete-envios">Frete e envios</Link>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await qc.cancelQueries();
                qc.clear();
                await supabase.auth.signOut();
                await navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut size={16} /> Sair
            </Button>
          </nav>
        </header>
        <p role="status" className="mb-4 text-sm">
          {paymentMessage}
        </p>
        {query.isPending ? (
          <p role="status">Carregando pedidos…</p>
        ) : query.isError ? (
          <section role="alert" className="rounded-xl border p-6">
            <p>{query.error.message}</p>
            <Button className="mt-4" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </section>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Pedidos nesta página", String(orders.length)],
                [
                  "Pagos nesta página",
                  String(orders.filter((o) => o.payment_status === "approved").length),
                ],
                [
                  "Total pago nesta página",
                  money(
                    orders
                      .filter((o) => o.payment_status === "approved")
                      .reduce((sum, o) => sum + orderTotal(o), 0),
                  ),
                ],
              ].map(([label, value]) => (
                <section key={label} className="rounded-xl border bg-card p-5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </section>
              ))}
            </div>
            <section className="rounded-xl border bg-card p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap gap-3">
                <label className="min-w-48 flex-1 text-sm">
                  Buscar nesta página
                  <Input
                    className="mt-2"
                    placeholder="Cliente, telefone, pedido ou produto"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Pagamento
                  <select
                    className="mt-2 block h-10 rounded-md border bg-background px-3"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {Object.entries(paymentLabels).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  className="self-end"
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => query.refetch()}
                >
                  <RefreshCw size={16} /> Atualizar
                </Button>
              </div>
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">
                  {orders.length
                    ? "Nenhum pedido corresponde aos filtros desta página."
                    : "Nenhum pedido registrado."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Pedidos e compradores</caption>
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        {["Pedido / data", "Cliente", "Total", "Pagamento", "Entrega", ""].map(
                          (h, i) => (
                            <th key={i} className="p-3">
                              {h || "Detalhes"}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((o) => (
                        <tr key={o.id} className="border-b">
                          <td className="p-3">
                            <span className="font-mono">{o.id.slice(0, 8)}</span>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dateTime(o.created_at)}
                            </p>
                          </td>
                          <td className="p-3">
                            {text(record(o.delivery_address)["name"]) || "Cliente não registrado"}
                            <p className="text-xs text-muted-foreground">
                              {text(record(o.delivery_address)["city"])}
                            </p>
                          </td>
                          <td className="whitespace-nowrap p-3 font-semibold">
                            {money(orderTotal(o))}
                          </td>
                          <td className="p-3">
                            {paymentLabels[o.payment_status] ?? o.payment_status}
                          </td>
                          <td className="p-3">
                            {o.payment_status === "approved" &&
                            o.shipping_status === "awaiting_payment"
                              ? "Aguardando preparo do envio"
                              : (shippingStates[o.shipping_status] ?? o.shipping_status)}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              aria-label={`Ver pedido ${o.id}`}
                              onClick={() => setSelected(o.id)}
                            >
                              Ver pedido
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} · {query.data?.count ?? 0} pedidos no total · até 50 por página
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => {
                      setPage(page - 1);
                      setSelected(null);
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={(page + 1) * 50 >= (query.data?.count ?? 0)}
                    onClick={() => {
                      setPage(page + 1);
                      setSelected(null);
                    }}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </section>
            {order && <OrderDetails order={order} onClose={() => setSelected(null)} />}
          </>
        )}
      </div>
    </main>
  );
}
