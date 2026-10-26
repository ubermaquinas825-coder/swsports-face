import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users, UserRoundCheck, ShoppingBag, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCustomersAdmin } from "@/lib/customers.functions";
import { dateTime, money } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/clientes")({
  loader: () => getCustomersAdmin(),
  head: () => ({ meta: [{ title: "Clientes | SW Sports" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const data = Route.useLoaderData();
  const [search, setSearch] = useState("");
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return data.customers.filter((customer) => {
      if (onlyRecurring && customer.orders < 2) return false;
      if (!query) return true;
      return [customer.name, customer.email, customer.phone, customer.document, customer.city, customer.state]
        .join(" ").toLocaleLowerCase("pt-BR").includes(query);
    });
  }, [data.customers, onlyRecurring, search]);

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold text-brand">SW SPORTS · MINI ERP</p><h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold"><Users /> Clientes</h1><p className="mt-2 text-muted-foreground">CRM formado exclusivamente pelos compradores registrados nos pedidos da loja.</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin">Vendas e pedidos</Link></Button><Button asChild variant="outline"><Link to="/estoque">Produtos e estoque</Link></Button></div>
      </header>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Clientes", String(data.totals.customers), Users], ["Recorrentes", String(data.totals.recurring), UserRoundCheck], ["Pedidos pagos", String(data.totals.paidOrders), ShoppingBag], ["Receita paga", money(data.totals.paidRevenueCents), CircleDollarSign]].map(([label,value,Icon]) => <div key={String(label)} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{String(label)}</p><Icon size={18} className="text-muted-foreground" /></div><p className="mt-3 text-2xl font-bold">{String(value)}</p></div>)}
      </section>
      {data.capped && <p className="mb-4 rounded-xl border p-3 text-sm text-muted-foreground">A visão está limitada aos 5.000 pedidos mais recentes.</p>}
      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-3"><label className="min-w-56 flex-1 text-sm">Buscar cliente<div className="relative mt-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Nome, telefone, e-mail, CPF/CNPJ ou cidade" value={search} onChange={(event) => setSearch(event.target.value)} /></div></label><Button className="self-end" variant={onlyRecurring ? "default" : "outline"} onClick={() => setOnlyRecurring(!onlyRecurring)}>Clientes recorrentes</Button></div>
        {filtered.length === 0 ? <p className="py-10 text-center text-muted-foreground">Nenhum cliente corresponde aos filtros.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-muted-foreground"><tr>{["Cliente","Contato","Cidade","Pedidos","Pagos","Total pago","Última compra"].map((title) => <th key={title} className="p-3">{title}</th>)}</tr></thead><tbody>{filtered.map((customer) => <tr key={customer.key} className="border-b"><td className="p-3 font-semibold">{customer.name}<p className="mt-1 text-xs font-normal text-muted-foreground">{customer.document || "Documento não registrado"}</p></td><td className="p-3">{customer.phone || "Sem telefone"}<p className="mt-1 text-xs text-muted-foreground">{customer.email || "Sem e-mail"}</p></td><td className="p-3">{[customer.city,customer.state].filter(Boolean).join(" / ") || "Não registrada"}</td><td className="p-3">{customer.orders}</td><td className="p-3">{customer.paidOrders}</td><td className="p-3 font-semibold">{money(customer.paidTotalCents)}</td><td className="p-3">{dateTime(customer.lastOrderAt)}</td></tr>)}</tbody></table></div>}
        <p className="mt-5 text-sm text-muted-foreground">Exibindo {filtered.length} de {data.totals.customers} cliente(s). O faturamento considera somente pedidos com pagamento aprovado.</p>
      </section>
    </div>
  </main>;
}
