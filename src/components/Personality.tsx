import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatBRL, products, UNIT_PRICE } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

export function Personality() {
  const [current, setCurrent] = useState(0);
  const reduce = useReducedMotion();
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
            <div className="relative mx-auto flex h-[320px] w-full items-center justify-center [perspective:1000px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={product.id}
                  src={product.image}
                  alt={`Balaclava ${product.name}`}
                  style={{ transformPerspective: 1000 }}
                  initial={reduce ? false : { opacity: 0, rotateY: -70, scale: 0.9 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 70, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="product-cutout relative h-full w-full max-w-sm object-contain"
                />
              </AnimatePresence>
              <Button variant="outline" size="icon" aria-label="Personalidade anterior" title="Personalidade anterior" onClick={() => setCurrent((value) => (value - 1 + products.length) % products.length)} className="absolute left-0 rounded-full"><ChevronLeft /></Button>
              <Button variant="outline" size="icon" aria-label="Próxima personalidade" title="Próxima personalidade" onClick={() => setCurrent((value) => (value + 1) % products.length)} className="absolute right-0 rounded-full"><ChevronRight /></Button>
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
                  <Button
                    onClick={() => add(product.id)}
                    className="mt-6 h-12 rounded-full px-7 text-sm font-bold"
                  >
                    <ShoppingBag />
                    QUERO ESSA BALACLAVA
                  </Button>
                </motion.div>
              </AnimatePresence>

              {/* miniaturas */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                {products.map((p, i) => (
                  <Button variant="ghost" size="icon"
                    key={p.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Ver balaclava ${p.name}`}
                    aria-pressed={i === current}
                    title={p.name}
                    className={`h-14 w-14 overflow-hidden rounded-lg border p-0 transition-all ${
                      i === current
                        ? "border-brand bg-brand/10"
                        : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={p.image} alt="" className="h-full w-full bg-background object-cover object-top" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
