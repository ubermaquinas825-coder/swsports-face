import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { adjustInventoryAdmin, createInventoryProduct, getInventoryAdmin } from "@/lib/inventory.functions";

export const Route = createFileRoute("/admin/estoque")({
  loader: () => getInventoryAdmin(),
  head: () => ({ meta: [{ title: "Produtos e estoque | SW Sports" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: InventoryPage,
});

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

function InventoryPage() {
  const router = useRouter();
  const { products, movements } = Route.useLoaderData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(products[0]?.id ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("entry");
  const [showProduct, setShowProduct] = useState(false);
  const [product, setProduct] = useState({ sku: "", slug: "", name: "", description: "", sale: "49,90", minimum: "0" });

  const productNames = useMemo(() => new Map(products.map((p: any) => [p.id, p.name])), [products]);
  const totalUnits = products.reduce((sum: number, p: any) => sum + p.stock_on_hand, 0);
  const lowStock = products.filter((p: any) => p.stock_on_hand <= p.minimum_stock).length;

  async function refresh() { await router.invalidate(); }
  async function moveStock(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const quantity = Number(delta);
      const signed = type === "sale" ? -Math.abs(quantity) : type === "adjustment" ? quantity : Math.abs(quantity);
      await adjustInventoryAdmin({ data: { productId: selected, quantityDelta: signed, movementType: type as any, reason } });
      setDelta(""); setReason(""); setMessage("Movimentação registrada com sucesso."); await refresh();
    } catch (err: any) { setMessage(err?.message ?? "Erro ao movimentar estoque."); }
    finally { setBusy(false); }
  }
  async function addProduct(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const cents = (v: string) => Math.round(Number(v.replace(".", "").replace(",", ".")) * 100);
    try {
      await createInventoryProduct({ data: { sku: product.sku, slug: product.slug, name: product.name, description: product.description, salePriceCents: cents(product.sale), costPriceCents: 0, minimumStock: Number(product.minimum) } });
      setShowProduct(false); setProduct({ sku: "", slug: "", name: "", description: "", sale: "49,90", minimum: "0" });
      setMessage("Produto cadastrado com sucesso."); await refresh();
    } catch (err: any) { setMessage(err?.message ?? "Erro ao cadastrar produto."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold text-emerald-400">SW SPORTS · ERP</p><h1 className="mt-2 text-3xl font-bold">Produtos e Estoque</h1><p className="text-slate-400">Controle de quantidade e histórico de movimentações. O ERP não calcula custos ou margem.</p></div><nav className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/admin">Vendas</Link></Button><Button asChild variant="outline"><Link to="/financeiro">Financeiro</Link></Button><Button asChild variant="outline"><Link to="/relatorios">Relatórios</Link></Button><button onClick={() => setShowProduct(!showProduct)} className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-950">{showProduct ? "Cancelar" : "+ Novo produto"}</button></nav></header>
    {message && <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">{message}</div>}
    <section className="grid gap-3 sm:grid-cols-3">{[["Produtos", products.length], ["Unidades em estoque", totalUnits], ["Estoque baixo", lowStock]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="text-sm text-slate-400">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>)}</section>
    {showProduct && <form onSubmit={addProduct} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3"><input required placeholder="SKU" value={product.sku} onChange={e=>setProduct({...product,sku:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><input required placeholder="Identificador (slug)" value={product.slug} onChange={e=>setProduct({...product,slug:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><input required placeholder="Nome do produto" value={product.name} onChange={e=>setProduct({...product,name:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><input placeholder="Preço de venda" value={product.sale} onChange={e=>setProduct({...product,sale:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><input type="number" min="0" placeholder="Estoque mínimo" value={product.minimum} onChange={e=>setProduct({...product,minimum:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><textarea placeholder="Descrição" value={product.description} onChange={e=>setProduct({...product,description:e.target.value})} className="rounded-lg bg-slate-800 p-3"/><button disabled={busy} className="rounded-lg bg-emerald-500 p-3 font-semibold text-slate-950 md:col-span-3">Cadastrar produto</button></form>}
    <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[680px] text-sm"><thead className="text-left text-slate-400"><tr>{["Produto","SKU","Venda","Estoque","Mínimo","Situação"].map(x=><th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{products.map((p:any)=><tr key={p.id} className="border-t border-slate-800"><td className="p-4 font-semibold">{p.name}</td><td className="p-4">{p.sku}</td><td className="p-4">{money(p.sale_price_cents)}</td><td className="p-4 text-lg font-bold">{p.stock_on_hand}</td><td className="p-4">{p.minimum_stock}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${p.stock_on_hand <= p.minimum_stock ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>{p.stock_on_hand <= p.minimum_stock ? "Baixo" : "OK"}</span></td></tr>)}</tbody></table>{products.length===0 && <p className="p-6 text-slate-400">Nenhum produto cadastrado.</p>}</section>
    <section className="grid gap-6 lg:grid-cols-[380px_1fr]"><form onSubmit={moveStock} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Movimentar estoque</h2><select required value={selected} onChange={e=>setSelected(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3"><option value="">Selecione o produto</option>{products.map((p:any)=><option key={p.id} value={p.id}>{p.name} — {p.stock_on_hand} un.</option>)}</select><select value={type} onChange={e=>setType(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3"><option value="entry">Entrada</option><option value="sale">Saída</option><option value="return">Devolução</option><option value="cancellation">Cancelamento</option><option value="adjustment">Ajuste (+ ou -)</option><option value="opening">Estoque inicial</option></select><input required type="number" placeholder={type === "adjustment" ? "Quantidade (+ ou -)" : "Quantidade"} value={delta} onChange={e=>setDelta(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3"/><textarea required minLength={3} placeholder="Motivo da movimentação" value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3"/><button disabled={busy || !selected} className="w-full rounded-lg bg-emerald-500 p-3 font-semibold text-slate-950 disabled:opacity-50">Registrar movimentação</button></form><div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><div className="p-5"><h2 className="text-xl font-bold">Últimas movimentações</h2></div><table className="w-full min-w-[620px] text-sm"><thead className="text-left text-slate-400"><tr><th className="p-3">Data</th><th className="p-3">Produto</th><th className="p-3">Tipo</th><th className="p-3">Qtd.</th><th className="p-3">Saldo</th><th className="p-3">Motivo</th></tr></thead><tbody>{movements.map((m:any)=><tr key={m.id} className="border-t border-slate-800"><td className="p-3">{date(m.created_at)}</td><td className="p-3">{productNames.get(m.product_id) ?? "Produto"}</td><td className="p-3">{m.movement_type}</td><td className={`p-3 font-bold ${m.quantity_delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>{m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}</td><td className="p-3">{m.balance_after}</td><td className="p-3">{m.reason}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
