import { useRef, useState, type PointerEvent } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

export function TechShowcase() {
  const section = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const depth = useTransform(scrollYProgress, [0, 1], [0, 9]);
  const cubeTurn = useTransform(scrollYProgress, [0, 1], [-25, 100]);
  const [selected, setSelected] = useState(1);
  const product = products[selected];
  const { add, openCart } = useCart();
  if (!product) return null;

  const change = (direction: number) =>
    setSelected((value) => (value + direction + products.length) % products.length);
  const light = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse" || !surface.current) return;
    const bounds = surface.current.getBoundingClientRect();
    surface.current.style.setProperty(
      "--light-x",
      `${((event.clientX - bounds.left) / bounds.width) * 100}%`,
    );
    surface.current.style.setProperty(
      "--light-y",
      `${((event.clientY - bounds.top) / bounds.height) * 100}%`,
    );
  };

  return (
    <section
      ref={section}
      aria-labelledby="tech-title"
      className="tech-showcase relative isolate overflow-hidden border-b border-border pt-[72px] md:pt-[76px]"
    >
      <div aria-hidden className="tech-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-7xl items-center gap-x-12 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-muted-foreground">
            <span aria-hidden className="h-2 w-2 bg-brand" />
            BALACLAVAS SW SPORTS
          </p>
          <h1
            id="tech-title"
            className="max-w-lg font-display text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Sua estampa.
            <br />
            <span className="text-brand">Outra dimensão.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            Personalidade para vestir. Explore as estampas e encontre sua próxima balaclava.
          </p>
          <p className="mt-7 font-display text-3xl font-bold">
            {formatBRL(UNIT_PRICE)}{" "}
            <span className="font-sans text-sm font-normal text-muted-foreground">por unidade</span>
          </p>
          <Button asChild className="mt-5 min-h-12 rounded-md px-6 font-bold shadow-none">
            <a href="#colecao">
              EXPLORAR A COLEÇÃO <ArrowRight aria-hidden />
            </a>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Poliéster com elastano. Frete no carrinho.
          </p>
        </div>

        <div
          ref={surface}
          onPointerMove={light}
          onPointerLeave={() => {
            surface.current?.style.removeProperty("--light-x");
            surface.current?.style.removeProperty("--light-y");
          }}
          className="tech-surface relative min-w-0 overflow-hidden rounded-lg border border-white/15 bg-[#101010]"
        >
          <div aria-hidden className="tech-light pointer-events-none absolute inset-0" />
          <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs text-muted-foreground">
            <span>COLEÇÃO / SW SPORTS</span>
            <span className="font-mono">
              {String(selected + 1).padStart(2, "0")} — {String(products.length).padStart(2, "0")}
            </span>
          </div>
          <div className="tech-stage relative flex h-[280px] items-center justify-center px-3 pt-4 sm:h-[380px] lg:h-[440px]">
            <motion.div
              aria-hidden
              initial={false}
              style={{ rotateY: cubeTurn, rotateX: 18 }}
              className="tech-cube pointer-events-none absolute right-6 top-8"
            >
              <span className="tech-cube-face tech-cube-front" />
              <span className="tech-cube-face tech-cube-back" />
              <span className="tech-cube-face tech-cube-left" />
              <span className="tech-cube-face tech-cube-right" />
              <span className="tech-cube-face tech-cube-top" />
              <span className="tech-cube-face tech-cube-bottom" />
            </motion.div>
            <div
              aria-hidden
              className="tech-orbit absolute inset-x-10 bottom-8 h-20 rounded-[50%] border border-brand/35"
            />
            <motion.div
              initial={false}
              style={{ y: lift, rotateX: depth, transformPerspective: 1000 }}
              className="relative z-10 h-full w-full"
            >
              <img
                src={product.image}
                alt={`Balaclava ${product.name} da SW Sports`}
                width={859}
                height={622}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="tech-product h-full w-full object-contain"
              />
            </motion.div>
            <span aria-hidden className="tech-cross absolute left-4 top-5" />
            <span aria-hidden className="tech-cross absolute bottom-5 right-4" />
          </div>
          <div className="relative flex items-center justify-between gap-3 border-t border-white/10 px-4 py-4">
            <div aria-live="polite" aria-atomic="true">
              <h2 className="font-display text-lg font-semibold">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatBRL(UNIT_PRICE)} / unidade
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-md"
                onClick={() => change(-1)}
                aria-label="Estampa anterior"
              >
                <ArrowLeft aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-md"
                onClick={() => change(1)}
                aria-label="Próxima estampa"
              >
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </div>
          <div
            className="relative grid grid-cols-3 min-[375px]:grid-cols-6 gap-1 border-t border-white/10 px-3 py-3 sm:gap-2"
            aria-label="Escolher estampa"
          >
            {products.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Mostrar ${item.name}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded border p-1 transition-colors ${index === selected ? "border-brand bg-brand/10" : "border-transparent hover:border-white/30"}`}
              >
                <img
                  src={item.image}
                  alt=""
                  width={60}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full max-w-12 object-contain"
                />
              </button>
            ))}
          </div>
          <div className="relative px-4 pb-4">
            <Button
              type="button"
              className="min-h-12 w-full rounded-md font-bold shadow-none"
              onClick={() => {
                add(product.id);
                openCart();
              }}
            >
              <ShoppingBag aria-hidden />
              COMPRAR ESTA ESTAMPA
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-4 py-5 text-xs text-muted-foreground sm:px-6">
        <span>Pagamento pelo Mercado Pago</span>
        <span>Frete pelo Melhor Envio</span>
        <a
          href="#colecao"
          className="inline-flex min-h-11 items-center gap-2 font-medium text-foreground"
        >
          Role para escolher <ArrowRight aria-hidden className="h-3 w-3 rotate-90" />
        </a>
      </div>
    </section>
  );
}
