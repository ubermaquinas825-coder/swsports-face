# ERP SW Sports — status

## Concluído
- [x] Fase 1 — auditoria da loja e do painel administrativo
- [x] Fase 2 — dashboard operacional de vendas e pedidos
- [x] Fase 3 — banco ERP de produtos e movimentações de estoque
- [x] Fase 4 — segurança, RLS e permissões administrativas
- [x] Fase 5 — produtos e controle de estoque
- [x] Fase 6 — pedidos integrados ao estoque com proteção do histórico
- [x] Fase 7 — clientes e CRM interno
- [x] Fase 8 — financeiro baseado em vendas confirmadas, sem cálculo de custo, margem ou lucro
- [x] Fase 9 — logística Melhor Envio, fulfillment, rastreamento e relatórios gerenciais
- [x] Fase 10 — automação diária, testes, validação de ambiente e prontidão de produção

## Arquitetura operacional final
- Checkout: Mercado Pago.
- Frete e logística: Melhor Envio em produção via OAuth.
- Cotação: Melhor Envio antes do pagamento.
- Etiqueta: preparação pelo ERP, com revisão e pagamento manual na conta Melhor Envio.
- Rastreamento: sincronização manual por pedido e sincronização diária automatizada.
- Estoque: baixa idempotente somente para pedidos pagos elegíveis; histórico antigo preservado.
- Financeiro: faturamento pago, pedidos pagos, ticket médio, unidades, evolução mensal e desempenho por produto.
- Relatórios: vendas, clientes identificados, pipeline logístico, estoque baixo e saúde das integrações.
- Segurança: credenciais somente no servidor; nenhuma chave é exibida no painel ou versionada no repositório.

## Regras de segurança mantidas
- O ERP não compra etiquetas automaticamente nem debita a Melhor Carteira.
- Pedidos antigos não recebem baixa retroativa automática de estoque.
- Nenhum teste de produção cria cobrança real apenas para validar a infraestrutura.
- Dados de clientes permanecem restritos à área administrativa.
- Custos, margem e lucro não são calculados pelo ERP.

## Histórico legado
Código e registros antigos podem permanecer no histórico do repositório e do banco para auditoria, mas novos fluxos de frete utilizam Melhor Envio. Integrações legadas não fazem parte do caminho operacional principal.
