# Saneamento técnico do app autenticado

**Data:** 08/09/2026
**Escopo:** as seis dívidas registradas em `MOBILE-2026-09-08-app-autenticado.md`
(seção 9), sem redesign. Regra: o visual aprovado na rodada mobile não muda.
**Método:** impressão digital de estilos computados antes e depois (46
propriedades × 18 seletores × 7 viewports × 2 estados), bateria Playwright com
API real e prova em produção.

---

## 1. Type-check do frontend (P0)

**Causa.** `tsconfig.json` tinha `"ignoreDeprecations": "6.0"` com TypeScript
5.9.3, que só aceita `"5.0"`: o `tsc` parava no erro TS5103 antes de olhar
qualquer arquivo. Por baixo disso havia dois problemas que o erro escondia:

1. `"moduleResolution": "node"` com `"module": "ESNext"` e sem
   `esModuleInterop`: `import React from 'react'` era erro TS1259. O Vite
   resolve como bundler; o tsconfig dizia outra coisa.
2. `"include": ["src/**/*"]` cobria os ~800 arquivos órfãos que não entram no
   build desde a reescrita do frontend (memória: 819 de 867 fora do bundle).
   Eles somam **1.890 erros**. Um portão que nunca fecha não é portão.

**Alteração.**
- Removido `ignoreDeprecations` (não havia opção deprecada em uso).
- `moduleResolution: "bundler"`, o que o Vite faz.
- `paths` de `three/addons/*` apontando só para `@types/three` (a ordem
  anterior resolvia o `.js` sem tipos primeiro).
- O type-check cobre **o grafo de imports a partir de `src/main.tsx`**
  (`files`, sem `include`): 58 arquivos, exatamente o que entra no bundle.
  Os órfãos ficam fora até serem classificados (dívida já aberta no roadmap).
- Script `npm run typecheck`.

**Erros reais que apareceram (23) e o que era cada um.**

| Arquivo | Erro | Correção |
|---|---|---|
| `ViewerCanvas.tsx` (7×) | `host` possivelmente nulo dentro de `async function renderIfc()` | `function` hoisted perde o estreitamento do `if (!host) return`; virou arrow `const renderIfc = async () =>`. Mesmo código |
| `ViewerCanvas.tsx`, `ComparisonCanvas.tsx` | `renderer.outputColorSpace = THREE.SRGBColorSpace` não existe | **Linha morta desde sempre**: `outputColorSpace` entrou no three r152; o projeto usa 0.149. Em runtime atribuía `undefined` a uma propriedade inexistente. Removida. O viewer renderiza hoje em espaço linear; ligar sRGB de verdade (`outputEncoding = sRGBEncoding` no r149) muda a cor de todo modelo e fica como decisão separada, com print |
| `LandingPage.tsx` | tupla `[Icon, título, descrição, itens]` inferida como união; `Icon` não é JSX | `as const` no array; somem os `String()` e o `as string[]` |
| `LandingPage.tsx` | `faqOpen/setFaqOpen` nunca lidos | removido |
| `AdminPage.tsx` | `user` setado e nunca lido | removido |
| `JoinPage.tsx` | `workspaceId` nunca lido | removido (a página simula o convite com `setTimeout`; dívida, ver seção 9) |
| `ApiTokenspage.tsx`, `ApiTokenEmptyState.tsx` | imports de ícones não usados | removidos |
| `main.tsx`, `instrument.ts` | default import de React | resolvido pelo `bundler` |

**Resultado:** `npm run typecheck` → **0 erros**. Build → passa.

## 2. Sidebar sem recarregar o app (P1)

**Arquivos.** `Sidebar.tsx` (7 `<a href>` → `<Link to>`: 7 itens de navegação,
marca e 3 do submenu da conta), `Topbar.tsx` (marca mobile → `<Link>`),
`UserMenu.tsx` (botão Admin: `window.location.href` → `useNavigate()`).
Logout continua com reload de página, de propósito: limpa o estado em memória.

**Achado no caminho.** O submenu apontava para `/account#members`,
`/account#billing`, `/account#tokens`, e **nenhuma página lê o hash**. A
`AccountPage` abre a aba por `?tab=` (é assim que o retorno do cartão do
Mercado Pago chega). "Plano & Cobrança" no menu sempre abria em "Membros".
Agora o submenu usa `?tab=` e a página segue a troca de `?tab=` sem remontar
(`useLocation().search` → `setActiveTab`), porque com SPA ela fica montada ao
ir de Membros para Plano.

**Preservado.** `aria-current`, item ativo, fechamento do drawer ao navegar
(`onClick={onMobileClose}` no `Link`), histórico, deep links, todas as rotas.
Nenhum roteador paralelo: é o `react-router-dom` que o `App.tsx` já usa.

