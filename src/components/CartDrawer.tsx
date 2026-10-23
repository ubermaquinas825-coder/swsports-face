import { AnimatePresence, motion } from "motion/react";
import { LockKeyhole, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatBRL, UNIT_PRICE } from "@/lib/products";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import { currentShipping, type ShippingSelection } from "@/lib/checkout";
import { useMemo, useState } from "react";

const CHECKOUT_SHIPPING_KEY = "swsports-checkout-shipping-v1";

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, closeCart, setQty, remove } = useCart();
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
  const checkoutLines = useMemo(
    () => lines.map((line) => ({ id: line.product.id, qty: line.qty })),
    [lines],
  );
  const shipping = currentShipping(selection, checkoutLines);

  const finish = () => {
    if (!shipping || !lines.length) return;
    try {
      window.sessionStorage.setItem(CHECKOUT_SHIPPING_KEY, JSON.stringify(shipping));
    } catch {
      // If storage is unavailable, the checkout page will ask the customer to return and retry.
    }
    closeCart();
    window.location.assign("/checkout");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-popover"
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de compras"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold tracking-tight">
                SEU CARRINHO
                {count > 0 && <span className="ml-2 text-sm text-brand">{count}x</span>}
              </h2>
              <button
                onClick={closeCart}
                aria-label="Fechar carrinho"
                className="grid h-11 w-11 place-items-center rounded-full border border-border transition-colors hover:text-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                <p className="font-display font-bold">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground">
                  Escolha uma personalidade na coleção para começar.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-2 min-h-11 rounded-full border border-border px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
                >
                  VER COLEÇÃO
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {lines.map(({ product, qty }) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <img
                        src={product.image}
                        alt={`Balaclava ${product.name}`}
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-xl bg-background object-cover object-top"
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBRL(UNIT_PRICE)} / un.
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setQty(product.id, qty - 1)}
                            aria-label={`Diminuir quantidade de ${product.name}`}
                            className="grid h-11 w-11 place-items-center rounded-full border border-border"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{qty}</span>
                          <button
                            onClick={() => setQty(product.id, qty + 1)}
                            aria-label={`Aumentar quantidade de ${product.name}`}
                            className="grid h-11 w-11 place-items-center rounded-full border border-border"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(product.id)}
                            aria-label={`Remover ${product.name}`}
                            className="ml-auto grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <ShippingCalculator
                    lines={checkoutLines}
                    selection={shipping}
                    onSelect={setSelection}
                  />
                </div>

                <div className="border-t border-border px-5 py-4">
                  <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Produtos</span>
                    <span>{formatBRL(subtotal)}</span>
                  </div>
                  <div className="my-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Entrega</span>
                    <span>
                      {shipping ? formatBRL(shipping.option.priceCents / 100) : "Escolha o frete"}
                    </span>
                  </div>
                  <div className="mb-3 flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-display text-xl font-bold">
                      {formatBRL(
                        subtotal + (shipping ? shipping.option.priceCents / 100 : 0),
                      )}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={finish}
                    disabled={!shipping}
                    className="min-h-12 w-full whitespace-normal rounded-xl py-3.5 text-sm font-bold"
                  >
                    FINALIZAR COMPRA
                  </Button>

                  <div className="mt-3 flex items-start justify-center gap-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                    <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    <span>
                      Pagamento seguro pelo Mercado Pago. O frete é validado novamente no servidor antes da cobrança.
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
