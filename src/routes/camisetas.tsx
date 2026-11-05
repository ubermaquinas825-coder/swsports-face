import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Bike, ShieldCheck, Shirt } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShirtCollection } from "@/components/ShirtCollection";
import { shirtModels } from "@/lib/products";

const PAGE_URL = "https://www.balaclavaswsports.com.br/camisetas";
const description = "Camisas iFood SW SPORTS unissex em tecido DrySport, manga longa e proteção solar UV 50+. Referências 01, 02 e 03 por R$ 79,90. Veja modelos, tamanhos e medidas.";

export const Route = createFileRoute("/camisetas")({
  head: () => ({
    meta: [
      { title: "Camisetas Manga Longa UV 50+ | SW Sports" },
      { name: "description", content: description },
      { property: "og:title", content: "Camisetas Manga Longa UV 50+ | SW Sports" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Camisetas Manga Longa UV 50+ | SW Sports" },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: ShirtsPage,
});

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Camisetas manga longa UV 50+",
  url: PAGE_URL,
  description,
  // No Offer/stock claim until each size is enabled for sale.
  mainEntity: {
    "@type": "ItemList",
    itemListElement: shirtModels.map((model, index) => ({
      "@type": "ListItem", position: index + 1, name: model.name,
      url: `${PAGE_URL}#camisetas`,
    })),
  },
};

function ShirtsPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <SiteHeader />
    <main>
      <section aria-labelledby="shirts-page-title" className="border-b border-white/10 bg-[#0a0a0a] pt-[72px] md:pt-[82px]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
          <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-brand">SW SPORTS · CAMISETAS</p>
          <h1 id="shirts-page-title" className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Manga longa para a sua rotina.<span className="mt-2 block text-brand">Proteção solar UV 50+.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Camisas iFood SW SPORTS unissex em tecido DrySport, para a rotina de entregas e o uso diário. Conheça as três referências por R$ 79,90 cada e confira os tamanhos de cada modelo.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#camisetas" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 text-sm font-bold transition-colors hover:bg-brand/90">CONHECER OS MODELOS <ArrowDown aria-hidden className="h-4 w-4" /></a>
            <Link to="/" hash="colecao" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-white/25 px-5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand">Ver balaclavas <ArrowRight aria-hidden className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            {[{ icon: ShieldCheck, text: "Proteção solar UV 50+" }, { icon: Shirt, text: "DrySport · Manga longa · Unissex" }, { icon: Bike, text: "Para entregas e uso diário" }].map(({ icon: Icon, text }) => <p key={text} className="flex items-center gap-3 text-muted-foreground"><Icon aria-hidden className="h-5 w-5 shrink-0 text-brand" />{text}</p>)}
          </div>
        </div>
      </section>
      <ShirtCollection />
    </main>
    <SiteFooter />
  </>;
}
