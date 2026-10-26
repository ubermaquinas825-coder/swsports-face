# Preparar envio e pagar pessoalmente na SuperFrete

No painel `/admin`, abra **Ver pedido → Envio → Preparar envio e abrir SuperFrete**.
O servidor verifica o pagamento atual, o endereço, os produtos, o remetente, o
volume e o serviço salvos na cotação; recota antes de criar um envio pendente
com `POST /api/v0/cart`. Nunca chama `checkout`, não debita a carteira e não
marca a etiqueta como paga. O responsável revisa e paga no painel SuperFrete.

O botão abre `https://web.superfrete.com/`, não um link de pagamento individual.
Não há contrato de deep link de pagamento verificado nesta implementação. Entre
na mesma conta vinculada ao token e localize o envio pelo identificador exibido
no pedido. A presença do carrinho API no painel dessa conta precisa ser validada
em homologação; não foi confirmada nesta sessão. Não há dados pessoais na URL.
Se o navegador bloquear a nova aba, o link **Abrir SuperFrete** permanece disponível.
O painel não sincroniza automaticamente o pagamento manual ou o rastreamento.

## Configuração necessária

- Servidor com integração SuperFrete existente: token server-only
  `SUPERFRETE_API_TOKEN` e `SUPERFRETE_CONTACT_EMAIL` na Vercel; nunca VITE_*.
  O adaptador também preserva o conector Lovable existente fora da Vercel.
- Remetente completo salvo em **Frete e envios → Configurações → Remetente e
  etiquetas**. A emissão/pagamento automáticos podem permanecer desligados.
- Revisar o schema existente e aplicar somente as migrações realmente ausentes.
  A nova `0010_manual_superfrete_cart.sql` depende da tabela de jobs da 0008.
  Não aplicar todo o histórico cegamente: o banco já preparado pelo proprietário
  e divergências documentadas em `labels-diagnostic-2026-10-26.md` devem ser revisados.
- Operações bloqueadas durante `SWSPORTS_FINANCIAL_MAINTENANCE`; não desligar
  manutenção só para contornar falhas ou configurações ainda não validadas.
- Homologar carrinho, dados, conta e abertura do painel antes do uso operacional.

## Duplicidade e resultados incertos

Uma reserva transacional na mesma `shipping_label_jobs` da emissão automática
impede concorrência entre os dois fluxos. Jobs manuais usam `stage=review` e
payload `manual_payment=true`: nunca são elegíveis a avanços automáticos ou
pagamento pelo cron. A identidade externa é persistida antes de validar a
resposta completa. Timeouts e resultados ambíguos mantêm a reserva, sem repetir
POST. Confira o envio na SuperFrete; não apague o job para tentar novamente.
A nova preparação é exclusiva de administradores, protegida no servidor e por
RLS/RPCs com privilégio service_role. Nenhuma etiqueta real foi criada nos testes.

## Integração ERP retirada

Por decisão do proprietário, não há conexão OAuth, consulta de estoque, exportação
ou painel ERP no código ativo. O administrativo é o centro de gestão dos pedidos.
O cron e o botão Conferir pagamentos consultam apenas os provedores de pagamento.
A emissão/pagamento automático de etiquetas foi removida do fluxo: somente o
administrador pode preparar o carrinho e o pagamento é feito na SuperFrete.
Os nomes de colunas e migrações históricas são preservados para não destruir
pedidos, auditorias e bloqueios financeiros. Não apagar tabelas históricas.
Para os pedidos retidos exclusivamente pelo erro antigo de configuração anterior
às chamadas externas, aplicar 0011 após 0010; ela mantém a pendência histórica e
permite somente o preparo manual com pagamento Mercado Pago reconfirmado.
A remoção do código não revoga autorizações já concedidas na conta do provedor.
Revogar o aplicativo externamente e remover variáveis de credenciais antigas
na hospedagem após a nova publicação. Nenhum segredo foi lido ou exposto.
