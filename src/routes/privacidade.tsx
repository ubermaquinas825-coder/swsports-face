import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { NOTICE_TEXT, NOTICE_VERSION } from "@/lib/advertising";
import { waLink } from "@/lib/products";
import { business } from "@/lib/business";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.balaclavaswsports.com.br/privacidade" }],
    meta: [
      { title: "Políticas, privacidade e termos | SW Sports" },
      { name: "description", content: "Consulte as políticas de privacidade, cookies, trocas, entrega, termos de uso e canais de contato da SW Sports." },
      { property: "og:title", content: "Políticas da loja | SW Sports" },
      { property: "og:description", content: "Privacidade, cookies, trocas, entrega, termos de uso e contato da SW Sports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const contactUrl = waLink("Olá, equipe SW Sports! Gostaria de falar sobre uma compra, entrega, troca ou privacidade.");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-28">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.14em] text-brand">SW SPORTS</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Políticas da loja, privacidade e termos</h1>
          <p className="mt-3 text-sm text-muted-foreground">Atualização: 26 de outubro de 2026.</p>
        </div>

        <nav aria-label="Políticas da loja" className="mb-10 grid gap-2 border-y border-border py-4 text-sm sm:grid-cols-2">
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#privacidade">Política de Privacidade</a>
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#cookies">Política de Cookies</a>
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#trocas">Trocas, Devoluções e Reembolsos</a>
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#entrega">Política de Entrega</a>
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#termos">Termos de Uso</a>
          <a className="min-h-11 rounded-md px-3 py-3 hover:bg-accent" href="#contato">Contato e identificação</a>
        </nav>

        <div className="space-y-12 leading-relaxed">
          <section id="privacidade" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold">Política de Privacidade</h2>
            <p className="text-sm text-muted-foreground">A {business.legalName}, CNPJ {business.cnpj}, responsável pela operação da SW Sports, trata dados pessoais necessários para operar a loja, atender clientes, processar pedidos, pagamentos e entregas, prevenir fraudes e cumprir obrigações legais e regulatórias aplicáveis.</p>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Compras e entrega</h3>
              <p className="text-sm text-muted-foreground">Dados informados no pedido, como nome, CPF/CNPJ, contato e endereço, são usados para atendimento, pagamento, emissão e entrega do pedido. O Mercado Pago processa o pagamento; o sistema administrativo organiza os pedidos e os dados de atendimento; e o Melhor Envio é utilizado no cálculo e na operação logística. Cada serviço recebe os dados necessários à sua função.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Direitos e solicitações de privacidade</h3>
              <p className="text-sm text-muted-foreground">O titular pode entrar em contato para solicitar informações e exercer os direitos previstos na legislação de proteção de dados aplicável. As solicitações serão analisadas considerando a identidade do solicitante e as obrigações legais de conservação de dados da empresa.</p>
              <a className="text-brand underline" href={`mailto:${business.email}`}>{business.email}</a>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Medição de anúncios</h3>
              <p className="text-sm text-muted-foreground">{NOTICE_TEXT}</p>
              <p className="text-sm text-muted-foreground">Usamos a tag Google Ads AW-875949502 e Meta Pixel 1664422701692558 para medir visitas à vitrine e desempenho publicitário. Informações técnicas podem incluir endereço IP, navegador, página visitada e cookies publicitários. Não ativamos correspondência de clientes, coleta automática de formulários, personalização de anúncios ou envio de compras confirmadas nesta instalação.</p>
              <p className="text-sm text-muted-foreground">As páginas administrativas e os dados de entrega e pagamento não são enviados por estes rastreadores. O código AW é do Google Ads; Google Analytics 4 não está instalado por esse código.</p>
              <p className="text-sm"><a className="text-brand underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacidade do Google</a>{" · "}<a className="text-brand underline" href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">Privacidade da Meta</a></p>
            </div>
          </section>

          <section id="cookies" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold">Política de Cookies e Tecnologias de Rastreamento</h2>
            <p className="text-sm text-muted-foreground">A loja utiliza tecnologias necessárias ao funcionamento do site e, conforme a escolha do visitante, tecnologias publicitárias do Google Ads e da Meta para medição de visitas e desempenho de anúncios.</p>
            <p className="text-sm text-muted-foreground">O site guarda neste navegador um identificador aleatório do visitante, data, região e histórico das escolhas de publicidade, com o texto apresentado e versão {NOTICE_VERSION}. Quando o consentimento é exigido e ainda não foi concedido, o rastreamento publicitário permanece bloqueado. A retirada da permissão bloqueia novos envios e não envia eventos anteriores retroativamente.</p>
            <p className="text-sm text-muted-foreground">O visitante pode revisar sua escolha a qualquer momento pelo botão abaixo.</p>
            <Button variant="outline" className="min-h-11" onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}>Configurações de cookies</Button>
          </section>

          <section id="trocas" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Trocas, Devoluções e Reembolsos</h2>
            <p className="text-sm text-muted-foreground">Nas compras realizadas pela internet, o consumidor pode exercer o direito de arrependimento no prazo legal de 7 dias contados da assinatura ou do recebimento do produto, conforme o Código de Defesa do Consumidor. Quando o direito for aplicável e exercido regularmente, os valores pagos serão restituídos na forma prevista pela legislação.</p>
            <p className="text-sm text-muted-foreground">Produtos que apresentem vício ou estejam em desacordo com a oferta serão tratados conforme as garantias e soluções previstas na legislação de defesa do consumidor. Esta política não limita direitos legais do cliente.</p>
            <p className="text-sm text-muted-foreground">Para solicitar atendimento, informe o número do pedido, o produto e o motivo pelo WhatsApp ou pelo e-mail {business.email}. A equipe fornecerá as orientações para devolução e acompanhamento. Antes de enviar o produto, solicite as instruções de retorno para permitir a correta identificação do pedido.</p>
            <a className="inline-flex min-h-11 items-center text-brand underline" href={contactUrl}>Solicitar troca, devolução ou reembolso</a>
          </section>

          <section id="entrega" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Política de Entrega</h2>
            <p className="text-sm text-muted-foreground">O frete é calculado a partir do CEP e dos itens do carrinho. As opções, valores e prazos estimados exibidos na compra são consultados pela integração com o Melhor Envio e novamente validados no servidor antes da criação do pagamento.</p>
            <p className="text-sm text-muted-foreground">O cliente deve conferir o endereço antes de concluir a compra. Se a busca automática do CEP não preencher algum campo, o checkout permite completar o endereço manualmente.</p>
            <p className="text-sm text-muted-foreground">Os prazos apresentados são estimativas de transporte. Em caso de dúvida sobre um envio, fale com a equipe informando os dados do pedido.</p>
          </section>

          <section id="termos" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Termos de Uso e Compra</h2>
            <p className="text-sm text-muted-foreground">Ao utilizar a loja, o visitante deve fornecer informações verdadeiras e utilizar o site de forma lícita. Os preços, produtos, características e condições comerciais válidos são os apresentados na loja no momento da compra, sem prejuízo dos direitos assegurados pela legislação brasileira.</p>
            <p className="text-sm text-muted-foreground">A disponibilidade dos produtos é verificada pelo fluxo da loja quando aplicável. Informações e publicidade suficientemente precisas integram a oferta nos termos da legislação de defesa do consumidor.</p>
            <p className="text-sm text-muted-foreground">O retorno do navegador após o pagamento não é tratado, sozinho, como confirmação financeira. A aprovação do pedido depende da confirmação segura recebida pela integração de pagamento.</p>
            <p className="text-sm text-muted-foreground">A SW Sports pode atualizar a apresentação da loja e estas políticas para operações futuras, preservando os direitos relacionados a pedidos já celebrados e a legislação aplicável.</p>
          </section>

          <section id="contato" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Identificação e Contato</h2>
            <p className="text-sm text-muted-foreground">Para dúvidas sobre pedidos, entrega, troca, devolução, reembolso ou privacidade, utilize os canais oficiais da SW Sports.</p>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">SW Sports</p>
              <p className="mt-2">Razão social: {business.legalName}</p>
              <p>CNPJ: {business.cnpj}</p>
              <p className="mt-2">{business.address}</p>
              <p>{business.city}</p>
              <p>CEP {business.postalCode}</p>
              <p className="mt-2">Telefone/WhatsApp: {business.phone}</p>
              <p>E-mail: <a className="text-brand underline" href={`mailto:${business.email}`}>{business.email}</a></p>
            </div>
            <a className="inline-flex min-h-11 items-center text-brand underline" href={contactUrl}>Falar com a SW Sports</a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
