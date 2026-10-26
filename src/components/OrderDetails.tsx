import type { ReactNode } from "react";
import {
  Package,
  UserRound,
  MapPin,
  CreditCard,
  Truck,
  ReceiptText,
  X,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SuperfreteOrderAction } from "@/components/SuperfreteOrderAction";
import { productFor } from "@/lib/products";
import { dateTime, money, orderTotal, paymentLabels, record, text } from "@/lib/sales";
import { shippingStates } from "@/lib/shipping";
import type { getSalesAdmin } from "@/lib/sales.functions";

type Order = Awaited<ReturnType<typeof getSalesAdmin>>["orders"][number];
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 className="mb-5 flex items-center gap-2.5 text-base font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "min-w-0 sm:col-span-2" : "min-w-0"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium leading-6 [overflow-wrap:anywhere]">
        {value || "Não registrado"}
      </dd>
    </div>
  );
}
export function OrderDetails({ order, onClose }: { order: Order; onClose: () => void }) {
  const address = record(order.delivery_address);
  const service = record(order.shipping_service);
  const paid = order.payment_status === "approved";
  const delivery =
    paid && order.shipping_status === "awaiting_payment"
      ? "Aguardando preparo do envio"
      : (shippingStates[order.shipping_status] ?? order.shipping_status);
  const icon = "h-4 w-4 shrink-0 text-muted-foreground";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-border bg-background p-0 sm:max-w-6xl [&>button]:hidden">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
              SW Sports · Vendas
            </p>
            <DialogTitle className="text-xl font-bold sm:text-2xl">Detalhes do pedido</DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              Pedido #{order.id.slice(0, 8)} · {dateTime(order.created_at)}
            </DialogDescription>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${paid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
              >
                {paymentLabels[order.payment_status] ?? order.payment_status}
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {delivery}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="shrink-0 gap-2"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            <span className="hidden sm:inline">Fechar</span>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              <Section title="Produtos comprados" icon={<Package className={icon} />}>
                {Array.isArray(order.items) && order.items.length ? (
                  <div className="divide-y divide-border">
                    {order.items.map((item, index) => {
                      const line = record(item);
                      const catalog = productFor(text(line["id"]));
                      const qty = typeof line["qty"] === "number" ? line["qty"] : null;
                      const unit =
                        typeof line["unit_price_cents"] === "number"
                          ? line["unit_price_cents"]
                          : null;
                      return (
                        <article
                          key={index}
                          className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                        >
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-background sm:h-18 sm:w-18">
                            {catalog ? (
                              <img
                                src={catalog.image}
                                alt={catalog.name}
                                className="h-full w-full rounded-lg object-contain p-1"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold leading-6">
                              {text(line["name"]) || catalog?.name || "Produto sem nome"}
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              Código: {text(line["id"]) || "Não registrado"}
                            </p>
                            <p className="mt-2 text-sm">
                              Quantidade: <strong>{qty ?? "Não registrada"}</strong>
                            </p>
                          </div>
                          <div className="col-start-2 text-sm sm:col-start-auto sm:text-right">
                            <p className="text-muted-foreground">
                              {unit !== null ? `${money(unit)} / un.` : "Preço não registrado"}
                            </p>
                            {qty !== null && unit !== null && (
                              <p className="mt-1 font-semibold">Subtotal: {money(qty * unit)}</p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Itens não registrados.</p>
                )}
              </Section>
              <Section title="Comprador e contato" icon={<UserRound className={icon} />}>
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Field label="Nome" value={text(address["name"])} />
                  <Field label="CPF / CNPJ" value={text(address["document"])} />
                  <Field label="E-mail" value={text(address["email"])} wide />
                  <Field label="Telefone com DDD" value={text(address["phone"])} />
                </dl>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                  {/^[1-9]\d{9,10}$/.test(text(address["phone"])) && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://wa.me/55${text(address["phone"])}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Conversar no WhatsApp
                      </a>
                    </Button>
                  )}
                  {text(address["email"]) && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${text(address["email"])}`}>
                        <Mail className="h-4 w-4" />
                        Enviar e-mail
                      </a>
                    </Button>
                  )}
                </div>
              </Section>
              <Section title="Pagamento" icon={<CreditCard className={icon} />}>
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <Field
                    label="Situação"
                    value={paymentLabels[order.payment_status] ?? order.payment_status}
                  />
                  <Field
                    label="Provedor"
                    value={
                      order.payment_link_id?.startsWith("mp:")
                        ? "Mercado Pago"
                        : order.payment_link_id
                          ? "Appmax"
                          : ""
                    }
                  />
                  <Field
                    label="Identificador do pagamento"
                    value={order.provider_payment_id ?? ""}
                    wide
                  />
                </dl>
                <details className="mt-5 border-t border-border pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Informações adicionais do pagamento
                  </summary>
                  <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="Pedido criado em" value={dateTime(order.created_at)} />
                    <Field label="Forma de pagamento" value="Não registrada no histórico atual" />
                    <Field label="Pago em" value="Data exata não registrada no histórico atual" />
                    <Field
                      label="Última confirmação financeira"
                      value={dateTime(order.appmax_payment_verified_at)}
                    />
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Horários de Brasília. A confirmação financeira indica quando o sistema verificou
                    o pagamento; não é o horário em que o cliente pagou.
                  </p>
                </details>
              </Section>
            </div>
            <aside className="min-w-0 space-y-5" aria-label="Resumo e entrega">
              <Section title="Resumo financeiro" icon={<ReceiptText className={icon} />}>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Produtos</dt>
                    <dd className="tabular-nums">{money(order.subtotal_cents)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Descontos</dt>
                    <dd className="tabular-nums">− {money(order.discount_cents)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Frete</dt>
                    <dd className="tabular-nums">
                      {order.freight_cents === null ? "Não registrado" : money(order.freight_cents)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                    <dt className="font-semibold">Total do pedido</dt>
                    <dd className="text-2xl font-bold tracking-tight tabular-nums">
                      {money(orderTotal(order))}
                    </dd>
                  </div>
                </dl>
              </Section>
              <Section title="Endereço de entrega" icon={<MapPin className={icon} />}>
                {order.delivery_address ? (
                  <address className="space-y-2 text-sm leading-6 not-italic [overflow-wrap:anywhere]">
                    <p className="font-semibold">{text(address["name"])}</p>
                    <p>
                      {text(address["street"])}, {text(address["number"])}
                    </p>
                    {text(address["complement"]) && <p>{text(address["complement"])}</p>}
                    <p>{text(address["district"])}</p>
                    <p>
                      {text(address["city"])} / {text(address["state"])} · CEP{" "}
                      {text(address["postalCode"])}
                    </p>
                  </address>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Endereço não registrado neste pedido.
                  </p>
                )}
              </Section>
              <Section title="Envio" icon={<Truck className={icon} />}>
                <dl className="space-y-4">
                  <Field label="Situação da entrega" value={delivery} />
                  <Field
                    label="Transportadora / serviço"
                    value={[text(service["company"]), text(service["name"])]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <Field label="Código de rastreamento" value={order.tracking_code ?? ""} />
                </dl>
              </Section>
              <SuperfreteOrderAction key={order.id} order={order} />
            </aside>
          </div>
          <footer className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="mr-2">Identificador completo do pedido:</span>
            <span className="font-mono [overflow-wrap:anywhere]">{order.id}</span>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
