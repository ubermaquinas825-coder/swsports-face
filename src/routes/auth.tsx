import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import logo from "@/assets/sw-sports-logo.jpg.asset.json";
import "@lovable.dev/cloud-auth-js/styles.css";
export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acesso administrativo | SW Sports" }, { name: "description", content: "Acesso seguro ao painel de frete e envios SW Sports." }, { property: "og:title", content: "Acesso SW Sports" }, { property: "og:description", content: "Painel administrativo de frete e envios." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Auth,
});
function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/frete-envios" }); }); }, [navigate]);
  const social = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) setMessage("Não foi possível entrar. Tente novamente.");
    else if (!result.redirected) navigate({ to: "/frete-envios" });
  };
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-6 py-12">
    <Link to="/"><img src={logo.url} alt="SW Sports Uniformes" className="h-24 w-44 object-contain" /></Link>
    <h1 className="font-display text-3xl font-bold">ACESSO ADMINISTRATIVO</h1>
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setBusy(false); if (error) setMessage("E-mail ou senha inválidos. Verifique também a confirmação do e-mail."); else navigate({ to: "/frete-envios" }); }}>
      <label className="block text-sm">E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-card px-3 py-3" /></label>
      <label className="block text-sm">Senha<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-card px-3 py-3" /></label>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Entrando…" : "Entrar"}</Button>
    </form>
    <Button variant="outline" onClick={() => social("google")}>Entrar com Google</Button>
    <Button className="lovable-auth-button" onClick={() => social("lovable")}>Sign in with Lovable</Button>
    <Button variant="link" onClick={async () => { if (!email) { setMessage("Informe seu e-mail para recuperar a senha."); return; } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` }); setMessage(error ? "Não foi possível enviar o e-mail." : "Confira seu e-mail para redefinir a senha."); }}>Esqueci minha senha</Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <Link to="/" className="text-sm text-muted-foreground">Voltar à loja</Link>
  </main>;
}