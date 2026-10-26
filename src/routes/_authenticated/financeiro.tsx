import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Banknote, CircleDollarSign, Package, ReceiptText, TrendingUp } from "lucide-react";
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
  const costReliable = data.costCoverageComplete;
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-brand">SW SPORTS · MINI ERP</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold"><Banknote /> Financeiro</h1><p className="mt-2 text-muted-foreground">Faturamento confirmado e indicadores gerenciais baseados nos pedidos pagos.</p></div><nav className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin">Vendas e pedidos</Link></Button><Button asChild variant="outline"><Link to="/clientes">Clientes</Link></Button><Button asChild variant="outline"><Link to="/estoque">Produtos e estoque</Link></Button></nav></header>
    {!costReliable && <section className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18}/><div><p className="font-semibold">Custos ainda não configurados completamente.</p><p className="mt-1 text-muted-foreground">O faturamento e o ticket médio são reais. Margem bruta e custo dos produtos só serão considerados indicadores confiáveis depois que o custo unitário de cada produto for cadastrado. Não estimamos custos.</p></div></section>}
    {data.capped && <p className="rounded-xl border p-3 text-sm text-muted-foreground">A visão está limitada aos 5.000 pedidos mais recentes.</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
      ["Faturamento pago", money(data.totals.revenueCents), CircleDollarSign], ["Pedidos pagos", String(data.totals.paidOrders), ReceiptText], ["Ticket médio", money(data.totals.averageTicketCents), TrendingUp], ["Unidades vendidas", String(data.totals.units), Package], [costReliable ? "Margem bruta" : "Margem bruta*", costReliable ? money(data.totals.grossMarginCents) : "Aguardando custos", Banknote],
    ].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{String(label)}</p><Icon size={18} className="text-muted-foreground"/></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></div>)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="font-display text-xl font-bold">Últimos meses</h2><p className="text-sm text-muted-foreground">Somente pagamentos aprovados.</p></div><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-t border-b text-muted-foreground"><tr><th className="p-3">Mês</th><th className="p-3">Pedidos</th><th className="p-3">Unidades</th><th className="p-3">Faturamento</th><th className="p-3">Margem bruta*</th></tr></thead><tbody>{data.monthly.map((row) => <tr key={row.month} className="border-b"><td className="p-3 font-semibold">{row.month}</td><td className="p-3">{row.orders}</td><td className="p-3">{row.units}</td><td className="p-3 font-semibold">{money(row.revenueCents)}</td><td className="p-3">{costReliable ? money(row.revenueCents-row.productCostCents) : "—"}</td></tr>)}</tbody></table>{data.monthly.length===0 && <p className="p-6 text-muted-foreground">Ainda não há pagamentos aprovados.</p>}</div>
      <div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="font-display text-xl font-bold">Produtos vendidos</h2><p className="text-sm text-muted-foreground">Quantidade identificada nos pedidos pagos.</p></div><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-t border-b text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">Unidades</th><th className="p-3">Custo*</th></tr></thead><tbody>{data.products.map((row) => <tr key={row.slug} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.units}</td><td className="p-3">{costReliable ? money(row.productCostCents) : "—"}</td></tr>)}</tbody></table>{data.products.length===0 && <p className="p-6 text-muted-foreground">Nenhuma venda paga identificada.</p>}</div></section>
    <p className="text-xs text-muted-foreground">* Margem bruta = faturamento pago menos custo cadastrado dos produtos. Não inclui impostos, anúncios, aluguel, folha, taxas de pagamento ou outras despesas operacionais.</p>
  </div></main>;
}
