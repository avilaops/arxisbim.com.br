# SPRINT-07-RESULT · Parser IFC: Estrutura Base

> Artefato de memória pós-execução. Evidência verificável coletada na sessão de fechamento.

**Sprint:** S07 · Parser IFC, Estrutura Base
**Status:** Concluído (núcleo + utopia mensurável). Pool de workers fica para S11.
**Data de fechamento:** 2026-06-13
**Commits:** `345e344`, `c4e5707`, `8872e91`, `3542bba`, `646d754`

---

## Objetivo (entregue?)

Transformar qualquer arquivo IFC num modelo de domínio estável (`IFCStructure`), hierarquia espacial, grafo de entidades, stats e bounding box. Sem geometria de render. **Entregue e validado em 3 schemas reais.**

## Arquivos

- `src/modules/ifc/ifc-structure.dto.ts` - **novo.** DTO `IFCStructure` versionado (`version:1`); doc: bbox sempre metros, `units` = autoria.
- `src/modules/ifc/ifc-structure.builder.ts` - **novo.** Helpers puros: `classifyDiscipline`, `buildStats`, `createBBoxAccumulator` (bbox in-place, zero alloc/vértice), `mergeBoundingBox`, `boundingBoxFromPoints`.
- `src/modules/ifc/ifc-parser.worker.ts` - **novo.** web-ifc (WASM) em `worker_threads`: schema, árvore espacial, enumeração completa por `GetLineIDsWithType`, bbox geométrico via `StreamAllMeshes`, dedup GlobalId, units do `IfcUnitAssignment`.
- `src/modules/ifc/ifc-parser-structure.service.ts` - **novo.** Spawna worker, timeout 60s, ArrayBuffer transferível, handlers `error`/`exit`, logs formato S06.
- `web-ifc@0.0.77` adicionado ao backend.

## Critérios de aceite: passou?

| Critério | Resultado | Evidência |
|---|---|---|
| Lê IFC 2x3 e 4.x sem crash | ✅ | 3 schemas reais: IFC2X3, IFC4, IFC4X3_ADD2 (`ifc-parser.worker.spec`) |
| Hierarquia espacial Site→Building→Storey | ✅ | `spatialTree[0]` = IfcProject; storey mapeado por elemento |
| `byType` por tipo | ✅ | soma = totalElements (assert) |
| `byDiscipline` populado | ✅ | 4 chaves architecture/structure/mep/other |
| `boundingBox` em toda saída | ✅ | metros (web-ifc normaliza), in-place |
| DTO `version:1` + `parentExpressID` | ✅ | assert no DTO |
| Parsing de 50MB < 10s | ✅ | **57MB → 2.9s** (prod path, modelo sintético 20× do AC20-FZK IFC4) |
| Memória do parse < 3× arquivo | ✅ | **1.85×** (delta RSS 106MB / 57MB) |
| GlobalId + expressID por elemento | ✅ | + dedup de GlobalId duplicado (expressID é autoridade) |
| Logs sucesso/falha formato S06 + `error_type` | ✅ | `IFC parse success/failed` com req_id/model_version_id/schema/elements/duration_ms |
| Worker não bloqueia event loop | ✅ | 510 ticks de setInterval durante parse de 57MB |
| Build e lint passam | ✅ | tsc 0 erros, esbuild ok, 121/121 testes verdes |

## Benchmark (modelo sintético 57MB, prod path via service)

```
fileMb: 57.1 · sec: 2.9 · baseRssMb: 348 · peakRssMb: 453 · deltaMb: 106 · ratioOverFile: 1.85 · ticksDuringParse: 510
```

Modelo sintético = AC20-FZK-Haus (IFC4) replicado 20× com renumeração de `#IDs` (STEP válido). Patológico (geometria 20× duplicada) → número é teto pessimista; modelo real de 57MB tende a ratio menor.

## Aberto (não-bloqueante)

- **Pool de workers + fila de concorrência.** Hoje 1 worker frio por parse (Init WASM ~200ms cada); N uploads simultâneos = N instâncias WASM. Pertence ao **S11** (pipeline assíncrono), onde o pool é parte do design.
- **Wiring parser→upload→persist.** S11.
- 5º modelo de referência (`rac_advanced`, infra bridge): 3 schemas já cobrem 2x3/4/4.3; cobertura adicional é incremental.
- `ifc-parser.service.ts` legado (regex/texto) mantido para outros consumers; o caminho S07 é o novo worker.
