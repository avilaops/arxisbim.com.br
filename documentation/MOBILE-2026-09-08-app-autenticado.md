# App autenticado no mobile: auditoria e correção

**Data:** 08/09/2026
**Escopo:** navegação (sidebar/drawer + topbar), dashboard e Viewer 3D.
**Método:** auditoria em produção com sessão limpa e Playwright (390×844,
touch), medindo antes de mexer. Correção na causa. Validação em 8 viewports
local (API real por proxy) e em produção.

---

## 1. Problemas encontrados e causa de cada um

| # | Observado | Causa | Correção |
|---|---|---|---|
| 1 | **Menu abre sozinho** em toda visita nova pelo celular | `AppShell` usava UM estado (`sidebarCollapsed`, persistido) para "recolhida no desktop" e "aberta no mobile". O padrão é "expandida", e no mobile "expandida" = aberta. Fechar persistia "recolhida" e encolhia a sidebar do desktop | Estado `mobileNavOpen` separado, nunca persistido, nasce fechado |
| 2 | **Fechado o menu, não havia como reabrir** | O único controle ("Recolher menu") ficava DENTRO da sidebar, que some ao fechar. Topbar não tinha hambúrguer. Usuário ficava sem navegação | Hambúrguer 44×44 no topbar (`aria-expanded`, `aria-controls`), X 44×44 na cabeça do drawer |
| 3 | Menu **por baixo do topbar** | `.sidebar` z-index 60, `.topbar` 100 | Sidebar 110 e backdrop 105 no mobile |
| 4 | Conteúdo ao fundo competindo com o menu | Backdrop `rgba(0,0,0,0.5)` sem blur | 0.65 + blur 2px |
| 5 | "Ctrl K" no celular | A busca é **decorativa**: `<div>` com texto, sem input nem handler | Escondida no mobile (é dívida no desktop também) |
| 6 | Itens do menu 32px, "Recolher menu" 36px | Padding de desktop, `<a>` sem min-height | `min-height: 44px`, fonte 15px; toggle escondido |
| 7 | Topbar: nome do usuário + Suporte + avatar competindo | Sem regra mobile | Mobile: hambúrguer, marca, Suporte só ícone 44×44, avatar 44 (era 28); nome some (o avatar identifica) |
| 8 | Avatar é `<div onClick>` | Sem `role`, sem `tabIndex` | `role="button"`, `tabIndex`, `aria-label` |
| 9 | Dashboard: KPIs em 3 colunas de 110px, "Reuniões XR" quebrando | `gridTemplateColumns: 'repeat(3, 1fr)'` inline | Classe `.dash-kpis`: 3 col desktop, 2 col ≤768, 1 col ≤370 |
| 10 | "Novo projeto" 30px, canto | Altura inline | `.dash-cta`: 44px, largura toda no mobile, abaixo do título |
| 11 | "Ver tudo" com 4px de padding | Inline | `.dash-link`: 36px mínimo no mobile |
| 12 | Padding de 28px no dashboard mobile | Inline | 16px + safe-area |
| 13 | **Painel de projetos intocável** no viewer mobile: abre mas nada dentro responde ao toque | Em ≤1100 o `.viewer-drawer-backdrop` tem z-index 3 e o painel z-index 2: **o backdrop cobria o próprio painel**. O S12 nunca pegou isso porque foi provado em 1440 | Painel `.is-open` vai para z-index 4 |
| 14 | **Botão Cenários (S12) invisível no celular** | Em ≤760 todo `.viewer-icon-button` sem `.viewer-mobile-action` some; o botão que eu criei não tinha a classe. O marco provado em 1440 era inalcançável no iPhone | Classe adicionada |
| 15 | Botões do viewer 34×34 | Tamanho base | 44×44 no mobile (ícones, upload, fechar painel, adicionar) |
| 16 | **Instruções de teclado no touch** ("W A S D", "Shift", "Mouse") | Uma só variante, sem detectar ponteiro | Duas variantes; `@media (pointer: coarse)` escolhe. Não é por largura: iPad de 1024 é touch, notebook de 1280 não |
| 17 | Sem orientação de gestos | Não existia | Pill discreta no rodapé: **1 dedo orbita · Pinça zoom · 2 dedos move**, os três gestos que o OrbitControls de fato faz (não há toque duplo). Fecha no X e fica fechada nas próximas visitas |
| 18 | Banner "modelo enviado" alto, empurrando o canvas | `.viewer-notice` no fluxo (`position: relative`, `border-bottom`); crescia quando o texto quebrava | Mobile: toast sobreposto (`absolute`, top 60px), compacto; `Viewer3DPage` apaga em 4,5s. Erro fica |
| 19 | Painel de projetos continua aberto depois de escolher o modelo | `onSelectModel` só setava o id | Fecha o painel ao escolher (no desktop o painel é coluna fixa, não muda) |
| 20 | Toolbar do viewer 56px | Base | 52px no mobile |

