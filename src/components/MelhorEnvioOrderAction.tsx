import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { money, record, text } from "@/lib/sales";
import {
  prepareMelhorEnvioShipping,
  inspectMelhorEnvioShipping,
  resetMelhorEnvioShipping,
} from "@/lib/melhor-envio-cart.functions";

type Props = {
  order: {
    id: string;
    payment_status: string;
    shipping_status: string;
    shipping_hold?: string | null;
    provider_shipment_id?: string | null;
    tracking_code?: string | null;
    label_url?: string | null;
    shipping_service?: unknown;
    quoted_cep?: string | null;
    freight_cents?: number | null;
  };
};

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatCep(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value || "Não registrado";
}

export function MelhorEnvioOrderAction({ order }: Props) {
  const prepare = useServerFn(prepareMelhorEnvioShipping);
  const inspect = useServerFn(inspectMelhorEnvioShipping);
  const resetShipping = useServerFn(resetMelhorEnvioShipping);
  const qc = useQueryClient();
  const [inspecting, setInspecting] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Awaited<ReturnType<typeof inspectMelhorEnvioShipping>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{ shipmentId: string; dashboardUrl: string } | null>(null);
  const linked = prepared?.shipmentId || order.provider_shipment_id;
  const service = record(order.shipping_service);
  const packageInfo = record(service["package"]);
  const serviceId = text(service["id"]) || (numberValue(service["id"]) !== null ? String(numberValue(service["id"])) : "");
  const serviceName = [text(service["company"]), text(service["name"])].filter(Boolean).join(" · ");
  const servicePriceCents = numberValue(service["priceCents"]) ?? order.freight_cents ?? null;
  const deliveryDays = numberValue(service["deliveryDays"]);
  const originCep = text(service["originCep"]);
  const length = numberValue(packageInfo["length"]);
  const width = numberValue(packageInfo["width"]);
  const height = numberValue(packageInfo["height"]);
  const weight = numberValue(packageInfo["weight"]);
  const packageLabel =
    length !== null && width !== null && height !== null && weight !== null
      ? `${length} × ${width} × ${height} cm · ${weight} kg`
      : "Não registrado";
  const hold =
    order.shipping_hold ||
    (order.payment_status !== "approved" ? "O pagamento deste pedido ainda não está aprovado." : null) ||
    (["logistics_failed", "posted", "delivered"].includes(order.shipping_status)
      ? "Este envio já foi processado ou exige conferência no Melhor Envio."
      : null);
  const blocked = Boolean(hold);
  const canReset =
    order.payment_status === "approved" &&
    !order.tracking_code &&
    !order.label_url &&
    !["ready_to_post", "posted", "delivered"].includes(order.shipping_status) &&
    (Boolean(linked) ||
      ["awaiting_label", "awaiting_label_payment", "label_issued", "logistics_failed"].includes(
        order.shipping_status,
      ));

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h4 className="text-base font-semibold">Envio pelo Melhor Envio</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Confira os dados abaixo. Ao clicar, o pedido é enviado para o carrinho do Melhor Envio; o pagamento e a emissão da etiqueta são feitos diretamente na sua conta.
      </p>

      <dl className="my-5 grid gap-3 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Transportadora / serviço</dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere]">{serviceName || "Não registrado"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">ID do serviço</dt>
          <dd className="mt-1 font-medium">{serviceId || "Não registrado"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Valor cotado</dt>
          <dd className="mt-1 font-medium">{servicePriceCents === null ? "Não registrado" : money(servicePriceCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prazo estimado</dt>
          <dd className="mt-1 font-medium">{deliveryDays === null ? "Não registrado" : `${deliveryDays} dia(s) útil(eis)`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">CEP origem → destino</dt>
          <dd className="mt-1 font-medium">{formatCep(originCep)} → {formatCep(order.quoted_cep)}</dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Embalagem enviada ao Melhor Envio</dt>
          <dd className="mt-1 font-medium [overflow-wrap:anywhere]">{packageLabel}</dd>
        </div>
      </dl>

      {linked ? (
        <>
          <p className="mb-4 rounded-lg bg-background p-3 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            Identificador do envio no Melhor Envio
            <span className="mt-1 block font-mono text-foreground">{linked}</span>
          </p>
          <Button
            className="mb-3 w-full whitespace-normal"
            variant="outline"
            disabled={inspecting || resetting}
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
              <a href="https://melhorenvio.com.br/carrinho" target="_blank" rel="noreferrer">Abrir carrinho no Melhor Envio</a>
            </Button>
          )}
        </>
      ) : (
        <Button
          className="h-auto min-h-10 w-full whitespace-normal py-3"
          disabled={busy || blocked || resetting}
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
              setMessage(error instanceof Error ? error.message : "Não foi possível enviar os dados ao Melhor Envio.");
            } finally {
              setBusy(false);
              await qc.invalidateQueries({ queryKey: ["sales-admin"] });
            }
          }}
        >
          {busy ? "Enviando ao carrinho…" : "Enviar para o carrinho do Melhor Envio"}
        </Button>
      )}
      {canReset && (
        <Button
          className="mt-3 h-auto min-h-10 w-full whitespace-normal py-3"
          variant="outline"
          disabled={busy || inspecting || resetting}
          onClick={async () => {
            if (!window.confirm("Reiniciar a tentativa de emissão deste pedido? O sistema só continuará se confirmar que não há etiqueta paga, gerada ou postada no Melhor Envio.")) return;
            setResetting(true);
            setMessage("");
            setDiagnostic(null);
            try {
              const result = await resetShipping({ data: { orderId: order.id } });
              setPrepared(null);
              setMessage(result.message);
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["sales-admin"] }),
                qc.invalidateQueries({ queryKey: ["shipping-admin"] }),
              ]);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Não foi possível reiniciar a emissão.");
            } finally {
              setResetting(false);
            }
          }}
        >
          {resetting ? "Conferindo e reiniciando…" : "Reiniciar emissão da etiqueta"}
        </Button>
      )}
      {blocked && !canReset && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-500">{hold}</p>}
      {blocked && canReset && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-500">{hold} Se nenhuma etiqueta foi paga ou gerada, use o botão de reinício acima.</p>}
      {message && <p role="status" className="mt-4 rounded-lg border bg-background p-3 text-sm leading-6 [overflow-wrap:anywhere]">{message}</p>}
      <details className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        <summary className="cursor-pointer font-medium">Como funciona o envio</summary>
        <p className="mt-2">
          O site usa remetente, destinatário, produtos, serviço e volume já salvos no pedido e adiciona o envio ao carrinho do Melhor Envio. O site não compra a etiqueta e não debita sua Melhor Carteira. Você revisa, paga e emite a etiqueta no Melhor Envio.
        </p>
      </details>
    </section>
  );
}
