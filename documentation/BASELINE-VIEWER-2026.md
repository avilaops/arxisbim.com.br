# Baseline do viewer: Fase 0 do plano "superar a referência"

**Data:** 11/09/2026
**Fonte da verdade:** o que chega ao bundle a partir de `src/main.tsx` (58 arquivos)
e a aplicação publicada em `arxisvr.avilaops.com`. Nada abaixo vem de documento
antigo; cada linha foi conferida no repositório, no `node_modules` ou em produção.

---

## 1. Estado real do viewer vivo

**Superfície:** `pages/Viewer3DPage.tsx` (viewer) e `pages/ComparePage.tsx`
(S18), com `components/viewer/{ViewerCanvas,ViewerToolbar,ProjectModelsPanel,
ScenariosPanel,ViewerPropertiesPanel,visibilidadeIfc}` e
`components/comparison/{ComparisonCanvas,cameraSync}`. São **9 arquivos** de
viewer entre os 58 vivos; **954** arquivos `.ts/.tsx` existem em `src/`.

**O que o `ViewerCanvas` faz hoje** (lido no código, não na doc):

| Área | Estado |
|---|---|
| Renderer | `WebGLRenderer({ antialias })`, pixel ratio ≤ 2, `shadowMap.enabled` mas nenhuma malha recebe/lança sombra de forma útil; sem tone mapping, sem `outputColorSpace` (não existe no r149), sem environment, sem AO, sem pós-processamento |
| Luz | 1 `HemisphereLight` + 1 `DirectionalLight` com `castShadow` |
| Câmera | `PerspectiveCamera` + `OrbitControls` (damping); WASD/QE por teclado; touch = OrbitControls |
| IFC | `web-ifc-three` 0.0.126 → `web-ifc` 0.0.77, **na main thread** (`useWebWorkers(false)`), `COORDINATE_TO_ORIGIN`, `USE_FAST_BOOLS`; um mesh por modelo |
| Seleção | **não existe**: sem raycaster, sem clique no canvas; o painel "Informações" (54 linhas) mostra só "Selecione um elemento" |
| Propriedades | não existe |
| Visibilidade | por categoria IFC via subsets de expressID (S18, 09/09) |
| Corte, medição, isolar | não existem |
| Cenário | câmera + categorias ocultas (S12/S18) |
| Comparação | dois canvas, dois renderers, um `IFCLoader`, `CameraSync`, destaque por subset com material próprio (S18) |
| Colaboração | nada no viewer vivo; `socket.io-client` está no `package.json` mas nenhum arquivo vivo o importa |
| XR | nada vivo |
| Dispose | geometria, materiais, controls, `ifcManager.dispose()`, listeners: coberto no cleanup do efeito |
| Telemetria | nenhuma; `renderer.info` não é lido em lugar nenhum |

## 2. Versões reais (`node_modules`, não `package.json`)

| Lib | Versão | Observação |
|---|---|---|
| three | **0.149.0** (jan/2023) | pinado; `@types/three` 0.149.0; é o teto que o `web-ifc-three` 0.0.126 aceita |
| web-ifc | **0.0.77** (o hoisted); o `web-ifc-three` traz a sua própria cópia aninhada | duas cópias no lockfile |
| web-ifc-three | 0.0.126 | **descontinuado** pela That Open em favor de `@thatopen/components` + fragments |
| three-mesh-bvh | 0.5.24 | instalado, **não usado** no viewer vivo (só no órfão `ViewerRaycaster`) |
| @babylonjs/core | 9.13.0 | instalado, **zero uso** vivo: 2 chunks de nada |
| socket.io-client | 4.8.3 | zero uso vivo |
| react / vite | 19.2.7 / 8.0.14 (rolldown) | |

**Bundle publicado (`pages-BIoc7CZP.js`):** `pages` 3,7 MB, `web-ifc` 2,55 MB,
`three-vendor` 606 KB, `react-vendor` 179 KB; `dist` = 14 MB com o wasm.
O chunk `pages` de 3,7 MB é o sinal: todas as páginas num arquivo só, viewer
incluído, sem code splitting por rota.

## 3. Modelos disponíveis para corpus

Produção tem 3 IFCs, dois deles o mesmo arquivo: `ac20-fzk-haus_ifc4.ifc`
(2,57 MB, casa de 2 pavimentos, 90 elementos com geometria, 9 categorias) e um
de 315 KB. **Não existe modelo médio, grande, nem MEP denso.** O corpus da Fase 0
precisa de assets licenciados de fora (os IFC públicos do buildingSMART /
Open IFC Model Repository servem: FZK-Haus é um deles).

