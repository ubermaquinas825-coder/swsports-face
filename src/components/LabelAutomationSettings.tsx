import type { ShippingConfig } from "@/lib/shipping";

export function LabelAutomationSettings({ config, onChange }: { config: ShippingConfig; onChange: (config: ShippingConfig) => void }) {
  const settings = config.labelAutomation;
  const sender = settings.sender ?? { name: "", address: "", number: "", complement: "", district: "", city: "", state_abbr: "", postal_code: config.originCep, email: "" };
  const field = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";
  return <section className="border-b border-border py-8">
    <h2 className="mb-3 font-display text-xl font-bold">REMETENTE E ETIQUETAS</h2>
    <p className="mb-4 text-sm text-muted-foreground">Preencha o remetente para preparar os envios pelo administrativo. Você revisa e paga a etiqueta pessoalmente na SuperFrete; não há pagamento automático.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {([
        ["name", "Nome completo / nome da loja", 50], ["address", "Rua / avenida", 50],
        ["number", "Número (opcional)", 10], ["complement", "Complemento (opcional)", 20],
        ["district", "Bairro", 50], ["city", "Cidade", 50], ["state_abbr", "UF", 2],
        ["postal_code", "CEP do remetente", 8], ["email", "E-mail de contato técnico", 200],
      ] as const).map(([key, label, max]) => <label key={key} className="text-sm">{label}
        <input className={field} type={key === "email" ? "email" : "text"} maxLength={max}
          required={settings.enabled && key !== "number" && key !== "complement"} value={sender[key]}
          onChange={(e) => onChange({ ...config, labelAutomation: { ...settings, enabled: false, sender: { ...sender, [key]: key === "state_abbr" ? e.target.value.toUpperCase() : e.target.value } } })} />
      </label>)}
    </div>
  </section>;
}
