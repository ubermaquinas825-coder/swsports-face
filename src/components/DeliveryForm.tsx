import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { deliveryAddressSchema, type DeliveryAddress } from "@/lib/delivery";

type Raw = Record<keyof DeliveryAddress, string>;
const empty: Raw = { name: "", document: "", email: "", phone: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

/** Collects the delivery address for the CEP already quoted; reports a valid address or null. */
export function DeliveryForm({ cep, onChange }: { cep: string; onChange: (a: DeliveryAddress | null) => void }) {
  const [raw, setRaw] = useState<Raw>(empty);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json()).then((d: { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean }) => {
      if (!alive || d.erro) return;
      setRaw((r) => ({ ...r, street: r.street || (d.logradouro ?? ""), district: r.district || (d.bairro ?? ""), city: d.localidade ?? r.city, state: d.uf ?? r.state }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [cep]);
  const parsed = deliveryAddressSchema.safeParse(raw);
  useEffect(() => { onChange(parsed.success ? parsed.data : null); }, [JSON.stringify(raw)]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (key: keyof Raw, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Input aria-label={label} placeholder={label} value={raw[key]} onBlur={() => setTouched(true)} onChange={(e) => setRaw({ ...raw, [key]: e.target.value })} {...props} />
  );
  const firstError = !parsed.success && touched ? parsed.error.issues[0]?.message : "";
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <p className="text-sm font-semibold">Dados para entrega (CEP {cep.replace(/(\d{5})(\d{3})/, "$1-$2")})</p>
      {field("name", "Nome e sobrenome", { autoComplete: "name" })}
      <div className="grid grid-cols-2 gap-2">{field("document", "CPF", { inputMode: "numeric" })}{field("phone", "Celular (opcional)", { inputMode: "tel", autoComplete: "tel" })}</div>
      {field("email", "E-mail", { type: "email", autoComplete: "email" })}
      {field("street", "Rua", { autoComplete: "address-line1" })}
      <div className="grid grid-cols-2 gap-2">{field("number", "Número")}{field("complement", "Complemento")}</div>
      {field("district", "Bairro")}
      <div className="grid grid-cols-[1fr_70px] gap-2">{field("city", "Cidade")}{field("state", "UF", { maxLength: 2 })}</div>
      {firstError && <p className="text-xs text-destructive">{firstError}</p>}
    </div>
  );
}
