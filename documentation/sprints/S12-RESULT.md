# SPRINT-12-RESULT · Primeiro Cenário Salvo ★

> Artefato pós-execução. Marco crítico do roadmap.

**Sprint:** S12 · Primeiro Cenário Salvo
**Status:** Núcleo do objeto central (scenario_state + snapshot + create/clone/save) fechado e testado. CRUD routes + drizzle repo + wiring no viewer = glue/UI.
**Data:** 2026-06-13
**Commit:** `e90e028`

## Objetivo (entregue?)

`Scenario` como objeto central serializável (`scenario_state` único + `state_version`), referenciando ModelVersion. Captura/restaura camera (S09) + visibility (S10). Núcleo entregue + testado headless.

## Arquivos

- `migrations/041_scenarios_s12_state.sql` + `schema/scenarios.ts` - **alterado.** Adiciona `scenario_state`/`state_version`/`model_version_id`/`parent_id`/`is_base_scenario`/`sort_order`/`deleted_at`; camera/player/config legados → nullable (coexistência).
- `modules/scenario/scenario-snapshot.service.ts` - **novo.** capture/restore/validate/migrate/clone do envelope opaco. Única abstração que entende o formato (S18/S24/S28/S30 reusam).
- `modules/scenario/scenarios-v12.service.ts` - **novo.** create/clone/saveState/loadState; repo/limite/telemetria injetados.

## Critérios de aceite: passou?

| Critério | Resultado | Evidência |
|---|---|---|
| `scenario_state` é JSONB único com `state_version` | ✅ | schema + migration 041; envelope do snapshot |
| Criar cenário salva câmera + visibilidade no estado | ✅ | `saveState` → `capture` → `updateState` (teste) |
| `ScenarioSnapshotService` captura/restaura sem viewer persistir direto | ✅ | service isolado; capture/restore/migrate testados |
| Clone parte do estado BASE, não do último | ✅ | `clone` → `findBaseByModelVersion` → copia base (teste fov base, não do clonado) |
| Limite de plano aplicado (Starter máx 2) | ✅ | `checkLimit(current)` lança no 3º; base não conta (teste) |
| Eventos telemetria (`scenario_created/cloned/saved`) | ✅ | `emit` chamado com tenant/project/scenario_id |
| Migrar formatos antigos sem migration de schema | ✅ | `migrate` normaliza estado sem `stateVersion`; rejeita versão futura |
| Build e lint | ✅ | tsc 0, **152/152 testes verdes** |
| Alternar A↔B < 1s sem recarregar GLB | 🟡 frontend | `loadState` restaura só estado; UI ScenarioSwitcher = browser |
| Persistir entre sessões/dispositivos | 🟡 infra | depende do CRUD route + drizzle repo |
| Primeiro usuário cria/alterna sem instrução | 🟡 produto | requer UI + telemetria em produção |

## Aberto (glue/UI)

- `scenarios.routes.ts` CRUD (`/projects/:id/scenarios`) + drizzle `ScenarioRepo` (interface pronta).
- Frontend `ScenarioSwitcher`/`ScenarioList` + `viewer.loadScenario/saveScenario` (usa CameraState/VisibilityState já prontos do S09/S10).
- Telemetria real (`emit` → analytics ingest do S05).

## Schema/migrations (mantra)

`scenarios` estendido em schema drizzle **e** migration 041 (colunas idênticas). Queries do repo via drizzle (sem raw). Legacy camera/player/config relaxados p/ nullable (coexistência). Backend tsc 0; **152/152 verde**.
