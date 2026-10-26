const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_PUBLIC_SITE_URL",
  "CRON_SECRET",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MELHOR_ENVIO_CLIENT_ID",
  "MELHOR_ENVIO_CLIENT_SECRET",
  "MELHOR_ENVIO_REDIRECT_URI",
  "MELHOR_ENVIO_ENVIRONMENT",
  "MELHOR_ENVIO_OAUTH_STATE",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Configure these Vercel variables securely before building: ${missing.join(", ")}`);

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
if (process.env.CRON_SECRET.length < 32)
  throw new Error("Generate a CRON_SECRET with at least 32 characters");

if (process.env.MELHOR_ENVIO_ENVIRONMENT !== "production")
  throw new Error("MELHOR_ENVIO_ENVIRONMENT must be production for the production store");
const redirect = new URL(process.env.MELHOR_ENVIO_REDIRECT_URI);
if (
  redirect.protocol !== "https:" ||
  redirect.origin !== site.origin ||
  redirect.pathname !== "/api/melhor-envio/callback" ||
  redirect.search ||
  redirect.hash ||
  redirect.username ||
  redirect.password
) throw new Error("MELHOR_ENVIO_REDIRECT_URI must be the production callback on the public store origin");

console.log("Vercel configuration checks passed. No credentials were printed.");
