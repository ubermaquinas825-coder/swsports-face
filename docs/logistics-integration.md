# SuperFrete / Appmax — preparation

## Available
- Admin-only Cloud configuration, package editor, sender address, carriers, orders/events read paths.
- Destination CEP validation in cart. No upstream requests, shipping prices or deadlines until authorized adapter exists.
- Default single-unit package: 0.150 kg, 20 × 15 × 10 cm; origin 38408-562.
- Catalog-based total validator and label eligibility helpers (not yet a payment workflow).
- Separate role table; no automatic first-user promotion. Owner must identify the admin account after signing in.

## Provider authorization blockers
- SuperFrete advertises own-site API: https://ajuda.superfrete.com/artigo/quais-as-integracoes-disponiveis-da-superfrete-com-plataformas-de-e-commerce/
- SuperFrete reference: https://superfrete.readme.io/reference/primeiros-passos. Production base https://api.superfrete.com, Bearer authentication, read-only account endpoint GET /api/v0/user. The private custom connector is linked and its generated-app credential path returned HTTP 200. Use the connector gateway; never store the provider token in source or expose account response data.
- Appmax official authorization: https://docs.appmax.com.br/guides/autenticacao and https://docs.appmax.com.br/guides/instalacao. Installed merchant credentials were collected securely as APPMAX_CLIENT_ID, APPMAX_CLIENT_SECRET and APPMAX_EXTERNAL_ID. POST https://auth.appmax.com.br/oauth2/token with form-encoded client_credentials returned HTTP 200 with an access token; the token was not printed or persisted. This grant is not supported by the available custom-connector authorization-code setup, so use server-only credential exchange. External ID does not authenticate merchant requests.
- Appmax payment-link reference: https://docs.appmax.com.br/api-reference/payment-links/criar-link-pagamento. Documented POST /v1/payment-link returns checkout_url; its complete production contract still needs validation before implementation. Authentication success does not establish checkout permission, payment success, or webhook security.
- Need real product weight, packaging tare and supported package capacities before multi-unit quotations.

## Not implemented or live-tested
- Provider quote adapter, payment creation, signed payment webhook, verified labels, label payment, official PDF provenance and tracking synchronization.
- Atomic event deduplication/reprocessing, failed label emission and real approved/pending payment flows require those adapters. Unique external identifiers are present in storage but not a completed webhook implementation.
- Checkout remains WhatsApp; automatic checkout and shipping selection are intentionally not offered yet.
- Administrative persistence must be tested with an owner-approved account. Public login verification does not establish admin access.

## Tests
- Unit tests cover CEP, unavailable quotations, one/multiple packages, total calculation, payment authorization guard and existing shipment guard.
- Live provider and complete event/reprocessing tests are pending credentials and official contracts.