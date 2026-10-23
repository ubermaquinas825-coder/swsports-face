import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { Button } from "@/components/ui/button";
import TechText from "@/components/TechText";

export function Hero() {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(1);
  const featured = products[current];
  const areaRef = useRef<HTMLDivElement>(null);
  const rotateY = useSpring(0, { stiffness: 110, damping: 22 });
  const rotateX = useSpring(0, { stiffness: 110, damping: 22 });
  const [hovered, setHovered] = useState(false);
  // troca automática a cada 10s; pausa com o mouse em cima e para sempre com movimento reduzido
  useEffect(() => {
    if (reduce || hovered) return;
    const id = window.setTimeout(() => setCurrent((value) => (value + 1) % products.length), 10000);
    return () => window.clearTimeout(id);
  }, [current, reduce, hovered]);
  if (!featured) return null;
  const change = (direction: number) => setCurrent((value) => (value + direction + products.length) % products.length);
  return (
    <section className="showcase relative isolate overflow-hidden border-b border-border pt-24 pb-8 md:pt-28">
      <div aria-hidden className="showcase-grid absolute inset-0 -z-10" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-xs font-semibold text-muted-foreground">
          <span>ESTAMPAS REAIS. PERSONALIDADES ÚNICAS.</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> COLEÇÃO SW SPORTS</span>
        </div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 mt-7 text-center">
          <h1 className="font-display text-4xl font-bold leading-none sm:text-5xl lg:text-7xl">
            {reduce ? (
              <>BALACLAVAS <span className="text-brand">SW SPORTS</span></>
            ) : (
              <>
                <span className="sr-only">BALACLAVAS SW SPORTS</span>
                <span aria-hidden="true" className="mx-auto grid h-20 max-w-5xl grid-cols-[1.2fr_1fr] sm:h-24 lg:h-32">
                  <span className="block min-w-0">
                    <TechText text="BALACLAVAS" fontFamily="Space Grotesk, Inter, ui-sans-serif, sans-serif" fontWeight={700} fontSize={72} letterSpacing={0} color="currentColor" accentColor="currentColor" reveal="letter" intro="none" />
                  </span>
                  <span className="block min-w-0 text-brand">
                    <TechText text="SW SPORTS" fontFamily="Space Grotesk, Inter, ui-sans-serif, sans-serif" fontWeight={700} fontSize={72} letterSpacing={0} color="currentColor" accentColor="currentColor" reveal="letter" intro="none" />
                  </span>
                </span>
              </>
            )}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">Não é só uma balaclava. É uma nova personalidade.</p>
        </motion.div>
        <div ref={areaRef} className="relative mx-auto mt-2 flex h-[240px] max-w-4xl items-center justify-center sm:h-[300px] lg:h-[360px] [perspective:1200px]"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
          onPointerMove={(event) => {
            if (reduce || event.pointerType !== "mouse") return;
            const rect = areaRef.current?.getBoundingClientRect();
            if (!rect) return;
            rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 28);
            rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 18);
          }} onPointerLeave={() => { rotateX.set(0); rotateY.set(0); setHovered(false); }}>
          <span aria-hidden className="absolute left-0 top-10 font-display text-7xl font-bold text-foreground/5 sm:text-9xl">0{current + 1}</span>
          <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="relative flex h-full w-full items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.img key={featured.id} src={featured.image} alt={`Balaclava ${featured.name} da SW Sports`} width={859} height={622} loading="eager" fetchPriority="high"
                initial={reduce ? false : { opacity: 0, rotateY: -45, x: -40 }} animate={{ opacity: 1, rotateY: 0, x: 0, y: reduce ? 0 : [0, -10, 0] }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 45, x: 40 }} transition={{ duration: 0.5, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                className="product-cutout h-full w-full max-w-xl select-none object-contain" />
            </AnimatePresence>
          </motion.div>
          <Button variant="outline" size="icon" onClick={() => change(-1)} aria-label="Estampa anterior" title="Estampa anterior" className="absolute left-0 h-10 w-10 rounded-full bg-background/80"><ChevronLeft /></Button>
          <Button variant="outline" size="icon" onClick={() => change(1)} aria-label="Próxima estampa" title="Próxima estampa" className="absolute right-0 h-10 w-10 rounded-full bg-background/80"><ChevronRight /></Button>
        </div>
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div><p className="text-sm font-medium">{featured.name} <span className="mx-2 text-muted-foreground">/</span><span className="font-bold text-brand">{formatBRL(UNIT_PRICE)}</span></p></div>
          <Button asChild size="lg" className="h-12 rounded-full px-8 font-bold"><a href="#colecao">ESCOLHER MINHA BALACLAVA <ArrowUpRight /></a></Button>
          <div className="flex gap-2" aria-label="Estampas da coleção">
            {products.map((product, index) => <Button key={product.id} variant="ghost" size="icon" aria-label={`Mostrar ${product.name}`} aria-pressed={index === current} onClick={() => setCurrent(index)} title={product.name} className="h-7 w-7 rounded-full"><span className={`h-1.5 rounded-full transition-all ${index === current ? "w-5 bg-brand" : "w-1.5 bg-muted-foreground"}`} /></Button>)}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span>06 MODELOS · {formatBRL(UNIT_PRICE)} CADA</span><a href="#colecao" aria-label="Ver coleção" className="flex items-center gap-2">VER COLEÇÃO <ArrowDown className="h-3.5 w-3.5" /></a></div>
      </div>
    </section>
  );
}
