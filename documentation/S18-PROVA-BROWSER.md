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
