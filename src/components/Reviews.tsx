import { MessageSquareQuote } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function Reviews() {
  return (
    <section aria-labelledby="reviews-title" className="border-y border-border bg-popover/30 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-brand">
              <MessageSquareQuote className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-bold tracking-[0.3em] text-brand">AVALIAÇÕES DE CLIENTES</p>
            <h2 id="reviews-title" className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              EXPERIÊNCIAS REAIS, SEM NOTAS INVENTADAS
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Este espaço está preparado para receber avaliações verificadas de compradores, com nome, comentário, foto e produto adquirido. Até termos conteúdo real, não exibimos estrelas ou notas artificiais.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
