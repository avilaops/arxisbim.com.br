# Etapa 1: Diagnóstico e Planejamento Inicial

## Objetivo
Mapear de forma detalhada as responsabilidades, dependências e domínios do app.html e do frontend, identificando pontos de acoplamento, riscos de manutenção e oportunidades de modularização.

## Como preencher cada item
- Para cada checklist, cite exemplos concretos do código (trechos, funções, seletores, imports, etc).
- Aponte onde há mistura de responsabilidades (UI, lógica, serviços).
- Identifique padrões repetidos, blocos grandes e dependências diretas.
- Use comentários sobre riscos, oportunidades e sugestões iniciais.

---

## 1.1 Mapear Responsabilidades do app.html
- Identifique e liste:
  - Trechos de layout: header, sidebar, painel direito, canvas central, etc.
  - Blocos de lógica JS/TS: inicialização do viewer, listeners, manipulação de estado, etc.
  - CSS global: onde estão tokens, temas, variáveis, regras corporativas.
  - Serviços inicializados: auth, upload, API, etc.
  - Exemplo: “Header implementado diretamente no HTML, com lógica de navegação inline.”

## 1.2 Identificar Dependências Cruzadas e Acoplamentos
- Liste onde UI e lógica estão misturadas (ex: onclick direto chamando função global).
- Aponte dependências diretas entre módulos (ex: viewer acessando authService diretamente).
- Identifique pontos de difícil manutenção (ex: funções grandes, variáveis globais, callbacks aninhados).
- Exemplo: “Função de upload acessa diretamente o estado do viewer.”

## 1.3 Levantar Principais Domínios
- Relacione os domínios principais e onde aparecem no código:
  - Viewer 3D e controles (Three.js, loaders, navegação)
  - Autenticação e sessão (login, tokens, usuário)
  - Upload/download de arquivos IFC
  - Orçamento/quantitativos 5D
  - Painéis e UI (componentes, modais, toolbars)
  - Serviços de API (fetch, axios, etc)
  - Sistema de navegação e modos (FPS, drone, orbit)
  - Sistema de inspeção/seleção IFC (raycast, selectionService)
- Exemplo: “Painel de propriedades implementado como div fixa, lógica de seleção acoplada ao evento de clique.”

---

> Preencha cada item acima com exemplos e observações do código atual. Use este diagnóstico como base para modularização e refatoração nas próximas etapas.

# Checklist

## 1.1 Mapear Responsabilidades do app.html
- [x] Identificar trechos de layout (header, sidebar, painel, canvas)
  - Header: `<header class="header">` com logo, navegação e ações de usuário.
  - Sidebar: `<aside class="sidebar">` com projetos, modelos IFC, ferramentas, cenas, cortes, medições, consultas, quantitativos e orçamento.
  - Canvas central: `<main class="canvas-area" id="viewer-canvas">` para o viewer 3D.
  - Painel direito: `<aside class="right-panel">` com informações do modelo, ações rápidas, modos de câmera e navegação.
- [x] Listar blocos de lógica JS/TS presentes
  - Inicialização do viewer: `ViewerHost` montado no canvas.
  - Listeners: `addEventListener` para navegação, upload, modos de câmera, drag&drop, etc.
  - Manipulação de estado: variáveis globais (`viewerHost`, `ifcLoader`, `currentIfcModels`, `localStorage`).
  - Serviços inicializados: API, upload IFC, autenticação, painéis, inspector, seleção.
- [x] Apontar trechos de CSS global e tokens
  - Tokens e temas em `:root` (ex: `--bg-primary`, `--accent-blue`).
  - Regras para layout, header, sidebar, painel, botões, scrollbar, responsividade.
- [x] Relacionar inicialização de serviços (viewer, auth, upload, etc)
  - `ViewerHost`, `IFCSimpleLoader`, `ArxisCopilot`, `ScenariosPanel`, `SectionsPanel`, `MeasurementsPanel`, `QueryPanel`, `TakeoffPanel`, `BudgetPanel`, `inspectorController`, `selectionService`.

## 1.2 Identificar Dependências Cruzadas e Acoplamentos
- [x] Listar onde UI e lógica estão misturadas
  - Botões HTML com `data-action` e listeners JS no script principal.
  - Sidebar e painel direito renderizam elementos manipulados por funções JS/TS.
- [x] Apontar dependências diretas entre módulos (ex: viewer acessando auth, upload dentro do shell, etc)
  - Viewer acessa diretamente serviços como `ifcUploadManager`, `selectionService`, `inspectorController`.
  - Upload de IFC chama `getIfcService()` e manipula estado do viewer e lista de modelos.
  - Painéis são montados no DOM e recebem referências do viewer via `window`.
- [x] Identificar pontos de difícil manutenção
  - Funções grandes e monolíticas no script principal.
  - Uso de variáveis globais (`window.__viewerHost`, etc).
  - Callbacks aninhados para eventos de UI e carregamento de modelos.

## 1.3 Levantar Principais Domínios
- [x] Viewer 3D e controles
  - `ViewerHost`, `FPSControls`, `ThirdPersonControls`, `DroneControls`, `OrbitControls` (Three.js).
  - Montado em `<main id="viewer-canvas">`.
- [x] Autenticação e sessão
  - Inicialização anônima para demo, integração com `AuthService` e tokens no localStorage.
- [x] Upload/download de arquivos IFC
  - Upload via botão ou drag&drop, usando `IFCSimpleLoader` e `ifcService.upload`.
  - Download e abertura de modelos via fetch e `ifcLoader.load`.
- [x] Orçamento/quantitativos 5D
  - Painéis `TakeoffPanel` e `BudgetPanel` na sidebar, usando APIs e lógica de 5D.
- [x] Painéis e UI
  - Componentes como `ScenariosPanel`, `SectionsPanel`, `MeasurementsPanel`, `QueryPanel`, `SelectionActionsPanel`.
- [x] Serviços de API
  - `initializeAPI`, `getIfcService`, `BudgetApiClient`.
- [x] Sistema de navegação e modos (FPS, drone, orbit)
  - FPS, terceira pessoa, drone, órbita, alternados por botões e atalhos de teclado.
- [x] Sistema de inspeção/seleção IFC
  - `inspectorController`, `selectionService`, `batchSelectionService`, raycast picker.

---