## 4. Benchmark inicial (viewer vivo, produção)

Roteiro: `scratchpad/ui/bench-viewer.mjs` (Playwright, Chromium headless com
ANGLE, 1440×900). Mede sem tocar no código: tempo até o canvas, tempo até o fim
do "carregando", long tasks, heap, frame time parado e em órbita.

**Limitação registrada:** a primeira tentativa em 11/09 rodou numa máquina
saturada por outras sessões (39 processos `node`) e o `goto` da própria landing
estourou 30 s, com o servidor respondendo em 88 ms. Números de máquina saturada
não são baseline; a tabela abaixo é preenchida só com uma rodada em máquina
ociosa, com o hardware anotado.

| Métrica | Valor | Hardware |
|---|---|---|
| ms até o canvas existir | _(pendente)_ | |
| ms até "carregando" sumir | _(pendente)_ | |
| long tasks durante a carga (n / máx ms) | _(pendente)_ | |
| heap JS após carga (MB) | _(pendente)_ | |
| frame time parado p50 / p95 (ms) | _(pendente)_ | |
| frame time em órbita p50 / p95 (ms) | _(pendente)_ | |
| draw calls / triângulos / geometrias | **não mensurável hoje**: o viewer não expõe `renderer.info` | |

O que já se sabe sem medir: o parse do IFC roda na **main thread**, então o
tempo de carga é inteiro uma long task; e o FZK-Haus é pequeno demais para
revelar gargalo de render (90 elementos). O primeiro número útil virá do
modelo médio do corpus.

## 5. Órfãos reaproveitáveis (`src/viewer`, 103 arquivos, 15 mil linhas)

Lidos, não só listados. Cada um é `.ts` sem React, o que é o padrão que já
serviu no S12 e S18 (`CameraSync` veio daqui).

| Peça | Linhas | Testes | Serve para | Veredito |
|---|---|---|---|---|
| `ViewerRaycaster` | 65 | 2 | picking com `three-mesh-bvh` (patch de protótipo, BVH 1× por modelo) | **reutilizar** na Fase 3 (seleção) |
| `ElementIndex` | 69 | 5 | mesh → expressID | reutilizar com o de cima |
| `ViewerFacade` | 122 | 5 | fronteira câmera/seleção com `RenderBridge` injetável | **é o embrião da `ArxisViewerEngine`**; a assinatura pedida no prompt cabe em cima dele |
| `ClippingPlane` | 41 | 2 | plano de corte | reutilizar na Fase 3 |
| `VisibilityManager` / `VisibilityState` | 105 | sim | isolar/ocultar por id | comparar com `visibilidadeIfc` (vivo) antes de escolher |
| `IFCMaterialLibrary` | 200 | não | PBR por tipo IFC (parede=concreto, janela=vidro, duto=metal) | **reutilizar** na Fase 2; é exatamente a "camada de materialização" do prompt |
| `HDRIManager` | 388 | não | RGBELoader + PMREM + ACES + `scene.environment` | reutilizar na Fase 2; conferir contra o r149 antes (usa `toneMapping`, que existe) |
| `BIMEnvironment` / `PhysicalSkyEnvironment` / `SunPositionCalculator` | 314+ | não | céu, sol, terreno | candidato à Fase 2 "modo apresentação" |
| `LODManager` | 248 | não | frustum + LOD por distância | avaliar na Fase 1 depois de medir |
| `MemoryMonitor` | 252 | não | heap e `renderer.info` no tempo | base do painel de performance (Fase 0) |
| `FPSControls` / `ThirdPersonControls` / `DroneControls` | 575 / 381 / ? | `ControlsLifecycle.test` | walk / third-person / fly | Fase 4; **sem colisão** (não há capsule nem BVH neles) |
| `SplitView` | 344 | 18 | um canvas, dois viewports (`setScissor`) | o S18 vivo usa **dois renderers**; o sprint S18 dizia "um context com viewports". Medir os dois antes de trocar |
| `TypeColorizer` / `DisciplineTaxonomy` | 199 / 33 | sim | cor por tipo, disciplinas | Fase 3 (painel de disciplinas) |
| `src/engine/IFCLoader` | 774 | ? | wrapper do mesmo `web-ifc-three`, workers desligados | **não** reutilizar: mesma dívida do vivo, mais código |
| `src/timeline/*` | 1.119 | sim | 4D (S26) | fora desta frente |

