import { useState } from "react";
import { ArrowRight, Maximize2, ShieldCheck, ShoppingBag } from "lucide-react";
import { formatBRL, products, UNIT_PRICE, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ProductCard({ product, onPreview }: { product: Product; onPreview: (product: Product) => void }) {
  const { add, openCart } = useCart();

  const buyNow = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    add(product.id);
    openCart();
  };

  const openPreview = () => onPreview(product);

  return (
    <article
      className="group flex min-w-0 cursor-pointer flex-col"
      onClick={openPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPreview();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes da balaclava ${product.name}`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#141414] p-3 transition-colors group-hover:bg-[#181818] sm:p-5">
        <ProductImage
          product={product}
          alt={`Balaclava ${product.name}`}
          loading="lazy"
          decoding="async"
          sizes="(min-width: 1280px) 355px, (min-width: 1024px) calc((100vw - 216px) / 3), (min-width: 640px) calc((100vw - 152px) / 2), (min-width: 375px) calc((100vw - 96px) / 2), calc(100vw - 56px)"
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025]"
        />
        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 sm:right-3 sm:top-3">
          <Maximize2 aria-hidden className="h-3.5 w-3.5" />
          <span className="sr-only">Ampliar</span>
        </span>
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { add } = useCart();

  const addSelectedToCart = () => {
    if (!selectedProduct) return;
    add(selectedProduct.id);
    setSelectedProduct(null);
  };

  return (
    <>
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
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onPreview={setSelectedProduct} />
            ))}
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        {selectedProduct && (
          <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-md gap-0 overflow-y-auto rounded-2xl border-white/10 bg-[#0d0d0d] p-0 text-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex min-h-[300px] items-center justify-center bg-[#141414] p-4 sm:min-h-[390px] sm:p-7">
              <ProductImage
                product={selectedProduct}
                alt={`Balaclava ${selectedProduct.name} ampliada`}
                loading="eager"
                decoding="async"
                sizes="(min-width: 640px) 560px, calc(100vw - 56px)"
                className="h-full max-h-[54dvh] w-full object-contain"
              />
            </div>

            <div className="p-5 sm:p-7">
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-start justify-between gap-4 pr-8">
                  <DialogTitle className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                    {selectedProduct.name}
                  </DialogTitle>
                  <span className="shrink-0 font-display text-xl font-bold text-brand sm:text-2xl">
                    {formatBRL(UNIT_PRICE)}
                  </span>
                </div>
                <DialogDescription className="text-sm leading-6 text-white/55 sm:text-base">
                  {selectedProduct.description}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-4 text-center text-[10px] leading-4 text-white/65 sm:gap-3 sm:text-xs">
                <div className="rounded-xl bg-white/[0.035] px-2 py-3">Proteção solar UV50+</div>
                <div className="rounded-xl bg-white/[0.035] px-2 py-3">Tecido com elastano</div>
                <div className="rounded-xl bg-white/[0.035] px-2 py-3">Confortável e respirável</div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-white/50 sm:text-sm">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-brand" />
                Compra segura e pagamento protegido.
              </div>

              <Button
                onClick={addSelectedToCart}
                size="lg"
                className="mt-5 min-h-13 w-full rounded-xl text-sm font-bold shadow-none sm:min-h-14"
              >
                <ShoppingBag aria-hidden className="h-4 w-4" />
                ADICIONAR AO CARRINHO
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-white/40 sm:text-xs">
                O produto será adicionado ao carrinho e você poderá continuar escolhendo outras estampas.
              </p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
