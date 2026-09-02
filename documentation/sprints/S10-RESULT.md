# SPRINT-10-RESULT · Viewer: Filtros e Visibilidade

> **Revisado em 02/09/2026** (`AUDIT-2026-09-02-sprints-e-codigo-morto.md`):
> backend **sim**, interface **nao**. O status abaixo descreve o núcleo entregue
> na época e continua válido como registro; ele **não** afirma que a
> funcionalidade chega ao usuário hoje.


> Artefato pós-execução. Evidência coletada na sessão.

**Sprint:** S10 · Viewer, Filtros e Visibilidade
**Status:** Núcleo serializável/desacoplado fechado e testado. UI (FilterPanel) + aplicação de `mesh.visible`/clipping no canvas = camada browser.
**Data:** 2026-06-13
**Commit:** `d89f862`

## Objetivo (entregue?)

Visibilidade como **estado serializável e reproduzível** (base p/ cenários S12 salvarem "o que está visível"). Núcleo entregue: DTO versionado, taxonomia configurável, manager desacoplado do Three.js.

## Arquivos (frontend/src/viewer)

- `VisibilityState.ts` - DTO `VisibilityState` versionado; grupos/floors/hiddenElements/clippingPlane; `isVisibilityState`, `defaultVisibilityState`.
- `DisciplineTaxonomy.ts` - tipo IFC → disciplina via **config injetável** (não hard-coded); `makeDisciplineResolver`.
- `VisibilityManager.ts` - `isVisible(expressID)` puro; toggle por grupo/floor; hide/show; `getState`/`setState`; `onApply(id,visible)` p/ render layer. Só expressID/groupKey.
- `ClippingPlane.ts` - `THREE.Plane` + serialização normal+constant.

## Critérios de aceite: passou?

| Critério | Resultado | Evidência |
|---|---|---|
| `getState()` serializável com version | ✅ | `isVisibilityState` + JSON roundtrip |
| `setState()` restaura config exata (grupos+pavimentos+ocultos+corte) | ✅ | teste roundtrip `getState`/`setState` deep-equal |
| Toggle de disciplina oculta/mostra grupo | ✅ | `setGroup` → `isVisible` por disciplina |
| Toggle por grupo (não elemento-a-elemento, <100ms) | ✅ | `recompute` opera por grupo; aplicação O(n) emit |
| Filtro de pavimento isola storey | ✅ | `setFloors([200])` isola; vazio = todos |
| Taxonomia da config do S14, não hard-coded | ✅ | `DisciplineResolver` injetável |
| `VisibilityManager` não expõe Mesh/Object3D | ✅ | API só expressID; `onApply(id,visible)` |
| Visibilidade local à sessão (não vaza p/ outros) | ✅ | estado em memória, nada enviado ao servidor |
| Clipping plane serializável (slider move constant) | ✅ | `ClippingPlane` getState/setState/fromState |
| Build e lint | ✅ | tsc 0, build ok, **57 testes viewer verdes** |
| Corte navegável com slider (visual) | 🟡 browser | `THREE.Plane` pronto; UI slider + render = canvas |
| Toggle <100ms em 10k (medição) | 🟡 browser | lógica O(n) por grupo; FPS/tempo real = canvas |

## Aberto

- `FilterPanel` (UI) + aplicar `mesh.visible` e `renderer.clippingPlanes` no scene = camada de render (browser/GPU). `onApply(id,visible)` é o encaixe.
- Wiring no `ViewerFacade` (get/setVisibilityState) quando S12 precisar, requer storeyId por elemento (do IFCStructure S07) plumbado ao frontend.
- Backend: **nada tocado** (puro frontend). v1/drizzle/zod/migrations intactos (130/130).
