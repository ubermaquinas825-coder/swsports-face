# SuperFrete / Appmax — preparation

## Available
- Admin-only Cloud configuration, package editor, sender address, carriers, orders/events read paths.
- Live SuperFrete quotation in cart through the linked gateway, service selection and subtotal/freight/total display. Changed cart/CEP invalidates the selection. Server re-quotes before payment creation and rejects changed price/unavailable service.
- Default single-unit package: 0.150 kg, 20 × 15 × 10 cm; origin 38408-562.
- Catalog-based total validator and label eligibility helpers (not yet a payment workflow).
- Separate role table; no automatic first-user promotion. Owner must identify the admin account after signing in.

## Provider authorization blockers
- SuperFrete advertises own-site API: https://ajuda.superfrete.com/artigo/quais-as-integracoes-disponiveis-da-superfrete-com-plataformas-de-e-commerce/
- SuperFrete reference: https://superfrete.readme.io/reference/primeiros-passos. Production base https://api.superfrete.com, Bearer authentication, read-only account endpoint GET /api/v0/user. The private custom connector is linked and its generated-app credential path returned HTTP 200. Use the connector gateway; never store the provider token in source or expose account response data.
- Appmax official authorization: https://docs.appmax.com.br/guides/autenticacao and https://docs.appmax.com.br/guides/instalacao. Installed merchant credentials were collected securely as APPMAX_CLIENT_ID, APPMAX_CLIENT_SECRET and APPMAX_EXTERNAL_ID. POST https://auth.appmax.com.br/oauth2/token with form-encoded client_credentials returned HTTP 200 with an access token; the token was not printed or persisted. This grant is not supported by the available custom-connector authorization-code setup, so use server-only credential exchange. External ID does not authenticate merchant requests.
- Appmax payment-link reference: https://docs.appmax.com.br/api-reference/payment-links/criar-link-pagamento. POST https://api.appmax.com.br/v1/payment-link returns data.checkout_url. Uses value in cents, flat payments array per embedded schema, physical product type, quantity editing disabled, no installment surcharge. Live hosted link creation verified with R$49.90 product + R$18.45 PAC = R$68.35 displayed on Appmax, without entering customer data or paying.
- Payment-link API supports an aggregate charge, not structured item/shipping fields: items, selected service and quoted CEP go in description; hosted UI displays the aggregate as one item. Appmax collects customer/address itself; this contract does not lock its entered address to the quoted CEP or implement payment/order reconciliation. Those require a separate verified provider contract before automatic fulfillment.
- Multi-unit packaging: 100 g per unit; 26x36 envelope (2-3 un.), 32x40 envelope (4-10 un.); above 10 blocked.

## Not implemented or live-tested
- Signed payment webhook, verified labels, label payment, official PDF provenance and tracking synchronization remain unimplemented.
- Atomic event deduplication/reprocessing, failed label emission and real approved/pending payment flows require those adapters. Unique external identifiers are present in storage but not a completed webhook implementation.
- Retail checkout is Appmax only; no WhatsApp finalization fallback. Multi-unit shipping remains blocked until actual weights and supported packaging are supplied.
- Administrative persistence must be tested with an owner-approved account. Public login verification does not establish admin access.

## Tests
- 18 tests pass, including catalog-price totals, freight invalidation and invalid cart rejection. Browser verified live SuperFrete prices, selected total, hosted Appmax amount, and blocking unconfigured multi-unit packages. Payment and complete event/reprocessing tests remain pending their contracts.