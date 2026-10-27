import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import { UNIT_PRICE, formatBRL, productFor, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";

function DepthProduct({
  product,
  index,
  progress,
}: {
  product: Product;
  index: number;
  progress: MotionValue<number>;
}) {
  const { add, openCart } = useCart();
  const position = index - 1;
  const rotateY = useTransform(
    progress,
    [0, 0.5, 1],
    [position * -28, position * -8, position * 18],
  );
  const y = useTransform(
    progress,
    [0, 0.5, 1],
    [Math.abs(position) * 70, position * -18, Math.abs(position) * -45],
  );
  const z = useTransform(
    progress,
    [0, 0.5, 1],
    [position === 0 ? 70 : -70, 0, position === 0 ? -35 : 50],
  );
  return (
    <motion.article
      initial={false}
      style={{ rotateY, y, z, transformStyle: "preserve-3d" }}
      className="tech-depth-card relative flex min-w-0 flex-col rounded-md border border-white/15 bg-[#131313] p-3 sm:p-4"
    >
      <img
        src={product.image}
        alt={`Balaclava ${product.name}`}
        width={400}
        height={320}
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full object-contain"
      />
      <h3 className="mt-3 font-display text-base font-semibold">{product.name}</h3>
      <p className="mt-2 text-lg font-bold text-brand">{formatBRL(UNIT_PRICE)}</p>
      <button
        type="button"
        onClick={() => {
          add(product.id);
          openCart();
        }}
        className="mt-3 inline-flex min-h-11 items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm font-semibold transition-colors hover:text-brand"
        aria-label={`Comprar ${product.name}`}
      >
        Escolher <ArrowRight aria-hidden className="h-4 w-4" />
      </button>
    </motion.article>
  );
}

export function TechScrollScene() {
  const target = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end end"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-25, 100]);
  const featured = ["bigodudo-irreverente", "sorriso-rebelde", "grisalho-sorridente"].map(productFor);
  return (
    <section
      ref={target}
      aria-labelledby="depth-title"
      className="tech-scroll-scene relative border-b border-border"
    >
      <div className="tech-sticky-scene mx-auto grid max-w-7xl items-center gap-9 px-4 py-12 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-brand">
            ESCOLHA EM MOVIMENTO
          </p>
          <h2
            id="depth-title"
            className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
          >
            A sua cara.
            <br />
            De outro ângulo.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
            Veja os detalhes das estampas. Escolha uma balaclava e confira o frete no carrinho.
          </p>
          <div className="mt-7 border-t border-border pt-5">
            <p className="text-sm font-medium">Poliéster com elastano</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatBRL(UNIT_PRICE)} por unidade.
            </p>
          </div>
          <div aria-hidden className="tech-scroll-hint mt-8 hidden lg:block">
            <p className="mb-3 text-xs text-muted-foreground">CONTINUE ROLANDO</p>
            <div className="h-px w-32 overflow-hidden bg-white/15">
              <motion.div
                style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
                className="h-full w-full bg-brand"
              />
            </div>
          </div>
        </div>
        <div className="tech-depth-stage relative isolate min-w-0">
          <motion.div
            aria-hidden
            initial={false}
            style={{ rotate }}
            className="pointer-events-none absolute inset-8 -z-10 border border-brand/20"
          />
          <div className="tech-depth-grid grid grid-cols-1 items-start gap-4 sm:grid-cols-3 sm:gap-3 lg:gap-4">
            {featured.map(
              (product, index) =>
                product && (
                  <DepthProduct
                    key={product.id}
                    product={product}
                    index={index}
                    progress={scrollYProgress}
                  />
                ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
