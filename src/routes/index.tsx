import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Collection } from "@/components/Collection";
import { Personality } from "@/components/Personality";
import { Kits } from "@/components/Kits";
import { Benefits } from "@/components/Benefits";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SW Sports — Balaclavas Divertidas | É uma nova personalidade" },
      {
        name: "description",
        content:
          "Balaclavas com estampas realistas e divertidas por R$ 49,90. Consulte o frete SuperFrete e pague com segurança pelo Mercado Pago.",
      },
      { property: "og:title", content: "SW Sports — Balaclavas Divertidas" },
      {
        property: "og:description",
        content:
          "Não é só uma balaclava. É uma nova personalidade. Estampas realistas por R$ 49,90, frete SuperFrete e pagamento Mercado Pago.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SW Sports — Balaclavas Divertidas" },
      {
        name: "twitter:description",
        content: "Não é só uma balaclava. É uma nova personalidade. A partir de R$ 49,90.",
      },
    ],
  }),
  component: Home,
});

function WholesaleStrip() {
  return (
    <section className="border-y border-border bg-popover/40 py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center md:px-6">
        <Reveal>
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">ATACADO E REVENDA</p>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              LEVE A SW SPORTS PARA A SUA LOJA
            </h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Solicite condições comerciais para compras em quantidade.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            to="/atacado"
            className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3 text-sm font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
          >
            SOLICITAR ORÇAMENTO
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Collection />
        <div className="render-later"><Personality /></div>
        <div className="render-later"><Kits /></div>
        <div className="render-later"><Benefits /></div>
        <div className="render-later"><WholesaleStrip /></div>
        <div className="render-later"><Faq /></div>
        <div className="render-later"><FinalCta /></div>
      </main>
      <SiteFooter />
    </>
  );
}
