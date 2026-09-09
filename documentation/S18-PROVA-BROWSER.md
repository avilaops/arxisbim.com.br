# S18 ★ — prova em browser real

**Data:** 04/09/2026
**Onde:** `https://arxisvr.avilaops.com/app/compare` (aplicação **publicada**)
**Como:** Playwright 1.62.1, Chromium, 1600x900
**Resultado: 9/9 passos.** O segundo marco caiu.

---

## O que foi provado

| # | Passo | Resultado |
|---|---|---|
| 1 | Link "Comparar cenários" aparece no painel (só com 2 cenários) | OK |
| 2 | Tela de seleção abre | OK |
| 3 | Impede A × A (mesmo cenário desabilitado do outro lado) | OK |
| 4 | Dois viewports lado a lado | OK — 2 canvas |
| 5 | Cada lado rotulado com seu cenário | OK |
| 6 | Lado B tem altura (não é split invisível) | OK — 689×790 |
| 7 | **A e B abrem em câmeras diferentes** | OK |
| 8 | Mover a câmera de A muda o lado B (sincronizado) | OK |
| 9 | Com o cadeado solto, B **não** acompanha A | OK |

O caminho é o do usuário, não a URL: entra em `/app`, abre o painel de cenários,
clica em "Comparar cenários", escolhe A e B, e só então vê o split.

Cenários usados: **Fachada frente** (perspectiva) e **Vista de cima** (topo),
sobre `ac20-fzk-haus_ifc4.ifc`.

## Os passos 7 e 8 são os que impedem a prova de se enganar

O 8 verifica pixels do lado B antes e depois de arrastar o lado A: se a
sincronização não funcionasse, a imagem seria idêntica. O 9 é o inverso, com o
cadeado solto.

O **passo 7 não existia na primeira rodada**, e a ausência dele escondeu um
defeito real: os dois lados abriam **idênticos**, e todos os outros 8 passos
passavam mesmo assim. Dois viewports iguais não são comparação nenhuma.

## O que a prova pegou

**1. O split era invisível.** O cabeçalho aparecia certo, os dois canvas
existiam no DOM, e a área ficava vazia. `.compare-page` usava `height: 100%`; o
AppShell distribui altura por flex, e ali a altura percentual resolve para zero.
O `.viewer-page`, que funciona, usa `flex: 1` com `min-height: 0`.

**2. O lado B abria com a câmera de A.** Duas causas, ambas no `CameraSync`:
`setLocked(true)` copiava A sobre B na hora e era chamado na montagem, logo
depois de cada lado aplicar a sua própria câmera; e o `useEffect` do cadeado
disparava também na primeira renderização, repetindo o estrago. `setLocked`
ganhou o parâmetro `alinharAgora` (false na montagem) e o efeito passou a pular
a primeira execução.

Nenhum dos dois seria pego por build ou type-check.

## As capturas

Em `documentation/provas/s18/`:

| Arquivo | O que mostra |
|---|---|
| `01-painel.png` | Painel de cenários com o link "Comparar cenários". |
| `02-seletor.png` | Tela de seleção A/B, antes do split. |
| `03-escolhido.png` | A e B escolhidos; o mesmo cenário fica desabilitado do outro lado. |
| `04-split.png` | **O marco**: A em perspectiva, B de cima, lado a lado. |
| `05-sincronizado.png` | Depois de arrastar A: B acompanhou. |
| `06-solto.png` | Cadeado solto: A se move, B fica. |

## Escopo respeitado

Zero backend novo, zero S26/S30 de carona. O `GET /scenarios/:idA/diff/:idB`
existe, mas devolve `schedule` e `cost` — é 4D/5D, não visual, e **não foi
usado**. A comparação visual lê o que o S12 já salvou (`camera` e
`metadata.hidden`).

`CameraSync` veio do frontend órfão (`src/viewer/CameraSync.ts`, 68 linhas, sem
DOM). É a terceira peça órfã aproveitada em dois sprints.

## Dados de teste

Criados e apagados ao fim: tenant `s18-prova`, 1 projeto, 1 modelo, 2 cenários.

## Reproduzir

Roteiro em `scratchpad/s18/prova.mjs` (não versionado: contém credencial). Para
refazer, ver as notas de conta de teste em `S12-PROVA-BROWSER.md`. Um detalhe a
mais: o token JWT expira em cerca de uma hora, então numa sessão longa é preciso
refazer o login — e redefinir a senha pelo banco exige mandar o hash bcrypt em
**arquivo**, porque o `$2b$` é expandido pelo shell.

---

## Rodada 2: 08/09/2026, o que faltava do objetivo do sprint

O marco (split + câmera sincronizada) caiu em 04/09. O objetivo do sprint tinha
mais dois itens que ficaram de fora: **exportar como imagem** e a comparação
**sobreviver ao reload**. Fechados hoje, zero backend.

| # | Passo | Resultado |
|---|---|---|
| 10 | Menu sem Planejamento 4D, Reuniões XR, Orçamento 5D e Consulta BIM (apontavam para `/app#...`, nada lia o hash); "Comparar cenários" no menu | OK |
| 11 | Painel de cenários → "Comparar cenários" abre `/app/compare` **sem recarregar** | OK |
| 12 | A e B escolhidos vão para a URL (`?a=&b=`) | OK |
| 13 | "Comparar" marca `split=1`; dois canvas, lado B com 790px | OK |
| 14 | **Reload**: a comparação reabre sozinha, com os mesmos rótulos | OK |
| 15 | A e B em câmeras diferentes (52% dos pixels) | OK |
| 16 | Arrastar A move B (59%); cadeado solto, B fica (0,00%) | OK |
| 17 | **"Exportar imagem"** baixa `comparacao-fachada-frente-x-vista-de-cima.png`, 1226×826, os dois lados rotulados, 52% dos pixels com conteúdo (não veio preto) | OK |
| 18 | "Trocar cenários" volta ao seletor com A e B ainda marcados | OK |

