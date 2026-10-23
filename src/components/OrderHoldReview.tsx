import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { inspectBlingOrderForReview, resolveOrderHold } from "@/lib/order-review.functions";

export function OrderHoldReview({ order }: { order: { id: string; financial_revision: string; payment_status: string; bling_sync_error: string | null } }) {
  const inspect = useServerFn(inspectBlingOrderForReview), resolve = useServerFn(resolveOrderHold);
  const qc = useQueryClient();
  const [review, setReview] = useState<Awaited<ReturnType<typeof inspectBlingOrderForReview>> | null>(null);
  const [reason, setReason] = useState(""), [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage("");
    try { await operation(); await qc.invalidateQueries({ queryKey: ["shipping-admin"] }); }
    catch (error) { setReview(null); setMessage(error instanceof Error ? error.message : "Não foi possível registrar a revisão."); }
    finally { setBusy(false); }
  };
  const valid = reason.trim().length >= 10 && evidence.trim().length >= 10;
  const canAccept = review?.outcome === "found" && review.paymentStatus === "approved" && order.payment_status === "approved" && review.revision === order.financial_revision;
  const decide = (action: "keep_blocked" | "accept_verified_export") => run(async () => {
    await resolve({ data: { id: order.id, revision: order.financial_revision, action, reason, evidence } });
    setReview(null); setMessage(action === "keep_blocked" ? "Bloqueio preservado; revisão registrada." : "Vínculo existente confirmado e decisão registrada.");
  });
  return <section className="rounded-md border border-border p-4" aria-label={`Revisão do pedido ${order.id}`}>
    <h3 className="font-bold">Revisão manual · {order.id.slice(0, 8)}</h3>
    <p className="my-3 text-sm">{order.bling_sync_error ?? "Pedido bloqueado para conferência."}</p>
    <Button variant="outline" disabled={busy} onClick={() => run(async () => {
      const result = await inspect({ data: { id: order.id } }); setReview(result);
      setMessage(result.outcome === "found" ? `Pedido Bling ${result.blingId} localizado. Confira valores, cliente, entrega e estoque antes de confirmar.` : "Vínculo não confirmado. Mantenha o bloqueio; nenhum pedido será recriado.");
    })}>Conferir pagamento e vínculo existente</Button>
    <label className="mt-4 block text-sm">Motivo da decisão<textarea className="mt-1 w-full rounded border border-input bg-card p-2" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} /></label>
    <label className="mt-3 block text-sm">Referência da evidência ou chamado, sem dados pessoais<input className="mt-1 w-full rounded border border-input bg-card p-2" maxLength={1000} value={evidence} onChange={(e) => setEvidence(e.target.value)} disabled={busy} /></label>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button variant="outline" disabled={busy || !valid} onClick={() => decide("keep_blocked")}>Registrar e manter bloqueio</Button>
      <Button disabled={busy || !valid || !canAccept} onClick={() => decide("accept_verified_export")}>Confirmar pedido já existente no Bling</Button>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">As evidências expiram em cinco minutos. Esta revisão não cria pedidos, não reapresenta cobranças e não permite aprovar pagamentos falhos.</p>
    <p role="status" className="mt-2 text-sm">{message}</p>
  </section>;
}
