import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/hooks/use-cart";
import { formatBRL, products, UNIT_PRICE } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

export function Personality() {
  const [current, setCurrent] = useState(0);
  const { add } = useCart();
  const product = products[current];
  if (!product) return null;

  return (
    <section id="personalidade" className="scroll-mt-24 border-y border-border bg-popover/40 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">ESCOLHA SUA PERSONALIDADE</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              QUAL É A SUA CARA HOJE?
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-2">
            {/* produto central */}
            <div className="relative mx-auto flex min-h-[320px] w-full items-center justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[80px] transition-all duration-500"
                style={{
                  background: `radial-gradient(circle at ${40 + current * 4}% 45%, #E32636 0%, transparent 70%)`,
                }}
              />
              <AnimatePresence mode="wait">
                <motion.img
                  key={product.id}
                  src={product.image}
                  alt={`Balaclava ${product.name}`}
                  style={{ transformPerspective: 1000 }}
                  initial={{ opacity: 0, rotateY: -70, scale: 0.9 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: 70, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-sm drop-shadow-[0_30px_40px_rgba(0,0,0,0.65)]"
                />
              </AnimatePresence>
            </div>

            <div className="text-center md:text-left">
              <AnimatePresence mode="wait">
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                >
                  <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {product.name}
                  </h3>
                  <p className="mt-3 text-muted-foreground">{product.description}</p>
                  <p className="mt-4 font-display text-2xl font-bold text-brand">
                    {formatBRL(UNIT_PRICE)}
                  </p>
                  <button
                    onClick={() => add(product.id)}
                    className="mt-6 rounded-full bg-brand px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-8px_rgba(227,38,54,0.7)] transition-transform hover:scale-[1.02]"
                  >
                    QUERO ESSA BALACLAVA
                  </button>
                </motion.div>
              </AnimatePresence>

              {/* miniaturas */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                {products.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Ver balaclava ${p.name}`}
                    className={`h-16 w-16 overflow-hidden rounded-xl border transition-all ${
                      i === current
                        ? "border-brand shadow-[0_0_20px_-4px_rgba(227,38,54,0.7)]"
                        : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={p.image} alt="" className="h-full w-full bg-background object-cover object-top" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
