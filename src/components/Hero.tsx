import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ChevronDown } from "lucide-react";
import { products, UNIT_PRICE, formatBRL } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

const featured = products.find((p) => p.id === "boca-de-beijo")!;

export function Hero() {
  const reduce = useReducedMotion();
  const areaRef = useRef<HTMLDivElement>(null);
  const rotateY = useSpring(0, { stiffness: 120, damping: 16 });
  const rotateX = useSpring(0, { stiffness: 120, damping: 16 });

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduce || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(dx * 24); // ±12 graus
    rotateX.set(-dy * 16); // ±8 graus
  };

  const onMouseLeave = () => {
    rotateY.set(0);
    rotateX.set(0);
  };

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden pt-24 pb-16">
      {/* halo vermelho cinematográfico */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[620px] w-[620px] rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(circle, #E32636 0%, transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-52 bottom-0 h-[420px] w-[420px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "radial-gradient(circle, #9F1422 0%, transparent 70%)" }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 md:px-6 lg:grid-cols-[45%_55%]">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            BALACLAVAS SW SPORTS
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
            NÃO É SÓ UMA
            <br />
            BALACLAVA.
            <br />
            <span className="text-brand">É UMA NOVA PERSONALIDADE.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
            Estampas realistas e divertidas para quem nasceu para chamar atenção.
          </p>
          <p className="mt-4 font-display text-2xl font-bold">
            A partir de {formatBRL(UNIT_PRICE)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#colecao"
              className="inline-flex items-center justify-center rounded-full bg-brand px-7 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-6px_rgba(227,38,54,0.6)] transition-transform hover:scale-[1.02]"
            >
              ESCOLHER MINHA BALACLAVA
            </a>
            <a
              href="#colecao"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-bold tracking-wide text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              EXPLORAR COLEÇÃO
            </a>
          </div>
        </Reveal>

        {/* Apresentação 2.5D — substituível por modelo GLB real no futuro */}
        <div
          ref={areaRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className="relative mx-auto w-full max-w-xl [perspective:1200px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[90px]"
            style={{ background: "radial-gradient(circle, #E32636 0%, transparent 70%)" }}
          />
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative"
          >
            <motion.div
              {...(reduce ? {} : { animate: { y: [0, -9, 0] } })}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src={featured.image}
                alt={`Balaclava ${featured.name} da SW Sports`}
                width={859}
                height={622}
                loading="eager"
                fetchPriority="high"
                className="mx-auto w-full max-w-lg select-none drop-shadow-[0_40px_60px_rgba(0,0,0,0.7)]"
              />
            </motion.div>
            {/* sombra no chão */}
            <motion.div
              aria-hidden
              animate={reduce ? undefined : { scaleX: [1, 0.94, 1], opacity: [0.5, 0.35, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto h-6 w-2/5 rounded-[100%] bg-black/80 blur-md"
            />
          </motion.div>
        </div>
      </div>

      <a
        href="#colecao"
        aria-label="Rolar até a coleção"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-muted-foreground md:block"
      >
        <motion.span
          animate={reduce ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="block"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </a>
    </section>
  );
}
