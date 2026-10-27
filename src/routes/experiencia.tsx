import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { TechShowcase } from "@/components/TechShowcase";
import { Collection } from "@/components/Collection";
import { Benefits } from "@/components/Benefits";
import { Faq } from "@/components/Faq";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/experiencia")({
  head: () => ({
    meta: [
      { title: "Balaclavas SW Sports | Escolha sua estampa" },
      {
        name: "description",
        content:
          "Explore as estampas das balaclavas SW Sports. Poliéster com elastano, R$ 49,90 por unidade, pagamento pelo Mercado Pago e frete pelo Melhor Envio.",
      },
      { property: "og:title", content: "Balaclavas com personalidade | SW Sports" },
      {
        property: "og:description",
        content: "Explore a coleção de balaclavas SW Sports por R$ 49,90 por unidade.",
      },
      {
        property: "og:image",
        content:
          "https://www.balaclavaswsports.com.br/products/optimized/sorriso-grisalho-800.webp",
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.balaclavaswsports.com.br/" }],
  }),
  component: Experience,
});

function Experience() {
  return (
    <>
      <SiteHeader />
      <main className="premium-experience">
        <TechShowcase />
        <Collection />
        <Benefits />
        <section className="border-b border-border bg-[#141414] py-12 md:py-16">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand">
                ATACADO E REVENDA
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Personalidade para sua loja.
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Consulte as condições para revender balaclavas SW Sports.
              </p>
            </div>
            <Link
              to="/atacado"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-white/30 px-5 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              QUERO REVENDER SW SPORTS <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
