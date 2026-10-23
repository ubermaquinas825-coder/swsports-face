import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cepSchema } from "@/lib/shipping";
import { requestShippingQuote } from "@/lib/shipping.functions";
import {
  checkoutCartKey,
  type CheckoutLine,
  type ShippingOption,
  type ShippingSelection,
} from "@/lib/checkout";
import { formatBRL } from "@/lib/products";

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function ShippingCalculator({
  lines,
  selection,
  onSelect,
}: {
  lines: CheckoutLine[];
  selection: ShippingSelection | null;
  onSelect: (selection: ShippingSelection | null) => void;
}) {
  const [cep, setCep] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const revision = useRef(0);
  const lastQuotedRef = useRef("");
  const cartKey = checkoutCartKey(lines);
  const quote = useServerFn(requestShippingQuote);

  useEffect(() => {
    revision.current += 1;
    lastQuotedRef.current = "";
    setMessage("");
    setOptions([]);
    setBusy(false);
    onSelect(null);
  }, [cartKey, onSelect]);

  const calculate = useCallback(
    async (value = cep, force = false) => {
      const parsed = cepSchema.safeParse(value);
      if (!parsed.success) {
        setMessage("Informe um CEP válido com 8 dígitos.");
        return;
      }

      const requestKey = `${cartKey}:${parsed.data}`;
      if (!force && lastQuotedRef.current === requestKey) return;

      const requestRevision = ++revision.current;
      setBusy(true);
      setMessage("Consultando entrega...");
      setOptions([]);
      onSelect(null);

      try {
        const result = await quote({ data: { cep: parsed.data, lines } });
        if (requestRevision !== revision.current) return;
        lastQuotedRef.current = requestKey;
        setOptions(result.options);
        setMessage(result.message || (result.options.length ? "Escolha a melhor opção de entrega." : ""));
      } catch (error) {
        if (requestRevision !== revision.current) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Não conseguimos calcular esse frete agora. Confira o CEP ou tente novamente.",
        );
      } finally {
        if (requestRevision === revision.current) setBusy(false);
      }
    },
    [cartKey, cep, lines, onSelect, quote],
  );

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    revision.current += 1;
    setOptions([]);
    onSelect(null);
    if (digits.length !== 8) {
      lastQuotedRef.current = "";
      setMessage("");
      return;
    }

    setMessage("CEP completo. Consultando entrega...");
    const timer = window.setTimeout(() => {
      void calculate(cep);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [cep, calculate, onSelect]);

  return (
    <div className="border-t border-border py-4">
      <label htmlFor="shipping-cep" className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-brand" />
        CEP de entrega
      </label>

      <div className="flex gap-2">
        <input
          id="shipping-cep"
          aria-label="CEP de entrega"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          value={cep}
          onChange={(event) => setCep(maskCep(event.target.value))}
          placeholder="00000-000"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void calculate(cep, true)}
          className="min-h-11"
        >
          {busy ? "Consultando..." : "Calcular"}
        </Button>
      </div>

      {options.length > 0 && (
        <fieldset className="mt-3 space-y-2">
          <legend className="mb-2 text-xs text-muted-foreground">
            Compare as opções de entrega
          </legend>
          {options.map((option) => {
            const selected = selection?.option.id === option.id;
            const delivery =
              option.deliveryDays === null
                ? null
                : `${option.deliveryDays} ${option.deliveryDays === 1 ? "dia útil" : "dias úteis"}`;

            return (
              <label
                key={option.id}
                className={`flex min-h-[68px] cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  selected ? "border-brand bg-brand/10" : "border-border hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="shipping-option"
                  value={option.id}
                  checked={selected}
                  onChange={() =>
                    onSelect({
                      cep: cepSchema.parse(cep),
                      cartKey,
                      option,
                    })
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium">
                    {option.company} · {option.name}
                  </span>
                  {delivery && (
                    <span className="text-xs text-muted-foreground">
                      Entrega estimada: {delivery}
                    </span>
                  )}
                  {selected && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand">
                      <Check className="h-3.5 w-3.5" />
                      Frete selecionado
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-bold">
                  {formatBRL(option.priceCents / 100)}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {message && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
