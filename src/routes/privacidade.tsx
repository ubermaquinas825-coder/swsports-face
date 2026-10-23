import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { NOTICE_TEXT, NOTICE_VERSION } from "@/lib/advertising";
import { waLink } from "@/lib/products";
import { business } from "@/lib/business";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Políticas, privacidade e termos | SW Sports" },
      {
        name: "description",
        content:
          "Consulte as políticas de privacidade, trocas, entrega, termos de uso e canais de contato da SW Sports.",
      },
      { property: "og:title", content: "Políticas da loja | SW Sports" },
      {
        property: "og:description",
        content: "Privacidade, trocas, entrega, termos de uso e contato da SW Sports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const contactUrl = waLink(
    "Olá, equipe SW Sports! Gostaria de falar sobre uma compra, entrega, troca ou privacidade.",
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-28">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.28em] text-brand">SW SPORTS</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Políticas da loja, privacidade e termos
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Atualização: 23 de outubro de 2026.
          </p>
        </div>

        <nav
          aria-label="Políticas da loja"
          className="mb-10 grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-2"
        >
          <a className="min-h-11 rounded-xl px-3 py-3 hover:bg-accent" href="#privacidade">
            Política de Privacidade
          </a>
          <a className="min-h-11 rounded-xl px-3 py-3 hover:bg-accent" href="#trocas">
            Trocas e Devoluções
          </a>
          <a className="min-h-11 rounded-xl px-3 py-3 hover:bg-accent" href="#entrega">
            Política de Entrega
          </a>
          <a className="min-h-11 rounded-xl px-3 py-3 hover:bg-accent" href="#termos">
            Termos de Uso
          </a>
        </nav>

        <div className="space-y-12 leading-relaxed">
          <section id="privacidade" className="scroll-mt-28 space-y-4">
            <h2 className="font-display text-2xl font-bold">Política de Privacidade</h2>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Compras e entrega</h3>
              <p className="text-sm text-muted-foreground">
                Dados informados no pedido, como nome, CPF/CNPJ, contato e endereço, são usados para atendimento, pagamento, emissão e entrega do pedido. O Mercado Pago processa o pagamento; o Bling auxilia na organização de pedidos e estoque; e a SuperFrete é utilizada no cálculo e na operação logística. Cada serviço recebe apenas os dados necessários à sua função.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Medição de anúncios</h3>
              <p className="text-sm text-muted-foreground">{NOTICE_TEXT}</p>
              <p className="text-sm text-muted-foreground">
                Usamos a tag Google Ads AW-875949502 e Meta Pixel 725374147272634 para medir visitas à vitrine e desempenho publicitário. Informações técnicas podem incluir endereço IP, navegador, página visitada e cookies publicitários. Não ativamos correspondência de clientes, coleta automática de formulários, personalização de anúncios ou envio de compras confirmadas nesta instalação.
              </p>
              <p className="text-sm text-muted-foreground">
                As páginas administrativas e os dados de entrega e pagamento não são enviados por estes rastreadores. O código AW é do Google Ads; Google Analytics 4 não está instalado por esse código.
              </p>
              <p className="text-sm">
                <a
                  className="text-brand underline"
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacidade do Google
                </a>
                {" · "}
                <a
                  className="text-brand underline"
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacidade da Meta
                </a>
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Sua escolha sobre cookies</h3>
              <p className="text-sm text-muted-foreground">
                O aviso é apresentado nas regiões que exigem consentimento, incluindo Brasil, Espaço Econômico Europeu, Reino Unido e Suíça. Quando a região não pode ser confirmada, o rastreamento permanece bloqueado até sua escolha. Nas demais regiões a medição pode ficar ativa, respeitando recusas e sinais de privacidade do navegador.
              </p>
              <p className="text-sm text-muted-foreground">
                Guardamos neste navegador um identificador aleatório do visitante, data, região e histórico das escolhas, com o texto apresentado e versão {NOTICE_VERSION}. Retirar o consentimento bloqueia novos envios. Eventos bloqueados não são enviados retroativamente.
              </p>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}
              >
                Configurações de cookies
              </Button>
            </div>
          </section>

          <section id="trocas" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Trocas e Devoluções</h2>
            <p className="text-sm text-muted-foreground">
              Para solicitar análise de troca ou devolução, entre em contato com a SW Sports informando o número do pedido, o produto e o motivo da solicitação. A equipe orientará os próximos passos conforme a situação do pedido, a condição do produto e a legislação aplicável.
            </p>
            <p className="text-sm text-muted-foreground">
              Evite enviar qualquer produto sem orientação prévia, para que o atendimento consiga identificar corretamente o pedido e a forma adequada de retorno.
            </p>
            <a className="inline-flex min-h-11 items-center text-brand underline" href={contactUrl}>
              Falar com a SW Sports sobre troca ou devolução
            </a>
          </section>

          <section id="entrega" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Política de Entrega</h2>
            <p className="text-sm text-muted-foreground">
              O frete é calculado a partir do CEP e dos itens do carrinho. As opções, valores e prazos estimados exibidos na compra são consultados pela integração com a SuperFrete e são novamente validados no servidor antes da criação do pagamento.
            </p>
            <p className="text-sm text-muted-foreground">
              O cliente deve conferir o endereço antes de concluir a compra. Se a busca automática do CEP não preencher algum campo, o checkout permite completar o endereço manualmente.
            </p>
            <p className="text-sm text-muted-foreground">
              Prazos apresentados são estimativas de transporte. Em caso de dúvida sobre um envio, fale com a equipe informando os dados do pedido.
            </p>
          </section>

          <section id="termos" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Termos de Uso e Compra</h2>
            <p className="text-sm text-muted-foreground">
              Os preços, produtos e condições comerciais válidos são os exibidos na loja no momento da compra. A disponibilidade de estoque é verificada pelo fluxo do checkout quando aplicável.
            </p>
            <p className="text-sm text-muted-foreground">
              O retorno do navegador após o pagamento não é tratado, sozinho, como confirmação financeira. A aprovação do pedido depende da confirmação segura recebida pela integração de pagamento.
            </p>
            <p className="text-sm text-muted-foreground">
              A SW Sports pode atualizar a apresentação da loja, políticas e condições futuras sem alterar pedidos já confirmados em condições anteriores.
            </p>
          </section>

          <section id="contato" className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-bold">Contato</h2>
            <p className="text-sm text-muted-foreground">
              Para dúvidas sobre pedidos, entrega, troca, devolução ou privacidade, utilize os canais oficiais da SW Sports.
            </p>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{business.name}</p>
              <p className="mt-2">{business.address}</p>
              <p>{business.city}</p>
              <p>CEP {business.postalCode}</p>
              <p className="mt-2">Telefone/WhatsApp: {business.phone}</p>
            </div>
            <a className="inline-flex min-h-11 items-center text-brand underline" href={contactUrl}>
              Falar com a SW Sports
            </a>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
