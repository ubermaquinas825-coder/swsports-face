import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { products } from "@/lib/products";
import { emptyBlingInventoryConfig, type BlingInventoryConfig } from "@/lib/bling-inventory";
import { getBlingInventory, loadBlingWarehouses, saveBlingInventory, testBlingInventory, discoverBlingCatalog } from "@/lib/bling-inventory.functions";
import { checkAppmaxPayments } from "@/lib/payment-reconciliation.functions";

export function BlingInventory({ connected }: { connected: boolean }) {
  const getConfig = useServerFn(getBlingInventory);
  const query = useQuery({ queryKey: ["bling-inventory"], queryFn: () => getConfig() });
  const [draft, setDraft] = useState<BlingInventoryConfig | null>(null);
  const config = draft ?? query.data ?? emptyBlingInventoryConfig;
  const load = useServerFn(loadBlingWarehouses); const save = useServerFn(saveBlingInventory); const test = useServerFn(testBlingInventory);
  const discover = useServerFn(discoverBlingCatalog);
  const checkPayments = useServerFn(checkAppmaxPayments);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);
  const [stock, setStock] = useState<Array<{ blingId: number; available: number }> | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function run(action: () => Promise<void>) { setBusy(true); setMessage(""); try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível consultar o Bling."); } finally { setBusy(false); } }
  return <section className="border-b border-border py-8">
    <h2 className="mb-5 font-display text-xl font-bold">ESTOQUE E VÍNCULOS</h2>
    {query.isError && <p role="alert" className="mb-4 text-destructive">Não foi possível carregar os vínculos.</p>}
    <Button variant="outline" className="mb-5" disabled={!connected || busy} onClick={() => run(async () => { const mappings = await discover(); setDraft({ ...config, mappings }); setStock(null); setMessage("Seis modelos encontrados pelos nomes no Bling. Selecione o depósito e confirme os vínculos."); })}><RefreshCw /> Identificar modelos no Bling</Button>
    <div className="flex flex-wrap items-end gap-4"><div className="w-full max-w-sm"><label className="mb-2 block text-sm" htmlFor="bling-warehouse">Depósito Bling</label><Select value={config.warehouseId ? String(config.warehouseId) : ""} onValueChange={(value) => setDraft({ ...config, warehouseId: Number(value) })} disabled={!connected || busy}><SelectTrigger id="bling-warehouse"><SelectValue placeholder={config.warehouseId ? `Depósito ${config.warehouseId}` : "Selecione o depósito"} /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" disabled={!connected || busy} onClick={() => run(async () => { setWarehouses(await load()); })}><RefreshCw /> Consultar depósitos</Button></div>
    <div className="mt-5 divide-y divide-border">{products.map((product) => { const mapping = config.mappings.find((m) => m.productId === product.id); const balance = stock?.find((s) => s.blingId === mapping?.blingId); return <div key={product.id} className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_1fr_100px]"><label htmlFor={`sku-${product.id}`} className="text-sm">{product.name}</label><Input id={`sku-${product.id}`} aria-label={`SKU ${product.name}`} placeholder="SKU já cadastrado no Bling" value={mapping?.sku ?? ""} disabled={!connected || busy} onChange={(e) => { const others = config.mappings.filter((m) => m.productId !== product.id); setDraft({ ...config, mappings: e.target.value.trim() ? [...others, { productId: product.id, sku: e.target.value, blingId: null }] : others }); setStock(null); }} /><span className="text-sm text-muted-foreground">{balance ? `${balance.available} un.` : "—"}</span></div>; })}</div>
    <label className="my-5 flex items-center gap-3 text-sm"><Switch checked={config.checkAtCheckout} disabled={!connected || busy} onCheckedChange={(checked) => setDraft({ ...config, checkAtCheckout: checked })} /> Conferir estoque antes do pagamento</label>
    <div className="flex flex-wrap gap-3"><Button disabled={!connected || busy || query.isPending || query.isError} onClick={() => run(async () => { const result = await save({ data: config }); setDraft(result.config); setStock(result.stock); await query.refetch(); setMessage("Vínculos confirmados e estoque consultado."); })}><Save /> Confirmar vínculos</Button><Button variant="outline" disabled={!connected || busy} onClick={() => run(async () => { setStock(await test()); setMessage("Estoque atualizado."); })}><RefreshCw /> Consultar estoque</Button></div>
    <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>
    <div className="mt-8 border-t border-border pt-6"><h3 className="font-display font-bold">PAGAMENTOS E PEDIDOS</h3><Button variant="outline" className="mt-4" disabled={busy} onClick={() => run(async () => { const result = await checkPayments(); setMessage(result.checked ? `${result.checked} pedido(s) conferido(s) na Appmax. Consulte os resultados em Frete e Envios.` : "Nenhum pedido com link Appmax disponível para conferência."); })}><RefreshCw /> Conferir pagamentos Appmax</Button><p className="mt-3 text-sm text-muted-foreground">Envio ao Bling bloqueado até validar endereço de entrega, depósito, situação de venda e regra de baixa de estoque.</p></div>
  </section>;
}