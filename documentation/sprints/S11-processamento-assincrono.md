# S11 · Processamento Assíncrono + Observabilidade IFC

**Fase:** IFC Core  
**Status:** ✅ Entregue (chega ao usuário)  
**Backend:** sim · **Interface:** sim  
**Verificado em:** 02/09/2026 — Upload assincrono com status.
**Depende de:** S07 (parser estrutura), S08 (parser geometria), S06 (logs estruturados)  
**Bloqueia:** S12 (cenário precisa de modelo `ready`)

---

## Objetivo

Pipeline de background para processar IFC: upload → fila → parse → geometria → armazenamento → notificação. Modelo grande não bloqueia request. Logs granulares por etapa.

> **Nota para o agente:** O objetivo do S11 **não é apenas processar IFC em background.** É estabelecer o **pipeline operacional reutilizável** que suportará todos os processamentos futuros do produto: parse IFC, quantitativos 5D (S20), importação de cronogramas (S28), cálculo de cenários e futuras rotinas de Digital Twin. Projete a fila, o registro de etapas e a observabilidade como infraestrutura genérica, não específica de IFC.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Cálculo de quantitativos / custos (S20, S22), apenas reusam este pipeline depois
- Importação de cronograma (S28)
- Comparação de cenários (S18, S30)
- Priorização de fila por plano / billing
- Distribuição multi-região de workers

---

## Por que importa a longo prazo

Este é o sprint que determina a confiabilidade do produto. Modelos IFC reais chegam com 200–500 MB, levam minutos para processar, e falham de maneiras diversas (IFC malformado, memória insuficiente, entidades não suportadas). Sem pipeline assíncrono robusto, qualquer modelo grande trava a API ou gera timeout.

Os logs estruturados com etapas de parse definidos aqui são o que vai economizar horas quando um modelo de um cliente enterprise falhar em produção 6 meses depois.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Fila | BullMQ + Redis | Retry automático, visibilidade de jobs, persistência entre restarts |
| Workers | Processos separados (não threads) | Isolamento de memória, crash do worker não derruba API |
| Etapas do pipeline | `download → parse_structure → parse_geometry → serialize_glb → upload_glb → update_db` | Granularidade para diagnóstico |
| Status do modelo vs etapa | `ModelStatus` (draft/queued/processing/ready/failed) separado de `ProcessingStage` | Estado de negócio ≠ estado técnico do pipeline |
| Histórico de etapas | Tabela `model_processing_runs` persiste cada etapa | Diagnosticar ticket de cliente meses depois sem caçar logs |
| Deduplicação | `file_hash` (SHA-256) em `model_versions` → skip se já processado | Não reprocessar IFC gigante re-enviado por engano |
| Status polling | SSE preferencial + **polling fallback a cada 5s** | Proxies/firewalls corporativos quebram SSE |
| Retry | 3 tentativas com backoff exponencial | Erros transientes de storage se recuperam |
| Timeout por etapa | `parse_structure: 120s, parse_geometry: 300s` | Kill job travado |

---

## Etapas e logs

```typescript
// Cada etapa loga:
logger.info({ job_id, model_id, tenant_id, stage, duration_ms }, 'IFC pipeline stage complete')
logger.error({ job_id, model_id, stage, error: err.message }, 'IFC pipeline stage failed')

// Stages:
type ProcessingStage =
  | 'download'          // baixa IFC do R2
  | 'parse_structure'   // web-ifc → IFCStructure
  | 'parse_geometry'    // web-ifc → BufferGeometry
  | 'serialize_glb'     // geometria → GLB
  | 'upload_glb'        // GLB → R2
  | 'update_db'         // model_version.status = 'ready'

// Status de negócio do modelo (separado da etapa técnica):
type ModelStatus = 'draft' | 'queued' | 'processing' | 'ready' | 'failed'
```

---

## Histórico de processamento (persistido)

Cada execução de etapa grava uma linha, fonte de diagnóstico durável, não apenas log:

```sql
model_processing_runs (
  id                UUID PK,
  model_version_id  UUID FK model_versions NOT NULL,
  stage             VARCHAR(50) NOT NULL,   -- ProcessingStage
  status            VARCHAR(20) NOT NULL,   -- running | ok | failed
  started_at        TIMESTAMP,
  finished_at       TIMESTAMP,
  duration_ms       INT,
  error_message     TEXT
)
```

Permite abrir o banco e ver `parse_structure → OK`, `parse_geometry → FAILED (Invalid IfcRelAggregates)` em segundos.

---

## Métricas obrigatórias

Emitidas via log estruturado desde já (instrumentação pronta para Prometheus/OTel futuro):

- `ifc_jobs_total`
- `ifc_jobs_failed_total`
- `ifc_processing_duration_seconds`
- `ifc_parse_duration_seconds`
- `ifc_geometry_duration_seconds`

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-pipeline.queue.ts   ← definição BullMQ queue + job types
  ifc-pipeline.worker.ts  ← consumer do queue, orquestra stages
  ifc-pipeline.service.ts ← enfileira job após upload

backend/src/modules/models/
  models-status.routes.ts ← GET /models/:id/status (SSE + polling fallback)

backend/db/schema/
  processing.ts           ← model_processing_runs

docker-compose.dev.yml    ← adicionar Redis service
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Redis indisponível bloqueia novos uploads | Fallback para processamento síncrono em dev |
| Job travado em `parse_geometry` por modelo WASM crash | Timeout por etapa + worker process isolation |
| Re-upload do mesmo arquivo reprocessa tudo | Hash do arquivo → skip se `model_version` com mesmo hash existe |

---

## Critérios de aceite

- [ ] `POST /models` retorna 202 imediatamente (< 100ms)
- [ ] `GET /models/:id/status` via SSE envia progresso por etapa em tempo real
- [ ] Polling fallback (5s) funciona quando SSE é bloqueado
- [ ] 5 uploads simultâneos entram na fila sem perda de jobs
- [ ] Modelo de 200 MB processa sem timeout de request
- [ ] Upload do mesmo arquivo reutiliza resultado anterior quando `file_hash` coincide
- [ ] Cada etapa grava linha em `model_processing_runs` (status, duração, erro)
- [ ] `ModelStatus` e `ProcessingStage` são campos distintos
- [ ] Métricas (`ifc_jobs_total`, `ifc_jobs_failed_total`, durações) emitidas
- [ ] Job com falha em `parse_structure` retenta 3x e marca status `failed`
- [ ] Falha de worker (crash) não derruba a API principal
- [ ] Log JSON com `stage` + `duration_ms` em cada etapa
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
