# SW Sports — template tecnológico

Versão alternativa em `/experiencia`, na branch `feat/sw-sports-tech-template`. A home comercial da revisão anterior permanece disponível. A proposta continua exclusivamente escura, com preto, vermelho SW Sports, WhatsApp verde e preço unitário da fonte única `UNIT_PRICE` (R$ 49,90).

## Interações implementadas

- Vitrine com seis seletores de estampa, anterior/próxima e compra direta da opção selecionada pelo carrinho existente.
- Fundo com luz vermelha que responde ao ponteiro, grade discreta e cubo geométrico de seis faces construído em CSS 3D.
- Produto em uma camada com perspectiva e deslocamento ligados ao scroll.
- Cena sticky no desktop: três planos com fotos oficiais giram e mudam de profundidade conforme a rolagem, mantendo os botões de compra funcionais.
- Indicadores de progresso de leitura e da cena. Nenhum interceptador de wheel, biblioteca de smooth-scroll, WebGL ou dependência nova.
- Telas menores e dispositivos de toque recebem composição estática; movimento reduzido desativa transformações e efeitos. A rolagem e os controles continuam normais.
- Correção do WhatsApp flutuante: apresentação estática, com os mesmos destinos e exclusões por rota, para evitar atributos diferentes durante hidratação em movimento reduzido.

As fotos são planos com perspectiva, não modelos 3D dos produtos. O cubo é geometria 3D decorativa; não representa a estrutura da balaclava.

## Verificação

180 testes locais em 23 arquivos, incluindo a nova rota; lint e builds normal e Vercel Preview. Suíte financeira PostgreSQL isolada preservada. Browser em 320, 375, 390, 430, 768 e 1440 px, mais movimento reduzido em 390 e 1440 px:

- um H1, seis controles de seleção, áreas de toque com largura mínima de 44px;
- compra do modelo selecionado, quantidade/subtotal, guard sem frete e compra a partir da cena;
- transformação 3D realmente diferente após scroll em desktop;
- fallback estático sem overflow e sem avisos de hidratação em movimento reduzido;
- resposta do fundo ao ponteiro e sua desativação na preferência reduzida.

Resultados e capturas da sessão: `/workspace/swsports-audit/tech-browser-results.json` e `tech-*.png` (fora do Git). Preview publicado não equivale a validação visual remota quando a Vercel exige login. Nenhuma alteração ou teste transacional em produção.

## Seis fotos novas: requisito ainda pendente

As seis fotos aparecem na conversa, mas não foram disponibilizadas como arquivos ou IDs de download no ambiente. A busca nos diretórios de uploads, compartilhados e scratch não encontrou esses arquivos. O Template Creator não está disponível nas ferramentas da sessão; esta versão foi implementada diretamente no projeto, sem afirmar uso do plugin ou do Figma.

[PENDENTE — IMPORTAR AS SEIS IMAGENS ORIGINAIS] — fornecer os arquivos em ZIP ou um link de download autorizado. Não reconstruir as fotos com IA, não alterar as estampas, não inserir URLs de imagens inexistentes e não substituir por fotos dos modelos antigos.

Quando os arquivos estiverem disponíveis: identificar cada modelo sem duplicar produtos, preservar os originais, preparar imagens otimizadas, manter preço de R$ 49,90 via `UNIT_PRICE` e validar carrinho, cotação e cadastro correspondente em homologação. Não inventar estoque nem criar dados em produção. Até lá, a vitrine usa explicitamente o catálogo já existente; nenhum dos seis novos modelos foi cadastrado ou anunciado como disponível.
