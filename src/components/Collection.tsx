import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ShoppingBag, Zap } from "lucide-react";
import { formatBRL, UNIT_PRICE, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { Reveal } from "@/components/Reveal";

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { add, openCart, setQty } = useCart();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -dy * 10, y: dx * 10 }); // até ~5 graus visíveis
  };

  const buyNow = () => {
    setQty(product.id, 1);
    openCart();
  };

  return (
    <Reveal delay={(index % 3) * 0.08}>
      <div style={{ perspective: "900px" }}>
        <motion.div
          ref={ref}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          animate={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="group relative overflow-hidden rounded-3xl border border-border bg-card transition-colors duration-300 hover:border-brand/60"
        >
          {/* luz radial no hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(227,38,54,0.14) 0%, transparent 65%)",
            }}
          />
          <div className="relative px-6 pt-8 transition-transform duration-300 group-hover:-translate-y-1.5">
            <img
              src={product.image}
              alt={`Balaclava ${product.name}`}
              width={800}
              height={600}
              loading="lazy"
              className="mx-auto w-full max-w-[300px] drop-shadow-[0_24px_32px_rgba(0,0,0,0.6)]"
            />
          </div>
          <div className="relative flex flex-col gap-4 p-6 pt-2">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight">{product.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
            </div>
            <p className="font-display text-2xl font-bold text-brand">{formatBRL(UNIT_PRICE)}</p>
            <div className="flex gap-2">
              <button
                onClick={() => add(product.id)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                ADICIONAR
              </button>
              <button
                onClick={buyNow}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-xs font-bold tracking-wide text-white transition-colors hover:bg-brand-deep"
              >
                <Zap className="h-3.5 w-3.5" />
                COMPRAR AGORA
              </button>
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
          <div className="mb-12 max-w-xl">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">COLEÇÃO</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              ESCOLHA A SUA
            </h2>
            <p className="mt-3 text-muted-foreground">
              Seis personalidades prontas para sair do armário. Todas por {formatBRL(UNIT_PRICE)}.
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
          ].map((id, i) => (
            <ProductCard key={id} product={productFor(id)!} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
