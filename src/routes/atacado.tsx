import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { CartProvider } from "@/hooks/use-cart";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { products, waLink } from "@/lib/products";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/atacado")({
  head: () => ({
    meta: [
      { title: "Atacado e Revenda | SW Sports" },
      {
        name: "description",
        content:
          "Leve as balaclavas SW Sports para a sua loja. Solicite condições comerciais para compras em quantidade pelo WhatsApp.",
      },
      { property: "og:title", content: "Revenda SW Sports" },
      {
        property: "og:description",
        content:
          "Leve nossas balaclavas para sua loja e solicite condições comerciais para compras em quantidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Revenda SW Sports" },
      {
        name: "twitter:description",
        content: "Condições comerciais para revenda de balaclavas SW Sports.",
      },
    ],
  }),
  component: AtacadoPage,
});

function AtacadoPage() {
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    cidade: "",
    whatsapp: "",
    quantidade: "",
    modelos: "",
  });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = [
      "Olá, equipe SW Sports!",
      "",
      "Solicitação de orçamento no atacado:",
      "",
      `Nome: ${form.nome}`,
      `Empresa: ${form.empresa}`,
      `Cidade/UF: ${form.cidade}`,
      `WhatsApp: ${form.whatsapp}`,
      `Quantidade desejada: ${form.quantidade}`,
      `Modelos de interesse: ${form.modelos || "Todos"}`,
      "",
      "Podem enviar as condições comerciais?",
    ].join("\n");
    window.open(waLink(message), "_blank", "noopener");
    setSent(true);
  };

  const field =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-brand";

  return (
    <CartProvider>
      <SiteHeader />
      <main className="relative overflow-hidden pt-32 pb-24 md:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full opacity-20 blur-[110px]"
          style={{ background: "radial-gradient(circle, #E32636 0%, transparent 65%)" }}
        />
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 md:px-6 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.3em] text-brand">ATACADO E REVENDA</p>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                REVENDA <span className="text-brand">SW SPORTS.</span>
              </h1>
              <p className="mt-4 max-w-md text-muted-foreground">
                Leve nossas balaclavas para sua loja e solicite condições comerciais para compras
                em quantidade.
              </p>
              <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  Condições comerciais negociadas diretamente pela equipe.
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  Mix de modelos flexível para o seu público.
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  Resposta pelo WhatsApp comercial.
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              onSubmit={submit}
              className="rounded-3xl border border-border bg-card p-6 md:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    NOME *
                  </span>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={field}
                    placeholder="Seu nome"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    EMPRESA
                  </span>
                  <input
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    className={field}
                    placeholder="Nome da loja"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    CIDADE / UF
                  </span>
                  <input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className={field}
                    placeholder="Cidade e estado"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    WHATSAPP *
                  </span>
                  <input
                    required
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className={field}
                    placeholder="(DDD) número"
                    inputMode="tel"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    QUANTIDADE DESEJADA *
                  </span>
                  <input
                    required
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className={field}
                    placeholder="Ex.: 50 unidades"
                    inputMode="numeric"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold tracking-wide text-muted-foreground">
                    MODELOS DE INTERESSE
                  </span>
                  <input
                    value={form.modelos}
                    onChange={(e) => setForm({ ...form, modelos: e.target.value })}
                    className={field}
                    placeholder={products.map((p) => p.name).join(", ")}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-8px_rgba(227,38,54,0.7)] transition-transform hover:scale-[1.01] sm:w-auto sm:px-10"
              >
                SOLICITAR ORÇAMENTO
                <ArrowRight className="h-4 w-4" />
              </button>
              {sent && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Pedido de orçamento encaminhado ao WhatsApp comercial. A equipe responde por lá.
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </CartProvider>
  );
}
