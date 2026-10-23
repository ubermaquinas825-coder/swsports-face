import { ChevronDown } from "lucide-react";
import { formatBRL, UNIT_PRICE } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

const FAQS = [
  {
    q: "Quanto custa cada balaclava?",
    a: `Cada modelo custa ${formatBRL(UNIT_PRICE)}. Escolha a estampa, calcule o frete e finalize a compra pelo site.`,
  },
  {
    q: "De qual material é feita?",
    a: "As balaclavas são de poliéster com elastano, com elasticidade para vestir bem.",
  },
  {
    q: "Como faço o pedido?",
    a: "Escolha as balaclavas, calcule o frete no carrinho e siga para o pagamento seguro pelo Mercado Pago.",
  },
  {
    q: "Quanto custa o frete?",
    a: "O frete é consultado pela SuperFrete no carrinho, de acordo com o CEP e os itens do pedido.",
  },
  {
    q: "Vocês vendem no atacado?",
    a: "Sim. Lojistas podem solicitar condições comerciais na página de Atacado e Revenda.",
  },
  {
    q: "Quais modelos estão disponíveis?",
    a: "Velhinho Bigodudo, Boca de Beijo, Vovó Rebelde, Sorriso Banguela, Gato Divertido e Bebê com Chupeta — todos na coleção.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <Reveal>
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">PERGUNTAS FREQUENTES</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              TUDO QUE VOCÊ PRECISA SABER
            </h2>
          </div>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <details className="group rounded-2xl border border-border bg-card px-5 py-4 open:border-brand/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-sm font-bold tracking-wide sm:text-base">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-brand transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