**Prova** (validador, 8 viewports): `window.__marcaSpa = 'viva'` antes de
clicar; após navegar para `/app` a marca sobrevive (não houve reload); `goBack()`
volta a `/dashboard` com a marca viva; submenu abre `/account?tab=billing` sem
reload e a aba ativa é Plano & Cobrança, não Membros. No mobile, o drawer fecha
ao escolher o item.

## 3. CSS duplicado (P1)

**Encontrado em `globals.css`.** Dois blocos idênticos de ~95 linhas
("Dashboard & App Layouts", linhas 753 e 852): `.app`, `.app.sidebar-collapsed`,
`.topbar`, `.sidebar`, `.main`, `.content`, `#loading`, `@media 900`
(`.sidebar { display: none }`) e `@media 600` (`.h1/.h2/.btn`). O segundo
diferia só em `footer {}` (redundante com o inline do `<footer>` da landing) e
`.container { padding: 0 12px }` a 600px (já existia na linha 171). Mais abaixo
um terceiro `.sidebar` (o vivo, `position: fixed`) e um terceiro `.topbar`
(`height: 48px; padding: 0 20px`).

**Auditoria antes de apagar.** Por cascata: `.app` não é usado por ninguém
(AppShell usa `.app-layout`); `@media 900 .sidebar { display: none }` perdia
para o `.sidebar { display: flex }` vivo, que vem depois com a mesma
especificidade (por isso a sidebar não sumia entre 769 e 900px); mas
`padding: 12px`, `gap: 8px` e `font-size: 12px` do primeiro `.sidebar` **eram
efetivos** na sidebar viva, e `background`, `border-bottom`, `display: flex`,
`align-items` e `z-index: 100` do primeiro `.topbar` também. Não dava para só
apagar.

**Consolidação.** Bloco B apagado inteiro. Do bloco A saíram `.app`, `.topbar`,
`.sidebar`, `@media 900` e `.lp-footer` (zero usos). Ficam uma `.sidebar` e um
`.topbar`, cada um com todas as propriedades que antes vinham de dois lugares,
na posição da definição viva (nenhuma regra concorrente entre as posições
antigas e a nova). `.main`, `.content` e `#loading` ficaram uma vez.
**1.175 → 1.045 linhas.**

**Prova de que o visual não mudou.** `css-fingerprint.mjs`: 46 propriedades
computadas de 18 seletores em 7 viewports (360, 390, 430, 768, 820, 1280,
1440) × 2 estados (menu fechado/aberto no mobile, sidebar expandida/recolhida
no desktop), antes e depois. **Diferença zero** em `.topbar`, `.sidebar`,
`.main`, `.content`, `.main-content`, backdrop, hambúrguer, dashboard. As
únicas diferenças são a busca decorativa que saiu (item 4): os itens do menu
sobem 52px no desktop (busca 44px + gap 8px). No mobile ela já era
`display: none`, então **o mobile ficou pixel-idêntico**.

## 4. Busca decorativa (P1)

**Verificação.** No código vivo (58 arquivos) não existe command palette,
busca nem handler de Ctrl+K. Fora do build há um
`shared/components/ui/components/CommandPalette.ts` de 436 linhas do frontend
antigo: classe DOM vanilla, sem React, sem fonte de dados (recebe uma lista de
comandos do chamador) e sem API de busca por trás. Não é infraestrutura real;
seria construir a feature.

**Decisão.** Removida do `Sidebar.tsx` (era `<div>` com "Pesquisa..." e
`<kbd>Ctrl K</kbd>`), junto com os dois ganchos de CSS (`.sidebar-search` na
lista do modo recolhido e a regra que a escondia no mobile). Espaçamento da
navegação mantido como estava (`padding: 12px 0 4px`). **Command palette
registrada como feature futura**, não como dívida.

## 5. Estados técnicos em inglês (P2)

| Onde | Antes | Depois |
|---|---|---|
| Dashboard, card de projeto | `empty` cru (e também `uploading`, `processing`, `ready`, `failed`, que o `projects.service` deriva da versão ativa do modelo) | Sem modelo · Enviando · Processando · Pronto · Falhou. Valor desconhecido vira "Sem status" em vez de vazar o enum |
| Membros, papel | `owner/admin/member/viewer` com `text-transform: capitalize` | Dono · Admin · Membro · Visualizador (mesma tabela do `<select>` de convite) |
| Plano & Cobrança, aviso de checkout pendente | `pendingCheckout.plan` (`professional`) | nome do plano que a página já carrega, como o card "Plano atual" faz |

Valores internos, API e banco intocados: só apresentação.

**Fora do escopo, registrado:** `AdminPage` renderiza usuários, organizações e
auditoria **escritos à mão** ("João Silva", "TechBuild", "5m atrás"). É a
trava de dados falsos da casa; a tela precisa ler a API ou sair do menu.

