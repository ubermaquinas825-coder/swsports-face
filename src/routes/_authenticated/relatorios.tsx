import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getManagementReports } from "@/lib/reports.functions";
import { money } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/relatorios")({
  loader: () => getManagementReports(),
  head: () => ({ meta: [{ title: "Relatórios do ERP | SW Sports" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ReportsPage,
});

function HealthItem({ ok, label }: { ok: boolean; label: string }) {
  return <div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
    {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />}
    <span>{label}</span>
  </div>;
}

function ReportsPage() {
  const data = Route.useLoaderData();
  const l = data.logistics;
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-brand">SW SPORTS · ERP</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold"><Activity /> Relatórios e saúde do ERP</h1><p className="mt-2 text-muted-foreground">Visão gerencial de vendas, clientes, estoque, logística e integrações.</p></div><nav className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin">Vendas</Link></Button><Button asChild variant="outline"><Link to="/financeiro">Financeiro</Link></Button><Button asChild variant="outline"><Link to="/clientes">Clientes</Link></Button><Button asChild variant="outline"><Link to="/admin/estoque">Estoque</Link></Button><Button asChild variant="outline"><Link to="/frete-envios">Frete</Link></Button></nav></header>

    {data.health.maintenanceEnabled && <section className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-amber-500"/><div><p className="font-semibold">Modo de manutenção financeira ativo.</p><p className="mt-1 text-muted-foreground">Pagamentos e operações de escrita permanecem bloqueados até a checagem final de produção.</p></div></section>}
    {data.capped && <p className="rounded-xl border p-3 text-sm text-muted-foreground">Relatórios limitados aos 5.000 pedidos mais recentes.</p>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Pedidos pagos", String(data.totals.paidOrders), ReceiptText],
      ["Faturamento pago", money(data.totals.paidRevenueCents), CircleDollarSign],
      ["Unidades vendidas", String(data.totals.unitsSold), ShoppingBag],
      ["Clientes identificados", String(data.totals.uniqueCustomers), Users],
    ].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{String(label)}</p><Icon size={18} className="text-muted-foreground"/></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></div>)}</section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-xl border bg-card p-5"><div className="mb-5 flex items-center gap-3"><Truck className="text-brand"/><div><h2 className="font-display text-xl font-bold">Pipeline logístico</h2><p className="text-sm text-muted-foreground">Situação operacional dos pedidos registrados.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Aguardando preparo", l.awaitingPreparation],
        ["Aguardando etiqueta/pagamento", l.awaitingLabelPayment + l.awaitingLabel],
        ["Prontos para postagem", l.readyToPost],
        ["Postados", l.posted],
        ["Entregues", l.delivered],
        ["Revisão logística", l.logisticsFailed],
      ].map(([label,value]) => <div key={String(label)} className="rounded-lg border bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>{l.postedWithoutTracking > 0 && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-500">{l.postedWithoutTracking} pedido(s) postado(s) ainda sem código de rastreamento gravado.</p>}</div>
      <div className="rounded-xl border bg-card p-5"><div className="mb-5 flex items-center gap-3"><Activity className="text-brand"/><div><h2 className="font-display text-xl font-bold">Saúde operacional</h2><p className="text-sm text-muted-foreground">Sem exibir chaves ou segredos.</p></div></div><div className="space-y-2"><HealthItem ok={data.health.melhorEnvioConnected} label="Melhor Envio conectado"/><HealthItem ok={data.health.mercadoPagoConfigured} label="Mercado Pago configurado"/><HealthItem ok={data.health.cronConfigured} label="Automação diária protegida"/><HealthItem ok={data.health.shippingConfigured} label="Configuração de frete salva"/><HealthItem ok={data.health.inventoryConfigured} label="Estoque interno configurado"/><HealthItem ok={!data.health.maintenanceEnabled} label="Operações financeiras liberadas"/></div><div className={`mt-5 rounded-lg p-4 text-sm font-semibold ${data.health.operationalReady ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{data.health.operationalReady ? "ERP operacionalmente pronto." : "Há uma pendência operacional indicada acima."}</div></div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2"><div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="font-display text-xl font-bold">Produtos com melhor desempenho</h2><p className="text-sm text-muted-foreground">Pedidos pagos, sem cálculo de custo, margem ou lucro.</p></div><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-y text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">Unidades</th><th className="p-3">Vendas de produtos</th></tr></thead><tbody>{data.topProducts.map((row) => <tr key={row.key} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.units}</td><td className="p-3">{money(row.revenueCents)}</td></tr>)}</tbody></table>{data.topProducts.length===0 && <p className="p-6 text-muted-foreground">Nenhuma venda paga identificada.</p>}</div>
      <div className="overflow-x-auto rounded-xl border bg-card"><div className="p-5"><h2 className="flex items-center gap-2 font-display text-xl font-bold"><PackageCheck/> Estoque e clientes</h2><p className="text-sm text-muted-foreground">{data.totals.repeatCustomers} cliente(s) identificado(s) com mais de um pedido · {data.totals.pendingOrders} pedido(s) aguardando pagamento.</p></div>{data.lowStock.length ? <table className="w-full min-w-[420px] text-left text-sm"><thead className="border-y text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">SKU</th><th className="p-3">Estoque</th><th className="p-3">Mínimo</th></tr></thead><tbody>{data.lowStock.map((row) => <tr key={row.sku} className="border-b"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.sku}</td><td className="p-3">{row.stockOnHand}</td><td className="p-3">{row.minimumStock}</td></tr>)}</tbody></table> : <p className="p-6 text-emerald-500">Nenhum produto está no estoque mínimo ou abaixo dele.</p>}</div></section>

    <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Resumo: {data.totals.totalOrders} pedido(s) no histórico analisado · ticket médio pago {money(data.totals.averageTicketCents)}. Este ERP não calcula custos, margem ou lucro.</p>
  </div></main>;
}
