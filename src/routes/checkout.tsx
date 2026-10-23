import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, LockKeyhole, MapPin, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { checkoutCartKey, type ShippingSelection } from "@/lib/checkout";
import { createMercadoPagoCheckout } from "@/lib/checkout.functions";
import { deliveryAddressSchema } from "@/lib/delivery-address";
import { formatBRL } from "@/lib/products";

const CHECKOUT_SHIPPING_KEY = "swsports-checkout-shipping-v1";

type ViaCepResult = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido | SW Sports" },
      { name: "description", content: "Revise seu pedido, confirme seus dados de entrega e siga para o pagamento seguro no Mercado Pago." },
    ],
  }),
  component: CheckoutPage,
});

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
  const checkout = useServerFn(createMercadoPagoCheckout);
  const checkoutLines = useMemo(() => lines.map((line) => ({ id: line.product.id, qty: line.qty })), [lines]);
  const cartKey = checkoutCartKey(checkoutLines);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShippingSelection;
        if (parsed?.cep && parsed?.option?.id && parsed.cartKey === cartKey) setShipping(parsed);
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
    setAddressBusy(true);
    setAddressMessage("Buscando endereço pelo CEP…");
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("CEP indisponível");
        return response.json() as Promise<ViaCepResult>;
      })
      .then((data) => {
        if (data.erro) throw new Error("CEP não encontrado");
        setStreet(data.logradouro ?? "");
        setDistrict(data.bairro ?? "");
        setCity(data.localidade ?? "");
        setState(data.uf ?? "");
        setAddressMessage("Endereço localizado. Confira o número e os dados pessoais.");
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setAddressMessage("Não foi possível preencher o endereço automaticamente. Você pode completar os campos manualmente.");
      })
      .finally(() => setAddressBusy(false));
    return () => controller.abort();
  }, [shipping?.cep]);

  const total = subtotal + (shipping ? shipping.option.priceCents / 100 : 0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shipping || busy || !lines.length) return;
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
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o pagamento. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-background px-4"><p className="text-sm text-muted-foreground">Carregando checkout…</p></main>;
  }

  if (!lines.length || !shipping) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-4 font-display text-2xl font-bold">Finalize o frete primeiro</h1>
          <p className="mt-2 text-sm text-muted-foreground">Volte para a loja, confira os itens do carrinho e escolha uma opção de entrega antes de acessar o checkout.</p>
          <Button asChild className="mt-6 w-full rounded-full"><Link to="/">VOLTAR PARA A LOJA</Link></Button>
        </div>
      </main>
    );
  }

  const field = "mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-popover/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /> VOLTAR À LOJA</Link>
          <div className="text-right"><p className="font-display text-lg font-bold">SW SPORTS</p><p className="text-[11px] text-muted-foreground">Checkout seguro</p></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[1fr_360px] md:px-6 md:py-10">
        <section>
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.25em] text-brand">FINALIZAÇÃO DO PEDIDO</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Só faltam seus dados de entrega</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Seu frete já foi escolhido. Preenchemos o endereço automaticamente pelo CEP para você informar apenas o que falta.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
              <div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-brand"><MapPin className="h-4 w-4" /></div><div><h2 className="font-display text-lg font-bold">Dados de entrega</h2><p className="text-xs text-muted-foreground">CEP {shipping.cep}</p></div></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">Nome completo<input name="name" autoComplete="shipping name" maxLength={50} required className={field} /></label>
                <label className="text-sm">CPF ou CNPJ<input name="document" inputMode="numeric" maxLength={18} required className={field} /></label>
                <label className="text-sm">Telefone com DDD<input name="phone" type="tel" autoComplete="shipping tel-national" maxLength={20} required className={field} /></label>
                <label className="text-sm sm:col-span-2">E-mail<input name="email" type="email" autoComplete="shipping email" maxLength={200} required className={field} /></label>
                <label className="text-sm sm:col-span-2">Rua / avenida<input name="street" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="shipping address-line1" maxLength={50} required className={field} /></label>
                <label className="text-sm">Número<input name="number" autoComplete="off" maxLength={10} required placeholder="Ex.: 123 ou S/N" className={field} /></label>
                <label className="text-sm">Complemento <span className="text-muted-foreground">(opcional)</span><input name="complement" autoComplete="shipping address-line2" maxLength={20} className={field} /></label>
                <label className="text-sm">Bairro<input name="district" value={district} onChange={(e) => setDistrict(e.target.value)} autoComplete="shipping address-level3" maxLength={50} required className={field} /></label>
                <label className="text-sm">Cidade<input name="city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="shipping address-level2" maxLength={50} required className={field} /></label>
                <label className="text-sm">Estado<select name="state" value={state} onChange={(e) => setState(e.target.value)} autoComplete="shipping address-level1" required className={field}><option value="" disabled>Selecione</option>{deliveryAddressSchema.shape.state.options.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></label>
                <label className="text-sm">CEP<input name="postalCode" value={shipping.cep} readOnly autoComplete="shipping postal-code" className={`${field} opacity-80`} /></label>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${addressBusy ? "animate-pulse text-muted-foreground" : "text-brand"}`} />
                <span>{addressMessage || "Consultando o endereço automaticamente pelo CEP escolhido no frete."}</span>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 text-sm">
                <input type="checkbox" name="confirmDelivery" required className="mt-1 accent-primary" />
                <span>Confirmo que os dados acima estão corretos e podem ser usados para a entrega do pedido.</span>
              </label>
            </div>

            {error && <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

            <Button type="submit" disabled={busy || addressBusy} className="h-14 w-full rounded-2xl text-sm font-bold md:hidden">
              <LockKeyhole className="h-4 w-4" /> {busy ? "ABRINDO MERCADO PAGO…" : "REALIZAR PAGAMENTO"}
            </Button>
          </form>
        </section>

        <aside className="md:sticky md:top-6 md:self-start">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand" /><h2 className="font-display text-lg font-bold">Resumo do pedido</h2></div>
            <div className="space-y-3">
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <img src={product.image} alt="" loading="lazy" decoding="async" className="h-14 w-14 rounded-xl bg-background object-cover object-top" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{qty}x · {formatBRL(product.price ?? 49.9)}</p></div>
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-border" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Produtos</span><span>{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Frete</span><span>{formatBRL(shipping.option.priceCents / 100)}</span></div>
              <div className="flex justify-between gap-4 text-muted-foreground"><span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {shipping.option.company} · {shipping.option.name}</span>{shipping.option.deliveryDays !== null && <span className="shrink-0">{shipping.option.deliveryDays} dias úteis</span>}</div>
              <div className="pt-2 flex items-center justify-between font-semibold"><span>Total</span><span className="font-display text-2xl font-bold">{formatBRL(total)}</span></div>
            </div>

            <Button type="submit" form="checkout-order-form" disabled className="hidden" />
            <Button type="button" disabled={busy || addressBusy} onClick={() => document.querySelector<HTMLFormElement>("form")?.requestSubmit()} className="mt-5 hidden h-14 w-full rounded-2xl text-sm font-bold md:flex">
              <LockKeyhole className="h-4 w-4" /> {busy ? "ABRINDO MERCADO PAGO…" : "REALIZAR PAGAMENTO"}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">O pagamento é concluído no ambiente seguro do Mercado Pago. O valor do frete é validado novamente antes da cobrança.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
