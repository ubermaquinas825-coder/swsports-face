import type { ShippingConfig } from "@/lib/shipping";

export function LabelAutomationSettings({ config, onChange }: { config: ShippingConfig; onChange: (config: ShippingConfig) => void }) {
  const settings = config.labelAutomation;
  const sender = settings.sender ?? { name: "", address: "", number: "", complement: "", district: "", city: "", state_abbr: "", postal_code: config.originCep, email: "" };
  const field = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";
  return <section className="border-b border-border py-8">
    <h2 className="mb-3 font-display text-xl font-bold">ETIQUETAS AUTOMÁTICAS</h2>
    <p className="mb-4 text-sm text-muted-foreground">Declaração de conteúdo. Após a confirmação do pagamento e envio do pedido ao Bling, a etiqueta será paga com o saldo da carteira SuperFrete. Mantenha saldo suficiente. Divergências de valor ou dados ficam para conferência.</p>
    <label className="mb-5 flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={settings.enabled} onChange={(e) => onChange({ ...config, labelAutomation: { enabled: e.target.checked, sender: e.target.checked ? sender : settings.sender } })} />
      Emitir e pagar etiquetas automaticamente
    </label>
    <p className="mb-4 text-xs text-muted-foreground">Preencha todos os campos obrigatórios do remetente. O CPF/CNPJ utilizado será o cadastrado na conta SuperFrete. A ativação exige a migração de etiquetas e a validação do conector no servidor.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {([
        ["name", "Nome completo / nome da loja", 50], ["address", "Rua / avenida", 50],
        ["number", "Número (opcional)", 10], ["complement", "Complemento (opcional)", 20],
        ["district", "Bairro", 50], ["city", "Cidade", 50], ["state_abbr", "UF", 2],
        ["postal_code", "CEP do remetente", 8], ["email", "E-mail de contato técnico", 200],
      ] as const).map(([key, label, max]) => <label key={key} className="text-sm">{label}
        <input className={field} type={key === "email" ? "email" : "text"} maxLength={max}
          required={settings.enabled && key !== "number" && key !== "complement"} value={sender[key]}
          onChange={(e) => onChange({ ...config, labelAutomation: { ...settings, sender: { ...sender, [key]: key === "state_abbr" ? e.target.value.toUpperCase() : e.target.value } } })} />
      </label>)}
    </div>
  </section>;
}
