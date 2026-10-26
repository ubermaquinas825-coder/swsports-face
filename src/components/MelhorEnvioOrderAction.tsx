import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/sales";
import {
  prepareMelhorEnvioShipping,
  inspectMelhorEnvioShipping,
} from "@/lib/melhor-envio-cart.functions";

type Props = {
  order: {
    id: string;
    payment_status: string;
    shipping_status: string;
    shipping_hold?: string | null;
    provider_shipment_id?: string | null;
  };
};

export function MelhorEnvioOrderAction({ order }: Props) {
  const prepare = useServerFn(prepareMelhorEnvioShipping);
  const inspect = useServerFn(inspectMelhorEnvioShipping);
  const qc = useQueryClient();
  const [inspecting, setInspecting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Awaited<ReturnType<typeof inspectMelhorEnvioShipping>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{ shipmentId: string; dashboardUrl: string } | null>(null);
  const linked = prepared?.shipmentId || order.provider_shipment_id;
  const hold =
    order.shipping_hold ||
    (order.payment_status !== "approved" ? "O pagamento deste pedido ainda não está aprovado." : null) ||
    (["logistics_failed", "posted", "delivered"].includes(order.shipping_status)
      ? "Este envio já foi processado ou exige conferência no Melhor Envio."
      : null);
  const blocked = Boolean(hold);

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h4 className="text-base font-semibold">Envio pelo Melhor Envio</h4>
      <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
        O sistema prepara o envio. A revisão e o pagamento da etiqueta continuam na sua conta Melhor Envio.
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
                const result = await inspect({ data: { orderId: order.id } });
                setDiagnostic(result);
                setMessage(result.updated ? "Rastreamento atualizado no ERP." : "Rastreamento conferido; nenhuma alteração necessária.");
                await qc.invalidateQueries({ queryKey: ["sales-admin"] });
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Não foi possível consultar o envio.");
              } finally {
                setInspecting(false);
              }
            }}
          >
            {inspecting ? "Consultando…" : "Sincronizar rastreamento"}
          </Button>
          {diagnostic && (
            <div role="status" className="my-3 rounded-lg border bg-background p-3 text-sm leading-6 [overflow-wrap:anywhere]">
              <p>Estado no Melhor Envio: <strong>{diagnostic.status}</strong></p>
              <p>Estado no ERP: <strong>{diagnostic.shippingStatus}</strong></p>
              {diagnostic.priceCents !== null && <p>Valor retornado: {money(diagnostic.priceCents)}</p>}
              {diagnostic.tracking && <p>Rastreio: {diagnostic.tracking}</p>}
              <p className="mt-2 text-muted-foreground">Consulta e sincronização de status. Nenhum pagamento foi realizado.</p>
            </div>
          )}
          {!blocked && (
            <Button asChild variant="outline" className="w-full">
              <a href="https://melhorenvio.com.br/" target="_blank" rel="noreferrer">Abrir Melhor Envio</a>
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
            const tab = window.open("about:blank", "_blank");
            if (tab) tab.opener = null;
            try {
              const result = await prepare({ data: { orderId: order.id } });
              setPrepared(result);
              setMessage(result.message);
              if (tab) tab.location.href = result.dashboardUrl;
            } catch (error) {
              tab?.close();
              setMessage(error instanceof Error ? error.message : "Não foi possível preparar o envio.");
            } finally {
              setBusy(false);
              await qc.invalidateQueries({ queryKey: ["sales-admin"] });
            }
          }}
        >
          {busy ? "Preparando envio…" : "Preparar envio e abrir Melhor Envio"}
        </Button>
      )}
      {blocked && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-500">{hold}</p>}
      {message && <p role="status" className="mt-4 rounded-lg border bg-background p-3 text-sm leading-6 [overflow-wrap:anywhere]">{message}</p>}
      <details className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        <summary className="cursor-pointer font-medium">Como funciona o envio</summary>
        <p className="mt-2">
          O preparo usa remetente, destinatário, produtos, serviço e volume salvos no pedido. O site não compra a etiqueta nem debita sua Melhor Carteira; a conferência e o pagamento são feitos por você no Melhor Envio. Depois, o ERP sincroniza rastreamento e situação de entrega.
        </p>
      </details>
    </section>
  );
}
