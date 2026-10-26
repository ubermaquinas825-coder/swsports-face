import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { prepareSuperfreteShipping } from "@/lib/superfrete-cart.functions";

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
    <section className="mt-6 rounded-lg border p-4">
      <h4 className="font-semibold">Envio pela SuperFrete</h4>
      <p className="my-3 text-sm text-muted-foreground">
        Prepare o envio com remetente, endereço, produtos e embalagem do pedido. O site não paga a
        etiqueta nem debita sua carteira. Revise e pague na mesma conta SuperFrete usada pela
        integração.
      </p>
      {linked ? (
        <>
          <p className="mb-3 break-all text-sm">
            Identificador do envio: <strong>{linked}</strong>
          </p>
          {!blocked && (
            <Button asChild variant="outline">
              <a href="https://web.superfrete.com/" target="_blank" rel="noreferrer">
                Abrir SuperFrete
              </a>
            </Button>
          )}
        </>
      ) : (
        <Button
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
      {blocked && <p className="mt-3 text-sm text-muted-foreground">{hold}</p>}
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
    </section>
  );
}
