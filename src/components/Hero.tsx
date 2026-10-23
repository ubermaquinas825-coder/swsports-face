import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { Button } from "@/components/ui/button";

export function Hero() {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(1);
  const featured = products[current];
  const areaRef = useRef<HTMLDivElement>(null);
  const rotateY = useSpring(0, { stiffness: 120, damping: 24 });
  const rotateX = useSpring(0, { stiffness: 120, damping: 24 });

  if (!featured) return null;

  const change = (direction: number) =>
    setCurrent((value) => (value + direction + products.length) % products.length);

  return (
    <section className="showcase relative isolate overflow-hidden border-b border-border pb-10 pt-24 md:pt-28">
      <div aria-hidden className="showcase-grid absolute inset-0 -z-10" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-xs font-semibold text-muted-foreground">
          <span className="tracking-[0.22em] text-brand">SW SPORTS</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            COLEÇÃO DE BALACLAVAS
          </span>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 mx-auto mt-7 max-w-4xl text-center"
        >
          <h1 className="font-display text-4xl font-bold leading-[0.96] tracking-tight sm:text-5xl lg:text-7xl">
            BALACLAVAS QUE MUDAM SUA <span className="text-brand">PERSONALIDADE</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Estampas realistas, confortáveis e prontas para transformar seu visual.
          </p>
          <p className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {formatBRL(UNIT_PRICE)}
          </p>
        </motion.div>

        <div
          ref={areaRef}
          className="relative mx-auto mt-3 flex h-[240px] max-w-4xl items-center justify-center sm:h-[300px] lg:h-[350px] [perspective:1200px]"
          onPointerMove={(event) => {
            if (reduce || event.pointerType !== "mouse") return;
            const rect = areaRef.current?.getBoundingClientRect();
            if (!rect) return;
            rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 14);
            rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 9);
          }}
          onPointerLeave={() => {
            rotateX.set(0);
            rotateY.set(0);
          }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-10 font-display text-7xl font-bold text-foreground/5 sm:text-9xl"
          >
            0{current + 1}
          </span>

          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative flex h-full w-full items-center justify-center"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={featured.id}
                src={featured.image}
                alt={`Balaclava ${featured.name} da SW Sports`}
                width={859}
                height={622}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                initial={reduce ? false : { opacity: 0, rotateY: -18, x: -24 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 18, x: 24 }}
                transition={{ duration: 0.35 }}
                className="product-cutout h-full w-full max-w-xl select-none object-contain"
              />
            </AnimatePresence>
          </motion.div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => change(-1)}
            aria-label="Estampa anterior"
            title="Estampa anterior"
            className="absolute left-0 h-11 w-11 rounded-full bg-background/85"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => change(1)}
            aria-label="Próxima estampa"
            title="Próxima estampa"
            className="absolute right-0 h-11 w-11 rounded-full bg-background/85"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium">
            {featured.name}
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-bold text-brand">{formatBRL(UNIT_PRICE)}</span>
          </p>

          <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="min-h-12 rounded-full px-8 font-bold">
              <a href="#colecao">
                ESCOLHER MINHA BALACLAVA <ArrowUpRight />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-12 rounded-full px-8 font-bold">
              <a href="#colecao">VER COLEÇÃO</a>
            </Button>
          </div>

          <div className="grid w-full max-w-3xl gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
              <LockKeyhole className="h-4 w-4 shrink-0 text-brand" />
              <span>Pagamento seguro Mercado Pago</span>
            </div>
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
              <Truck className="h-4 w-4 shrink-0 text-brand" />
              <span>Frete calculado pela SuperFrete</span>
            </div>
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
              <span>Compra rápida e segura</span>
            </div>
          </div>

          <div className="flex gap-2" aria-label="Estampas da coleção">
            {products.map((product, index) => (
              <Button
                key={product.id}
                variant="ghost"
                size="icon"
                aria-label={`Mostrar ${product.name}`}
                aria-pressed={index === current}
                onClick={() => setCurrent(index)}
                title={product.name}
                className="h-11 w-11 rounded-full"
              >
                <span
                  className={`h-1.5 rounded-full transition-all ${
                    index === current ? "w-5 bg-brand" : "w-1.5 bg-muted-foreground"
                  }`}
                />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
