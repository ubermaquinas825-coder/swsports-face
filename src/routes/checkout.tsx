import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { checkoutCartKey, type ShippingSelection } from "@/lib/checkout";
import { createMercadoPagoCheckout } from "@/lib/checkout.functions";
import { deliveryAddressSchema, validTaxDocument } from "@/lib/delivery-address";
import { formatBRL, UNIT_PRICE } from "@/lib/products";

const CHECKOUT_SHIPPING_KEY = "swsports-checkout-shipping-v1";

type ViaCepResult = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CustomerField = "name" | "document" | "phone" | "email";

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function maskDocument(value: string) {
  const digits = onlyDigits(value, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCep(value: string) {
  const digits = onlyDigits(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function fieldError(name: CustomerField, value: string): string {
  if (name === "name") {
    return value.trim().split(/\s+/).length > 1 ? "" : "Informe seu nome completo.";
  }
  if (name === "document") {
    return validTaxDocument(value) ? "" : "Informe um CPF ou CNPJ válido.";
  }
  if (name === "phone") {
    return /^[1-9]\d{9,10}$/.test(value.replace(/\D/g, ""))
      ? ""
      : "Informe um telefone com DDD.";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? ""
    : "Informe um e-mail válido.";
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido | SW Sports" },
      {
        name: "description",
        content:
          "Revise seu pedido, confirme os dados de entrega e siga para o pagamento seguro no Mercado Pago.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutProgress() {
  return (
    <ol
      aria-label="Etapas da compra"
      className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 text-[11px] font-semibold sm:text-xs"
    >
      <li className="flex items-center gap-1.5 text-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
        Carrinho
      </li>
      <span aria-hidden className="h-px flex-1 bg-brand/50" />
      <li className="flex items-center gap-1.5 text-brand" aria-current="step">
        <span className="grid h-6 w-6 place-items-center rounded-md border border-brand bg-brand/10">
          <span className="h-2 w-2 rounded-md bg-brand" />
        </span>
        Entrega
      </li>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <li className="flex items-center gap-1.5 text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md border border-border">
          <Circle className="h-2.5 w-2.5" />
        </span>
        Pagamento
      </li>
    </ol>
  );
}

function CheckoutPage() {
  const { lines, subtotal } = useCart();
  const [shipping, setShipping] = useState<ShippingSelection | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [error, setError] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CustomerField, string>>>({});
  const checkout = useServerFn(createMercadoPagoCheckout);

  const checkoutLines = useMemo(
    () => lines.map((line) => ({ id: line.product.id, qty: line.qty })),
    [lines],
  );
  const cartKey = checkoutCartKey(checkoutLines);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShippingSelection;
        if (parsed?.cep && parsed?.option?.id && parsed.cartKey === cartKey) {
          setShipping(parsed);
        }
      }
    } catch {
      // Invalid or unavailable storage is handled by the empty checkout state below.
    } finally {
      setReady(true);
    }
  }, [cartKey]);

  useEffect(() => {
    if (!shipping?.cep) return;
    const controller = new AbortController();
    const cep = shipping.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    let active = true;
    const manualAddressMessage =
      "Não foi possível preencher o endereço automaticamente. Complete os campos manualmente.";

    setAddressBusy(true);
    setAddressMessage("Buscando endereço...");
    // Address autocomplete is optional. A slow provider must not keep payment
    // disabled, and a late response must not overwrite a manually entered address.
    const timeout = window.setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setAddressMessage(manualAddressMessage);
      setAddressBusy(false);
    }, 8000);
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("CEP indisponível");
        return response.json() as Promise<ViaCepResult>;
      })
      .then((data) => {
        if (!active) return;
        if (data.erro) throw new Error("CEP não encontrado");
        setStreet(data.logradouro ?? "");
        setDistrict(data.bairro ?? "");
        setCity(data.localidade ?? "");
        setState(data.uf ?? "");
        setAddressMessage("Endereço localizado. Confira o número e os dados pessoais.");
      })
      .catch(() => {
        if (active) setAddressMessage(manualAddressMessage);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setAddressBusy(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [shipping?.cep]);

  const total = subtotal + (shipping ? shipping.option.priceCents / 100 : 0);

  const validateCustomerField = (fieldName: CustomerField, value: string) => {
    const nextError = fieldError(fieldName, value);
    setFieldErrors((current) => ({ ...current, [fieldName]: nextError }));
    return !nextError;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shipping || busy || !lines.length) return;

    const customerValues: Record<CustomerField, string> = { name, document, phone, email };
    const invalidFields = (Object.entries(customerValues) as [CustomerField, string][])
      .map(([fieldName, value]) => [fieldName, fieldError(fieldName, value)] as const)
      .filter(([, message]) => Boolean(message));

    if (invalidFields.length) {
      setFieldErrors((current) => ({
        ...current,
        ...Object.fromEntries(invalidFields),
      }));
      setError("Confira os campos destacados antes de continuar.");
      return;
    }

    const form = new FormData(event.currentTarget);
    if (form.get("confirmDelivery") !== "on") {
      setError("Confirme os dados de entrega antes de continuar.");
      return;
    }

    const parsed = deliveryAddressSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados do pedido.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await checkout({
        data: {
          lines: checkoutLines,
          cep: shipping.cep,
          serviceId: shipping.option.id,
          quotedPriceCents: shipping.option.priceCents,
          deliveryAddress: parsed.data,
        },
      });
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível abrir o pagamento seguro. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Verificando pedido...</p>
      </main>
    );
  }

  if (!lines.length || !shipping) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-7 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 font-display text-2xl font-bold">Finalize o frete primeiro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Volte para a loja, confira os itens e escolha uma opção de entrega antes de acessar o checkout.
          </p>
          <Button asChild className="mt-6 min-h-11 w-full rounded-md">
            <Link to="/">VOLTAR PARA A LOJA</Link>
          </Button>
        </div>
      </main>
    );
  }

  const field =
    "mt-1.5 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
  const errorField = "border-destructive focus:border-destructive focus:ring-destructive/20";
  const inputClass = (fieldName: CustomerField) =>
    `${field} ${fieldErrors[fieldName] ? errorField : ""}`;

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="border-b border-border bg-popover/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              VOLTAR À LOJA
            </Link>
            <div className="text-right">
              <p className="font-display text-lg font-bold">SW SPORTS</p>
              <p className="text-[11px] text-muted-foreground">Checkout seguro</p>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <CheckoutProgress />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] md:px-6 md:py-10">
        <section>
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.25em] text-brand">ENTREGA</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Só faltam seus dados de entrega
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Seu frete já foi escolhido. Preenchemos o endereço pelo CEP quando possível e você completa apenas o que falta.
            </p>
          </div>

          <form id="checkout-order-form" onSubmit={submit} className="space-y-5" noValidate>
            <div className="rounded-lg border border-border bg-card p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Dados de entrega</h2>
                  <p className="text-xs text-muted-foreground">
                    CEP {maskCep(shipping.cep)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  Nome completo
                  <input
                    name="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (fieldErrors.name) validateCustomerField("name", event.target.value);
                    }}
                    onBlur={() => validateCustomerField("name", name)}
                    autoComplete="shipping name"
                    maxLength={50}
                    required
                    aria-invalid={Boolean(fieldErrors.name)}
                    className={inputClass("name")}
                  />
                  {fieldErrors.name && (
                    <span role="alert" className="mt-1 block text-xs text-destructive">
                      {fieldErrors.name}
                    </span>
                  )}
                </label>

                <label className="text-sm">
                  CPF ou CNPJ
                  <input
                    name="document"
                    value={document}
                    onChange={(event) => {
                      const next = maskDocument(event.target.value);
                      setDocument(next);
                      if (fieldErrors.document) validateCustomerField("document", next);
                    }}
                    onBlur={() => validateCustomerField("document", document)}
                    inputMode="numeric"
                    maxLength={18}
                    required
                    aria-invalid={Boolean(fieldErrors.document)}
                    placeholder="000.000.000-00"
                    className={inputClass("document")}
                  />
                  {fieldErrors.document && (
                    <span role="alert" className="mt-1 block text-xs text-destructive">
                      {fieldErrors.document}
                    </span>
                  )}
                </label>

                <label className="text-sm">
                  Telefone com DDD
                  <input
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      const next = maskPhone(event.target.value);
                      setPhone(next);
                      if (fieldErrors.phone) validateCustomerField("phone", next);
                    }}
                    onBlur={() => validateCustomerField("phone", phone)}
                    autoComplete="shipping tel-national"
                    maxLength={15}
                    required
                    aria-invalid={Boolean(fieldErrors.phone)}
                    placeholder="(34) 99999-9999"
                    className={inputClass("phone")}
                  />
                  {fieldErrors.phone && (
                    <span role="alert" className="mt-1 block text-xs text-destructive">
                      {fieldErrors.phone}
                    </span>
                  )}
                </label>

                <label className="text-sm sm:col-span-2">
                  E-mail
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (fieldErrors.email) validateCustomerField("email", event.target.value);
                    }}
                    onBlur={() => validateCustomerField("email", email)}
                    autoComplete="shipping email"
                    maxLength={200}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={inputClass("email")}
                  />
                  {fieldErrors.email && (
                    <span role="alert" className="mt-1 block text-xs text-destructive">
                      {fieldErrors.email}
                    </span>
                  )}
                </label>

                <label className="text-sm sm:col-span-2">
                  Rua / avenida
                  <input
                    name="street"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    autoComplete="shipping address-line1"
                    maxLength={50}
                    required
                    className={field}
                  />
                </label>

                <label className="text-sm">
                  Número
                  <input
                    name="number"
                    autoComplete="off"
                    maxLength={10}
                    required
                    placeholder="Ex.: 123 ou S/N"
                    className={field}
                  />
                </label>

                <label className="text-sm">
                  Complemento <span className="text-muted-foreground">(opcional)</span>
                  <input
                    name="complement"
                    autoComplete="shipping address-line2"
                    maxLength={20}
                    className={field}
                  />
                </label>

                <label className="text-sm">
                  Bairro
                  <input
                    name="district"
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    autoComplete="shipping address-level3"
                    maxLength={50}
                    required
                    className={field}
                  />
                </label>

                <label className="text-sm">
                  Cidade
                  <input
                    name="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="shipping address-level2"
                    maxLength={50}
                    required
                    className={field}
                  />
                </label>

                <label className="text-sm">
                  Estado
                  <select
                    name="state"
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    autoComplete="shipping address-level1"
                    required
                    className={field}
                  >
                    <option value="" disabled>Selecione</option>
                    {deliveryAddressSchema.shape.state.options.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  CEP
                  <input
                    name="postalCode"
                    value={maskCep(shipping.cep)}
                    readOnly
                    autoComplete="shipping postal-code"
                    className={`${field} opacity-80`}
                  />
                </label>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    addressBusy ? "animate-pulse text-muted-foreground" : "text-brand"
                  }`}
                />
                <span>
                  {addressMessage ||
                    "Buscando automaticamente o endereço do CEP escolhido no frete."}
                </span>
              </div>

              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 text-sm">
                <input
                  type="checkbox"
                  name="confirmDelivery"
                  required
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>
                  Confirmo que os dados acima estão corretos e podem ser usados para a entrega do pedido.
                </span>
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
              <LockKeyhole className="mx-auto mb-2 h-4 w-4 text-brand" />
              Pagamento processado com segurança pelo Mercado Pago. A confirmação financeira ocorre pela integração segura, não pelo retorno do navegador.
            </div>
          </form>
        </section>

        <aside className="md:sticky md:top-6 md:self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-brand" />
              <h2 className="font-display text-lg font-bold">Resumo do pedido</h2>
            </div>

            <div className="space-y-3">
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <ProductImage
                    product={product}
                    variant="thumbnail"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-md bg-background object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {qty}x · {formatBRL(UNIT_PRICE)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Produtos</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{formatBRL(shipping.option.priceCents / 100)}</span>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  {shipping.option.company} · {shipping.option.name}
                </span>
                {shipping.option.deliveryDays !== null && (
                  <span className="shrink-0">
                    {shipping.option.deliveryDays} {" "}
                    {shipping.option.deliveryDays === 1 ? "dia útil" : "dias úteis"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 font-semibold">
                <span>Total</span>
                <span className="font-display text-2xl font-bold">{formatBRL(total)}</span>
              </div>
            </div>

            <Button
              type="submit"
              form="checkout-order-form"
              disabled={busy || addressBusy}
              className="mt-5 hidden min-h-14 w-full rounded-2xl text-sm font-bold md:flex"
            >
              <LockKeyhole className="h-4 w-4" />
              {busy ? "ABRINDO PAGAMENTO SEGURO..." : "REALIZAR PAGAMENTO"}
            </Button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              O pagamento é concluído no ambiente seguro do Mercado Pago. O frete é validado novamente antes da cobrança.
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Total do pedido</p>
            <p className="font-display text-xl font-bold">{formatBRL(total)}</p>
          </div>
          <Button
            type="submit"
            form="checkout-order-form"
            disabled={busy || addressBusy}
            className="min-h-12 flex-1 rounded-xl text-xs font-bold"
          >
            <LockKeyhole className="h-4 w-4" />
            {busy ? "ABRINDO..." : "REALIZAR PAGAMENTO"}
          </Button>
        </div>
      </div>
    </main>
  );
}
