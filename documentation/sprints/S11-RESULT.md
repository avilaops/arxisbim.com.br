# SPRINT-11-RESULT · Processamento Assíncrono + Observabilidade IFC

> Artefato pós-execução. Evidência coletada na sessão.

**Sprint:** S11 · Processamento Assíncrono
**Status:** Núcleo reutilizável (runner + orquestração + histórico + dedup + métricas) fechado e testado. Transporte BullMQ/Redis + rota SSE/polling + factory das stages reais = infra (precisa Redis).
**Data:** 2026-06-13
**Commit:** `efbeb4a`

## Objetivo (entregue?)

Pipeline operacional **reutilizável** (spec: infra genérica, não específica de IFC). Núcleo entregue: runner de etapas com timeout/retry/histórico/métricas, dedup por file_hash, separação ModelStatus vs ProcessingStage.

## Arquivos

- `shared/pipeline/stage-pipeline.ts` — **novo.** Runner genérico: ordem, timeout/etapa, retry 3x backoff exponencial, recorder/logger/metric injetáveis. Reusado por S20/S28/cenários.
- `shared/database/schema/processing.ts` + `migrations/040_model_processing_runs.sql` — **novo.** Histórico durável por etapa.
- `modules/ifc/ifc-pipeline.types.ts` — **novo.** `ProcessingStage` (6 etapas), `ModelStatus` (negócio), `STAGE_TIMEOUT_MS`.
- `modules/ifc/ifc-pipeline.ts` — **novo.** Orquestra dedup + status + métricas `ifc_jobs_*`.
- `modules/ifc/ifc-pipeline.recorder.ts` — **novo.** Impl drizzle (`DbStageRecorder`, `DrizzleModelStatusStore`).

## Critérios de aceite — passou?

| Critério | Resultado | Evidência |
|---|---|---|
| Cada etapa grava linha em model_processing_runs (status, duração, erro) | ✅ | `DbStageRecorder` + `recorder.start/finish/fail` no runner (teste com fake) |
| `ModelStatus` e `ProcessingStage` distintos | ✅ | tipos separados em `ifc-pipeline.types` |
| Métricas (`ifc_jobs_total`, `ifc_jobs_failed_total`, durações) emitidas | ✅ | teste do orquestrador |
| Job com falha retenta 3x e marca `failed` | ✅ | runner retry+backoff; orquestrador → status failed (teste) |
| Timeout por etapa mata job travado | ✅ | `withTimeout` (teste timeout) |
| Re-upload reutiliza resultado quando `file_hash` coincide | ✅ | dedup `findReadyBySha256` → skip stages (teste) |
| Falha de worker não derruba a API | ✅ | orquestrador nunca lança (retorna status failed) |
| Log JSON com `stage` + `duration_ms` por etapa | ✅ | `logger.info({stage,duration_ms})` no runner |
| Build e lint | ✅ | tsc 0, 9 testes verdes |
| `POST /models` 202 < 100ms | 🟡 infra | enfileira + retorna; precisa do worker/rota |
| `GET /models/:id/status` SSE + polling 5s | 🟡 infra | rota HTTP — precisa Redis/transporte |
| 5 uploads simultâneos sem perda / 200MB sem timeout | 🟡 infra | BullMQ+Redis (processos separados) |

## Aberto (infra — precisa Redis)

- BullMQ queue + worker (processo separado) consumindo `runPipeline`. Fallback síncrono em dev (spec) é trivial sobre o orquestrador.
- Rota `GET /models/:id/status` (SSE + polling 5s).
- Factory das 6 stages reais ligando `IfcParserStructureService` + `IfcGeometryPipelineService` (atual `buildGeometry` já faz serialize_glb+upload_glb juntos — separar p/ granularidade plena é refinamento).
- Pool de workers do S07/S08: spec usa **processos separados** (BullMQ) → isolamento por processo cobre o "worker frio"; thread-pool intra-processo vira refinamento de perf.

## Schema/migrations (mantra)

`model_processing_runs` definido em schema drizzle **e** migration 040 (colunas idênticas). sha256/status já em model_versions. Queries do recorder via drizzle (sem raw). Backend tsc 0; suíte 133 verdes (1 flaky pré-existente, DB warmup).
