import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Clock3,
  FileBarChart2,
  LogOut,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetails } from "@/components/OrderDetails";
import { Input } from "@/components/ui/input";
import { checkPayments } from "@/lib/payment-reconciliation.functions";
import { getSalesAdmin } from "@/lib/sales.functions";
import { dateTime, money, orderTotal, paymentLabels, record, text } from "@/lib/sales";
import { shippingStates } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof ShoppingBag;
  onClick?: () => void;
}) {
  const body = <>
    <div className="flex items-start justify-between gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white shadow-sm backdrop-blur-sm">
        <Icon size={20} aria-hidden="true" />
      </div>
      {onClick && <ArrowUpRight size={18} aria-hidden="true" className="text-white/50" />}
    </div>
    <p className="mt-6 text-sm font-medium text-white/65">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight text-white">{value}</p>
    <p className="mt-2 text-xs text-white/45">{helper}</p>
  </>;

  const className = "group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-5 text-left shadow-[0_18px_55px_-35px_rgba(0,0,0,.75)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_65px_-35px_rgba(0,0,0,.9)]";

  return onClick
    ? <button type="button" onClick={onClick} className={className}>{body}</button>
    : <section className={className}>{body}</section>;
}

function PaymentBadge({ status }: { status: string }) {
  const approved = status === "approved";
  const pending = status === "pending";
  const classes = approved
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : pending
      ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "border-border bg-muted text-muted-foreground";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
    {paymentLabels[status] ?? status}
  </span>;
}

