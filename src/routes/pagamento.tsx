import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  resultado: z.enum(["sucesso", "pendente", "falha"]).catch("pendente"),
});

export const Route = createFileRoute("/pagamento")({
  validateSearch: searchSchema,
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const { resultado } = Route.useSearch();

  const state = resultado === "sucesso"
    ? {
        icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden="true" />,
        title: "Pagamento enviado para confirmação",
        message:
          "O Mercado Pago retornou você para a loja. O pedido só será liberado após a confirmação segura do pagamento pelo nosso servidor.",
      }
    : resultado === "falha"
      ? {
          icon: <XCircle className="h-12 w-12 text-destructive" aria-hidden="true" />,
          title: "Pagamento não concluído",
          message:
            "O pagamento não foi concluído. Você pode voltar à loja e tentar novamente. Nenhum pedido será tratado como pago sem confirmação do Mercado Pago.",
        }
      : {
          icon: <Clock3 className="h-12 w-12 text-amber-500" aria-hidden="true" />,
          title: "Pagamento pendente",
          message:
            "Seu pagamento ainda está aguardando confirmação. Assim que o Mercado Pago confirmar, o pedido poderá seguir para processamento.",
        };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-5 py-16">
      <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="mb-5 flex justify-center">{state.icon}</div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{state.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{state.message}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Não feche um pedido como pago apenas com base nesta página de retorno.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link to="/">VOLTAR PARA A LOJA</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
