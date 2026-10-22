import { ScanFace, StretchHorizontal, Eye, Store } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const BENEFITS = [
  {
    icon: ScanFace,
    title: "Estampas realistas",
    text: "Cada modelo é uma personalidade completa, impressa com riqueza de detalhes.",
  },
  {
    icon: StretchHorizontal,
    title: "Poliéster com elastano",
    text: "Tecido com elasticidade para vestir bem e acompanhar os movimentos.",
  },
  {
    icon: Eye,
    title: "Feita para chamar atenção",
    text: "Não passa despercebida: a sua cara nova garante os olhares.",
  },
  {
    icon: Store,
    title: "Varejo e atacado",
    text: "Una unidade para você ou quantidade para a sua loja revender.",
  },
];

export function Benefits() {
  return (
    <section className="border-y border-border bg-popover/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="mb-12 max-w-xl">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">POR QUE SW SPORTS</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              MAIS QUE UM ACESSÓRIO
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.07}>
              <div className="h-full rounded-3xl border border-border bg-card p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
