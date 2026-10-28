import { ArrowRight, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
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
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-white/10 bg-[#090909] pt-[72px] md:pt-[76px]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.045),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-x-14 gap-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch lg:gap-y-0 lg:py-18">
        <div className="flex min-w-0 flex-col justify-between lg:pr-2">
          <div>
            <p className="mb-7 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              <span aria-hidden className="h-px w-9 bg-brand" />
              Coleção SW Sports
            </p>

            <h1
              id="hero-title"
              className="max-w-[11ch] font-display text-[2.55rem] font-bold leading-[0.98] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.65rem]"
            >
              Balaclavas com presença.
              <span className="mt-2 block text-brand">Escolha a sua.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-7 text-white/58 sm:text-lg">
              Poliéster com elastano, acabamento confortável e {products.length} estampas para combinar com o seu estilo.
            </p>
          </div>

          <div className="mt-10 border-t border-white/10 pt-7 lg:mt-12">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Por unidade</span>
              <span className="font-display text-4xl font-bold tracking-[-0.03em] text-white sm:text-[2.8rem]">
                {formatBRL(UNIT_PRICE)}
              </span>
            </div>

            <Button
              asChild
              size="lg"
              className="mt-6 min-h-14 w-full rounded-none border border-brand bg-brand px-7 text-sm font-bold tracking-[0.02em] text-white shadow-none transition-all hover:-translate-y-0.5 hover:bg-brand/90 sm:w-auto"
            >
              <a href="#colecao">
                ESCOLHER MINHA BALACLAVA
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </Button>

            <p className="mt-4 text-sm text-white/45">
              Frete e valor final exibidos antes da confirmação do pedido.
            </p>

            <div className="mt-7 grid gap-3 text-xs text-white/58 sm:grid-cols-3">
              <span className="flex items-center gap-2.5 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
                <LockKeyhole aria-hidden className="h-4 w-4 shrink-0 text-white/70" />
                Mercado Pago
              </span>
              <span className="flex items-center gap-2.5 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
                <Truck aria-hidden className="h-4 w-4 shrink-0 text-white/70" />
                Melhor Envio
              </span>
              <span className="flex items-center gap-2.5 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-white/70" />
                Compra segura
              </span>
            </div>
          </div>
        </div>

        <figure
          ref={showcase.cardRef}
          className="min-w-0 border border-white/10 bg-[#111] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
          aria-live="off"
        >
          <div className="relative isolate flex h-[300px] items-center justify-center overflow-hidden px-4 pt-5 min-[375px]:h-[340px] sm:h-[430px] lg:h-[560px]">
            <div aria-hidden className="absolute inset-x-10 bottom-5 h-16 rounded-full bg-white/[0.025] blur-2xl" />
            {previousFeatured && showcase.motionAllowed && (
              <ProductImage
                key={`previous-${previousFeatured.id}`}
                product={previousFeatured}
                alt=""
                aria-hidden="true"
                sizes={SHOWCASE_IMAGE_SIZES}
                loading="eager"
                className="premium-showcase-outgoing absolute inset-0 h-full w-full object-contain px-4 pt-5"
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

          <figcaption className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Modelo em destaque</p>
              <span className="mt-1 block truncate text-sm font-semibold text-white/90 sm:text-base">{featured.name}</span>
            </div>
            <a
              href="#colecao"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
            >
              Ver coleção <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