## 6. Controles do viewer (P2)

Os dois botões estavam `disabled` **em todo viewport**, não só no mobile.

**Redefinir visualização.** O enquadramento existe: o efeito que abre o IFC
calcula `Box3` → centro → distância e posiciona câmera e `controls.target`. Só
rodava uma vez. Conectado com o que o `OrbitControls` já tem: `saveState()`
logo após o enquadramento e `reset()` no clique (via `redefinirVista()` no
`ViewerHandle`). Detalhe que o teste pegou: com `enableDamping` o controle guarda
um resto de inércia do arrasto anterior e o aplicava nos frames seguintes ao
reset (12% dos pixels diferentes). Um `update()` sem damping consome esse resto
antes do `reset()`. Botão desabilitado só enquanto não há modelo, com `title`
explicando.

**Tela cheia.** Fullscreen API verificada: Safari só a tem em elemento
qualquer no iPad desde o 16.4 e **no iPhone desde o 17.2**; antes disso só
`<video>`. Implementação: `requestFullscreen()` na `.viewer-page` inteira
(toolbar junto, para o botão de sair continuar à mão), `fullscreenchange`
sincroniza o estado, ícone vira `Minimize2` e `aria-label` "Sair da tela
cheia". **Detecção em runtime:** sem `document.fullscreenEnabled` o botão não
é renderizado (um botão sem função não fica na tela). No mobile a toolbar
aprovada continua com 4 ações; os dois botões seguem ausentes ali, como antes.

**Prova (1280 e 1440):** botão ativo com modelo; tela cheia entra na
`.viewer-page` e o botão vira "Sair"; sai. Orbitar com o mouse muda 41,8% dos
pixels do canvas; após "Redefinir", **0,00%** de diferença para o quadro
inicial.

## 7. Não mexido

Layout do dashboard, drawer (dimensões, z-index 110/105, backdrop 0.65), alvos
de 44px, toast de upload, Cenários, gestos touch, `OrbitControls` (só
`saveState`/`reset`, que já existiam), canvas, breakpoints, identidade visual.

## 8. Regressão

`validar-app.mjs` estendido (as 194 verificações anteriores + as desta rodada):
360×800, 375×812, 390×844, 393×852, 430×932, 768×1024, 1280×800, 1440×900.

**Local: 258 verificações, zero falhas.** Menu nasce fechado; hambúrguer;
fecha por X, fora, ESC; sem scroll horizontal; sidebar desktop visível;
navegação sem reload; back/forward; aba da conta; dashboard no layout
aprovado; sem status em inglês; busca ausente; Cenários visível; painel de
projetos clicável; ajuda touch com os 3 gestos e teclado escondido no touch;
canvas ≥70%; Redefinir e Tela cheia no desktop.

**Produção** (após deploy, `documentation/provas/debito/`): ver seção 10.

**Testes unitários (`vitest`):** 610 testes, 24 falhas **pré-existentes**
(medido com `git stash` antes das alterações: 24 falhas, 586 passando), todas
em arquivos órfãos (`src/__tests__`, `src/controllers`, `src/services/*Service`,
`shared/components/ui/panels`). Com as alterações: 24 ou 25, a variação é
`VisibilityManager.test.ts` do bim-4d (animação por tempo, oscila sozinha).
Nenhum teste cobre os arquivos alterados.

## 9. Dívida que ficou (registrada, não escondida)

1. **Cor de saída do viewer** em espaço linear: a linha que pedia sRGB nunca
   funcionou no three 0.149. Ligar de verdade muda todos os modelos; decidir
   com print lado a lado.
2. **Quatro itens do menu levam ao mesmo lugar:** Planejamento 4D, Reuniões
   XR, Orçamento 5D e Consulta BIM apontam para `/app#...` e nada lê o hash;
   "Recentes" aponta para `/dashboard#recentes` sem elemento com esse id.
   Cada um promete uma tela que não existe no app vivo.
3. `AdminPage` com dados escritos à mão (seção 5).
4. `JoinPage` simula o convite com `setTimeout` e `alert`.
5. ~800 arquivos órfãos com 1.890 erros de tipo, fora do type-check até a
   classificação (roadmap).
6. Testes unitários: 24 falhas em código órfão.
7. Command palette: feature futura, se a busca fizer sentido no produto.

## 10. Evidência

`documentation/provas/debito/`: `390-dashboard.png`, `390-menu.png`,
`390-viewer.png`, `430-viewer.png`, `768-dashboard.png`, `1440-dashboard.png`
(sidebar sem busca), `1440-viewer.png` (Redefinir e Tela cheia ativos),
`1440-reset-0/1/2.png` (quadro inicial, orbitado, redefinido).
