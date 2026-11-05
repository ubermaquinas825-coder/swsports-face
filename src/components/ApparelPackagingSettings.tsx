import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApparelPackage, ShippingConfig } from "@/lib/shipping";

const numericFields = [
  { key: "shirtQuantity", label: "Camisetas nesta embalagem (un.)", min: 1, step: 1 },
  { key: "balaclavaQuantity", label: "Balaclavas nesta embalagem (un.)", min: 0, step: 1 },
  { key: "weightKg", label: "Peso total embalado (kg)", min: 0.001, step: 0.001 },
  { key: "lengthCm", label: "Comprimento externo (cm)", min: 0.001, step: 0.001 },
  { key: "widthCm", label: "Largura externa (cm)", min: 0.001, step: 0.001 },
  { key: "heightCm", label: "Altura externa (cm)", min: 0.001, step: 0.001 },
] as const;

export function ApparelPackagingSettings({ config, onChange }: {
  config: ShippingConfig;
  onChange: (config: ShippingConfig) => void;
}) {
  const packages = config.apparelPackages ?? [];
  const updatePackages = (apparelPackages: ApparelPackage[]) => onChange({ ...config, apparelPackages });
  const updatePackage = (index: number, changes: Partial<ApparelPackage>) =>
    updatePackages(packages.map((packaging, position) => position === index ? { ...packaging, ...changes } : packaging));
  const field = "mt-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";

  return (
    <section aria-labelledby="apparel-packaging-title" className="border-b border-border py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="apparel-packaging-title" className="font-display text-xl font-bold">EMBALAGENS PARA CAMISETAS</h2>
        <Button type="button" variant="outline" onClick={() => updatePackages([
          ...packages,
          { name: "", shirtQuantity: 0, balaclavaQuantity: 0, weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
        ])}>
          <Plus aria-hidden /> Adicionar combinação
        </Button>
      </div>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-muted-foreground">
        Monte e meça cada combinação real de camisetas e balaclavas. Informe o peso total com a embalagem
        e as medidas externas do pacote pronto. A cotação usa apenas a combinação exata cadastrada;
        quantidades diferentes precisam de outro cadastro.
      </p>
      {packages.length === 0 && (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          Nenhuma combinação medida cadastrada. Pedidos com camisetas não terão frete disponível até o cadastro.
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
