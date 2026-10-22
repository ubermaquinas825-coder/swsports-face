import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
import { INSTAGRAM_URL, waLink } from "@/lib/products";
import logoAsset from "@/assets/sw-sports-logo.jpg.asset.json";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-black/60 py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoAsset.url} alt="SW Sports Uniformes" width={453} height={255} className="h-24 w-44 object-contain" />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Balaclavas divertidas com estampas realistas. Uma nova personalidade por{" "}
            R$ 49,90.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <Instagram className="h-4 w-4 text-brand" /> @swsport.s
          </a>
          <a
            href={waLink(
              "Olá, equipe SW Sports!\n\nGostaria de mais informações sobre as balaclavas.",
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <MessageCircle className="h-4 w-4 text-brand" /> WhatsApp comercial
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border px-4 pt-6 text-xs text-muted-foreground md:px-6">
        © {new Date().getFullYear()} SW Sports. Todos os direitos reservados.
      </div>
    </footer>
  );
}
