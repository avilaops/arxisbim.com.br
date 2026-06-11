# S11 · Processamento Assíncrono + Observabilidade IFC

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S07 (parser estrutura), S08 (parser geometria), S06 (logs estruturados)  
**Bloqueia:** S12 (cenário precisa de modelo `ready`)

---

## Objetivo

Pipeline de background para processar IFC: upload → fila → parse → geometria → armazenamento → notificação. Modelo grande não bloqueia request. Logs granulares por etapa.

---

## Por que importa a longo prazo

Este é o sprint que determina a confiabilidade do produto. Modelos IFC reais chegam com 200–500 MB, levam minutos para processar, e falham de maneiras diversas (IFC malformado, memória insuficiente, entidades não suportadas). Sem pipeline assíncrono robusto, qualquer modelo grande trava a API ou gera timeout.

Os logs estruturados com etapas de parse definidos aqui são o que vai economizar horas quando um modelo de um cliente enterprise falhar em produção 6 meses depois.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Fila | BullMQ + Redis | Retry automático, visibilidade de jobs, persistência entre restarts |
| Workers | Processos separados (não threads) | Isolamento de memória — crash do worker não derruba API |
| Etapas do pipeline | `download → parse_structure → parse_geometry → serialize_glb → upload_glb → update_db` | Granularidade para diagnóstico |
| Status polling | `GET /models/:id/status` com SSE (Server-Sent Events) | Sem WebSocket overhead para operação one-shot |
| Retry | 3 tentativas com backoff exponencial | Erros transientes de storage se recuperam |
| Timeout por etapa | `parse_structure: 120s, parse_geometry: 300s` | Kill job travado |

---

## Etapas e logs

```typescript
// Cada etapa loga:
logger.info({ job_id, model_id, tenant_id, stage, duration_ms }, 'IFC pipeline stage complete')
logger.error({ job_id, model_id, stage, error: err.message }, 'IFC pipeline stage failed')

// Stages:
type PipelineStage =
  | 'download'          // baixa IFC do R2
  | 'parse_structure'   // web-ifc → IFCStructure
  | 'parse_geometry'    // web-ifc → BufferGeometry
  | 'serialize_glb'     // geometria → GLB
  | 'upload_glb'        // GLB → R2
  | 'update_db'         // model_version.status = 'ready'
```

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-pipeline.queue.ts   ← definição BullMQ queue + job types
  ifc-pipeline.worker.ts  ← consumer do queue, orquestra stages
  ifc-pipeline.service.ts ← enfileira job após upload

backend/src/modules/models/
  models-status.routes.ts ← GET /models/:id/status (SSE)

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
- [ ] Modelo de 200 MB processa sem timeout de request
- [ ] Job com falha em `parse_structure` retenta 3x e marca status `failed`
- [ ] Falha de worker (crash) não derruba a API principal
- [ ] Log JSON com `stage` + `duration_ms` em cada etapa
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
