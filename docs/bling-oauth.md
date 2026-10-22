# Bling — etapa 1

Callback HTTPS previsto (exige publicação da infraestrutura antes de autorizar):
https://swsports-face.lovable.app/api/public/bling/callback

Painel: `/integracoes/bling`, disponível pelo painel Frete e Envios.

## Cadastro do aplicativo privado

1. Bling → Central de Extensões → Área do Integrador → Criar aplicativo → Privado.
2. Registrar o callback acima como Link de redirecionamento. O Bling usa o endereço registrado mesmo que redirect_uri seja enviado no pedido.
3. Selecionar permissão de leitura de produtos para a consulta administrativa; não há sincronização nem criação de produtos ou pedidos.
4. Após cadastro, solicitar pelo formulário seguro BLING_CLIENT_ID e BLING_CLIENT_SECRET. Não colar em mensagens, arquivos ou imagens.
5. Autorizar a conta administrativa SW Sports antes de clicar Conectar Bling.

## Segurança

- OAuth público verifica ticket emitido por administrador, state de uso único, expiração e cookie HttpOnly/Secure/SameSite=Lax.
- Callback troca code imediatamente (o código Bling expira em um minuto); usa Basic e formulário oficial com enable-jwt: 1.
- Tokens são criptografados por AES-GCM e guardados com acesso exclusivo do servidor. A chave BLING_TOKEN_ENCRYPTION_KEY é gerada no Cloud.
- Renovação antecipada sob trava persistida evita uso concorrente do refresh_token; falha ambígua exige nova autorização.
- Não se registram códigos, tokens, segredos ou respostas do endpoint de tokens.
- Nenhum produto, estoque ou pedido é criado/alterado nesta etapa.

Documentação: https://developer.bling.com.br/aplicativos e https://developer.bling.com.br/migracao-jwt

Verificação em 22/10/2026: callback publicado responde HTTP 400 sem state/cookie (não mais 404). Credenciais BLING_CLIENT_ID e BLING_CLIENT_SECRET salvas pelo formulário seguro; não foi possível verificar se o segredo exposto foi regenerado. Conta do proprietário identificada via sessão --self e autorizada como administradora; consentimento no Bling ainda pendente.

O botão Conectar Bling gera um state novo de uso único; não usar o state estático de um convite copiado. O destino de autorização é o oficial do Bling com o Client ID salvo. A consulta administrativa usa somente GET /Api/v3/produtos?pagina=1&limite=10, sem criar ou modificar registros. Tokens são renovados automaticamente antes da consulta quando próximos do vencimento. Se a renovação for ambígua, conectar novamente evita reutilizar refresh token rotacionado. Trocar a chave de criptografia exige nova autorização.

## Estoque e pedidos — preparação

- Painel permite selecionar depósito e informar manualmente o SKU correto de cada modelo; confirmação consulta produtos ativos, rejeita ausentes/duplicados e salva IDs existentes, sem criar produtos.
- Operações verificadas no OpenAPI oficial https://developer.bling.com.br/build/assets/openapi-DA9aa7wN.json: GET /depositos, GET /produtos com codigos[], GET /estoques/saldos com idsProdutos[]. Usar saldoVirtual do depósito selecionado, nunca saldo total.
- Conferência no checkout é opcional e só pode ser habilitada com os seis vínculos; consulta falha fechada, sem reserva nem baixa. Consulta não garante ausência de venda concorrente até que reservas/pedidos sejam integrados.
- Pedidos pendentes e IDs de links Appmax são registrados antes do redirecionamento. Criação de link nunca confirma pagamento nem exporta pedido ao Bling.
- Envio automático NÃO implementado/ativado: faltam contrato validado de confirmação Appmax e associação do cliente/endereço ao link; depósito/mapeamento/consentimento e teste real de pedido com reconciliação também pendentes. Não criar webhook sem validação nem presumir que numeroLoja garante unicidade no ERP.

## Verificação de 22/10/2026 22:45 UTC

- Painel autenticado do proprietário acessível; conexão ainda sem autorização salva e consultas de produtos/depósitos/estoque indisponíveis.
- Logs publicados mostram início OAuth HTTP 302 seguido de retorno à raiz `/?code=…&state=…`, não ao callback. Não reutilizar esses códigos expirados nem encaminhá-los por suporte/chat.
- Corrigir no aplicativo Bling o campo **Link de redirecionamento** para `https://swsports-face.lovable.app/api/public/bling/callback`, salvar e iniciar **Conectar Bling** novamente. A documentação oficial associa o retorno ao endereço cadastrado: https://developer.bling.com.br/aplicativos e https://developer.bling.com.br/como-testar.
- Callback publicado retorna HTTP 400 sem parâmetros, como esperado. Não confirma troca de tokens, permissões ou estoque real.