import { waLink } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[110px]"
        style={{ background: "radial-gradient(circle, #E32636 0%, transparent 70%)" }}
      />
      <Reveal>
        <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            PRONTO PARA TROCAR DE <span className="text-brand">PERSONALIDADE</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Escolha a sua balaclava e finalize pelo WhatsApp em segundos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#colecao"
              className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-6px_rgba(227,38,54,0.6)] transition-transform hover:scale-[1.02]"
            >
              ESCOLHER MINHA BALACLAVA
            </a>
            <a
              href={waLink(
                "Olá, equipe SW Sports!\n\nTenho uma dúvida sobre as balaclavas e gostaria de mais informações.",
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-border px-8 py-3.5 text-sm font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
            >
              FALAR COM A EQUIPE
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