**Não reutilizar:** `@babylonjs/core` (9 MB de dependência sem um import vivo),
`src/engine/Renderer.ts`, os `example-viewer3d*.ts`.

## 6. Backend que já existe para as fases 4 a 6 (não inventar)

| Módulo | Rotas | Estado |
|---|---|---|
| `virtual-meetings` | criar sala, entrar por código, participantes, mensagens, `collaboration/updates`, `collaboration/snapshot`, `media-config`; **gateway Socket.IO** montado no mesmo servidor (`/socket.io/`) | backend pronto, **nenhum cliente vivo**; `VirtualMeetingsClient.ts` existe órfão |
| `collaboration` | comentários por recurso, atividades, feed | idem |
| `clash-detection` | `scan` por projeto, listagem, stats; `ifc-aabb.parser` (AABB, não geométrico) | backend pronto, sem tela |
| `streaming` | orquestrador | não lido a fundo |
| `notifications` | namespace Socket.IO `/notifications` | sem cliente vivo |

O prompt pede "não transportar vídeo em Socket.IO": o backend já separa
(`media-config` é WebRTC/LiveKit por configuração; o gateway leva só estado).

## 7. Riscos de upgrade (medidos, não supostos)

1. **three 0.149 → atual (r17x)**: `web-ifc-three` 0.0.126 não acompanha; o
   caminho é trocar o loader junto (That Open) ou congelar o three. Não dá para
   subir só o three.
2. **`outputColorSpace`**: já quebrou uma vez (código do viewer usava API do
   r152 no r149; removido em 08/09). O r149 usa `outputEncoding = sRGBEncoding`.
   Qualquer mexida em cor precisa do golden screenshot do item 9 antes.
3. **WebGPU**: no r149 **não existe** `WebGPURenderer` utilizável. WebGPU só
   entra depois do upgrade do three, atrás de flag, como o prompt já diz.
4. **Duas cópias de `web-ifc`** no lockfile: o wasm servido de `/wasm/` tem de
   bater com a cópia que o `web-ifc-three` usa, não com a hoisted.
5. **Bundle único de páginas** (3,7 MB): o viewer carrega junto com a landing.
   Code splitting por rota é ganho barato e mensurável.

## 8. Proposta da `ArxisViewerEngine`

Partir da assinatura do prompt e do `ViewerFacade` órfão (que já tem
`RenderBridge` injetável e testes). A fronteira concreta:

- `engine/ArxisViewerEngine.ts` (sem React): `loadModel`, `unloadModel`,
  `get/applyCameraState`, `get/applyVisibilityState` (categorias IFC, como hoje;
  ids estáveis = tipo IFC agora, GlobalId quando houver seleção), `selectElement`,
  `isolate/hide/show`, `fitTo`, `setSectionPlane`, `setQuality`,
  `getPerformanceMetrics` (lê `renderer.info` + frame time), `dispose`.
- `ViewerCanvas.tsx` passa a ser um host fino que instancia a engine e expõe o
  mesmo `ViewerHandle` de hoje (para não quebrar S12/S18).
- `ComparisonCanvas.tsx` instancia duas engines (ou uma com dois viewports,
  decidido pelo benchmark do `SplitView`).

## 9. Ordem, e o que entra agora

**Adotar agora (Fase 0 e 1):** `renderer.info` exposto num handle de dev;
painel de performance escondido; corpus com 4 IFCs públicos; golden screenshots
determinísticos (mesma câmera, mesmo modelo) para cor; parse do IFC em **worker**
(o `web-ifc-three` tem `useWebWorkers(true)` e já foi desligado por algum
motivo não documentado: medir); BVH do `ViewerRaycaster` para picking; code
splitting do viewer; `dispose` testado 10× abrir/fechar com heap medido.

**Experimentar (spike isolado, com números):** `@thatopen/components` +
fragments contra o loader atual no mesmo corpus; `SplitView` de um context
contra os dois renderers do S18; `LODManager`.

**Não vale agora:** WebGPU (bloqueado pelo three 0.149), Rapier/física, XR,
LiveKit, avatar de corpo inteiro, clash geométrico. Cada um entra quando a fase
anterior tiver baseline e prova.

## 10. Regras que este documento obriga

Nenhuma mudança de renderer, loader ou iluminação entra sem: a tabela do item 4
preenchida ANTES, a mesma tabela DEPOIS na mesma máquina, golden screenshot
comparado, S12 e S18 provados em produção, type-check zero, build verde.
