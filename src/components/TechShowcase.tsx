import { ArrowLeft, ArrowRight, Pause, Play, ShoppingBag } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { SHOWCASE_IMAGE_SIZES, useProductShowcase } from "@/hooks/use-product-showcase";

export function TechShowcase() {
  const { add, openCart, isOpen } = useCart();
  const showcase = useProductShowcase(isOpen);
  const { product, previousProduct, selected, paused, motionAllowed, loading, cardRef, select } = showcase;
  if (!product) return null;

  const change = (direction: number) =>
    select((selected + direction + products.length) % products.length);

  return (
    <section
      aria-labelledby="premium-title"
      className="border-b border-border pt-[72px] md:pt-[76px]"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") showcase.setHovered(true);
      }}
      onPointerLeave={() => showcase.setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-playback-control]")) showcase.pause();
      }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-9 sm:px-6 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-14">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-brand">
            VESTUÁRIO SW SPORTS
          </p>
          <h1
            id="premium-title"
            className="max-w-lg font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
          >
            Balaclavas
            <br />
            com personalidade.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Poliéster com elastano. Escolha entre {products.length} estampas e compre pelo site.
          </p>
          <div className="mt-7 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">Estampa selecionada</p>
            <p
              className="mt-1 font-display text-lg font-semibold"
              aria-live={paused ? "polite" : "off"}
              aria-atomic="true"
            >
              {product.name}
            </p>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight">
              {formatBRL(UNIT_PRICE)}{" "}
              <span className="font-sans text-sm font-normal text-muted-foreground">
                por unidade
              </span>
            </p>
            <Button
              type="button"
              className="mt-5 min-h-12 w-full rounded-md px-6 font-bold shadow-none sm:w-auto"
              disabled={loading}
              onClick={() => {
                showcase.pause();
                add(product.id);
                openCart();
              }}
            >
              <ShoppingBag aria-hidden />
              COMPRAR ESTA ESTAMPA
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              Frete e total informados antes de pagar.
            </p>
            <a
              href="#colecao"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4 transition-colors hover:text-brand"
            >
              Ver todas as estampas <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="min-w-0">
          <figure
            ref={cardRef}
            aria-label="Balaclavas em destaque"
            aria-roledescription="carrossel"
            aria-busy={loading}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-[0_18px_48px_-24px_rgba(0,0,0,0.6)]"
          >
            <div className="relative isolate aspect-[4/3] overflow-hidden">
              <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-3 sm:inset-x-5 sm:top-5">
                <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-white/65">
                  <span aria-hidden className="h-3 w-0.5 bg-brand" />
                  BALACLAVAS SW SPORTS
                </span>
                <span className="text-xs tabular-nums text-white/50" aria-label={`${selected + 1} de ${products.length} estampas`}>
                  <span className="font-semibold text-white">{String(selected + 1).padStart(2, "0")}</span>
                  <span aria-hidden> / </span>{String(products.length).padStart(2, "0")}
                </span>
              </div>
              {previousProduct && motionAllowed && (
                <ProductImage
                  key={`previous-${previousProduct.id}`}
                  product={previousProduct}
                  alt=""
                  aria-hidden="true"
                  sizes={SHOWCASE_IMAGE_SIZES}
                  loading="eager"
                  className="premium-showcase-outgoing absolute inset-0 h-full w-full object-contain px-2 pt-8"
                />
              )}
              <ProductImage
                key={product.id}
                product={product}
                alt={`Balaclava ${product.name} no modelo de referência da SW Sports`}
                sizes={SHOWCASE_IMAGE_SIZES}
                loading="eager"
                fetchPriority="high"
                className={`relative h-full w-full object-contain px-2 pt-8${previousProduct && motionAllowed ? " premium-showcase-incoming" : ""}`}
              />
            </div>
            <figcaption className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
              <p className="text-sm font-medium leading-snug sm:text-base">{product.name}</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-playback-control
                  disabled={!motionAllowed}
                  className="h-11 w-11 rounded-md text-muted-foreground hover:text-white"
                  onClick={showcase.togglePlayback}
                  aria-label={paused || !motionAllowed ? "Reproduzir apresentação" : "Pausar apresentação"}
                  title={!motionAllowed ? "Movimento reduzido: escolha pelas setas" : paused ? "Reproduzir apresentação" : "Pausar apresentação"}
                >
                  {paused || !motionAllowed ? <Play aria-hidden /> : <Pause aria-hidden />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-md"
                  onClick={() => change(-1)}
                  aria-label="Estampa anterior"
                >
                  <ArrowLeft aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-md"
                  onClick={() => change(1)}
                  aria-label="Próxima estampa"
                >
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </figcaption>
          </figure>
          {showcase.imageError && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Não foi possível carregar esta estampa. Tente novamente.
            </p>
          )}
          <label className="mt-4 block text-sm">
            <span className="mb-2 block text-muted-foreground">Escolher estampa</span>
            <select
              aria-label="Escolher estampa"
              value={selected}
              onChange={(event) => select(Number(event.target.value))}
              className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {products.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
