import type { ShippingConfig } from "@/lib/shipping";

type Sender = NonNullable<ShippingConfig["labelAutomation"]["sender"]>;

export function LabelAutomationSettings({ config, onChange }: { config: ShippingConfig; onChange: (config: ShippingConfig) => void }) {
  const settings = config.labelAutomation;
  const sender: Sender = settings.sender ?? {
    name: "", address: "", number: "", complement: "", district: "", city: "",
    state_abbr: "", postal_code: config.originCep, email: "",
    document_type: "cnpj", document: "", phone: "",
  };
  const mode = sender.document_type ?? "cnpj";
  const field = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";
  const setSender = (changes: Partial<Sender>) => onChange({
    ...config, labelAutomation: { ...settings, enabled: false, sender: { ...sender, ...changes } },
  });

  return <section className="border-b border-border py-8">
    <h2 className="mb-3 font-display text-xl font-bold">REMETENTE E ETIQUETAS</h2>
    <p className="mb-4 text-sm text-muted-foreground">
      Informe os dados reais do remetente. A etiqueta é paga e emitida no Melhor Envio, nunca automaticamente pelo site.
    </p>
    <div className="mb-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Tipo de remetente
        <select className={field} value={mode}
          onChange={(e) => setSender({ document_type: e.target.value as "cpf" | "cnpj", document: "" })}>
          <option value="cnpj">Pessoa jurídica — CNPJ da empresa</option>
          <option value="cpf">Pessoa física — CPF (remessa pessoal)</option>
        </select>
      </label>
      {mode === "cpf" && <>
        <label className="text-sm">CPF do remetente
          <input className={field} type="text" inputMode="numeric" autoComplete="off"
            placeholder="000.000.000-00" maxLength={14} required
            value={sender.document ?? ""}
            onChange={(e) => setSender({ document: e.target.value })}/>
        </label>
        <label className="text-sm">Telefone do remetente (DDD + número)
          <input className={field} type="tel" inputMode="tel" autoComplete="tel"
            maxLength={20} required placeholder="(00) 90000-0000"
            value={sender.phone ?? ""}
            onChange={(e) => setSender({ phone: e.target.value })}/>
        </label>
      </>}
    </div>
    <p className="mb-5 text-xs leading-5 text-muted-foreground">
      O CPF deve pertencer ao remetente real. Selecione pessoa física apenas para uma remessa pessoal
      sem finalidade comercial e sem obrigatoriedade de nota fiscal. Para vendas, use os dados fiscais
      e a NF-e correspondente. Os documentos são informados somente no painel administrativo.
    </p>
    <div className="grid gap-4 sm:grid-cols-2">
      {([
        ["name", mode === "cpf" ? "Nome completo do remetente (igual ao CPF)" : "Nome / razão social do remetente", 50],
        ["address", "Rua / avenida", 50],
        ["number", "Número (opcional)", 10],
        ["complement", "Complemento (opcional)", 20],
        ["district", "Bairro", 50],
        ["city", "Cidade", 50],
        ["state_abbr", "UF", 2],
        ["postal_code", "CEP do remetente", 8],
        ["email", "E-mail do remetente", 200],
      ] as const).map(([key, label, max]) => <label key={key} className="text-sm">{label}
        <input className={field} type={key === "email" ? "email" : "text"} maxLength={max}
          required={settings.enabled && key !== "number" && key !== "complement"}
          value={sender[key]}
          onChange={(e) => setSender({ [key]: key === "state_abbr" ? e.target.value.toUpperCase() : e.target.value })} />
      </label>)}
    </div>
  </section>;
}
