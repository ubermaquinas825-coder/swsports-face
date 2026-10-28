import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Instagram, Menu, PackageSearch, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { INSTAGRAM_URL } from "@/lib/products";
import { Button } from "@/components/ui/button";

const MELHOR_RASTREIO_URL = "https://melhorrastreio.com.br/";

const NAV = [
  { label: "Coleção", to: "/", hash: "#colecao" },
  { label: "Atacado", to: "/atacado", hash: "" },
  { label: "Dúvidas", to: "/", hash: "#faq" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();
  const navigate = useNavigate();

  const go = (to: "/" | "/atacado", hash: string) => {
    setMenuOpen(false);

    if (to !== "/") {
      navigate({ to });
      return;
    }

    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
        return;
      }
    }

    if (window.location.pathname === "/" && !hash) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }

    navigate({ to: "/", hash: hash.replace(/^#/, "") });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090909]/98 shadow-[0_8px_28px_rgba(0,0,0,0.24)] md:bg-[#090909]/95 md:backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent md:block" />

      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 md:h-[82px] md:gap-4 md:px-6">
        <Link
          to="/"
          className="group relative flex min-h-11 items-center rounded-xl px-0.5 md:rounded-2xl md:px-1 md:transition-transform md:duration-300 md:hover:scale-[1.02]"
        >
          <span className="pointer-events-none absolute inset-1 hidden rounded-2xl bg-brand/0 blur-xl transition-colors duration-300 group-hover:bg-brand/5 md:block" />
          <img
            src="/products/optimized/sw-sports-logo-192.webp"
            srcSet="/products/optimized/sw-sports-logo-192.webp 192w, /products/optimized/sw-sports-logo-384.webp 384w"
            sizes="(min-width: 768px) 144px, 112px"
            alt="SW Sports"
            width={453}
            height={255}
            className="relative h-12 w-28 object-contain md:h-16 md:w-36"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1.5 shadow-inner shadow-white/[0.02] md:flex"
          aria-label="Navegação principal"
        >
          {NAV.map((item) => (
            <Button
              variant="ghost"
              key={item.label}
              onClick={() => go(item.to, item.hash)}
              className="min-h-10 rounded-full px-5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              {item.label}
            </Button>
          ))}

          <a
            href={MELHOR_RASTREIO_URL}
            target="_blank"
            rel="noreferrer"
            className="ml-1 inline-flex min-h-10 items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.08] px-4 text-sm font-semibold text-white transition-all duration-200 hover:border-brand/60 hover:bg-brand/[0.13]"
          >
            <PackageSearch className="h-4 w-4 text-brand" />
            Rastrear pedido
          </a>
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da SW Sports"
            className="hidden h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/65 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white sm:grid"
          >
            <Instagram className="h-[17px] w-[17px]" />
          </a>

          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            aria-label="Abrir carrinho"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/80 transition-colors duration-200 hover:border-brand/40 hover:bg-brand/[0.08] hover:text-brand"
          >
            <ShoppingBag className="h-[17px] w-[17px]" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#090909] bg-brand px-1 text-[10px] font-extrabold text-black">
                {count}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/80 transition-colors hover:bg-white/[0.07] md:hidden"
          >
            {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-white/10 bg-[#0b0b0b] px-3 pb-4 pt-3 shadow-2xl md:hidden"
          aria-label="Navegação mobile"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
            {NAV.map((item) => (
              <Button
                variant="ghost"
                key={item.label}
                onClick={() => go(item.to, item.hash)}
                className="min-h-12 justify-start rounded-xl px-4 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </Button>
            ))}
            <a
              href={MELHOR_RASTREIO_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-flex min-h-12 items-center gap-2 rounded-xl border border-brand/25 bg-brand/[0.08] px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/[0.13]"
            >
              <PackageSearch className="h-4 w-4 text-brand" />
              Rastrear pedido
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
