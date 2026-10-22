import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cepSchema } from "@/lib/shipping";
import { requestShippingQuote } from "@/lib/shipping.functions";
export function ShippingCalculator({ cartKey }: { cartKey: string }) {
  const [cep, setCep] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const quote = useServerFn(requestShippingQuote);
  useEffect(() => { setMessage(""); }, [cartKey, cep]);
  const calculate = async () => {
    const parsed = cepSchema.safeParse(cep);
    if (!parsed.success) { setMessage("Informe um CEP válido com 8 dígitos."); return; }
    setBusy(true);
    try { const result = await quote({ data: { cep: parsed.data } }); setMessage(result.message); }
    catch { setMessage("Cotação indisponível. Confirme o frete pelo WhatsApp."); }
    finally { setBusy(false); }
  };
  return <div className="border-t border-border py-4">
    <label htmlFor="shipping-cep" className="mb-2 flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-brand" /> Entrega</label>
    <div className="flex gap-2"><input id="shipping-cep" aria-label="CEP de destino" inputMode="numeric" maxLength={9} value={cep} onChange={(e) => setCep(e.target.value.replace(/[^\d-]/g, ""))} placeholder="CEP de destino" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" /><Button variant="outline" disabled={busy} onClick={calculate}>{busy ? "Consultando…" : "Calcular"}</Button></div>
    {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
  </div>;
}