## 2. Arquivos alterados

- `frontend/src/components/layout/AppShell.tsx`: estado mobile separado; scroll lock em `html.app-nav-open`; ESC; fecha na troca de rota; backdrop fecha.
- `frontend/src/components/layout/Topbar.tsx`: hambúrguer, marca mobile, Suporte com texto em `<span>` escondível, `aria-*`.
- `frontend/src/components/layout/Sidebar.tsx`: props `mobileOpen`/`onMobileClose`; `id="app-sidebar"`; X na cabeça; itens fecham o drawer; `aria-current`.
- `frontend/src/components/layout/UserMenu.tsx`: wrap com classe; `role/tabIndex/aria-label`.
- `frontend/src/pages/DashboardPage.tsx`: classes `dash-page/dash-head/dash-cta/dash-kpis/dash-link`; padding/altura/colunas saem do inline.
- `frontend/src/pages/Viewer3DPage.tsx`: toast auto-dismiss; fecha painel ao escolher modelo.
- `frontend/src/components/viewer/ViewerToolbar.tsx`: Cenários com `viewer-mobile-action`.
- `frontend/src/components/viewer/ViewerCanvas.tsx`: ajuda em duas variantes; dica touch dispensável com memória.
- `frontend/src/styles/globals.css`: bloco "Navegação mobile do app" (substitui o de 768px); dashboard.
- `frontend/src/styles/viewer.css`: z-index dos painéis; 44px; toast; ajuda touch; `.viewer-page` posicionado.

## 3. Breakpoints

Reutilizados os do app: **768px** (navegação, dashboard) e **760/1100/480px** (viewer, já existiam). Um novo: **370px** (KPIs em 1 coluna só em 360). Ajuda do viewer não usa largura: usa `(pointer: coarse)`.

## 4. Como ficou o menu mobile

Nasce fechado. Hambúrguer (44×44, canto esquerdo do topbar) abre um drawer de `min(84vw, 300px)` pela esquerda, acima do topbar, com backdrop escuro + blur. Cabeça com marca e X. Sem busca. Itens de 44px, 15px, seções (principal, Workspace, Ferramentas, conta), ativo com borda azul. Fecha pelo X, tocando fora, no ESC, ao escolher item e ao trocar de rota. Scroll travado enquanto aberto. Safe-area em cima e embaixo. Desktop: idêntico ao anterior.

## 5. Como ficou o viewer mobile

Topbar 56px + toolbar 52px; o resto é canvas (**736 de 844px em 390**, 87%). Quatro botões de 44px: projetos, **cenários**, informações, enviar. Painel de projetos como drawer que **responde ao toque** e fecha ao escolher o modelo. Aviso de sucesso vira toast sobre o canvas por 4,5s. Ajuda de gestos no rodapé, dispensável.

## 6. Instruções touch exibidas

