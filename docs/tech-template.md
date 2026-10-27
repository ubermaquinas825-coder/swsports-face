# SW Sports — template tecnológico

Versão alternativa em `/experiencia`, na branch `feat/sw-sports-tech-template`. A home comercial da revisão anterior permanece disponível. A proposta continua exclusivamente escura, com preto, vermelho SW Sports, WhatsApp verde e preço unitário da fonte única `UNIT_PRICE` (R$ 49,90).

## Interações implementadas

- Vitrine com doze seletores de estampa, anterior/próxima e compra direta da opção selecionada pelo carrinho existente.
- Fundo com luz vermelha que responde ao ponteiro, grade discreta e cubo geométrico de seis faces construído em CSS 3D.
- Produto em uma camada com perspectiva e deslocamento ligados ao scroll.
- Cena sticky no desktop: três planos com fotos oficiais giram e mudam de profundidade conforme a rolagem, mantendo os botões de compra funcionais.
- Indicadores de progresso de leitura e da cena. Nenhum interceptador de wheel, biblioteca de smooth-scroll, WebGL ou dependência nova.
- Telas menores e dispositivos de toque recebem composição estática; movimento reduzido desativa transformações e efeitos. A rolagem e os controles continuam normais.
- Correção do WhatsApp flutuante: apresentação estática, com os mesmos destinos e exclusões por rota, para evitar atributos diferentes durante hidratação em movimento reduzido.

As fotos são planos com perspectiva, não modelos 3D dos produtos. O cubo é geometria 3D decorativa; não representa a estrutura da balaclava.

## Verificação

188 testes locais em 24 arquivos, incluindo a nova rota; lint e builds normal e Vercel Preview. Suíte financeira PostgreSQL isolada preservada. Browser em 320, 375, 390, 430, 768 e 1440 px, mais movimento reduzido em 390 e 1440 px:

- um H1, doze controles de seleção, áreas de toque com largura mínima de 44px;
- compra do modelo selecionado, quantidade/subtotal, guard sem frete e compra a partir da cena;
- transformação 3D realmente diferente após scroll em desktop;
- fallback estático sem overflow e sem avisos de hidratação em movimento reduzido;
- resposta do fundo ao ponteiro e sua desativação na preferência reduzida.

Resultados e capturas da sessão: `/workspace/swsports-audit/tech-browser-results.json` e `tech-*.png` (fora do Git). Preview publicado não equivale a validação visual remota quando a Vercel exige login. Nenhuma alteração ou teste transacional em produção.

## Seis fotos novas importadas

O ZIP `balaclavas.zip` contém somente `01.jpeg` a `06.jpeg`. As seis imagens de 1254×1254 foram importadas sem recorte, geração, recompressão ou alteração de cores; o manifesto `docs/balaclavas-asset-manifest.json` relaciona cada arquivo original ao ID do produto, caminho público, tamanho e SHA-256.

| Arquivo | Nome de exibição | ID |
| --- | --- | --- |
| 01.jpeg | Sorriso Grisalho | sorriso-grisalho |
| 02.jpeg | Grisalho com Charuto | grisalho-com-charuto |
| 03.jpeg | Bigodudo Irreverente | bigodudo-irreverente |
| 04.jpeg | Sorriso Rebelde | sorriso-rebelde |
| 05.jpeg | Bigode Branco | bigode-branco |
| 06.jpeg | Grisalho Sorridente | grisalho-sorridente |

Os nomes são descrições para identificar as seis fotos numeradas, não SKUs de estoque. IDs, nomes, ordem e imagens dos seis produtos anteriores foram preservados. Os novos itens compartilham `UNIT_PRICE` (R$ 49,90) e aparecem na coleção, seleção interativa, carrinho e dados estruturados. A vitrine tecnológica abre com Sorriso Grisalho e a cena 3D destaca três novas fotos.

A validação passa a aceitar até o número de modelos cadastrados, mantendo rejeição de IDs desconhecidos, itens duplicados e quantidades inválidas. A capacidade das embalagens e os cálculos não foram alterados: um carrinho de doze unidades continua sem embalagem elegível na configuração padrão, cuja capacidade máxima é dez. Não foram criados registros de estoque, pedidos, pagamentos, migrações ou dados de produção.

Os testes adicionais verificam os bytes originais, cada novo item a 4.990 centavos, carrinho misto com sete modelos, subtotal, guard de frete e preservação dos limites de embalagem. Template Creator/Figma não foram usados; a proposta foi implementada diretamente no projeto.
