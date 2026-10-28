import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Clock3,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
} from "lucide-react";
import { INSTAGRAM_URL, WHATSAPP_NUMBER, waLink } from "@/lib/products";
import { business } from "@/lib/business";
import { Button } from "@/components/ui/button";

const MELHOR_RASTREIO_URL = "https://melhorrastreio.com.br/";

const policyLinks = [
  ["Política de Privacidade", "/privacidade#privacidade"],
  ["Política de Cookies", "/privacidade#cookies"],
  ["Trocas, Devoluções e Reembolsos", "/privacidade#trocas"],
  ["Política de Entrega", "/privacidade#entrega"],
  ["Termos de Uso", "/privacidade#termos"],
] as const;

const sectionTitle =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0d0d0d]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-10 xl:grid-cols-[1.15fr_1.1fr_.8fr_1.15fr] xl:gap-x-12">
          <section className="pb-8 sm:pb-0">
            <Link to="/" className="inline-flex" aria-label="SW Sports — início">
              <img
                src="/products/optimized/sw-sports-logo-192.webp"
                srcSet="/products/optimized/sw-sports-logo-192.webp 192w, /products/optimized/sw-sports-logo-384.webp 384w"
                sizes="(min-width: 640px) 176px, 148px"
                alt="SW Sports"
                width={384}
                height={216}
                loading="lazy"
                decoding="async"
                className="h-auto w-36 object-contain sm:w-44"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
              Balaclavas com personalidade, estilo e proteção para o dia a dia.
            </p>

            <div className="mt-5 space-y-2 text-sm text-white/45">
              <p>Pagamento seguro via Mercado Pago</p>
              <p>Frete calculado pelo Melhor Envio</p>
            </div>
          </section>

          <section className="border-t border-white/10 py-7 sm:border-t-0 sm:py-0">
            <h2 className={`${sectionTitle} flex items-center gap-2.5`}>
              <MapPin className="h-4 w-4 text-brand" />
              Nossa loja
            </h2>

            <div className="mt-5 space-y-3 text-sm leading-6 text-white/55">
              <p className="font-semibold text-white">{business.name}</p>
              <p className="text-xs leading-5 text-white/42">
                {business.legalName}
                <br />
                CNPJ {business.cnpj}
              </p>
              <address className="not-italic">
                {business.address}
                <br />
                {business.city}
                <br />
                CEP {business.postalCode}
              </address>
            </div>

            <a
              href={business.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand transition-colors hover:text-white"
            >
              Ver no Google Maps
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </section>

          <section className="border-t border-white/10 py-7 sm:border-t-0 sm:py-0">
            <h2 className={`${sectionTitle} flex items-center gap-2.5`}>
              <Clock3 className="h-4 w-4 text-brand" />
              Horários
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              {business.hours.map(({ days, time }) => (
                <div key={days}>
                  <dt className="text-white/45">{days}</dt>
                  <dd className="mt-1 font-semibold text-white">{time}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t border-white/10 pt-7 sm:border-t-0 sm:pt-0">
            <h2 className={sectionTitle}>Atendimento</h2>

            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-white/58 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0 text-brand" />
                <span>{business.phone}</span>
              </a>

              <a
                href={`mailto:${business.email}`}
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-white/58 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-brand" />
                <span className="break-all">{business.email}</span>
              </a>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-white/58 transition-colors hover:text-white"
              >
                <Instagram className="h-4 w-4 shrink-0 text-brand" />
                <span>@swsport.s</span>
              </a>

              <a
                href={waLink("Olá, equipe SW Sports! Gostaria de ajuda com uma compra.")}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-whatsapp transition-colors hover:text-whatsapp/80"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>Falar no WhatsApp</span>
              </a>

              <a
                href={MELHOR_RASTREIO_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-white/58 transition-colors hover:text-white"
              >
                <PackageSearch className="h-4 w-4 shrink-0 text-brand" />
                <span>Rastrear pedido</span>
              </a>
            </div>

            <div className="mt-7">
              <h2 className={sectionTitle}>Políticas</h2>
              <nav className="mt-3 grid gap-1" aria-label="Políticas da loja">
                {policyLinks.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center py-1 text-sm leading-5 text-white/48 transition-colors hover:text-white"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </section>
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/38 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>© {new Date().getFullYear()} SW Sports. Todos os direitos reservados.</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto justify-start p-0 text-xs text-white/38 hover:text-white sm:text-sm"
            onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}
          >
            Configurações de cookies
          </Button>
        </div>
      </div>
    </footer>
  );
}