Em produção, bundle `pages-EbXtaJIJ.js`. Capturas novas em `provas/s18/`:
`07-escolha-na-url.png`, `08-split-apos-reload.png`, `09-exportado.png` (o PNG
que o botão gera).

**Detalhe técnico do export.** `drawImage` de um canvas WebGL vem preto se o
buffer já foi descartado depois do frame; os dois renderers do split passaram a
usar `preserveDrawingBuffer: true`. O PNG é montado num canvas 2D com os
rótulos "A · nome" e "B · nome", o modelo e a data.

## O que continua fora, e por quê

**"Diferenças visuais destacadas"** (o terceiro item do objetivo) não foi feito
porque **não há diferença de visibilidade para destacar**: o viewer vivo não
tem nenhuma ação que oculte elemento (sem seleção, sem raycaster, sem filtro),
então `metadata.hidden` é `[]` em todo cenário de produção. Além disso o
`hidden` é guardado por `id` de objeto three, que é um contador de runtime e
muda a cada carga; e o `web-ifc-three` entrega o IFC como **um** mesh, então
"ocultar um mesh" seria ocultar o prédio inteiro. Um diff sobre esse estado
seria um painel dizendo "sem diferenças" para sempre: a mesma falsa affordance
dos quatro itens de menu que saíram hoje.

Para o diff existir de verdade, os cenários precisam poder diferir em algo além
da câmera: visibilidade por **categoria IFC** (paredes, laje, cobertura,
esquadrias) via subsets por `expressID`, que o `web-ifc-three` já faz. É uma
fatia do S10 (filtros do viewer), frontend puro, e é o que transforma "duas
câmeras do mesmo prédio" em "com cobertura × sem cobertura". Decisão em aberto.

Conta usada: a de auditoria de 08/09 (`nicolasrosaab+auditoria-debito@`),
projeto "Auditoria debito tecnica", cenários "Fachada frente" e "Vista de
cima". Roteiro: `scratchpad/ui/validar-s18.mjs`.

---

## Rodada 3: 09/09/2026, estado real de cenário. O ★ de verdade

A rodada 2 deixou escrito: A e B diferiam só pela câmera, e "diferenças
destacadas" não tinha o que destacar. Hoje entrou a fatia mínima do S10 que
faltava, **visibilidade por categoria IFC**, e o critério final passou em
produção, 12 de 12, no bundle `pages-BIoc7CZP.js`:

| # | Passo | Resultado |
|---|---|---|
| 19 | Painel de cenários lista as categorias IFC do modelo (Paredes, Janelas, Portas, Lajes e pisos, Vigas, Guarda-corpos, Escadas, Terreno, Barras e montantes) | OK |
| 20 | Ocultar Janelas muda o canvas (14% dos pixels) e o botão vira "Mostrar Janelas" | OK |
| 21 | Cenário A salvo com `metadata.visibility.hiddenIfcCategories = ["IFCWINDOW"]` | OK |
| 22 | Cenário B salvo com tudo visível | OK |
| 23 | Selecionar A no painel reaplica as janelas ocultas | OK |
| 24 | Comparar A\|B: legenda vinda do **estado**: "Janelas: oculta em A · visível em B" | OK |
| 25 | Janelas em **magenta só no lado B** (0,4% dos pixels de B, 0,02% em A, que é o quadrado da legenda) | OK |
| 26 | Arrastar A move B (36%) | OK |
| 27 | PNG exportado: destaque só na metade direita, rodapé com "Diferenças: Janelas (só em B)" | OK |
| 28 | **Reload**: split, legenda e destaque continuam | OK |

Capturas em `provas/s18/`: `10-viewer-visibilidade-sem-janelas.png`,
`11-split-diferenca-destacada.png`, `12-apos-reload.png`,
`13-exportado-com-diferenca.png` (o PNG do botão), `14-390-visibilidade.png`
(a gaveta no celular, itens de 44px, rolável).

### O que se persiste

Nomes de tipo IFC, não ids. `IFCWALL` e `IFCWALLSTANDARDCASE` viram a linha
"Paredes"; o cenário guarda os dois. Cor do destaque: laranja = visível só em
A, magenta = visível só em B (verde confundia com o terreno do modelo). A
diferença é calculada do que cada cenário declarou oculto; pixel nenhum é
comparado.

### O que a prova pegou

1. **Dois `IFCLoader` no split**: o web-ifc-three partilha a API wasm por
   baixo, o lado B nascia com `modelID 1` num manager que só conhecia o 0, e
   `getAllItemsOfType` devolvia nada. Um loader para os dois lados.
2. **O painel de cenários roubava metade do canvas desde o S12**: era o 4º
   item de um grid de 3 colunas e criava uma segunda linha implícita. A
   captura `01-painel.png` de 04/09 já mostrava o canvas com 400 de 900px e
   ninguém mediu. Com a lista de visibilidade o canvas virava uma faixa.
   Coluna da esquerda em duas linhas, canvas atravessando as duas.
3. **Gaveta mobile com 1px de altura**: item absoluto com `grid-row` explícito
   usa a área do grid como bloco de contenção, e no celular a linha 2 não
   existe. `grid-area: auto` nas gavetas.
4. **Incidente de produção às 18:16 UTC**, achado porque a prova parou de
   listar cenários: ver `INCIDENTE-2026-09-09-conexoes-postgres.md`. Nove
   controladores da API abriam um pool novo a cada requisição.

Fora do escopo, de propósito: filtros, pavimentos, seleção individual,
materiais, diff geométrico, custo, prazo. O ★ termina aqui.
