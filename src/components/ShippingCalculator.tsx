import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cepSchema } from "@/lib/shipping";
import { requestShippingQuote } from "@/lib/shipping.functions";
import { checkoutCartKey, type CheckoutLine, type ShippingOption, type ShippingSelection } from "@/lib/checkout";
import { formatBRL } from "@/lib/products";
export function ShippingCalculator({ lines, selection, onSelect }: { lines: CheckoutLine[]; selection: ShippingSelection | null; onSelect: (selection: ShippingSelection | null) => void }) {
  const [cep, setCep] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const revision = useRef(0);
  const cartKey = checkoutCartKey(lines);
  const quote = useServerFn(requestShippingQuote);
  useEffect(() => { revision.current += 1; setMessage(""); setOptions([]); setBusy(false); onSelect(null); }, [cartKey, cep, onSelect]);
  const calculate = async () => {
    const parsed = cepSchema.safeParse(cep);
    if (!parsed.success) { setMessage("Informe um CEP válido com 8 dígitos."); return; }
    const requestRevision = ++revision.current;
    setBusy(true);
    setMessage(""); setOptions([]); onSelect(null);
    try {
      const result = await quote({ data: { cep: parsed.data, lines } });
      if (requestRevision !== revision.current) return;
      setOptions(result.options); setMessage(result.message);
    }
    catch (error) { if (requestRevision === revision.current) setMessage(error instanceof Error ? error.message : "Não foi possível consultar o frete. Tente novamente."); }
    finally { if (requestRevision === revision.current) setBusy(false); }
  };
  return <div className="border-t border-border py-4">
    <label htmlFor="shipping-cep" className="mb-2 flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-brand" /> Entrega</label>
    <div className="flex gap-2"><input id="shipping-cep" aria-label="CEP de destino" inputMode="numeric" maxLength={9} value={cep} onChange={(e) => setCep(e.target.value.replace(/[^\d-]/g, ""))} placeholder="CEP de destino" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" /><Button variant="outline" disabled={busy} onClick={calculate}>{busy ? "Consultando…" : "Calcular"}</Button></div>
    {options.length > 0 && <fieldset className="mt-3 space-y-2"><legend className="mb-2 text-xs text-muted-foreground">Opções SuperFrete</legend>{options.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${selection?.option.id === option.id ? "border-primary bg-accent" : "border-border"}`}><input type="radio" name="shipping-option" value={option.id} checked={selection?.option.id === option.id} onChange={() => onSelect({ cep: cepSchema.parse(cep), cartKey, option })} className="accent-primary" /><span className="min-w-0 flex-1 text-sm"><span className="block font-medium">{option.company} · {option.name}</span>{option.deliveryDays !== null && <span className="text-xs text-muted-foreground">Prazo estimado: {option.deliveryDays} dias úteis</span>}</span><span className="shrink-0 text-sm font-semibold">{formatBRL(option.priceCents / 100)}</span></label>)}</fieldset>}
    {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
  </div>;
}