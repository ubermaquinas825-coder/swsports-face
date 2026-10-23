import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { getMercadoPagoOrderStatus } from "@/lib/mercadopago-status.functions";

const searchSchema = z.object({
  resultado: z.enum(["sucesso", "pendente", "falha"]).catch("pendente"),
  external_reference: z.string().uuid().optional(),
});

type PaymentState = "checking" | "approved" | "pending" | "failed" | "unknown";

export const Route = createFileRoute("/pagamento")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Status do pagamento | SW Sports" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const { resultado, external_reference: orderId } = Route.useSearch();
  const verifyPayment = useServerFn(getMercadoPagoOrderStatus);
  const { clear } = useCart();
  const [paymentState, setPaymentState] = useState<PaymentState>(
    orderId ? "checking" : resultado === "falha" ? "failed" : "unknown",
  );

  useEffect(() => {
    if (!orderId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const result = await verifyPayment({ data: { orderId } });
        if (!active) return;
        setPaymentState(result.state);

        if (result.state === "approved") {
          clear();
          window.sessionStorage.removeItem("swsports-checkout-shipping-v1");
          return;
        }

        if (result.state === "pending" || result.state === "unknown") {
          timer = setTimeout(() => void poll(), 4_000);
        }
      } catch {
        if (!active) return;
        setPaymentState("pending");
        timer = setTimeout(() => void poll(), 5_000);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [clear, orderId, verifyPayment]);

  const state = paymentState === "approved"
    ? {
        icon: <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden="true" />,
        title: "Pagamento aprovado com sucesso!",
        message:
          "Recebemos a confirmação segura do Mercado Pago. Seu pedido está pago e seguirá para preparação e envio.",
      }
    : paymentState === "failed"
      ? {
          icon: <XCircle className="h-14 w-14 text-destructive" aria-hidden="true" />,
          title: "Pagamento não concluído",
          message:
            "O Mercado Pago não confirmou este pagamento. Você pode voltar à loja e tentar novamente.",
        }
      : paymentState === "checking"
        ? {
            icon: <LoaderCircle className="h-14 w-14 animate-spin text-brand" aria-hidden="true" />,
            title: "Confirmando seu pagamento...",
            message:
              "Estamos consultando o Mercado Pago para confirmar o status real do seu pedido.",
          }
        : paymentState === "pending"
          ? {
              icon: <Clock3 className="h-14 w-14 text-amber-500" aria-hidden="true" />,
              title: "Aguardando confirmação do Pix",
              message:
                "Seu Pix ainda está em confirmação. Esta tela consulta o Mercado Pago automaticamente e muda para pagamento aprovado assim que a confirmação chegar.",
            }
          : {
              icon: <Clock3 className="h-14 w-14 text-amber-500" aria-hidden="true" />,
              title: resultado === "falha" ? "Pagamento não concluído" : "Pagamento em confirmação",
              message:
                orderId
                  ? "Ainda não foi possível confirmar o pagamento. Continuaremos verificando automaticamente."
                  : "O retorno não trouxe a identificação necessária para consultar o pedido automaticamente. Nenhum pedido será marcado como pago sem confirmação do Mercado Pago.",
            };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-5 py-16">
      <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="mb-5 flex justify-center">{state.icon}</div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{state.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {state.message}
        </p>

        {orderId && (paymentState === "checking" || paymentState === "pending" || paymentState === "unknown") ? (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            Confirmação feita diretamente no servidor, sem confiar apenas na tela de retorno.
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">{paymentState === "approved" ? "CONTINUAR COMPRANDO" : "VOLTAR PARA A LOJA"}</Link>
          </Button>
          {orderId && paymentState !== "approved" && paymentState !== "failed" ? (
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              VERIFICAR AGORA
            </Button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
