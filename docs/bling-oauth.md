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

Verificação em 22/10/2026: callback publicado responde HTTP 400 sem state/cookie (não mais 404). Credenciais BLING_CLIENT_ID e BLING_CLIENT_SECRET salvas pelo formulário seguro; não foi possível verificar se o segredo exposto foi regenerado. Nenhum usuário de autenticação existe ainda: criar a conta do proprietário e conceder administração com autorização explícita antes do teste completo.

O botão Conectar Bling gera um state novo de uso único; não usar o state estático de um convite copiado. O destino de autorização é o oficial do Bling com o Client ID salvo. A consulta administrativa usa somente GET /Api/v3/produtos?pagina=1&limite=10, sem criar ou modificar registros. Tokens são renovados automaticamente antes da consulta quando próximos do vencimento. Se a renovação for ambígua, conectar novamente evita reutilizar refresh token rotacionado. Trocar a chave de criptografia exige nova autorização.