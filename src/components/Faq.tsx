import { ChevronDown } from "lucide-react";
import { formatBRL, UNIT_PRICE } from "@/lib/products";

const FAQS = [
  { q: "De qual material é feita?", a: "As balaclavas são de poliéster com elastano, com elasticidade para acompanhar os movimentos." },
  { q: "Como confirmo as medidas?", a: "Antes de comprar, fale com o atendimento pelo WhatsApp para consultar as medidas do modelo escolhido." },
  { q: "Quanto custa cada balaclava?", a: `Cada modelo custa ${formatBRL(UNIT_PRICE)} por unidade. O frete é calculado separadamente no carrinho.` },
  { q: "Como vejo o frete e o prazo?", a: "Informe seu CEP no carrinho. As opções de transporte, os valores e os prazos estimados são consultados pelo Melhor Envio. Você confere o total antes de seguir para o pagamento." },
  { q: "Como funciona o pagamento?", a: "Depois de escolher o frete e preencher os dados de entrega, revise o pedido e siga para o pagamento pelo Mercado Pago." },
  { q: "Como compro para revender?", a: "Acesse Atacado e Revenda e informe os modelos e a quantidade desejada. A equipe envia as condições comerciais pelo WhatsApp." },
  { q: "Posso solicitar uma troca ou devolução?", a: "Consulte a política de trocas e devoluções no rodapé. Para iniciar o atendimento, entre em contato com a SW Sports e informe os dados do pedido." },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-12 md:py-20">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand">ANTES DE COMPRAR</p>
          <h2 id="faq-title" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Tire suas dúvidas.</h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Material, entrega, pagamento e atendimento. As informações para escolher com tranquilidade.</p>
        </div>
        <div className="border-t border-border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium">
                {q}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="max-w-xl pb-5 pr-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
