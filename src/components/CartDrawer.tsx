import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { buildOrderMessage, formatBRL, UNIT_PRICE, waLink } from "@/lib/products";

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, closeCart, setQty, remove } = useCart();

  const finish = () => {
    if (lines.length === 0) return;
    window.open(waLink(buildOrderMessage(lines)), "_blank", "noopener");
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-popover"
            role="dialog"
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
                className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:text-brand"
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
                  className="mt-2 rounded-full border border-border px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-brand hover:text-brand"
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
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <img
                        src={product.image}
                        alt={`Balaclava ${product.name}`}
                        className="h-16 w-16 shrink-0 rounded-xl bg-background object-cover object-top"
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBRL(UNIT_PRICE)} / un.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQty(product.id, qty - 1)}
                            aria-label={`Diminuir quantidade de ${product.name}`}
                            className="grid h-7 w-7 place-items-center rounded-full border border-border"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{qty}</span>
                          <button
                            onClick={() => setQty(product.id, qty + 1)}
                            aria-label={`Aumentar quantidade de ${product.name}`}
                            className="grid h-7 w-7 place-items-center rounded-full border border-border"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => remove(product.id)}
                            aria-label={`Remover ${product.name}`}
                            className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-brand"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="border-t border-border px-5 py-4">
                  <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total dos produtos</span>
                    <span className="font-display text-xl font-bold text-white">
                      {formatBRL(subtotal)}
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Frete confirmado com a equipe no WhatsApp.
                  </p>
                  <button
                    onClick={finish}
                    className="w-full rounded-full bg-brand py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_32px_-8px_rgba(227,38,54,0.7)] transition-transform hover:scale-[1.01]"
                  >
                    FINALIZAR PELO WHATSAPP
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
