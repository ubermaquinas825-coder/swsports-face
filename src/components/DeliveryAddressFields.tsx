import { deliveryAddressSchema } from "@/lib/delivery-address";

export function DeliveryAddressFields({ postalCode, disabled }: { postalCode: string; disabled: boolean }) {
  const field = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <fieldset disabled={disabled} className="space-y-3 border-t border-border pt-4" aria-describedby="delivery-data-help">
      <legend className="font-semibold">Dados para entrega</legend>
      <p id="delivery-data-help" className="text-xs text-muted-foreground">
        Informe somente os dados necessários para identificar o destinatário e realizar a entrega do pedido.
      </p>
      {[
        { name: "name", label: "Nome completo do destinatário", autoComplete: "shipping name", maxLength: 50 },
        { name: "document", label: "CPF ou CNPJ do destinatário", autoComplete: "off", maxLength: 18, inputMode: "numeric" as const },
        { name: "email", label: "E-mail", autoComplete: "shipping email", type: "email", maxLength: 200 },
        { name: "phone", label: "Telefone com DDD", autoComplete: "shipping tel-national", type: "tel", maxLength: 20 },
        { name: "street", label: "Rua / avenida", autoComplete: "shipping address-line1", maxLength: 50 },
        { name: "number", label: "Número (ou S/N)", autoComplete: "off", maxLength: 10 },
        { name: "complement", label: "Complemento (opcional)", autoComplete: "shipping address-line2", maxLength: 20 },
        { name: "district", label: "Bairro", autoComplete: "shipping address-level3", maxLength: 50 },
        { name: "city", label: "Cidade", autoComplete: "shipping address-level2", maxLength: 50 },
      ].map((item) => (
        <label key={item.name} className="block text-sm">
          {item.label}
          <input {...item} className={field} required={item.name !== "complement"} />
        </label>
      ))}
      <label className="block text-sm">Estado
        <select name="state" autoComplete="shipping address-level1" required defaultValue="" className={field}>
          <option value="" disabled>Selecione</option>
          {deliveryAddressSchema.shape.state.options.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
      <label className="block text-sm">CEP cotado
        <input name="postalCode" value={postalCode} readOnly autoComplete="shipping postal-code" className={field} />
      </label>
      <p id="delivery-privacy-help" className="text-xs text-muted-foreground">
        Para mudar o CEP, calcule o frete novamente. Os dados informados são usados para processar o pedido, atendimento e entrega. Consulte a Política de Privacidade para mais informações.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmDelivery" required className="mt-1 h-4 w-4 accent-primary" aria-describedby="delivery-privacy-help" />
        Confirmo que os dados acima estão corretos para a entrega.
      </label>
    </fieldset>
  );
}
