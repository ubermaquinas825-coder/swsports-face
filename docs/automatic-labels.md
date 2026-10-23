# Etiquetas automáticas SuperFrete

Decisões do proprietário: declaração de conteúdo e endereço coletado no site
antes de abrir o pagamento Appmax.

## Fluxo implementado

1. O carrinho coleta nome do destinatário, CPF/CNPJ com dígitos verificadores,
   e-mail, telefone e endereço completo. O cliente confirma o endereço de entrega;
   o CEP deve ser o mesmo da cotação. A validação é repetida no servidor antes
   de abrir o pagamento. Dados ficam em `shipping_orders.delivery_address`;
   não são enviados na descrição do link nem guardados em localStorage/logs.
2. A cotação salva o CEP de origem e o volume retornado pela SuperFrete junto
   do serviço. Pedidos antigos sem endereço/volume não são emitidos automaticamente.
3. O cron existente `/api/public/cron/sync-orders` confirma pagamentos e exporta
   pedidos ao Bling. Depois processa até uma nova etiqueta por ciclo, somente
   quando a automação estiver ativada e o pedido estiver `synced` no Bling.
4. Antes de emitir, consulta novamente o pagamento Appmax e recota o serviço
   usando o volume salvo. Pagamento deve estar aprovado, com valor exato;
   mudanças no frete, remetente, bloqueios ou estornos impedem emissão automática.
5. `POST /api/v0/cart` cria a etiqueta com `options.non_commercial=true`, produtos
   e valores do pedido. A resposta é vinculada ao pedido antes de prosseguir.
6. `GET /api/v0/order/info/{id}` verifica destinatário, documento, remetente,
   preço, serviço, volume, seguro e produtos antes do débito.
7. `POST /api/v0/checkout` paga uma única etiqueta com saldo da carteira.
   Nova consulta confirma liberação e rastreamento; `POST /api/v0/tag/print`
   fornece o PDF. Somente URLs HTTPS oficiais esperadas são aceitas.
8. O painel Frete e Envios mostra o estado, identificador, rastreio e impressão.
   O histórico registra sucesso ou necessidade de conferência.

Todas as chamadas usam o conector SuperFrete já vinculado ao Lovable. Não
introduzir token direto nem colocar credenciais no código ou em VITE_*.

## Proteção contra duplicidade

A migração `0008_automatic_superfrete_labels.sql` cria `shipping_label_jobs`
com uma tentativa por pedido, associação externa única e etapas persistidas.
Somente funções service-role podem avançar essas etapas. Revisão financeira,
confirmação recente, estado do pedido e ativação são rechecados antes do pagamento.
Concorrência não permite uma segunda criação. Timeout, débito incerto, falha de
persistência ou worker interrompido entram em revisão e nunca autorizam novo POST.

Conferir na SuperFrete pelo identificador exibido ou tag do pedido antes de
qualquer intervenção manual. Não apagar jobs para tentar novamente. Não há
botão de repetição de cobrança. Falhas de preparação também ficam para revisão,
para não bloquear indefinidamente a fila de novos pedidos.

## Ativação no Lovable

A implementação permanece **desligada por padrão**.

1. Aplicar a migração pendente pelo migrador oficial do projeto, respeitando
   `docs/deployment-maintenance.md`. Não aplicar SQL por uma conexão pública
   nem reaplicar migrações anteriores. A migração foi testada apenas em banco local.
2. Reutilizar os vínculos existentes `LOVABLE_API_KEY` e `UDC_SUPERFRETE_API_KEY`
   no servidor Lovable, além das credenciais Appmax/Supabase já utilizadas. Não
   criar segredos duplicados. Essas credenciais não estão disponíveis nesta máquina.
3. Validar com conector/conta de sandbox separados os contratos de cart, checkout,
   order/info e tag/print, incluindo permissões, declaração, valores, PDF e falhas.
   Testes automatizados usam provedores simulados; nenhuma etiqueta real foi comprada.
   O adaptador de produção não aceita PDFs do sandbox nem muda de destino por input.
4. Em **Frete e Envios > Configurações > Etiquetas automáticas**, preencher os
   dados estruturados do remetente e e-mail de contato técnico. CEP deve ser igual
   à origem da cotação. O CPF/CNPJ será o vinculado à conta SuperFrete.
5. Manter saldo suficiente na carteira SuperFrete. A API de pagamento desconta
   da carteira; o recebimento Appmax não recarrega essa carteira automaticamente.
6. Após homologação, marcar **Emitir e pagar etiquetas automaticamente** e salvar.
   O servidor verifica a migração e faz uma consulta de conta sem cobrança antes
   de aceitar a ativação. Confirmar que o cron existente está ativo e autenticado.
7. Publicar a versão validada e acompanhar o primeiro pedido real autorizado.
   Desmarcar a opção interrompe novas admissões; chamadas já enviadas exigem
   conferência no provedor. Não é um cancelamento de etiquetas já pagas.

## Evidências desta implementação

- Testes de formulário, validação e persistência do endereço.
- Provedores simulados: aprovado/pendente/estornado, alterações de valor e dados,
  criação e débito incertos, concorrência e automação desativada.
- PostgreSQL descartável: etapas, privilégio mínimo, identidade externa,
  confirmação recente, estorno, job interrompido e duas sessões concorrentes.
- Build e checagem de tipos executados localmente.
- Não foram verificados o schema, o cron ou a configuração atuais do Lovable
  nesta sessão; não há ferramenta conectada para essas operações aqui.

## Fontes oficiais consultadas

- https://superfrete.readme.io/reference/adicionar-frete-carrinho
- https://superfrete.readme.io/reference/apiintegrationv1checkout
- https://superfrete.readme.io/reference/tag-informa%C3%A7%C3%B5es-do-pedido
- https://superfrete.readme.io/reference/tag-link
- https://superfrete.readme.io/reference/cotacao-de-frete

A documentação de cart tem divergências entre o texto e o schema. Esta
implementação segue o OpenAPI publicado: campo `volumes` e tags em `options.tags`.
Isso reforça a necessidade de validar o contrato no sandbox antes da ativação.
