import { ArrowRight, LockKeyhole, Truck } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { SHOWCASE_IMAGE_SIZES, useProductShowcase } from "@/hooks/use-product-showcase";

export function Hero() {
  const { isOpen } = useCart();
  const showcase = useProductShowcase(isOpen, {
    intervalMs: 4500,
  });
  const featured = showcase.product;
  const previousFeatured = showcase.previousProduct;
  if (!featured) return null;

  return (
    <section aria-labelledby="hero-title" className="border-b border-border pt-[72px] md:pt-[76px]">
      <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-6 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-2 lg:gap-y-0 lg:py-16">
        <div className="self-end lg:pb-7">
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground">
            <span aria-hidden className="h-px w-8 bg-brand" />
            BALACLAVAS SW SPORTS
          </p>
          <h1
            id="hero-title"
            className="max-w-xl font-display text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]"
          >
            Balaclavas SW Sports.
            <br />
            <span className="text-brand">Escolha sua estampa.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Poliéster com elastano. {products.length} modelos para escolher a sua cara.
          </p>
        </div>

        <figure
          ref={showcase.cardRef}
          className="min-w-0 bg-[#141414] lg:col-start-2 lg:row-start-1 lg:row-span-2"
          aria-live="off"
        >
          <div className="relative isolate flex h-[250px] items-center justify-center overflow-hidden px-2 pt-4 min-[375px]:h-[290px] sm:h-[360px] lg:h-[440px]">
            {previousFeatured && showcase.motionAllowed && (
              <ProductImage
                key={`previous-${previousFeatured.id}`}
                product={previousFeatured}
                alt=""
                aria-hidden="true"
                sizes={SHOWCASE_IMAGE_SIZES}
                loading="eager"
                className="premium-showcase-outgoing absolute inset-0 h-full w-full object-contain px-2 pt-4"
              />
            )}
            <ProductImage
              key={featured.id}
              product={featured}
              alt={`Balaclava ${featured.name} da SW Sports, vista de frente`}
              sizes={SHOWCASE_IMAGE_SIZES}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className={`relative h-full w-full object-contain${previousFeatured && showcase.motionAllowed ? " premium-showcase-incoming" : ""}`}
            />
          </div>
          <figcaption className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-sm">
            <span className="font-medium">{featured.name}</span>
            <a
              href="#colecao"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver coleção <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </figcaption>
        </figure>

        <div className="self-start lg:pb-2">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-3xl font-bold tracking-tight">
              {formatBRL(UNIT_PRICE)}
            </span>
            <span className="text-sm text-muted-foreground">por unidade</span>
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 min-h-12 w-full rounded-md px-6 text-sm font-bold shadow-none sm:w-auto"
          >
            <a href="#colecao">
              ESCOLHER MINHA BALACLAVA <ArrowRight aria-hidden />
            </a>
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            Frete e total informados antes de pagar.
          </p>
          <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="flex items-center gap-2">
              <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />
              Pagamento pelo Mercado Pago
            </span>
            <span className="flex items-center gap-2">
              <Truck aria-hidden className="h-4 w-4 shrink-0" />
              Envio pelo Melhor Envio
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
