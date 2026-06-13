# SPRINT-08-RESULT · Parser IFC — Geometria

> Artefato de memória pós-execução. Evidência verificável coletada na sessão de fechamento.

**Sprint:** S08 · Parser IFC — Geometria
**Status:** Núcleo + contrato + ponte de identidade fechados e testados. Critérios de GPU/visual ficam para verificação no S09 (viewer).
**Data de fechamento:** 2026-06-13
**Commits:** `c446035` (backend), `6181c19` (frontend)

---

## Objetivo (entregue?)

Extrair geometria real de cada IfcProduct → GLB (cache de render) → ponte confiável BIM↔mesh (clique→expressID). **Substituiu o S08 regex por pipeline real web-ifc.** Render visual/FPS é browser (S09).

## Arquivos

**Backend**
- `ifc-geometry.dto.ts` — **novo.** `MeshReference` + `GeometryManifest` versionado; `BoundingSphere`.
- `ifc-geometry.builder.ts` — **novo.** Puros: `boundingSphereFromPoints`, `sphereFromBounds`, `instanceKey` (geom+material), `writeGlb` (glTF 2.0 binário à mão, sem dep; expressID/globalId nos `extras`).
- `ifc-geometry.worker.ts` — **novo.** web-ifc em worker_threads: vértices+índices → world (metros) → GLB + manifest + instancedGroups + bounds/sphere do modelo.
- `ifc-geometry-pipeline.service.ts` — **novo.** Spawna worker, salva GLB no storage (cache regenerável), logs S06, handlers error/exit/timeout.

**Frontend**
- `viewer/MeshReference.ts` — tipos espelho do contrato.
- `viewer/ElementIndex.ts` — `Map<expressID, MeshReference>`; `resolveExpressID` sobe a hierarquia (clique→id); `byType` (base S10). Sem Three.js, sem BIM.
- `viewer/ModelLoader.ts` — GLTFLoader carrega GLB, popula `userData.expressID`. **ZERO lógica BIM** (só Three + manifest).

## Critérios de aceite — passou?

| Critério | Resultado | Evidência |
|---|---|---|
| Cada elemento com mesh identificável por expressID | ✅ | GLB node extras + `ElementIndex`; 115/83/12 meshes nos 3 fixtures |
| **Clique em mesh retorna expressID correto** | ✅ (headless) | roundtrip GLB→GLTFLoader→ElementIndex→expressID (`ModelLoader.roundtrip.test`); raycast real = S09 |
| Instancing só com geometria + material idênticos | ✅ | `instanceKey` = geometryId+cor (não só tipo IFC); `instancedGroups` count>1 |
| MeshReference com expressID/globalId/type/bounds/boundingSphere | ✅ | DTO + teste |
| ModelLoader sem lógica BIM | ✅ | só Three + manifest |
| BoundingBox e BoundingSphere do modelo | ✅ | `modelBounds`/`modelSphere`; sphere envolve bbox |
| GLB regenerável do IFC original | ✅ | pipeline re-extrai a qualquer momento (fonte = IFC + IFCStructure S07) |
| Build e lint | ✅ | tsc 0, frontend build ok, 130 backend + 11 frontend testes verdes |
| Modelo visível no canvas | 🟡 browser | GLB carrega (roundtrip ok); render no canvas = S09 |
| FPS > 30 em 10k elementos | 🟡 browser/GPU | instancing preparado (instancedGroups); medição = S09 |
| Tempo até 1º frame < 5s | 🟡 browser | medição = S09 |
| Nada sumido/invertido/fora de escala | 🟡 browser | geometria em metros, bbox real; inspeção visual = S09 |

## Números reais (extração via worker, 3 fixtures)

```
sample.ifc (IFC2X3)        115 meshes · 5 instanced groups · GLB 594KB · 116ms
ac20-fzk-haus (IFC4)        83 meshes · 5 instanced groups · GLB 768KB · 209ms
building-arch (IFC4X3)      12 meshes · 0 instanced groups · GLB  61KB ·  30ms
```

## Aberto

- Critérios de GPU/visual (FPS, 1º frame, "nada sumido") — exigem browser+GPU. Verificação natural no **S09** (viewer/navegação), onde o canvas real existe.
- Wiring do `instancedGroups` no `InstanceManager` existente — render real = S09.
- Pool de workers (Init WASM frio por parse) compartilhado com geometria = **S11**.
- GLB hoje só POSITION (sem normais/índice comprimido). Normais/Draco quando o viewer exigir — pipeline já preparado (não tomou decisão incompatível).
