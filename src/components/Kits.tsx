import { formatBRL, UNIT_PRICE } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

const KITS = [
  { qty: 2, total: 89.9, note: "Sugestão de valor" },
  { qty: 3, total: 119.9, note: "Sugestão de valor" },
];

export function Kits() {
  return (
    <section id="kits" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="mb-12 max-w-xl">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">KITS PROMOCIONAIS</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              UMA PERSONALIDADE NÃO É SUFICIENTE.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Em breve será possível montar kits misturando modelos. As ofertas abaixo aguardam
              aprovação comercial antes de entrar no ar.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
          {KITS.map((kit, i) => (
            <Reveal key={kit.qty} delay={i * 0.08}>
              <div className="relative flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
                <span className="absolute right-4 top-4 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground">
                  EM APROVAÇÃO
                </span>
                <p className="font-display text-4xl font-bold text-white">
                  {kit.qty}x
                </p>
                <div>
                  <p className="font-display text-2xl font-bold">{formatBRL(kit.total)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Equivale a {formatBRL(kit.total / kit.qty)} por unidade
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Economia de {formatBRL(kit.qty * UNIT_PRICE - kit.total)} no kit completo
                  ({kit.note}).
                </p>
                <button
                  disabled
                  className="mt-auto cursor-not-allowed rounded-full border border-border px-5 py-2.5 text-xs font-bold tracking-wide text-muted-foreground"
                >
                  MONTAR MEU KIT
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
