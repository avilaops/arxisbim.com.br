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
| Clique em elemento seleciona | ✅ | `pickObject`→expressID→select |
| Clique no vazio deseleciona | ✅ | objeto sem expressID → clear |
| Hover destaca sem persistir seleção | ✅ | `hover` não altera selected |
| Seleção desacoplada (só expressID, nunca Object3D) | ✅ | `Selection`/fachada |
| Nenhum consumer fora do Viewer importa Three.js | ✅ | fachada troca só DTO |
| Build e lint | ✅ | tsc 0, build ok, 15 testes verdes |
| Orbit/pan/zoom mouse+touch | 🟡 browser | OrbitControls — verificação visual |
| Seleção correta após orbit/pan/zoom | 🟡 browser | raycast real (BVH) — canvas |
| Highlight visual / outline | 🟡 browser | render pass — canvas |
| Preset iso < 300ms | 🟡 browser | animação real |
| BVH construído 1× no load | 🟡 browser | three-mesh-bvh (ABSENT) na camada de render |

## Aberto

- **Migração do `ViewerHost` legado** (débito): expõe `THREE.PerspectiveCamera` e `Object3D` direto — viola o contrato S09. Deve rotear pela `ViewerFacade`. Refactor de ~766 linhas, tarefa própria.
- Camada de render (orbit/pan/zoom, raycast+BVH, outline) + `three-mesh-bvh` — verificação visual com canvas/GPU. `RenderBridge` já preparada.
- Backend: **nada tocado** no S09 (puro frontend). v1/drizzle/zod/migrations intactos (130/130).
