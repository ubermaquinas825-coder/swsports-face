import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CONSENT_KEY, NOTICE_TEXT, readConsent, requiresConsent, saveChoice, trackStorefrontPage } from "@/lib/advertising";

export function AdvertisingConsent() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [region, setRegion] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const optOut = () => (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === "1";
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    void fetch("/cdn-cgi/trace", { signal: controller.signal, credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return null;
      const text = await response.text();
      return text.match(/^loc=([A-Z]{2})$/m)?.[1] ?? null;
    }).catch(() => null).then((country) => {
      if (!active) return;
      setRegion(country); setReady(true);
      setOpen(requiresConsent(country) && !readConsent() && !optOut());
    }).finally(() => clearTimeout(timeout));
    const changed = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) setRevision((value) => value + 1); };
    const settings = () => setOpen(true);
    window.addEventListener("storage", changed); window.addEventListener("sw-cookie-settings", settings);
    return () => { active = false; controller.abort(); clearTimeout(timeout); window.removeEventListener("storage", changed); window.removeEventListener("sw-cookie-settings", settings); };
  }, []);
  useEffect(() => { if (ready) trackStorefrontPage(region, path, optOut()); }, [ready, region, path, revision]);
  function choose(accepted: boolean) {
    try { saveChoice(accepted, region); } catch { return; }
    trackStorefrontPage(region, path, optOut());
    setRevision((value) => value + 1); setOpen(false);
  }
  if (!open) return null;
  return <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-popover px-5 py-5 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1"><h2 id="cookie-title" className="font-display text-lg font-bold">Sua privacidade</h2><p className="mt-2 text-sm text-muted-foreground">{NOTICE_TEXT}</p><Link to="/privacidade" className="mt-2 inline-block text-sm text-brand underline">Política de privacidade</Link></div>
      <div className="flex shrink-0 gap-3"><Button variant="outline" onClick={() => choose(false)}>Recusar</Button><Button variant="outline" onClick={() => choose(true)}>Aceitar</Button></div>
    </div>
  </section>;
}