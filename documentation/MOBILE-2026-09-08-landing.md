# Landing mobile: auditoria e correção

**Data:** 08/09/2026
**Escopo:** header, drawer, hero, CTA band e rodapé da landing (`/`).
**Regra seguida:** menor alteração estrutural que resolve a causa. Inline
continua carregando a identidade; só o que varia por viewport foi para CSS.
Nada de `overflow: hidden` para esconder erro, nada de media query por modelo.

---

## 0. O problema estrutural que não estava no pedido

**A landing não rolava.** Wheel de 600px, `scrollY` continuava 0, medido em
produção. Tudo abaixo da dobra era inalcançável por gesto desde **24/06/2026**,
dia em que a landing virou React (`8c11b92`) e o `body { overflow: hidden }` do
layout do app entrou (`0a13bcc`). O app rola por um container interno; a
landing não tem container nenhum, então o viewport ficou travado. Dois meses e
meio sem ninguém notar, porque ninguém testou abaixo da dobra.

Corrigido com a classe `lp-page` no `<html>` enquanto a landing está montada,
devolvendo o fluxo normal do documento sem tocar nas páginas do app. Virou
verificação permanente no portão (item 1b abaixo).

## 1. Causa de cada problema

| # | Problema observado | Causa encontrada | Correção |
|---|---|---|---|
| 1 | Logo cortado "ARXISV", "Entrar" esmagando o header | `.nav-cta` (Entrar + Criar conta) sem regra mobile; os três disputavam o espaço | `.nav-cta > a { display: none }` em ≤760; Entrar e Criar conta vão para o drawer |
| 1b | Header parecia responsivo no código | `'@media (max-width: 760px)'` **dentro de `style={{}}`** é no-op em React | Removido do inline; as regras `!important` do CSS já faziam o trabalho |
| 2 | Drawer branco com texto branco | **Dois** blocos `.mobile-nav` no CSS: um escuro (correto), um claro (obsoleto) mais abaixo, vencendo pela cascata; e o TSX ainda punha `rgba(255,255,255,0.97)` inline | Bloco claro removido; drawer reescrito como `.lp-drawer` (painel lateral, backdrop, X, ESC, toque fora, item) |
| 2b | Drawer com só 2 itens | Nunca foi completado | 5 links + Criar conta + Entrar |
| 3 | H1 gigante, 5 linhas | `clamp(34px…)` inline vencia o `.h1 { 28px }` do CSS; `<br/>` forçado | Tipografia sai do inline; `.hero .h1 { clamp(40px, 11vw, 46px) }`; `<br/>` só no desktop; "no navegador" sai no mobile (autorizado) |
| 4 | Descrição ilegível | `--text-secondary` = `#666` sobre `#0a0a0a` = **3,4:1**, reprova AA | `--c-text2` = `#b4b4b4` = **9,5:1**. Também estava errado no desktop |
| 5 | Badge larga demais | Sem `max-width`, sem tamanho mobile | Versão curta "BIM · 4D/5D · XR · IA" em ≤760, `max-width: 100%` |
| 6 | CTAs apertados lado a lado | Sem hierarquia mobile | Empilhados, 100%, `min-height: 50px`; desktop lado a lado como antes |
| 7 | Espaçamento do hero | Padding desktop herdado (80/60) | 40/36 em ≤760, escala consistente |
| 8 | Benefícios em flex-wrap imprevisível, cinza escuro | `#666` + `flex-wrap` | Grid 2 col em ≤760, 1 col em ≤400, `--c-text2` |
| 9 | Rodapé | Grid inline fixo `1.4fr repeat(3,1fr)`: 4 colunas em 390px | `.foot-grid`: 2 col em ≤760, 1 col em ≤480 |
| 10 | Safe-area ignorada | `viewport-fit=cover` ausente: `env(safe-area-*)` retorna 0 | Adicionado no meta; header e drawer usam `env()` |
| 11 | Scroll lock do drawer não travava | Travava o `body`, que **já** era hidden (item 0). No-op | Lock em `html.lp-page.lp-menu-open` + `touch-action: none` (iOS) |

## 2. Arquivos alterados

- `frontend/index.html`: `viewport-fit=cover`.
- `frontend/src/styles/globals.css`: bloco B obsoleto removido (71 linhas,
  `.brand` a `.cta-row` + `.mobile-nav` claro); bloco "Landing — responsivo de
  verdade" inserido; `lp-page` e o lock.
- `frontend/src/pages/LandingPage.tsx`: header (aria, X/hambúrguer, sem
  `@media` inline), drawer `.lp-drawer`, hero (props responsivas para CSS,
  `h1-br`, `h1-nav`, `eyebrow-full/short`), `foot-grid`, dois `useEffect`
  (`lp-page`; scroll lock + ESC).

## 3. Breakpoints

Reutilizados os que a landing já usava: **760px** (mobile) e **600px**
(container). Acrescentados só dois pontos finos: **400px** (benefícios em 1
coluna) e **480px** (rodapé em 1 coluna). Nenhuma query por modelo de iPhone.

