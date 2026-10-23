const configuredOrigin = import.meta.env["VITE_PUBLIC_SITE_URL"] || "https://swsports-face.lovable.app";
const url = new URL(configuredOrigin);
if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
  throw new Error("VITE_PUBLIC_SITE_URL deve ser a origem HTTPS pública da loja, sem caminho ou credenciais.");
}
export const SITE_ORIGIN = url.origin;
