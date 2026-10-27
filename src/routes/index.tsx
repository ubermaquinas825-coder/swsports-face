import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { Collection } from "@/components/Collection";
import { Benefits } from "@/components/Benefits";
import { Faq } from "@/components/Faq";
import { SiteFooter } from "@/components/SiteFooter";
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
      { property: "og:image", content: new URL(products[1].image, SITE_URL).href },
      { property: "og:image:alt", content: "Balaclava Boca de Beijo da SW Sports" },
      { name: "twitter:image", content: new URL(products[1].image, SITE_URL).href },
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
          image: new URL(product.image, SITE_URL).href,
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
    <section aria-labelledby="wholesale-title" className="bg-[#141414]">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-brand">ATACADO E REVENDA</p>
          <h2 id="wholesale-title" className="max-w-md font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">SW Sports na sua loja.</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">Balaclavas com personalidade para o seu público. Consulte condições para compras em quantidade diretamente com a nossa equipe.</p>
          <Link to="/atacado" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-foreground/40 px-5 py-3 text-sm font-bold transition-colors hover:border-brand hover:text-brand sm:w-auto">QUERO REVENDER SW SPORTS</Link>
        </div>
        <div aria-hidden className="grid grid-cols-3 gap-2 border-b border-white/10 pb-5 sm:gap-4">
          {products.slice(0, 3).map((product) => <img key={product.id} src={product.image} alt="" width={300} height={240} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-contain" />)}
        </div>
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
        <div id="personalidade" className="scroll-mt-24"><Collection /></div>
        <Benefits />
        <WholesaleStrip />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