## 4. Validação

`scratchpad/ui/validar.mjs` (Playwright, Chromium), **9 viewports**:
360×800, 375×812, 390×844, 393×852, 430×932, 768×1024, 1280×800, 1440×900,
1920×1080. Por viewport: sem scroll horizontal, **rola por gesto**, logo
inteiro e descoberto, composição do header certa para o modo, hambúrguer
≥44×44, H1 na faixa e ≤4 linhas, contraste AA (H1, descrição, benefícios,
drawer) medido por luminância, badge dentro do viewport, CTAs conforme o
modo, benefícios e rodapé sem corte. No mobile ainda: drawer cabe, 5+2 itens,
scroll travado, z-index acima do header, `aria-expanded`, fecha tocando fora
(destravando), fecha no ESC.

**Resultado: todas passaram nos 9 viewports.** Números em 390×844: H1 42,9px
em 4 linhas; descrição 9,5:1; drawer 19,2:1; CTAs 366 de 366px, 50px de
altura; `scrollY` 500 após wheel. Em 1440×900: H1 58px, CTAs lado a lado,
"Entrar" no header, layout idêntico ao anterior.

O teste também pegou **dois erros meus** antes de virarem produção: um
`box-sizing: content-box` que criava 24px de scroll horizontal, e o lock no
elemento errado.

## 5. Type-check e build

- **Build (Vite):** passa. É o portão real.
- **`tsc --noEmit` no frontend:** não roda por um problema **pré-existente** do
  `tsconfig.json` (`TS5103: Invalid value for '--ignoreDeprecations'`). Não é
  desta mudança. Fica em dívida.

## 5b. Segunda rodada, depois dos prints do iPhone real

O Nicolas testou no aparelho e mandou três telas. Duas estavam erradas.

**CTA band ("Pronto para ver seu projeto…"): regressão minha.** O `<h2>` fica
dentro de um card claro (`rgba(255,255,255,0.7)`). Na varredura de contraste de
hoje cedo troquei todo `#000000` por `var(--c-text)`; recuperei dois botões de
fundo branco, e este título passou. Estava certo antes; eu deixei branco sobre
cinza-claro. Voltou para `#0a0a0a` (**9,8:1** medido). Os botões do card, que
sempre foram lado a lado apertados no mobile, agora empilham full-width, como
os do hero. E eu tinha validado só o hero apesar do prompt pedir a landing
inteira: falha de cobertura, corrigida com o item 12 do validador.

**Login (e registro, esqueci, redefinir): fora do escopo, mesma doença.** As
quatro telas têm o split desktop (brand | form) em `flex: 1` inline, sem regra
mobile: em 390px o formulário ocupava metade da tela e o placeholder saía
cortado ("seu@email.con"). Marquei `.auth-split` / `.auth-brand` / `.auth-form`
nas quatro por script (cada uma tem exatamente dois painéis `flex: 1`, nessa
ordem) e em ≤760 o brand some e o form ocupa a tela. Input passou de ~270 para
**350px**. Dois `!important` foram necessários porque `display` e `padding`
estão inline nessas telas, o mesmo recurso que o código já usava para
`.nav-links`.

**Os links do menu não são "quebrados": o conteúdo foi perdido.** `#selo`,
`#usecases` e `#cases` existiam em `frontend/index.html` e `#features` e
`#pricing` em `frontend/arxisvr-build.html` **antes** da conversão HTML→TSX de
24/06 (`8c11b92^`). A conversão não trouxe as cinco seções, e como a página
parou de rolar no mesmo dia, ninguém desceu para notar. Recuperar é um
trabalho de conteúdo (cinco seções do HTML antigo para React), não um bug fix:
**decisão do Nicolas**. Removê-los esconderia a perda, então ficaram.

## 6. Dívida técnica encontrada

1. **`tsconfig.json` do frontend** com `--ignoreDeprecations` inválido: o
   type-check não executa. Pré-existente.
2. **Resto do bloco B** em `globals.css`: cópias idênticas de `.app`,
   `.sidebar`, `.h1 { 28px }` (~100 linhas). Inofensivas, mas duplicadas.
3. **Links do menu apontam para âncoras que não existem.** `#features`,
   `#selo`, `#usecases`, `#cases`, `#pricing`: a landing hoje tem hero, CTA
   band e rodapé. Clicar não faz nada. Fora do escopo desta correção.
4. **Bloco A "Dark Identity"** (`--lp-*`, wordmark em gradiente) está no CSS
   mas o TSX o anula com inline da versão clara antiga. É código morto que
   parece vivo. Não ressuscitei porque seria redesign.
5. **Header renderiza cinza-claro** embora `.nav` diga escuro. Algo inline
   sobrescreve. É a identidade atual, não mexi.

## 7. Evidência visual

Em `documentation/provas/mobile/`, capturadas **em produção** após o deploy:
`390x844.png`, `390x844-drawer.png`, `430x932.png`, `1440x900.png`.
