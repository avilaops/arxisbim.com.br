# SPRINT-13-RESULT · Extração de Propriedades IFC

> Artefato pós-execução.

**Sprint:** S13 · Extração de Propriedades IFC
**Status:** Núcleo (extração real + normalização + quantidades + schema + batch insert) fechado e testado. Etapa no pipeline S11 + rota + CSV + painel = glue/UI.
**Data:** 2026-06-13
**Commit:** `c324454`

## Objetivo (entregue?)

Transformar dados embutidos no IFC em camada consultável e quantificável (fonte dos quantitativos S20 / custos S22). Extração real de PropertySets + quantidades em SI, persistida em JSONB indexável. Núcleo entregue + testado.

## Arquivos

- `schema/element-properties.ts` + `migrations/042_element_properties.sql` — **novo.** `properties` JSONB (GIN) + `area_m2`/`volume_m3`/`length_m` indexados; índices por (model, type) e (model, storey).
- `modules/ifc/ifc-properties.dto.ts` — **novo.** `ElementProperties`, `PropertySet`.
- `modules/ifc/ifc-properties.builder.ts` — **novo.** Puros: `normalizeValue` (null-safe), `lengthScale`, `extractQuantities` (Qto_* → SI), `normalizePropertySets`.
- `modules/ifc/ifc-properties.extractor.ts` — **novo.** web-ifc `getPropertySets` por elemento (IfcPropertySet + IfcElementQuantity), unidade autoria → SI.
- `modules/ifc/ifc-properties-store.service.ts` — **novo.** Batch insert 1000/transação, idempotente.

## Critérios de aceite — passou?

| Critério | Resultado | Evidência |
|---|---|---|
| `Pset_*Common`, `Qto_*` e Psets customizados extraídos | ✅ | integração IFC4: withPsets > 0 (Pset_/Qto_ reais) |
| `area_m2`/`volume_m3`/`length_m` preenchidos quando disponíveis | ✅ | integração: withQty > 0, valores SI plausíveis |
| Normalização de unidades (mm→m, in→m) | ✅ | `lengthScale` + `extractQuantities` (área=scale², volume=scale³) |
| Pset com null/tipo inesperado normalizado, nunca throw | ✅ | `normalizeValue` (objeto→string); extrator try/catch por elemento |
| Batch insert em lotes de 1000 em transação | ✅ | `chunk` + `db.transaction` por lote (teste de chunking) |
| Build e lint | ✅ | tsc 0, **162/162 testes verdes** |
| Clique abre painel com PropertySets | 🟡 frontend | `PropertiesPanel` = UI; dados prontos |
| Etapa `extract_properties` no pipeline S11 (sem re-parse) | 🟡 infra | extrator + store são o corpo da etapa; wiring no runner S11 |
| Props exportáveis como CSV | 🟡 glue | derivável de `ElementProperties` |
| 50k elementos < 60s | 🟡 infra | batching pronto; medição no pipeline real |

## Aberto (glue/infra)

- Etapa `extract_properties` em `runPipeline` (S11): reusa o modelo aberto do parse (sem re-abrir) → chama `extractProperties` + `IfcPropertiesStore.persist`.
- `GET /elements/:expressId/properties` + export CSV por elemento/tipo.
- `frontend/src/viewer/PropertiesPanel.ts` (UI; consome a rota).

## Schema/migrations (mantra)

`element_properties` em schema drizzle **e** migration 042 (colunas/índices idênticos: GIN em properties, (model,type), (model,storey), (model,express)). Inserts via drizzle (sem raw). Backend tsc 0; **162/162 verde**.
