# Diagnóstico SuperFrete — 26/10/2026

Somente leituras de produção e testes com provedores simulados. Nenhuma etiqueta,
pagamento, pedido, migração ou configuração de envio criada/alterada.

- Conexão SuperFrete vinculada e acessível; GET /api/v0/user HTTP 200.
- Saldo retornado: R$9,60. Não garante cobertura de cada frete cotado.
- shipping_settings sem labelAutomation e sem remetente estruturado.
- shipping_label_jobs, claim_shipping_label e shipping_label_candidates ausentes.
- Histórico Drizzle: 0005/0006/0007 aplicadas, hashes iguais aos arquivos locais.
- Última entrada: created_at 1792774306209, hash
  871fb4781ab5a7bd6acd44938a7709642b139a02c8d14124b742abbc95a2f6fe.
- 0008 local: timestamp 1792772517669, hash
  40cbe28f8dec8b73121757385eb417c7f4806c9c67fa18bf08a48aad2e3ba8b2.
  É anterior à última entrada aplicada e diferente do hash registrado. O migrador
  pode ignorá-la. Parar antes de aplicar ou modificar o histórico.
- Há colunas de implementação anterior: label_status, label_error,
  label_processing_started_at, label_price_cents, label_url. Não remover dados.
- Cron ativo a cada minuto, nome sync-paid-orders-to-bling, rota
  /api/public/cron/sync-orders. Código atual chama etiquetas após conciliação/Bling.
- Dois pedidos pending/reconciliation_required; nenhum aprovado encontrado.
  Não reenfileirar pedidos em revisão nem presumir falha de pagamento resolvida.
- Rota webhook Appmax não encontrada no checkout atual; aviso imediato requer
  investigação separada. Não prometer emissão em segundos.
- 54 testes de etiquetas, cron e manutenção passaram com provedores simulados.

Próximos requisitos: regularização autorizada sem reescrever histórico aplicado,
remetente confirmado, homologação de contratos de emissão/pagamento/impressão,
saldo suficiente e publicação explicitamente autorizada antes da ativação.