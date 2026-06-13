# SPRINT-09-RESULT · Viewer — Navegação e Câmera

> Artefato pós-execução. Evidência verificável coletada na sessão.

**Sprint:** S09 · Viewer — Navegação e Câmera
**Status:** Núcleo serializável/desacoplado fechado e testado. Navegação visual (orbit/raycast/highlight) = verificação com canvas/GPU real.
**Data:** 2026-06-13
**Commit:** `70f815a`

## Objetivo (entregue?)

Navegação 3D como **estado persistente e reproduzível**, independente do motor gráfico. Núcleo entregue: câmera serializável, seleção por expressID, fachada que não vaza Three.js.

## Arquivos (frontend/src/viewer)

- `CameraState.ts` — DTO `CameraState` versionado + `ViewerState`; `isCameraState`, `cameraStatesEqual`.
- `CameraPresets.ts` — presets do bbox (front/back/top/bottom/left/right/iso); `resetCameraState` determinístico.
- `Selection.ts` — seleção/hover só com expressID; callbacks; idempotência.
- `Camera.ts` — wrapper PerspectiveCamera com getState/setState exatos.
- `ViewerFacade.ts` — API pública (expressID + CameraState apenas); `pickObject` raycast→expressID; `RenderBridge` p/ a camada de render.

## Critérios de aceite — passou?

| Critério | Resultado | Evidência |
|---|---|---|
| `camera.getState()` serializável com version | ✅ | `isCameraState` + JSON roundtrip |
| `camera.setState()` restaura câmera exata | ✅ | `Camera.test` roundtrip |
| Presets calculados do bounding box (qualquer escala) | ✅ | teste escala 1m vs 400m |
| Preset iso centra o modelo | ✅ | target = centro do bbox |
| Reset recalcula do bbox atual (determinístico) | ✅ | `reset` idêntico em repetição |
| **Clique em mesh retorna expressID correto** | ✅ **headless** | BVH raycast real: GLB→three→raio→ElementIndex→1001 (`ViewerRaycaster.test`) |
| Clique no vazio deseleciona | ✅ headless | raio que erra → null → `pickObject` clear |
| Hover destaca sem persistir seleção | ✅ | `hover` não altera selected |
| Seleção desacoplada (só expressID, nunca Object3D) | ✅ | `Selection`/fachada |
| **BVH construído 1× no load, não por seleção** | ✅ headless | `buildBVH` idempotente (rebuild no-op) |
| Preset iso < 300ms | ✅ (lógica) | `CameraAnimator` chega exato a B em 300ms; suavidade visual = browser |
| Nenhum consumer fora do Viewer importa Three.js | ✅ | fachada troca só DTO |
| Build e lint | ✅ | tsc 0, build ok, **32 testes viewer verdes** |
| Clique vs arrasto (mouseup + threshold; touch área maior) | ✅ headless | `ViewerInput`/`ViewerInputController` (mouse 4px, touch 12px); arrasto preserva seleção |
| Seleção correta após orbit/pan/zoom | ✅ (lógica) | arrasto não toca seleção; raycast pós-movimento idêntico (matemática) |
| Orbit/pan/zoom mouse+touch (gesto real) | 🟡 browser | OrbitControls (eventos DOM) — verificação visual |
| Highlight visual / outline (pixels) | 🟡 browser | render pass — canvas/GPU |
| FPS > 30 em 10k elementos | 🟡 browser/GPU | render loop real |

## Headless provado (atualização)

`three-mesh-bvh@0.5.24` instalado. `ViewerRaycaster` + `CameraAnimator` fecham, SEM browser, os critérios antes tidos como visuais: clique→expressID via BVH real, BVH-1×, preset<300ms (lógica). Raycaster+geometria são matemática pura → testáveis sem WebGL.

## Aberto

- **Migração do `ViewerHost` legado** (débito): expõe `THREE.PerspectiveCamera` e `Object3D` direto — viola o contrato S09. Deve rotear pela `ViewerFacade`. ~766 linhas; seu `.test` falha por WebGL no jsdom (pré-existente). Tarefa própria.
- Só-browser/GPU: orbit/pan/zoom (input DOM), outline em pixels, FPS>30, 1º frame<5s. `RenderBridge`/`tick(now)` já preparados p/ a camada de render plugar.
- Backend: **nada tocado** no S09 (puro frontend). v1/drizzle/zod/migrations intactos (**130/130, tsc 0**).
