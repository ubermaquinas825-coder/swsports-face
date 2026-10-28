import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CircleDollarSign, Clock3, LogOut, PackageCheck, ReceiptText, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetails } from "@/components/OrderDetails";
import { Input } from "@/components/ui/input";
import { checkPayments } from "@/lib/payment-reconciliation.functions";
import { getSalesAdmin } from "@/lib/sales.functions";
import { dateTime, money, orderTotal, paymentLabels, record, text } from "@/lib/sales";
import { shippingStates } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";

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
  const approvedOrders = orders.filter((order) => order.payment_status === "approved");
  const pendingOrders = orders.filter((order) => order.payment_status === "pending");
  const awaitingShippingOrders = approvedOrders.filter((order) =>
    ["awaiting_payment", "awaiting_label", "awaiting_label_payment"].includes(order.shipping_status),
  );
  const paidRevenue = approvedOrders.reduce((sum, order) => sum + orderTotal(order), 0);
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

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-brand">SW SPORTS · ERP</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold"><ShoppingBag /> Painel de vendas</h1><p className="mt-2 text-muted-foreground">Central operacional de pedidos, pagamentos, estoque, clientes e entregas.</p></div><nav className="flex max-w-3xl flex-wrap justify-end gap-2"><Button asChild variant="outline"><Link to="/financeiro">Financeiro</Link></Button><Button asChild variant="outline"><Link to="/clientes">Clientes</Link></Button><Button asChild variant="outline"><Link to="/admin/estoque">Estoque</Link></Button><Button asChild variant="outline"><Link to="/frete-envios">Frete e envios</Link></Button><Button asChild variant="outline"><Link to="/relatorios">Relatórios do ERP</Link></Button><Button variant="outline" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }}><LogOut size={16}/> Sair</Button></nav></header>

    <section className="mb-5 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={checkingPayments} onClick={async () => { setCheckingPayments(true); setPaymentMessage(""); try { const result = await check(); setPaymentMessage(`${result.checked} pagamento(s) conferido(s). ${result.errors.length ? "Alguns pagamentos exigem nova conferência." : "Conferência concluída."}`); await qc.invalidateQueries({ queryKey: ["sales-admin"] }); } catch (error) { setPaymentMessage(error instanceof Error ? error.message : "Não foi possível conferir os pagamentos."); } finally { setCheckingPayments(false); } }}>{checkingPayments ? "Conferindo…" : "Conferir pagamentos"}</Button><p role="status" className="text-sm text-muted-foreground">{paymentMessage}</p></section>

    {query.isPending ? <p role="status">Carregando pedidos…</p> : query.isError ? <section role="alert" className="rounded-xl border p-6"><p>{query.error.message}</p><Button className="mt-4" onClick={() => query.refetch()}>Tentar novamente</Button></section> : <>
      <section aria-labelledby="erp-overview" className="mb-6"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="erp-overview" className="font-display text-xl font-bold">Resumo operacional</h2><p className="text-sm text-muted-foreground">Indicadores dos até 50 pedidos exibidos nesta página. Use Relatórios do ERP para a visão gerencial consolidada.</p></div><p className="text-sm text-muted-foreground">{query.data?.count ?? 0} pedido(s) no total</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{([
        ["Pedidos", String(orders.length), ShoppingBag],
        ["Faturamento pago", money(paidRevenue), CircleDollarSign],
        ["Ticket médio", money(averageTicket), ReceiptText],
        ["Aguardando pagamento", String(pendingOrders.length), Clock3],
        ["Aguardando envio", String(awaitingShippingOrders.length), PackageCheck],
      ] as const).map(([label,value,Icon]) => <section key={String(label)} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{String(label)}</p><Icon size={18} aria-hidden="true" className="text-muted-foreground"/></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></section>)}</div></section>

      <section className="rounded-xl border bg-card p-4 sm:p-6"><div className="mb-5 flex flex-wrap gap-3"><label className="min-w-48 flex-1 text-sm">Buscar nesta página<Input className="mt-2" placeholder="Cliente, telefone, pedido ou produto" value={search} onChange={(e) => setSearch(e.target.value)}/></label><label className="text-sm">Pagamento<select className="mt-2 block h-10 rounded-md border bg-background px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos</option>{Object.entries(paymentLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select></label><Button className="self-end" variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw size={16}/> Atualizar</Button></div>
        {filtered.length === 0 ? <p className="py-10 text-center text-muted-foreground">{orders.length ? "Nenhum pedido corresponde aos filtros desta página." : "Nenhum pedido registrado."}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Pedidos e compradores</caption><thead className="border-b text-muted-foreground"><tr>{["Pedido / data","Cliente","Total","Pagamento","Entrega",""].map((heading,index) => <th key={index} className="p-3">{heading || "Detalhes"}</th>)}</tr></thead><tbody>{filtered.map((row) => { const address = record(row.delivery_address); return <tr key={row.id} className="border-b"><td className="p-3"><span className="font-mono">{row.id.slice(0,8)}</span><p className="mt-1 text-xs text-muted-foreground">{dateTime(row.created_at)}</p></td><td className="p-3">{text(address["name"]) || "Cliente não registrado"}<p className="text-xs text-muted-foreground">{text(address["city"])}</p></td><td className="whitespace-nowrap p-3 font-semibold">{money(orderTotal(row))}</td><td className="p-3">{paymentLabels[row.payment_status] ?? row.payment_status}</td><td className="p-3">{row.payment_status === "approved" && row.shipping_status === "awaiting_payment" ? "Aguardando preparo do envio" : (shippingStates[row.shipping_status] ?? row.shipping_status)}</td><td className="p-3"><Button variant="outline" aria-label={`Ver pedido ${row.id}`} onClick={() => setSelected(row.id)}>Ver pedido</Button></td></tr>; })}</tbody></table></div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Página {page + 1} · {query.data?.count ?? 0} pedidos no total · até 50 por página</p><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(null); }}>Anterior</Button><Button variant="outline" disabled={(page + 1) * 50 >= (query.data?.count ?? 0)} onClick={() => { setPage(page + 1); setSelected(null); }}>Próxima</Button></div></div>
      </section>
      {order && <OrderDetails order={order} onClose={() => setSelected(null)}/>}
    </>}
  </div></main>;
}
