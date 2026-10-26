import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CircleDollarSign, Package, ReceiptText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFinancialAdmin } from "@/lib/financial.functions";
import { money } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/financeiro")({
  loader: () => getFinancialAdmin(),
  head: () => ({ meta: [{ title: "Financeiro | SW Sports" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: FinancialPage,
});

function FinancialPage() {
  const data = Route.useLoaderData();
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-brand">SW SPORTS · MINI ERP</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold"><Banknote /> Financeiro</h1><p className="mt-2 text-muted-foreground">Faturamento confirmado e indicadores baseados somente nos pedidos pagos.</p></div><nav className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin">Vendas e pedidos</Link></Button><Button asChild variant="outline"><Link to="/clientes">Clientes</Link></Button><Button asChild variant="outline"><Link to="/admin/estoque">Produtos e estoque</Link></Button><Button asChild variant="outline"><Link to="/relatorios">Relatórios do ERP</Link></Button></nav></header>
    {data.capped && <p className="rounded-xl border p-3 text-sm text-muted-foreground">A visão está limitada aos 5.000 pedidos mais recentes.</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Faturamento pago", money(data.totals.revenueCents), CircleDollarSign],
      ["Pedidos pagos", String(data.totals.paidOrders), ReceiptText],
      ["Ticket médio", money(data.totals.averageTicketCents), TrendingUp],
      ["Unidades vendidas", String(data.totals.units), Package],
    ].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{String(label)}</p><Icon size={18} className="text-muted-foreground"/></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="font-display text-xl font-bold">Últimos meses</h2><p className="text-sm text-muted-foreground">Somente pagamentos aprovados.</p></div><table className="w-full min-w-[540px] text-left text-sm"><thead className="border-t border-b text-muted-foreground"><tr><th className="p-3">Mês</th><th className="p-3">Pedidos</th><th className="p-3">Unidades</th><th className="p-3">Faturamento</th></tr></thead><tbody>{data.monthly.map((row) => <tr key={row.month} className="border-b"><td className="p-3 font-semibold">{row.month}</td><td className="p-3">{row.orders}</td><td className="p-3">{row.units}</td><td className="p-3 font-semibold">{money(row.revenueCents)}</td></tr>)}</tbody></table>{data.monthly.length===0 && <p className="p-6 text-muted-foreground">Ainda não há pagamentos aprovados.</p>}</div>
      <div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="font-display text-xl font-bold">Desempenho por produto</h2><p className="text-sm text-muted-foreground">Quantidade e valor dos produtos identificados nos pedidos pagos.</p></div><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-t border-b text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">Unidades</th><th className="p-3">Vendas de produtos</th></tr></thead><tbody>{data.products.map((row) => <tr key={row.slug} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.units}</td><td className="p-3">{money(row.revenueCents)}</td></tr>)}</tbody></table>{data.products.length===0 && <p className="p-6 text-muted-foreground">Nenhuma venda paga identificada.</p>}</div></section>
    <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Este painel não calcula custo de produto, margem ou lucro. Os indicadores exibidos são baseados apenas em vendas e pagamentos registrados.</p>
  </div></main>;
}
