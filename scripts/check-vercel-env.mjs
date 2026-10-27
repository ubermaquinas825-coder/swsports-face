const sharedRequired = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_PUBLIC_SITE_URL",
  "VITE_STANDALONE_AUTH",
];

const productionOnly = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MELHOR_ENVIO_CLIENT_ID",
  "MELHOR_ENVIO_CLIENT_SECRET",
  "MELHOR_ENVIO_REDIRECT_URI",
  "MELHOR_ENVIO_ENVIRONMENT",
  "MELHOR_ENVIO_OAUTH_STATE",
];

const deprecatedSuperfrete = ["SUPERFRETE_API_TOKEN", "SUPERFRETE_CONTACT_EMAIL"];
const isPreview = process.env.VERCEL_ENV === "preview";
const required = isPreview ? sharedRequired : [...sharedRequired, ...productionOnly];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Configure these Vercel variables securely before building: ${missing.join(", ")}`);

if (isPreview) {
  const leaked = productionOnly.filter((name) => process.env[name]);
  if (leaked.length)
    throw new Error(`Preview must not receive production-only credentials: ${leaked.join(", ")}`);
}

const legacySuperfrete = deprecatedSuperfrete.filter((name) => process.env[name]);
if (legacySuperfrete.length)
  throw new Error(`Remove deprecated SuperFrete runtime variables: ${legacySuperfrete.join(", ")}`);

const publicDb = new URL(process.env.VITE_SUPABASE_URL);
const serverDb = new URL(process.env.SUPABASE_URL);
if (
  publicDb.origin !== serverDb.origin ||
  publicDb.protocol !== "https:" ||
  publicDb.username ||
  publicDb.password ||
  publicDb.pathname !== "/" ||
  serverDb.pathname !== "/" ||
  publicDb.search ||
  serverDb.search
) throw new Error("Public and server Supabase URLs must identify the same HTTPS project");
if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY !== process.env.SUPABASE_PUBLISHABLE_KEY)
  throw new Error("Public Supabase key differs between browser and server");

const site = new URL(process.env.VITE_PUBLIC_SITE_URL);
if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash)
  throw new Error("VITE_PUBLIC_SITE_URL must be the public HTTPS origin without a path");
if (process.env.VITE_STANDALONE_AUTH !== "true")
  throw new Error("Set VITE_STANDALONE_AUTH=true for Vercel + Supabase authentication");

if (!isPreview) {
  if (process.env.CRON_SECRET.length < 32)
    throw new Error("Generate a CRON_SECRET with at least 32 characters");

  if (process.env.MELHOR_ENVIO_ENVIRONMENT !== "production")
    throw new Error("MELHOR_ENVIO_ENVIRONMENT must be production for the production store");
  const redirect = new URL(process.env.MELHOR_ENVIO_REDIRECT_URI);
  const canonicalHost = (hostname) => hostname.toLowerCase().replace(/^www\./, "");
  if (
    redirect.protocol !== "https:" ||
    canonicalHost(redirect.hostname) !== canonicalHost(site.hostname) ||
    redirect.pathname !== "/api/melhor-envio/callback" ||
    redirect.search ||
    redirect.hash ||
    redirect.username ||
    redirect.password
  ) throw new Error("MELHOR_ENVIO_REDIRECT_URI must be the production callback on the public store domain");
}

console.log(`Vercel ${isPreview ? "preview" : "production"} configuration checks passed. No credentials were printed.`);
