import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { NOTICE_TEXT, NOTICE_VERSION } from "@/lib/advertising";
import { waLink } from "@/lib/products";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [
    { title: "Privacidade e cookies | SW Sports" },
    { name: "description", content: "Saiba como a SW Sports trata dados de compras, medição publicitária e escolhas de cookies." },
    { property: "og:title", content: "Privacidade e cookies SW Sports" },
    { property: "og:description", content: "Dados compartilhados, finalidades e opções de privacidade na loja SW Sports." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Privacy,
});
function Privacy() {
  return <><SiteHeader /><main className="mx-auto max-w-3xl space-y-8 px-5 py-16">
    <h1 className="font-display text-3xl font-bold">Privacidade e cookies</h1>
    <p className="text-sm text-muted-foreground">Atualização: 23 de outubro de 2026.</p>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Compras e entrega</h2><p>Dados informados no pedido, como nome, CPF/CNPJ, contato e endereço, são usados para atendimento, pagamento e entrega. Appmax processa pagamentos; Bling organiza pedidos e estoque; SuperFrete calcula frete e processa envios. Esses serviços recebem os dados necessários às suas atividades.</p></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Medição de anúncios</h2><p>{NOTICE_TEXT}</p><p>Usamos a tag Google Ads AW-875949502 e Meta Pixel 725374147272634 para medir visitas à vitrine e desempenho publicitário. Informações técnicas podem incluir endereço IP, navegador, página visitada e cookies publicitários. Não ativamos correspondência de clientes, coleta automática de formulários, personalização de anúncios ou envio de compras confirmadas nesta instalação.</p><p>As páginas administrativas e os dados de entrega e pagamento não são enviados por estes rastreadores. O código AW é do Google Ads; Google Analytics 4 não está instalado por esse código.</p><p><a className="text-brand underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidade do Google</a> · <a className="text-brand underline" href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">Privacidade da Meta</a></p></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Sua escolha</h2><p>O aviso é apresentado nas regiões que exigem consentimento, incluindo Brasil, Espaço Econômico Europeu, Reino Unido e Suíça. Quando a região não pode ser confirmada, o rastreamento permanece bloqueado até sua escolha. Nas demais regiões a medição pode ficar ativa, respeitando recusas e sinais de privacidade do navegador.</p><p>Guardamos neste navegador um identificador aleatório do visitante, data, região e histórico das escolhas, com o texto apresentado e versão {NOTICE_VERSION}. Retirar o consentimento mantém a evidência da aceitação anterior e bloqueia novos envios, inclusive nas outras abas da loja. Eventos bloqueados não são enviados retroativamente. Limpar os dados do navegador remove esse registro local.</p><Button variant="outline" onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}>Configurações de cookies</Button></section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Contato e direitos</h2><p>Para solicitar acesso, correção ou exclusão de seus dados, ou esclarecer o tratamento de informações de pedidos, fale com a SW Sports. Dados necessários a obrigações legais e execução de pedidos podem precisar ser mantidos.</p><a className="text-brand underline" href={waLink("Olá, gostaria de falar sobre meus dados e privacidade.")}>Contato sobre privacidade</a></section>
  </main><SiteFooter /></>;
}