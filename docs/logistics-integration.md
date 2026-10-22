# SuperFrete / Appmax — preparation

## Available
- Admin-only Cloud configuration, package editor, sender address, carriers, orders/events read paths.
- Destination CEP validation in cart. No upstream requests, shipping prices or deadlines until authorized adapter exists.
- Default single-unit package: 0.150 kg, 20 × 15 × 10 cm; origin 38408-562.
- Catalog-based total validator and label eligibility helpers (not yet a payment workflow).
- Separate role table; no automatic first-user promotion. Owner must identify the admin account after signing in.

## Provider authorization blockers
- SuperFrete advertises own-site API: https://ajuda.superfrete.com/artigo/quais-as-integracoes-disponiveis-da-superfrete-com-plataformas-de-e-commerce/
- Official reference: https://api.superfrete.com/. Obtain custom-integration access and its credential specification from SuperFrete. Authentication requirements remain unverified; never reuse another platform's token or guess endpoints.
- Appmax official authorization: https://docs.appmax.com.br/guides/autenticacao and https://docs.appmax.com.br/guides/instalacao. Developer client_id/client_secret differ from installed merchant client_id/client_secret. Confirm account API version and installation requirements before requesting credentials securely through a connector.
- Need real product weight, packaging tare and supported package capacities before multi-unit quotations.

## Not implemented or live-tested
- Provider quote adapter, payment creation, signed payment webhook, verified labels, label payment, official PDF provenance and tracking synchronization.
- Atomic event deduplication/reprocessing, failed label emission and real approved/pending payment flows require those adapters. Unique external identifiers are present in storage but not a completed webhook implementation.
- Checkout remains WhatsApp; automatic checkout and shipping selection are intentionally not offered yet.
- Administrative persistence must be tested with an owner-approved account. Public login verification does not establish admin access.

## Tests
- Unit tests cover CEP, unavailable quotations, one/multiple packages, total calculation, payment authorization guard and existing shipment guard.
- Live provider and complete event/reprocessing tests are pending credentials and official contracts.