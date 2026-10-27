import { useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";

export function TechShowcase() {
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      products.findIndex((item) => item.id === "sorriso-grisalho"),
    ),
  );
  const product = products[selected];
  const { add, openCart } = useCart();
  if (!product) return null;

  const change = (direction: number) =>
    setSelected((value) => (value + direction + products.length) % products.length);

  return (
    <section
      aria-labelledby="premium-title"
      className="border-b border-border pt-[72px] md:pt-[76px]"
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
              aria-live="polite"
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
              onClick={() => {
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
          <figure className="bg-[#121212]">
            <div className="flex h-[260px] items-center justify-center px-2 pt-4 min-[375px]:h-[300px] sm:h-[380px] lg:h-[430px]">
              <ProductImage
                product={product}
                alt={`Balaclava ${product.name} no modelo de referência da SW Sports`}
                sizes="(min-width: 1280px) 600px, (min-width: 1024px) 45vw, calc(100vw - 32px)"
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-contain"
              />
            </div>
            <figcaption className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {selected + 1} de {products.length} estampas
              </span>
              <div className="flex gap-2">
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
          <label className="mt-4 block text-sm">
            <span className="mb-2 block text-muted-foreground">Escolher estampa</span>
            <select
              aria-label="Escolher estampa"
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
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
