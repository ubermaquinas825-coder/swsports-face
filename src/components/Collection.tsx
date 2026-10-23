import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ShoppingBag, Zap } from "lucide-react";
import { formatBRL, productFor, UNIT_PRICE, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { add, openCart } = useCart();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -dy * 7, y: dx * 7 });
  };

  const buyNow = () => {
    add(product.id);
    openCart();
  };

  return (
    <Reveal delay={(index % 3) * 0.06}>
      <div style={{ perspective: "1000px" }}>
        <motion.div
          ref={ref}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          animate={{ rotateX: tilt.x, rotateY: tilt.y }}
          whileHover={{ y: reduce ? 0 : -4 }}
          style={{ transformStyle: "preserve-3d" }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="group relative h-full rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-brand/60"
        >
          <div
            className="relative px-6 pt-8 transition-transform duration-300 md:group-hover:scale-[1.03]"
            style={{ transform: "translateZ(32px)" }}
          >
            <img
              src={product.image}
              alt={`Balaclava ${product.name}`}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="product-cutout mx-auto h-[230px] w-full max-w-[300px] object-contain"
            />
          </div>

          <div className="relative flex flex-col gap-4 p-6 pt-2">
            <div className="min-h-[90px]">
              <h3 className="font-display text-lg font-bold tracking-tight">{product.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </div>

            <p className="font-display text-3xl font-bold text-brand">{formatBRL(UNIT_PRICE)}</p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => add(product.id)}
                className="min-h-11 rounded-full text-xs font-bold tracking-wide"
              >
                <ShoppingBag className="h-4 w-4" />
                ADICIONAR
              </Button>
              <Button
                onClick={buyNow}
                className="min-h-11 whitespace-normal rounded-full bg-brand text-xs font-bold tracking-wide text-primary-foreground hover:bg-brand-deep"
              >
                <Zap className="h-4 w-4" />
                COMPRAR AGORA
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </Reveal>
  );
}

export function Collection() {
  return (
    <section id="colecao" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="mb-10 max-w-xl">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">COLEÇÃO</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              ESCOLHA SUA PRÓXIMA PERSONALIDADE
            </h2>
            <p className="mt-3 text-muted-foreground">
              Seis estampas exclusivas. Todas por {formatBRL(UNIT_PRICE)}.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "boca-de-beijo",
            "velhinho-bigodudo",
            "gato-divertido",
            "bebe-chupeta",
            "vovo-rebelde",
            "sorriso-banguela",
          ].map((id, i) => {
            const product = productFor(id);
            return product ? <ProductCard key={id} product={product} index={i} /> : null;
          })}
        </div>
      </div>
    </section>
  );
}
