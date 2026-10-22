import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plug, RefreshCw, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlingAdmin, startBlingOAuth, renewBlingOAuth, testBlingProducts } from "@/lib/bling.functions";
import logo from "@/assets/sw-sports-logo.png.asset.json";

const adminQuery = queryOptions({ queryKey: ["bling-admin"], queryFn: () => getBlingAdmin() });
export const Route = createFileRoute("/_authenticated/integracoes/bling")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQuery),
  head: () => ({ meta: [{ title: "Integrações > Bling | SW Sports" }, { name: "description", content: "Conexão administrativa segura do Bling ERP com a SW Sports." }, { property: "og:title", content: "Bling ERP | SW Sports" }, { property: "og:description", content: "Autorização e estado da conexão Bling da SW Sports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BlingAdmin,
  errorComponent: ({ reset }) => <main className="p-8"><p>Não foi possível carregar a conexão Bling.</p><Button onClick={reset}>Tentar novamente</Button></main>,
});
function BlingAdmin() {
  const { data } = useSuspenseQuery(adminQuery);
  const start = useServerFn(startBlingOAuth); const renew = useServerFn(renewBlingOAuth);
  const testProducts = useServerFn(testBlingProducts);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string }> | null>(null);
  const qc = useQueryClient(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4"><Link to="/"><img src={logo.url} alt="SW Sports" className="h-16 w-28 object-contain" /></Link><Link to="/frete-envios" className="text-sm text-muted-foreground">Frete e Envios</Link></div></header>
    <main className="mx-auto max-w-6xl px-5 py-10"><p className="mb-3 text-sm text-muted-foreground">Integrações / Bling</p><h1 className="flex items-center gap-3 font-display text-3xl font-bold"><Plug className="text-brand" /> BLING ERP</h1>
      {!data.allowed ? <p className="mt-8 text-muted-foreground">Seu acesso está aguardando autorização administrativa do proprietário.</p> : <>
        <section className="border-b border-border py-8"><h2 className="font-display text-xl font-bold">CONEXÃO</h2><p className="my-4 text-muted-foreground">{data.connected ? "Autorização concedida" : data.configured ? "Aguardando autorização no Bling" : "Aguardando credenciais do aplicativo privado"}</p>
          <div className="flex flex-wrap gap-3"><Button disabled={busy || !data.configured} onClick={async () => { setBusy(true); setMessage(""); try { const result = await start(); window.location.assign(result.url); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a conexão."); setBusy(false); } }}><Plug /> Conectar Bling</Button>
          {data.connected && <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await renew(); setMessage("Acesso Bling verificado."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível renovar o acesso."); } finally { await qc.invalidateQueries({ queryKey: ["bling-admin"] }); setBusy(false); } }}><RefreshCw /> Verificar acesso</Button>}</div>
          {data.authorizedAt && <p className="mt-4 text-sm text-muted-foreground">Autorizado em {new Date(data.authorizedAt).toLocaleString("pt-BR")}</p>}
          {data.error && <p role="alert" className="mt-4 text-sm text-destructive">{data.error}</p>}<p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>
        </section><section className="border-b border-border py-8"><h2 className="mb-4 font-display text-xl font-bold">PRODUTOS DO BLING</h2>
          <Button variant="outline" disabled={busy || !data.connected} onClick={async () => { setBusy(true); setMessage(""); setProducts(null); try { const result = await testProducts(); setProducts(result.products); setMessage(`Consulta concluída: ${result.products.length} produto(s) nesta página.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível consultar os produtos."); } finally { await qc.invalidateQueries({ queryKey: ["bling-admin"] }); setBusy(false); } }}><PackageSearch /> Consultar produtos</Button>
          {products && <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="py-3 pr-4">SKU</th><th className="py-3">Produto</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-border"><td className="py-3 pr-4 text-muted-foreground">{product.sku || "—"}</td><td className="py-3">{product.name}</td></tr>)}</tbody></table></div>}
        </section><section className="py-8"><h2 className="mb-4 font-display text-xl font-bold">URL DE RETORNO</h2><p className="break-all text-sm text-muted-foreground">{data.callbackUrl}</p></section>
      </>}
    </main></div>;
}