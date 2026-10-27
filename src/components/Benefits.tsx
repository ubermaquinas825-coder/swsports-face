import { ScanFace, StretchHorizontal, Store } from "lucide-react";

const BENEFITS = [
  { icon: StretchHorizontal, title: "Poliéster com elastano", text: "Elasticidade para acompanhar os movimentos." },
  { icon: ScanFace, title: "Seis estampas, sua escolha", text: "Veja os modelos e escolha a sua balaclava." },
  { icon: Store, title: "Varejo e atacado", text: "Compre pelo site ou consulte condições para revenda." },
];

export function Benefits() {
  return (
    <section aria-label="Sobre as balaclavas" className="border-y border-border">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-9 sm:px-6 md:grid-cols-3 md:gap-10 md:py-12">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-4">
            <Icon aria-hidden className="mt-1 h-5 w-5 shrink-0 text-brand" />
            <div>
              <h2 className="font-display text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
