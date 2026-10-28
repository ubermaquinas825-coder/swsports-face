import { ArrowRight } from "lucide-react";
import { formatBRL, products, UNIT_PRICE, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";

function ProductCard({ product }: { product: Product }) {
  const { add, openCart } = useCart();

  const buyNow = () => {
    add(product.id);
    openCart();
  };

  return (
    <article className="flex min-w-0 flex-col">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#141414] p-3 sm:p-5">
        <ProductImage
          product={product}
          alt={`Balaclava ${product.name}`}
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1280px) 355px, (min-width: 1024px) calc((100vw - 216px) / 3), (min-width: 640px) calc((100vw - 152px) / 2), (min-width: 375px) calc((100vw - 96px) / 2), calc(100vw - 56px)"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <h3 className="min-h-12 font-display text-base font-semibold leading-snug sm:min-h-0 sm:text-lg">{product.name}</h3>
        <p className="mt-1 font-display text-2xl font-bold tracking-tight text-brand">{formatBRL(UNIT_PRICE)}</p>
        <Button
          onClick={buyNow}
          className="mt-4 min-h-11 w-full rounded-md text-xs font-bold shadow-none sm:text-sm"
        >
          COMPRAR AGORA <ArrowRight aria-hidden className="hidden sm:block" />
        </Button>
      </div>
    </article>
  );
}

export function Collection() {
  return (
    <section id="colecao" aria-labelledby="collection-title" className="scroll-mt-24 py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-brand">A COLEÇÃO</p>
            <h2 id="collection-title" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Escolha sua estampa.</h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Poliéster com elastano.<br />Frete calculado no carrinho.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-9 min-[375px]:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
}
