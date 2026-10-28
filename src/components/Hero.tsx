import { ArrowRight, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import { UNIT_PRICE, formatBRL } from "@/lib/products";
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
      className="border-b border-white/10 bg-[#0a0a0a] pt-[72px] md:pt-[82px]"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:py-9">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)] lg:items-center lg:gap-8 xl:gap-10">
          <div className="flex min-w-0 flex-col justify-center lg:py-1">
            <div className="max-w-2xl">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 sm:mb-4 sm:text-[11px]">
                Balaclavas SW Sports
              </p>

              <h1
                id="hero-title"
                className="max-w-[11.5ch] font-display text-[2.1rem] font-bold leading-[0.98] tracking-[-0.04em] text-white min-[390px]:text-[2.3rem] sm:text-[3.1rem] lg:text-[3.65rem] xl:text-[4.05rem]"
              >
                Balaclavas com personalidade.
                <span className="mt-1 block text-brand sm:mt-1.5">Estilo que diverte.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:mt-4 sm:text-base sm:leading-7">
                Balaclavas em tecido elastano com proteção solar UV50+.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 sm:mt-6 sm:p-4 lg:mt-7 lg:max-w-[500px] lg:p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-[10px]">
                    Preço por unidade
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-display text-[1.85rem] font-bold leading-none tracking-[-0.035em] text-white sm:text-[2.35rem]">
                      {formatBRL(UNIT_PRICE)}
                    </span>
                  </div>
                </div>
                <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:inline-flex">
                  Compra online
                </span>
              </div>

              <Button
                asChild
                size="lg"
                className="mt-3 min-h-12 w-full rounded-xl bg-brand px-5 text-[12px] font-bold tracking-[0.01em] text-white shadow-none transition-colors hover:bg-brand/90 sm:mt-4 sm:min-h-13 sm:text-[13px] lg:min-h-[52px]"
              >
                <a href="#colecao" className="flex items-center justify-between gap-4">
                  <span>ESCOLHER MINHA BALACLAVA</span>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                </a>
              </Button>

              <p className="mt-2.5 text-[10px] leading-4 text-white/40 sm:text-xs sm:leading-5">
                Compra segura, pagamento protegido e conexão criptografada durante todo o processo.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-[9px] leading-4 text-white/55 sm:mt-4 sm:gap-3 sm:pt-3.5 sm:text-[11px]">
                <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <LockKeyhole aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/65" />
                  <span>Mercado Pago</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <Truck aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/65" />
                  <span>Melhor Envio</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/65" />
                  <span>Compra segura</span>
                </span>
              </div>
            </div>
          </div>

          <figure
            ref={showcase.cardRef}
            className="order-first min-w-0 overflow-hidden rounded-[18px] border border-white/10 bg-[#111] lg:order-none lg:w-full lg:max-w-[500px] lg:justify-self-end lg:rounded-[22px]"
            aria-live="off"
          >
            <div className="relative isolate flex h-[225px] items-center justify-center overflow-hidden px-3 pt-3 min-[375px]:h-[250px] sm:h-[340px] sm:pt-4 lg:h-[430px] lg:px-5 lg:pt-6 xl:h-[450px]">
              <div aria-hidden className="absolute inset-x-[20%] bottom-5 h-10 rounded-full bg-white/[0.03] blur-xl sm:h-12" />

              {previousFeatured && showcase.motionAllowed && (
                <ProductImage
                  key={`previous-${previousFeatured.id}`}
                  product={previousFeatured}
                  alt=""
                  aria-hidden="true"
                  sizes={SHOWCASE_IMAGE_SIZES}
                  loading="eager"
                  className="premium-showcase-outgoing absolute inset-0 h-full w-full object-contain px-3 pt-3 lg:px-5 lg:pt-6"
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

              <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:left-4 sm:top-4 sm:text-[9px]">
                Modelo em destaque
              </div>
            </div>

            <figcaption className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white sm:text-[15px]">{featured.name}</p>
                <p className="mt-0.5 text-[10px] text-white/38 sm:text-[11px]">Coleção SW Sports</p>
              </div>
              <a
                href="#colecao"
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-[10px] font-semibold text-white/55 transition-colors hover:text-white sm:text-xs"
              >
                Ver coleção
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