`1 dedo orbita · Pinça zoom · 2 dedos move`. Só isso, porque é só isso que o `OrbitControls` faz no touch (ONE: ROTATE, TWO: DOLLY_PAN). Não inventei toque duplo. "W A S D / Q E / Shift / Mouse" nunca aparece em ponteiro grosso.

## 7. Type-check e build

- **Build (Vite):** passa.
- **`tsc --noEmit` no frontend:** não roda (`tsconfig.json` com `--ignoreDeprecations` inválido, pré-existente). Backend: 0 erros.

## 8. Validação

`scratchpad/ui/validar-app.mjs`: 6 viewports mobile + 2 desktop, com API real (proxy via `route.fetch`, porque CORS bloqueia `localhost`). Por viewport mobile, 30 verificações: sem scroll horizontal; menu fechado ao carregar; hambúrguer ≥44; sem `kbd`; CTA ≥44; KPIs ≤2 col; avatar e Suporte ≥44; abrir → acima do topbar, backdrop ≥0.65, itens ≥44, X ≥44, `aria-expanded`, scroll travado, toggle e busca escondidos; fecha por X, fora e ESC; viewer sem overflow; Cenários visível; botões ≥44; toolbar ≤56; painel acima do backdrop; **modelo clicável**; teclado escondido; touch com 3 gestos; canvas ≥70%; dica fecha. Desktop: sidebar visível, sem hambúrguer, KPIs 3 col, ajuda de teclado visível e touch não.

**Resultado local: 8 de 8 viewports, 194 verificações, zero falhas** (30 por
mobile × 6, 7 por desktop × 2). Em 390×844: hambúrguer 44×44, drawer 300px
com z 110 > 100, backdrop `rgba(0,0,0,0.65)`, 8 itens com mínimo de 44px,
"Novo projeto" 358×44, viewer com toolbar de 52px e canvas de 736 de 844px
(87%), painel de projetos z 4 > 3, ajuda touch "1 dedo orbita · Pinça zoom ·
2 dedos move".

**O teste pegou duas regressões minhas antes do deploy.** Na primeira
rodada, o botão Cenários sumiu em 1280/1440: eu tinha dado a ele
`viewer-mobile-action`, que é `display: none` no desktop. E em 768 (iPad) os
botões voltavam a 34px e o backdrop cobria o painel, porque o viewer usava
760 e o app 768. Corrigido com uma classe própria (`viewer-always`) e o
viewer alinhado a 768. Validar só em um tamanho teria deixado passar as duas.

Uma rodada ainda falhou por **token expirado** (JWT de 1h; a bateria de 8
viewports com carregamento de IFC leva mais que isso quando o token já não é
novo). Não é bug do produto; ficou registrado para quem for repetir.

## 9. Dívida encontrada

> **Fechada em 08/09/2026** (mesma data, rodada seguinte): os seis itens abaixo
> foram resolvidos em `DEBITO-2026-09-08-app-autenticado.md`, com prova em
> produção. O item 5 virou funcionalidade no desktop (Redefinir e Tela cheia);
> no mobile os botões seguem ausentes, como aprovado.

1. **Busca da sidebar é decorativa** também no desktop: `<div>` sem input. Ou vira command palette ou sai.
2. Status do projeto em inglês ("empty") no card de recentes.
3. `.topbar` e `.sidebar` definidos duas vezes em `globals.css` (766/865): resto do bloco B duplicado.
4. Itens da sidebar são `<a href>`, não `<Link>`: cada clique recarrega o app inteiro.
5. "Redefinir visualização" está `disabled` e "Tela cheia" some no mobile: dois botões que não fazem nada no celular. Fora do escopo decidir.
6. `tsconfig.json` do frontend: type-check não executa.

## 10. Evidência visual

`documentation/provas/mobile/app/`: `390-dashboard.png`, `390-menu.png`, `390-viewer.png`, `430-dashboard.png`, `430-viewer.png`, `1440-dashboard.png`, `1440-viewer.png`. Capturadas em produção após o deploy.
