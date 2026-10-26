import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Collection } from "@/components/Collection";
import { Personality } from "@/components/Personality";
import { Benefits } from "@/components/Benefits";
import { Reviews } from "@/components/Reviews";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { products, UNIT_PRICE } from "@/lib/products";
import { business } from "@/lib/business";

const SITE_URL = "https://www.balaclavaswsports.com.br/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Balaclavas Divertidas e Personalizadas | SW Sports" },
      {
        name: "description",
        content:
          "Balaclavas SW Sports com estampas realistas e divertidas. Modelos exclusivos por R$ 49,90. Calcule seu frete e compre com pagamento seguro pelo Mercado Pago.",
      },
      { property: "og:title", content: "Balaclavas Divertidas e Personalizadas | SW Sports" },
      {
        property: "og:description",
        content:
          "Modelos exclusivos por R$ 49,90, frete calculado pelo Melhor Envio e pagamento seguro pelo Mercado Pago.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "SW Sports" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Balaclavas Divertidas e Personalizadas | SW Sports" },
      {
        name: "twitter:description",
        content: "Balaclavas com estampas realistas e divertidas por R$ 49,90.",
      },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Home,
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "SW Sports",
      url: SITE_URL,
      telephone: business.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address,
        addressLocality: "Uberlândia",
        addressRegion: "MG",
        postalCode: business.postalCode,
        addressCountry: "BR",
      },
    },
    {
      "@type": "ItemList",
      name: "Coleção de balaclavas SW Sports",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: `Balaclava ${product.name}`,
          description: product.description,
          image: product.image,
          brand: { "@type": "Brand", name: "SW Sports" },
          offers: {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: UNIT_PRICE.toFixed(2),
            url: `${SITE_URL}#colecao`,
          },
        },
      })),
    },
  ],
};

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
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-7 py-3 text-sm font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <main>
        <Hero />
        <Collection />
        <div className="render-later"><Personality /></div>
        <div className="render-later"><Benefits /></div>
        <div className="render-later"><Reviews /></div>
        <div className="render-later"><WholesaleStrip /></div>
        <div className="render-later"><Faq /></div>
        <div className="render-later"><FinalCta /></div>
      </main>
      <SiteFooter />
    </>
  );
}
