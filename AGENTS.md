<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — SW Sports

Technical decisions for this project:

- Advertising base tags are centralized in a browser-only effect with regional advertising consent, versioned visitor choice history and cross-tab withdrawal; only public storefront paths are measured, never admin/auth or checkout personal data. No matching, purchase reporting or Google conversion labels are inferred from base tag IDs.

- Product photos are CDN assets: cut transparent from the user's original photos via `/mnt/user-uploads/` + Lovable Assets pointers (`src/assets/*.png.asset.json`). Never replace them with AI-generated images; keep the original stamp colors.
- Hero uses a 2.5D presentation (CSS perspective tilt + idle float) in `src/components/Hero.tsx`, kept as a standalone component so it can be swapped for a real GLB/GLTF model later. Do not fake a 3D model from the 2D photos.
- Storefront motion uses Motion with reduced-motion fallbacks; the global WhatsApp contact link sits below the cart overlay so it cannot interfere with payment.
- Cart state lives in `src/hooks/use-cart.tsx`, with one provider and drawer in the root layout so it remains available across storefront routes; product data and WhatsApp helpers in `src/lib/products.ts` are the single source of truth for prices and links.
- Retail checkout uses a public validated server function that re-quotes the chosen SuperFrete service and creates an Appmax hosted payment link for the catalog subtotal plus freight; redirect in the same tab without clearing the cart or marking payment complete. WhatsApp is contact/wholesale only.
- Kit offers are rendered disabled ("EM APROVAÇÃO") until the owner approves the commercial values.
- Public business identity, address and hours live in `src/lib/business.ts`; sales links remain in `src/lib/products.ts` so listing metadata cannot override checkout contacts.
- Logistics rules and configuration schemas live in `src/lib/shipping.ts`; admin configuration functions verify protected `user_roles`. Public quotation reads only operational settings server-side, never exposes private settings, and blocks quantities lacking confirmed packaging. Provider adapters live in `checkout.server.ts`, with client-safe RPC wrappers; quotes and checkout never create labels.
- SuperFrete runtime calls use the linked custom connector gateway on Lovable; standalone Vercel deployments use the official api.superfrete.com API with a server-only SUPERFRETE_API_TOKEN and contact email; Appmax merchant credentials stay in Cloud secrets for server-only client-credentials exchange because the available custom-connector OAuth setup does not support that grant. Admin diagnostics reuse these adapters without creating links/orders; never persist short-lived access tokens, expose credentials, or log token-endpoint bodies. Ambiguous link failures stay pending and are flagged for reconciliation, never retried automatically.


- Vercel + Supabase migration: keep the existing Lovable deployment intact while validating the new project. Use docs/vercel-supabase.md, preserve original exported public images, keep financial maintenance enabled during cutover, and never apply all migrations blindly to the owner-prepared Supabase database. Vercel builds do not migrate data or publish DNS.

- Orders are managed in /admin. The ERP integration was retired at the owner's request: do not restore OAuth routes, stock checks, exports, automatic label purchases or ERP UI. Preserve historical database migrations/columns and financial evidence; legacy column names are compatibility details only.
- Scheduled jobs reconcile payments only (Mercado Pago and legacy Appmax). Shipping is manually prepared by an admin, with fresh provider payment verification, validated address/items/volume, a durable one-attempt reservation and no checkout/wallet-debit API call. Existing financial/refund/ambiguous holds remain active; only the exact historical pre-API missing-mappings error may permit independent verified manual shipping, without clearing historical status.
