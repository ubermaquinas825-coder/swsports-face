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
      className="border-b border-white/10 bg-[#0a0a0a] pt-[72px] md:pt-[76px]"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(440px,1.06fr)] lg:items-stretch lg:gap-10 xl:gap-14">
          <div className="flex min-w-0 flex-col justify-center lg:py-4">
            <div className="max-w-2xl">
              <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45 sm:text-[11px]">
                <span aria-hidden className="h-px w-8 bg-brand sm:w-10" />
                Balaclavas SW Sports
              </p>

              <h1
                id="hero-title"
                className="max-w-[10.5ch] font-display text-[2.55rem] font-bold leading-[0.96] tracking-[-0.04em] text-white sm:text-[3.6rem] lg:text-[4.35rem] xl:text-[4.9rem]"
              >
                Sua estampa.
                <span className="block text-brand">Sua presença.</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-6 text-white/55 sm:mt-6 sm:text-lg sm:leading-7">
                Balaclavas em poliéster com elastano, conforto para o uso diário e {products.length} modelos exclusivos para escolher.
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:mt-8 sm:p-5 lg:mt-10 lg:max-w-xl lg:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Preço por unidade
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-display text-[2.15rem] font-bold leading-none tracking-[-0.035em] text-white sm:text-[2.65rem]">
                      {formatBRL(UNIT_PRICE)}
                    </span>
                  </div>
                </div>
                <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
                  Compra online
                </span>
              </div>

              <Button
                asChild
                size="lg"
                className="mt-5 min-h-14 w-full rounded-xl bg-brand px-6 text-[13px] font-bold tracking-[0.015em] text-white shadow-none transition-colors hover:bg-brand/90 sm:text-sm lg:min-h-[58px]"
              >
                <a href="#colecao" className="flex items-center justify-between gap-4">
                  <span>ESCOLHER MINHA BALACLAVA</span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                </a>
              </Button>

              <p className="mt-3 text-xs leading-5 text-white/38 sm:text-[13px]">
                Frete e valor final informados antes do pagamento.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-white/10 pt-4 text-xs text-white/55 min-[430px]:grid-cols-3">
                <span className="flex items-center gap-2">
                  <LockKeyhole aria-hidden className="h-4 w-4 shrink-0 text-white/65" />
                  Mercado Pago
                </span>
                <span className="flex items-center gap-2">
                  <Truck aria-hidden className="h-4 w-4 shrink-0 text-white/65" />
                  Melhor Envio
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-white/65" />
                  Compra segura
                </span>
              </div>
            </div>
          </div>

          <figure
            ref={showcase.cardRef}
            className="order-first min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#111] lg:order-none lg:rounded-[26px]"
            aria-live="off"
          >
            <div className="relative isolate flex h-[285px] items-center justify-center overflow-hidden px-3 pt-4 min-[375px]:h-[320px] sm:h-[420px] lg:h-full lg:min-h-[570px] lg:px-6 lg:pt-8">
              <div aria-hidden className="absolute inset-x-[18%] bottom-6 h-12 rounded-full bg-white/[0.035] blur-2xl sm:h-16" />

              {previousFeatured && showcase.motionAllowed && (
                <ProductImage
                  key={`previous-${previousFeatured.id}`}
                  product={previousFeatured}
                  alt=""
                  aria-hidden="true"
                  sizes={SHOWCASE_IMAGE_SIZES}
                  loading="eager"
                  className="premium-showcase-outgoing absolute inset-0 h-full w-full object-contain px-3 pt-4 lg:px-6 lg:pt-8"
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

              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55 backdrop-blur-sm sm:left-5 sm:top-5 sm:text-[10px]">
                Modelo em destaque
              </div>
            </div>

            <figcaption className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white sm:text-base">{featured.name}</p>
                <p className="mt-1 text-xs text-white/38">Coleção SW Sports</p>
              </div>
              <a
                href="#colecao"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-white/55 transition-colors hover:text-white sm:text-sm"
              >
                Ver coleção
                <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
