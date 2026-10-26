import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/sales";
import {
  prepareSuperfreteShipping,
  inspectSuperfreteShipping,
} from "@/lib/superfrete-cart.functions";

type Props = {
  order: {
    id: string;
    payment_status: string;
    shipping_status: string;
    shipping_hold?: string | null;
    provider_shipment_id?: string | null;
  };
};
export function SuperfreteOrderAction({ order }: Props) {
  const prepare = useServerFn(prepareSuperfreteShipping);
  const qc = useQueryClient();
  const inspect = useServerFn(inspectSuperfreteShipping);
  const [inspecting, setInspecting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Awaited<
    ReturnType<typeof inspectSuperfreteShipping>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{ shipmentId: string; dashboardUrl: string } | null>(
    null,
  );
  const linked = prepared?.shipmentId || order.provider_shipment_id;
  const hold =
    order.shipping_hold ||
    (order.payment_status !== "approved"
      ? "O pagamento deste pedido ainda não está aprovado."
      : null) ||
    (["logistics_failed", "posted", "delivered"].includes(order.shipping_status)
      ? "Este envio já foi processado ou exige conferência na SuperFrete."
      : null);
  const blocked = Boolean(hold);
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h4 className="text-base font-semibold">Envio pela SuperFrete</h4>
      <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
        Revise e pague a etiqueta na sua conta SuperFrete.
      </p>
      {linked ? (
        <>
          <p className="mb-4 rounded-lg bg-background p-3 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            Identificador do envio
            <span className="mt-1 block font-mono text-foreground">{linked}</span>
          </p>
          <Button
            className="mb-3 w-full whitespace-normal"
            variant="outline"
            disabled={inspecting}
            onClick={async () => {
              setInspecting(true);
              setMessage("");
              setDiagnostic(null);
              try {
                setDiagnostic(await inspect({ data: { orderId: order.id } }));
              } catch (error) {
                setMessage(
                  error instanceof Error ? error.message : "Não foi possível consultar o envio.",
                );
              } finally {
                setInspecting(false);
              }
            }}
          >
            {inspecting ? "Consultando…" : "Verificar envio existente"}
          </Button>
          {diagnostic && (
            <div
              role="status"
              className="my-3 rounded-lg border bg-background p-3 text-sm leading-6 [overflow-wrap:anywhere]"
            >
              <p>
                Estado na API SuperFrete: <strong>{diagnostic.status}</strong>
              </p>
              {diagnostic.priceCents !== null && (
                <p>Valor retornado: {money(diagnostic.priceCents)}</p>
              )}
              {diagnostic.problems.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {diagnostic.problems.map((problem, i) => (
                    <li key={i}>{problem}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  Dados conferidos com a API. Isso não confirma que a tela de pagamento da
                  SuperFrete esteja funcionando. Se continuar em loop, informe o identificador ao
                  suporte SuperFrete.
                </p>
              )}
              <p className="mt-2 text-muted-foreground">
                Consulta somente leitura. Nenhum envio ou pagamento foi criado ou alterado.
              </p>
            </div>
          )}
          {!blocked && (
            <Button asChild variant="outline" className="w-full">
              <a href="https://web.superfrete.com/" target="_blank" rel="noreferrer">
                Abrir SuperFrete
              </a>
            </Button>
          )}
        </>
      ) : (
        <Button
          className="h-auto min-h-10 w-full whitespace-normal py-3"
          disabled={busy || blocked}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            // Open synchronously to avoid browser popup blocking after the server request.
            const tab = window.open("about:blank", "_blank");
            if (tab) tab.opener = null;
            try {
              const result = await prepare({ data: { orderId: order.id } });
              setPrepared(result);
              setMessage(result.message);
              if (tab) tab.location.href = result.dashboardUrl;
            } catch (error) {
              tab?.close();
              setMessage(
                error instanceof Error ? error.message : "Não foi possível preparar o envio.",
              );
            } finally {
              setBusy(false);
              await qc.invalidateQueries({ queryKey: ["sales-admin"] });
            }
          }}
        >
          {busy ? "Preparando envio…" : "Preparar envio e abrir SuperFrete"}
        </Button>
      )}
      {blocked && (
        <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-500">
          {hold}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg border bg-background p-3 text-sm leading-6 [overflow-wrap:anywhere]"
        >
          {message}
        </p>
      )}
      <details className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        <summary className="cursor-pointer font-medium">Como funciona o envio</summary>
        <p className="mt-2">
          O preparo utiliza remetente, destinatário, produtos e embalagem salvos no pedido. Entre na
          mesma conta usada pela integração para revisar e pagar. O site não paga a etiqueta nem
          debita sua carteira.
        </p>
      </details>
    </section>
  );
}
