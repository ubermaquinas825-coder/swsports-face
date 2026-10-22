# Roadmap — SW Sports

## Correções atuais
- [x] Solicitação atual: identificação real dos seis modelos por nome e conferência oficial Appmax implementadas; consulta de saldo antes de salvar configuração, trava por pedido e barreiras financeiras testadas.
- [ ] Solicitação atual: ativar depósito Geral e estoque real — nova consulta ainda HTTP 403; exige reautorizar no Bling após liberar permissões.
- [ ] Solicitação atual: pedidos automáticos/fluxo pago completo — exige endereço final confiável, configuração de contato/situação/forma de pagamento Bling e confirmação da regra de baixa; nenhum pedido/link salvo disponível para teste de pagamento, não gerar cobrança sem etapa acompanhada.
- [x] Verificar integrações sem cobranças: SuperFrete cotou 1/2/3/4/10 unidades (11 bloqueada), Appmax autenticou HTTP 200; painel com diagnóstico real, embalagens salvas/relidas e falhas de link sinalizadas para reconciliação; 29 testes passaram
- [x] Liberar conta administrativa do proprietário identificado via --self; painel verificado com sessão real
- [x] Preparar vínculos verificados de SKU/depósito, consulta de estoque virtual e conferência opcional antes do checkout; registrar pedidos pendentes e ID do link Appmax (26 testes passaram)
- [ ] Ativar pedidos automáticos/estoque real Bling — OAuth e produtos verificados; consulta de depósitos negada HTTP 403, vínculos/depósito não salvos; faltam confirmação/cliente/endereço Appmax, reconciliação segura e teste real
- [x] Bling etapa 1: infraestrutura OAuth, armazenamento criptografado, renovação e página administrativa; testes locais passaram
- [x] Bling callback HTTPS público — verificado HTTP 400 sem parâmetros no domínio publicado
- [x] Bling credenciais seguras e consulta administrativa somente leitura de produtos preparadas
- [x] Solicitar publicação da consulta administrativa de produtos Bling
- [x] Bling autorização real e consulta de produtos — callback concluiu HTTP 303 às 22:51 UTC; painel autenticado verificou acesso e retornou os seis SKUs existentes sem alterações
- [ ] Bling depósitos/estoque — depósito Geral confirmado pelo proprietário, mas GET /depositos continua HTTP 403 em novo teste às 22:59 UTC; reautorizar no aplicativo, depois confirmar vínculos e depósito
- [x] Refinar apresentação, transições 3D e navegação; adicionar WhatsApp flutuante inferior esquerdo e verificar em telas largas e pequenas
- [x] Conectar credenciais SuperFrete e Appmax por formulário seguro e validar autenticação sem criar pedidos
- [x] Preparar área Frete e Envios, armazenamento protegido e CEP sem cotações fictícias
- [x] Identificar documentação oficial SuperFrete/Appmax e testar regras de embalagem e barreiras de emissão
- [x] Verificar painel salvando e relendo dados — corrigido mínimo fracionário do campo capacidade; valores inteiros 1/3/10 salvos e relidos pela conta do proprietário
- [x] Mostrar cotações SuperFrete no carrinho, selecionar frete e substituir finalização WhatsApp por checkout Appmax com total validado no servidor — cotação real e total R$68,35 relido na página hospedada, sem pagamento
- [x] Habilitar frete para múltiplas unidades — cotações reais verificadas até 10; tara/espessura dos envelopes continuam estimativas já informadas, aguardando medidas do proprietário
- [ ] Testar pagamentos reais, falha de emissão, eventos duplicados e reprocessamento — aguarda adaptadores autorizados
- [x] Incluir no rodapé endereço, contato, horários e link do perfil Google enviado
- [x] Corrigir compra imediata, navegação e carrinho no atacado; verificar no navegador
- [x] Aplicar a logo enviada no cabeçalho, rodapé e ícone do site

## Feito
- [x] Identidade Dark Motion 3D (tokens, fontes, layout escuro/vermelho)
- [x] Catálogo com as 6 fotos originais do usuário (recorte transparente)
- [x] Hero cinematográfico com apresentação 2.5D (tilt + flutuação)
- [x] Seção "Escolha sua personalidade"
- [x] Kits (desativados até aprovação comercial)
- [x] Carrinho lateral com localStorage + checkout Appmax e frete SuperFrete
- [x] Página /atacado com formulário via WhatsApp

## Pendente (aguarda o usuário / etapa futura)
- [ ] Kits promocionais: ativar após aprovação comercial (2un R$ 89,90 / 3un R$ 119,90)
- [ ] Painel de produtos, preços e WhatsApp — fora da preparação logística atual
- [ ] Analytics: Google Analytics 4, Meta Pixel, eventos ViewContent/AddToCart/InitiateCheckout/Contact
- [ ] SEO: sitemap.xml e OG image dedicada

- [x] Embalagens para várias unidades configuradas (100 g/un., envelopes 26×36 e 32×40)
