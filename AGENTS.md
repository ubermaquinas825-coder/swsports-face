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

- Product photos are CDN assets: cut transparent from the user's original photos via `/mnt/user-uploads/` + Lovable Assets pointers (`src/assets/*.png.asset.json`). Never replace them with AI-generated images; keep the original stamp colors.
- Hero uses a 2.5D presentation (CSS perspective tilt + idle float) in `src/components/Hero.tsx`, kept as a standalone component so it can be swapped for a real GLB/GLTF model later. Do not fake a 3D model from the 2D photos.
- Storefront motion uses Motion with reduced-motion fallbacks; the global WhatsApp contact link sits below the cart overlay so it cannot interfere with payment.
- Cart state lives in `src/hooks/use-cart.tsx`, with one provider and drawer in the root layout so it remains available across storefront routes; product data and WhatsApp helpers in `src/lib/products.ts` are the single source of truth for prices and links.
- Retail checkout uses a public validated server function that re-quotes the chosen SuperFrete service and creates an Appmax hosted payment link for the catalog subtotal plus freight; redirect in the same tab without clearing the cart or marking payment complete. WhatsApp is contact/wholesale only.
- Kit offers are rendered disabled ("EM APROVAÇÃO") until the owner approves the commercial values.
- Public business identity, address and hours live in `src/lib/business.ts`; sales links remain in `src/lib/products.ts` so listing metadata cannot override checkout contacts.
- Logistics rules and configuration schemas live in `src/lib/shipping.ts`; admin configuration functions verify protected `user_roles`. Public quotation reads only operational settings server-side, never exposes private settings, and blocks quantities lacking confirmed packaging. Provider adapters live in `checkout.server.ts`, with client-safe RPC wrappers; quotes and checkout never create labels.
- SuperFrete runtime calls must use its linked custom connector gateway; Appmax merchant credentials stay in Cloud secrets for server-only client-credentials exchange because the available custom-connector OAuth setup does not support that grant. Admin diagnostics reuse these adapters without creating links/orders; never persist short-lived access tokens, expose credentials, or log token-endpoint bodies. Ambiguous link failures stay pending and are flagged for reconciliation, never retried automatically.
- Bling uses the owner's explicitly requested site-hosted Authorization Code flow via TanStack public server routes; admin RPC issues a single-use ticket, start binds an HttpOnly browser cookie, callback atomically consumes hashed state and rechecks roles. Tokens use AES-GCM with a Cloud secret, service-role-only storage and a durable refresh lock; status RPC never returns credentials. OAuth redirects use the published storefront origin and must not be enabled before deployment of its callback is verified.
- Bling product verification is an admin-only, read-only API request through the shared token helper, returning an allowlisted product projection without persisting or creating ERP records; refresh occurs on demand before API calls to avoid unnecessary background work.
- Bling inventory settings require owner-confirmed catalog/SKU mappings verified against existing active ERP products and a selected warehouse; discovery matches unique returned product names, never SKU sequence, and stock is validated before saving. Optional checkout checks read warehouse virtual balances without writing stock. Checkout persists pending orders and payment-link IDs. When /depositos lacks scope, depots are derived from stock-balance responses.
- Appmax payment reconciliation uses authenticated payment-link membership and current order GETs under a per-order database lease; only approved/integrated exact-amount payments with paid timestamps qualify financially. Refunds, ambiguity and multiple paid orders hold fulfillment; unsigned webhooks never establish payment or address truth. Approved payments are queued and exported once as Bling sales orders (numeroLoja = store order id, queued->processing conditional lock, existing-order lookup before POST) by a 5-minute cron route; failures go to reconciliation_required, never auto-retried. Contacts are matched by CPF/CNPJ before creation; address stays in Appmax (no authoritative snapshot).
