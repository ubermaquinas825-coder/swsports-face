# Bling — etapa 1

Callback HTTPS (ambiente de desenvolvimento estável):
https://project--45740091-8f59-41fb-957a-c2f263b7b39c-dev.lovable.app/api/public/bling/callback

Painel: `/integracoes/bling`, disponível pelo painel Frete e Envios.

## Cadastro do aplicativo privado

1. Bling → Central de Extensões → Área do Integrador → Criar aplicativo → Privado.
2. Registrar o callback acima como Link de redirecionamento. O Bling usa o endereço registrado mesmo que redirect_uri seja enviado no pedido.
3. Selecionar somente escopos necessários; nesta etapa não há leitura/sincronização de produtos ou pedidos.
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

Publicação da loja não foi solicitada. Não registrar o callback no domínio da loja publicada antes de publicar essa infraestrutura.