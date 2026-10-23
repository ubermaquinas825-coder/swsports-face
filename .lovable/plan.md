# Plano: SW Sports funcionando de ponta a ponta

## Objetivo
Cliente compra no site → paga na Appmax → pedido entra sozinho no Bling → etiqueta SuperFrete é gerada automaticamente → loja só embala e posta.

## Etapa 1 — Conferir o que já existe (sem cobranças)
- Confirmar no banco que as rotinas de segurança de pagamento (conferência Appmax, fila do Bling, recuperação) existem e respondem. Uma verificação anterior retornou vazio; se faltar algo, reaplicar apenas o que falta, sem duplicar.
- Rodar todos os testes e conferir que a versão publicada é a atual.
- Conferir estoque Bling (6 modelos) e cotação SuperFrete reais.

## Etapa 2 — Endereço do cliente confiável
- Hoje a Appmax coleta o endereço, mas não o trava ao CEP cotado. Depois do pagamento aprovado, ler o endereço do pedido na Appmax e:
  - se o CEP bater com o cotado → seguir automático;
  - se divergir → segurar o pedido para revisão no painel (sem emitir etiqueta).

## Etapa 3 — Etiquetas automáticas SuperFrete (novo)
- Ao pagamento aprovado e endereço conferido: criar o envio na SuperFrete com o mesmo serviço e pacote cotados, pagar a etiqueta com o saldo da conta SuperFrete e guardar o código de rastreio e o link oficial do PDF.
- Proteção contra etiqueta duplicada: uma trava por pedido e consulta antes de criar novamente.
- Falhas (saldo insuficiente, erro do provedor) vão para "revisão manual" no painel, nunca repetem sozinhas.
- No painel Frete e Envios: lista de pedidos com status, botão "baixar etiqueta" e rastreio.
- Enviar o rastreio para o pedido no Bling.

## Etapa 4 — Pagamento rápido
- Manter o aviso instantâneo da Appmax + verificação a cada minuto.
- Você cadastra o aviso no painel da Appmax (passo a passo já enviado); eu confirmo a chegada.

## Etapa 5 — Teste real acompanhado
- Uma compra real de 1 unidade (R$ 49,90 + frete), com você pagando.
- Acompanhar: pagamento aprovado → pedido no Bling → etiqueta gerada → rastreio no painel.
- Corrigir o que aparecer e só então liberar marketing.

## Etapa 6 — Marketing (após o teste)
- Meta Pixel e Google Analytics com eventos de visualização, carrinho, início de compra e compra.
- Sitemap e imagem de compartilhamento.

## O que preciso de você
- Saldo na conta SuperFrete para pagar etiquetas automaticamente.
- Cadastrar o aviso na Appmax.
- Fazer a compra teste.
- IDs do Meta Pixel e Google Analytics (Etapa 6).

## Detalhes técnicos
- SuperFrete: POST /api/v0/cart (criar), /api/v0/checkout (pagar), /api/v0/tag/print (PDF), via gateway do conector já vinculado; confirmar contrato na documentação oficial antes de codar.
- Nova etapa no ciclo `syncPaidOrders`: após `synced` no Bling, estado de etiqueta `label_queued → label_processing → label_issued | label_review`, com lease no banco igual ao da exportação Bling.
- Novas colunas aditivas em `shipping_orders` (status/ids/rastreio/erro da etiqueta) via migração nova; nada removido.
- Testes: trava anti-duplicata, CEP divergente bloqueia, falha vai para revisão, pagamento não aprovado não emite.
