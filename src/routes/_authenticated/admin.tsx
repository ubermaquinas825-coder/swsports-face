import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuperfreteOrderAction } from "@/components/SuperfreteOrderAction";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { productFor } from "@/lib/products";
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
  const a = record(order?.delivery_address);
  const service = record(order?.shipping_service);
  const info = (label: string, value: string) => (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value || "Não registrado"}</dd>
    </div>
  );
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
                            {shippingStates[o.shipping_status] ?? o.shipping_status}
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
            {order && (
              <Dialog
                open={Boolean(order)}
                onOpenChange={(open) => {
                  if (!open) setSelected(null);
                }}
              >
                <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl bg-card p-5 sm:p-8">
                  <div className="pr-6">
                    <div className="mb-6 flex flex-wrap justify-between gap-3">
                      <div>
                        <DialogTitle className="text-xl font-bold">Detalhes do pedido</DialogTitle>
                        <DialogDescription className="mt-2">
                          Produtos comprados, comprador, pagamento e entrega.
                        </DialogDescription>
                        <p className="mt-1 break-all font-mono text-xs">{order.id}</p>
                      </div>
                      <Button variant="outline" onClick={() => setSelected(null)}>
                        Fechar detalhes
                      </Button>
                    </div>
                    <h3 className="mb-4 mt-8 font-bold">Produtos comprados</h3>
                    <div className="space-y-3">
                      {Array.isArray(order.items) && order.items.length ? (
                        order.items.map((item, i) => {
                          const p = record(item);
                          const catalog = productFor(text(p["id"]));
                          return (
                            <div
                              key={i}
                              className="flex flex-wrap justify-between gap-3 rounded-lg border p-4"
                            >
                              <div className="flex items-center gap-4">
                                {catalog && (
                                  <img
                                    src={catalog.image}
                                    alt={catalog.name}
                                    className="h-20 w-20 rounded-md bg-background object-contain"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold">
                                    {text(p["name"]) || catalog?.name || "Produto sem nome"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Código: {text(p["id"]) || "Não registrado"} · Quantidade:{" "}
                                    {typeof p["qty"] === "number" ? p["qty"] : "Não registrada"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p>
                                  {typeof p["unit_price_cents"] === "number"
                                    ? `${money(p["unit_price_cents"])} / un.`
                                    : "Preço não registrado"}
                                </p>
                                {typeof p["unit_price_cents"] === "number" &&
                                  typeof p["qty"] === "number" && (
                                    <p className="mt-1 font-semibold">
                                      Subtotal: {money(p["unit_price_cents"] * p["qty"])}
                                    </p>
                                  )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p>Itens não registrados.</p>
                      )}
                    </div>
                    <dl className="ml-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
                      <dt>Produtos</dt>
                      <dd className="text-right">{money(order.subtotal_cents)}</dd>
                      <dt>Descontos</dt>
                      <dd className="text-right">− {money(order.discount_cents)}</dd>
                      <dt>Frete</dt>
                      <dd className="text-right">
                        {order.freight_cents === null
                          ? "Não registrado"
                          : money(order.freight_cents)}
                      </dd>
                      <dt className="font-bold">Total do pedido</dt>
                      <dd className="text-right font-bold">{money(orderTotal(order))}</dd>
                    </dl>
                    <div className="mt-8 grid gap-8 lg:grid-cols-2">
                      <section>
                        <h3 className="mb-4 font-bold">Comprador e contato</h3>
                        <dl className="grid gap-4 sm:grid-cols-2">
                          {info("Nome", text(a["name"]))}
                          {info("CPF / CNPJ", text(a["document"]))}
                          {info("E-mail", text(a["email"]))}
                          {info("Telefone com DDD", text(a["phone"]))}
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {/^[1-9]\d{9,10}$/.test(text(a["phone"])) && (
                            <Button asChild variant="outline">
                              <a
                                href={`https://wa.me/55${text(a["phone"])}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Conversar no WhatsApp
                              </a>
                            </Button>
                          )}
                          {text(a["email"]) && (
                            <Button asChild variant="outline">
                              <a href={`mailto:${text(a["email"])}`}>Enviar e-mail</a>
                            </Button>
                          )}
                        </div>
                      </section>
                      <section>
                        <h3 className="mb-4 font-bold">Endereço de entrega</h3>
                        {order.delivery_address ? (
                          <address className="space-y-1 not-italic">
                            <p>{text(a["name"])}</p>
                            <p>
                              {text(a["street"])}, {text(a["number"])}
                            </p>
                            <p>{text(a["complement"])}</p>
                            <p>{text(a["district"])}</p>
                            <p>
                              {text(a["city"])} / {text(a["state"])} · CEP {text(a["postalCode"])}
                            </p>
                          </address>
                        ) : (
                          <p>Endereço não registrado neste pedido.</p>
                        )}
                      </section>
                      <section>
                        <h3 className="mb-4 font-bold">Pagamento</h3>
                        <dl className="grid gap-4 sm:grid-cols-2">
                          {info(
                            "Situação",
                            paymentLabels[order.payment_status] ?? order.payment_status,
                          )}
                          {info("Pedido criado em", dateTime(order.created_at))}
                          {info(
                            "Provedor",
                            order.payment_link_id?.startsWith("mp:")
                              ? "Mercado Pago"
                              : order.payment_link_id
                                ? "Appmax"
                                : "",
                          )}
                          {info("Forma de pagamento", "Não registrada no histórico atual")}
                          {info("Pago em", "Data exata não registrada no histórico atual")}
                          {info(
                            "Última confirmação financeira",
                            dateTime(order.appmax_payment_verified_at),
                          )}
                          {info("Identificador do pagamento", order.provider_payment_id ?? "")}
                        </dl>
                        <p className="mt-4 text-xs text-muted-foreground">
                          Horários de Brasília. A confirmação financeira indica quando o sistema
                          verificou o pagamento; não é o horário em que o cliente pagou.
                        </p>
                      </section>
                      <section>
                        <h3 className="mb-4 font-bold">Envio</h3>
                        <dl className="grid gap-4 sm:grid-cols-2">
                          {info(
                            "Situação da entrega",
                            shippingStates[order.shipping_status] ?? order.shipping_status,
                          )}
                          {info(
                            "Transportadora / serviço",
                            [text(service["company"]), text(service["name"])]
                              .filter(Boolean)
                              .join(" · "),
                          )}
                          {info("Código de rastreamento", order.tracking_code ?? "")}
                          {info("Integração ERP", order.bling_sync_status)}
                        </dl>
                        <SuperfreteOrderAction key={order.id} order={order} />
                      </section>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>
    </main>
  );
}