export function SalesAdmin() {
  const [view, setView] = useState<"all" | "pending" | "shipping">("all");
  const viewTitle = view === "pending" ? "Aguardando pagamento" : "Aguardando envio";
  function openView(next: typeof view) {
    setView(next);
    setPage(0);
    setSearch("");
    setStatus("all");
    setSelected(null);
  }
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
    queryKey: ["sales-admin", page, view],
    queryFn: () => getSalesAdmin({ data: { page, view } }),
    retry: false,
    gcTime: 0,
  });
  const orders = query.data?.orders ?? [];
  const approvedOrders = orders.filter((order) => order.payment_status === "approved");
  const pendingOrders = orders.filter((order) => order.payment_status === "pending");
  const awaitingShippingOrders = approvedOrders.filter((order) =>
    ["awaiting_payment", "awaiting_label", "awaiting_label_payment"].includes(order.shipping_status),
  );
  const paidRevenue = approvedOrders.reduce((sum, order) => sum + order.subtotal_cents - order.discount_cents, 0);
  const averageTicket = approvedOrders.length ? Math.round(paidRevenue / approvedOrders.length) : 0;
  const filtered = orders.filter((order) => {
    const address = record(order.delivery_address);
    const haystack = [
      order.id,
      text(address["name"]),
      text(address["email"]),
      text(address["phone"]),
      text(address["document"]),
      text(address["city"]),
      order.tracking_code,
      JSON.stringify(order.items),
    ].join(" ").toLocaleLowerCase("pt-BR");
    return (status === "all" || order.payment_status === status) && haystack.includes(search.trim().toLocaleLowerCase("pt-BR"));
  });
  const order = orders.find((row) => row.id === selected);
  const totalVisible = Math.max(orders.length, 1);
  const approvedPercent = Math.round((approvedOrders.length / totalVisible) * 100);
  const pendingPercent = Math.round((pendingOrders.length / totalVisible) * 100);
  const shippingPercent = Math.round((awaitingShippingOrders.length / totalVisible) * 100);

  const navItems = [
    ["Financeiro", "/financeiro", CircleDollarSign],
    ["Clientes", "/clientes", Users],
    ["Estoque", "/admin/estoque", Warehouse],
    ["Frete e envios", "/frete-envios", Truck],
    ["Relatórios", "/relatorios", FileBarChart2],
  ] as const;

  return <main className="min-h-screen bg-muted/25 text-foreground">
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
        <div className="relative bg-zinc-950 px-5 py-6 text-white sm:px-7 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,.08),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,.9)]" />
                SW Sports · ERP
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Central de vendas</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">Acompanhe pedidos, pagamentos, clientes, estoque e expedição em uma única visão operacional.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled={query.isFetching} onClick={() => query.refetch()}>
                <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar dados
              </Button>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={async () => {
                await qc.cancelQueries();
                qc.clear();
                await supabase.auth.signOut();
                await navigate({ to: "/auth", replace: true });
              }}><LogOut size={16} /> Sair</Button>
            </div>
          </div>
        </div>
        <nav className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
          {navItems.map(([label, to, Icon]) => <Link key={label} to={to} className="group flex items-center justify-between bg-card px-5 py-4 transition hover:bg-muted/60">
            <span className="flex items-center gap-3 text-sm font-semibold"><span className="rounded-xl bg-muted p-2 text-muted-foreground transition group-hover:text-foreground"><Icon size={17} /></span>{label}</span>
            <ArrowUpRight size={16} className="text-muted-foreground/50 transition group-hover:text-foreground" />
          </Link>)}
        </nav>
      </header>

      {query.isPending ? <section className="mt-6 rounded-3xl border bg-card p-8 text-sm text-muted-foreground" role="status">Carregando pedidos…</section> : query.isError ? <section role="alert" className="mt-6 rounded-3xl border bg-card p-8"><p>{query.error.message}</p><Button className="mt-4" onClick={() => query.refetch()}>Tentar novamente</Button></section> : <>
        {view === "all" && <>
          <section aria-labelledby="erp-overview" className="mt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Visão geral</p><h2 id="erp-overview" className="mt-1 font-display text-2xl font-bold">Resumo operacional</h2></div>
              <p className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">{query.data?.count ?? 0} pedidos no histórico</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Pedidos exibidos" value={String(orders.length)} helper="Até 50 pedidos nesta página" icon={ShoppingBag} />
              <MetricCard label="Faturamento pago" value={money(paidRevenue)} helper="Frete excluído deste indicador" icon={CircleDollarSign} />
              <MetricCard label="Ticket médio" value={money(averageTicket)} helper="Média dos pedidos aprovados" icon={ReceiptText} />
              <MetricCard label="Aguardando pagamento" value={String(pendingOrders.length)} helper="Clique para abrir a fila" icon={Clock3} onClick={() => openView("pending")} />
              <MetricCard label="Aguardando envio" value={String(awaitingShippingOrders.length)} helper="Clique para abrir a fila" icon={PackageCheck} onClick={() => openView("shipping")} />
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Fluxo da página</p><h2 className="mt-1 font-display text-xl font-bold">Status dos pedidos</h2></div><BarChart3 className="text-muted-foreground" size={20} /></div>
              <div className="mt-6 space-y-5">
                {[
                  ["Pagamentos aprovados", approvedOrders.length, approvedPercent, "bg-emerald-500"],
                  ["Aguardando pagamento", pendingOrders.length, pendingPercent, "bg-amber-500"],
                  ["Aguardando expedição", awaitingShippingOrders.length, shippingPercent, "bg-red-500"],
                ].map(([label, value, percent, barClass]) => <div key={String(label)}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="font-medium">{String(label)}</span><span className="text-muted-foreground">{String(value)} · {String(percent)}%</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${String(barClass)}`} style={{ width: `${Number(percent)}%` }} /></div>
                </div>)}
              </div>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">Os percentuais consideram apenas os pedidos carregados na página atual e servem como leitura operacional rápida.</p>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Rotina operacional</p>
              <h2 className="mt-1 font-display text-xl font-bold">Conciliação de pagamentos</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Execute uma conferência manual para atualizar o status dos pagamentos registrados.</p>
              <Button className="mt-5 w-full" disabled={checkingPayments} onClick={async () => {
                setCheckingPayments(true);
                setPaymentMessage("");
                try {
                  const result = await check();
                  setPaymentMessage(`${result.checked} pagamento(s) conferido(s). ${result.errors.length ? "Alguns pagamentos exigem nova conferência." : "Conferência concluída."}`);
                  await qc.invalidateQueries({ queryKey: ["sales-admin"] });
                } catch (error) {
                  setPaymentMessage(error instanceof Error ? error.message : "Não foi possível conferir os pagamentos.");
                } finally {
                  setCheckingPayments(false);
                }
              }}>{checkingPayments ? "Conferindo…" : "Conferir pagamentos"}</Button>
              <p role="status" className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">{paymentMessage || "Nenhuma conferência manual executada nesta sessão."}</p>
            </div>
          </section>
        </>}

        <section className="mt-5 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Pedidos</p><h2 className="mt-1 font-display text-2xl font-bold">{view === "all" ? "Últimos pedidos" : viewTitle}</h2></div>
                  {view !== "all" && <Button size="sm" variant="outline" onClick={() => openView("all")}>Ver todos</Button>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{query.data?.count ?? 0} pedido(s) neste grupo · até 50 por página</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <label className="relative min-w-0 flex-1 sm:min-w-[320px]">
                  <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                  <Input className="pl-9" aria-label="Buscar pedidos" placeholder="Cliente, telefone, pedido ou produto" value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>
                <label className="sr-only" htmlFor="payment-filter">Filtrar por pagamento</label>
                <select id="payment-filter" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">Todos os pagamentos</option>
                  {Object.entries(paymentLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? <div className="px-6 py-16 text-center"><ShoppingBag className="mx-auto text-muted-foreground/40" size={30} /><p className="mt-3 font-semibold">Nenhum pedido encontrado</p><p className="mt-1 text-sm text-muted-foreground">{orders.length ? "Ajuste os filtros para encontrar outro pedido." : view === "all" ? "Nenhum pedido foi registrado ainda." : "Nenhum pedido está neste grupo."}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Pedidos e compradores</caption><thead className="bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Pedido / data", "Cliente", "Total", "Pagamento", "Entrega", ""].map((heading, index) => <th key={index} className="px-5 py-3 font-semibold">{heading || "Detalhes"}</th>)}</tr></thead><tbody>{filtered.map((row) => {
            const address = record(row.delivery_address);
            return <tr key={row.id} className="border-t transition-colors hover:bg-muted/25">
              <td className="px-5 py-4"><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold">#{row.id.slice(0, 8)}</span><p className="mt-2 text-xs text-muted-foreground">{dateTime(row.created_at)}</p></td>
              <td className="px-5 py-4"><p className="font-semibold">{text(address["name"]) || "Cliente não registrado"}</p><p className="mt-1 text-xs text-muted-foreground">{text(address["city"]) || "Cidade não informada"}</p></td>
              <td className="whitespace-nowrap px-5 py-4 text-base font-bold">{money(orderTotal(row))}</td>
              <td className="px-5 py-4"><PaymentBadge status={row.payment_status} /></td>
              <td className="px-5 py-4"><span className="text-sm font-medium">{row.payment_status === "approved" && row.shipping_status === "awaiting_payment" ? "Aguardando preparo do envio" : (shippingStates[row.shipping_status] ?? row.shipping_status)}</span>{row.tracking_code && <p className="mt-1 text-xs text-muted-foreground">Rastreio: {row.tracking_code}</p>}</td>
              <td className="px-5 py-4 text-right"><Button variant="outline" size="sm" aria-label={`Ver pedido ${row.id}`} onClick={() => setSelected(row.id)}>Ver pedido <ArrowUpRight size={14} /></Button></td>
            </tr>;
          })}</tbody></table></div>}

          <div className="flex flex-col gap-3 border-t bg-muted/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Página {page + 1} · {query.data?.count ?? 0} pedidos no total</p>
            <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(null); }}>Anterior</Button><Button size="sm" variant="outline" disabled={(page + 1) * 50 >= (query.data?.count ?? 0)} onClick={() => { setPage(page + 1); setSelected(null); }}>Próxima</Button></div>
          </div>
        </section>

        {order && <OrderDetails order={order} onClose={() => setSelected(null)} />}
      </>}
    </div>
  </main>;
}
