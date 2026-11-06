import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApparelPackage, ApparelShipping, ShippingConfig } from "@/lib/shipping";

const numericFields = [
  { key: "shirtQuantity", label: "Camisetas nesta embalagem (un.)", min: 1, step: 1 },
  { key: "balaclavaQuantity", label: "Balaclavas nesta embalagem (un.)", min: 0, step: 1 },
  { key: "weightKg", label: "Peso total embalado (kg)", min: 0.001, step: 0.001 },
  { key: "lengthCm", label: "Comprimento externo (cm)", min: 0.001, step: 0.001 },
  { key: "widthCm", label: "Largura externa (cm)", min: 0.001, step: 0.001 },
  { key: "heightCm", label: "Altura externa (cm)", min: 0.001, step: 0.001 },
] as const;

const sharedNumericFields = [
  { key: "capacity", label: "Capacidade total de peças (un.)", min: 1, step: 1 },
  { key: "lengthCm", label: "Comprimento externo (cm)", min: 0.001, step: 0.001 },
  { key: "widthCm", label: "Largura externa (cm)", min: 0.001, step: 0.001 },
  { key: "heightCm", label: "Altura externa (cm)", min: 0.001, step: 0.001 },
  { key: "packagingWeightKg", label: "Peso da embalagem vazia (kg)", min: 0, step: 0.001 },
] as const;

export function ApparelPackagingSettings({ config, onChange }: {
  config: ShippingConfig;
  onChange: (config: ShippingConfig) => void;
}) {
  const packages = config.apparelPackages ?? [];
  const updatePackages = (apparelPackages: ApparelPackage[]) => onChange({ ...config, apparelPackages });
  const updatePackage = (index: number, changes: Partial<ApparelPackage>) =>
    updatePackages(packages.map((packaging, position) => position === index ? { ...packaging, ...changes } : packaging));
  const shared = config.apparelShipping;
  const updateShared = (apparelShipping: ApparelShipping) => onChange({ ...config, apparelShipping });
  const updateSharedPackage = (index: number, changes: Partial<ApparelShipping["packages"][number]>) => {
    if (!shared) return;
    updateShared({ ...shared, packages: shared.packages.map((packaging, position) => position === index ? { ...packaging, ...changes } : packaging) });
  };
  const field = "mt-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";

  return (
    <section aria-labelledby="apparel-packaging-title" className="border-b border-border py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="apparel-packaging-title" className="font-display text-xl font-bold">EMBALAGENS PARA CAMISETAS</h2>
      </div>
      <div className="mb-8 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Peso individual e embalagens compartilhadas</h3>
          <Button type="button" variant="outline" onClick={() => updateShared({
            productWeightKg: shared?.productWeightKg ?? 0,
            packages: config.packages.map((packaging) => ({ ...packaging })),
          })}>Usar embalagens cadastradas</Button>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Use esta opção após confirmar que as embalagens cadastradas comportam camisetas.
          Informe o peso de uma camiseta sem embalagem e a capacidade total de peças de cada pacote.
          O peso do envio soma as camisetas, as balaclavas e a embalagem vazia; as dimensões permanecem as cadastradas.
        </p>
        {shared ? <>
          <label className="mt-5 block max-w-sm text-sm">Peso individual de uma camiseta sem embalagem (kg)
            <input className={field} type="number" required min="0.001" step="0.001"
              value={shared.productWeightKg || ""} placeholder="Informe o peso real da peça"
              onChange={(event) => updateShared({ ...shared, productWeightKg: event.target.value ? Number(event.target.value) : 0 })} />
          </label>
          <div className="mt-5 space-y-5">
            {shared.packages.map((packaging, index) => <fieldset key={index} className="rounded-md border border-border p-4">
              <legend className="px-2 text-sm font-semibold">Embalagem compartilhada {index + 1}</legend>
              <div className="mb-4 flex items-end gap-3">
                <label className="flex-1 text-sm">Nome da embalagem compartilhada
                  <input className={field} required value={packaging.name}
                    onChange={(event) => updateSharedPackage(index, { name: event.target.value })} />
                </label>
                <Button type="button" variant="ghost" size="icon" disabled={shared.packages.length === 1}
                  aria-label={`Remover embalagem compartilhada ${index + 1}`}
                  onClick={() => updateShared({ ...shared, packages: shared.packages.filter((_, position) => position !== index) })}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedNumericFields.map(({ key, label, min, step }) => <label key={key} className="text-sm">{label}
                  <input className={field} type="number" required={key !== "packagingWeightKg"} min={min} step={step}
                    value={packaging[key] === null || (packaging[key] === 0 && min > 0) ? "" : packaging[key]}
                    placeholder={key === "packagingWeightKg" ? "Não informado" : "Informe a medida real"}
                    onChange={(event) => updateSharedPackage(index, { [key]: event.target.value ? Number(event.target.value) : key === "packagingWeightKg" ? null : 0 })} />
                </label>)}
              </div>
              {packaging.packagingWeightKg === null && <p className="mt-3 text-xs text-muted-foreground">Esta embalagem não será usada para camisetas enquanto o peso da embalagem vazia não for informado.</p>}
            </fieldset>)}
          </div>
          <Button type="button" variant="outline" className="mt-5" onClick={() => onChange({ ...config, apparelShipping: undefined })}>
            Remover configuração compartilhada
          </Button>
        </> : <p className="mt-3 text-sm text-muted-foreground">Nenhuma embalagem compartilhada habilitada para camisetas.</p>}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Combinações medidas individualmente</h3>
        <Button type="button" variant="outline" onClick={() => updatePackages([
          ...packages,
          { name: "", shirtQuantity: 0, balaclavaQuantity: 0, weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
        ])}>
          <Plus aria-hidden /> Adicionar combinação
        </Button>
      </div>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-muted-foreground">
        Monte e meça cada combinação real de camisetas e balaclavas. Informe o peso total com a embalagem
        e as medidas externas do pacote pronto. Uma combinação exata cadastrada tem prioridade sobre as embalagens compartilhadas.
        Sem uma combinação exata, a cotação procura uma embalagem compartilhada com capacidade e peso da embalagem vazia informados.
      </p>
      {packages.length === 0 && (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Nenhuma combinação medida cadastrada. Sem embalagens compartilhadas habilitadas, pedidos com camisetas não terão frete disponível.
        </p>
      )}
      <div className="space-y-6">
        {packages.map((packaging, index) => (
          <fieldset key={index} className="rounded-md border border-border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Combinação {index + 1}</legend>
            <div className="mb-4 flex items-end gap-3">
              <label className="flex-1 text-sm">Nome da embalagem
                <input className={field} required value={packaging.name}
                  placeholder="Identifique o pacote medido"
                  onChange={(event) => updatePackage(index, { name: event.target.value })} />
              </label>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover combinação ${index + 1}`}
                onClick={() => updatePackages(packages.filter((_, position) => position !== index))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {numericFields.map(({ key, label, min, step }) => (
                <label key={key} className="text-sm">{label}
                  <input className={field} type="number" required min={min} step={step}
                    value={packaging[key] === 0 && min > 0 ? "" : packaging[key]}
                    placeholder={key.endsWith("Quantity") ? "Informe a quantidade" : "Informe a medida real"}
                    onChange={(event) => updatePackage(index, { [key]: event.target.value ? Number(event.target.value) : 0 })} />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
