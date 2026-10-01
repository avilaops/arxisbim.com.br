# S06 · Deploy, CI e Observabilidade

**Fase:** Fundação SaaS  
**Status:** 🟡 Parcial (chega em parte ao usuário)  
**Backend:** sim · **Interface:** parcial  
**Verificado em:** 02/09/2026 — Deploy e health no ar. CI nao roda: conta GitHub bloqueada.

> **Infra congelada em 02/09/2026.** Produção em Docker no orquestrador
> `23.88.60.193` (`arxisvr-api`, `arxisvr-db`, `arxisvr-web`), TLS pelo Caddy de
> `/opt/observabilidade`. Banco em **Postgres 18.6** desde 02/09 (era 16), com o
> volume do PG16 preservado em `arxisvr_db-data-pg16-rollback`.
>
> A saída do Docker (PM2 + Postgres no host + Node 24) foi medida e **recusada**:
> não elimina o daemon, então o ganho de RAM é ~zero contra risco real numa
> máquina com 1,4 GB livres e zero swap. Ver
> `documentation/DECISAO-saida-do-docker.md`.
>
> **Armadilha do PG18:** a imagem 18+ espera o volume em `/var/lib/postgresql`,
> não em `/var/lib/postgresql/data`. No caminho antigo o container reinicia em
> loop. Rollback exige desfazer **a tag e o mount**.
>
> O item "deploy automático em push na main" continua **não atendido**: o deploy
> é manual, por `./deploy/deploy.sh [api|web]`, porque a conta do GitHub está
> bloqueada e nenhum Actions roda.
**Depende de:** S01–S05  
**Bloqueia:** Qualquer usuário real antes disso

---

## Objetivo

Pipeline de deploy estável, logs estruturados, alertas de erro e rollback testado. Nenhum usuário real antes de passar por este sprint.

> **Nota para o agente:** Este sprint **não existe para fazer deploy.** Ele existe para garantir que qualquer falha futura possa ser identificada, reproduzida e corrigida rapidamente. Toda decisão deve favorecer rastreabilidade, diagnóstico e segurança operacional antes de favorecer conveniência de implementação.

---

## Fora de Escopo

Observabilidade **suficiente**, não plataforma DevOps corporativa. Pertencem a estágios futuros, **não implementar aqui**:

- Datadog / New Relic
- OpenTelemetry completo
- Kubernetes
- Prometheus / Grafana
- Auto-scaling avançado
- Blue/Green deploy

---

## Por que importa a longo prazo

Observabilidade instalada desde o início é o que separa um produto que evolui com confiança de um que tem medo de cada deploy. Logs estruturados (JSON) desde o S06 permitem busca e alertas nos sprints seguintes sem retrofitting.

O padrão de tracing escolhido aqui (correlation ID nos logs) permite rastrear uma requisição de upload do S11, um cálculo de custo do S22, ou uma animação 4D do S27, todos usando o mesmo padrão de log.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Formato de log | JSON estruturado com `level`, `msg`, `req_id`, `trace_id`, `tenant_id` | Parseable por qualquer agregador |
| Trace context | `request_id` + `trace_id` (+ `span_id` opcional); inicialmente `trace_id = request_id` | Rastrear operação que cruza upload→fila→parser→persistência como uma só |
| Correlation ID | `X-Request-Id` gerado no gateway, propagado por toda requisição | Rastrear req end-to-end |
| Jobs assíncronos | Geram `job_id` próprio e preservam `origin_req_id` do request original | Rastrear S11/S22/S27 de ponta a ponta |
| Alertas | Render alertas nativos + webhook Slack/Discord | Sem dependência de Datadog no início |
| Health check | `/health/live` (processo OK) + `/health/ready` (Postgres + storage OK) | S11/S29 dependem do storage, não só do banco |
| Métricas | Contadores mínimos via log estruturado (sem Prometheus ainda) | Existir conceitualmente desde já |
| CI | GitHub Actions: type-check + lint + testes + deploy | Sem Docker no CI ainda |
| Rollback | Render previous deploy via dashboard, testado em staging | < 2 min, procedimento documentado |

---

## Logs obrigatórios desde o S06

Todo evento relevante deve logar:
- `req_id`: ID único da requisição
- `trace_id`: rastreia a operação completa (inicia igual ao `req_id`)
- `tenant_id`: **obrigatório em toda operação autenticada**, log sem `tenant_id` em contexto autenticado é considerado incompleto
- `duration_ms`: tempo de execução
- `status`: resultado da operação
- Erros: `stack` completo em `debug`, mensagem sanitizada em `error`

### Jobs assíncronos

```
req_id=abc        → upload iniciado
job_id=xyz origin_req_id=abc → processamento iniciado
```

Todo job preserva o `origin_req_id` do request que o originou.

---

## Redact: campos sempre removidos antes do log

Qualquer campo sensível deve ser removido **antes** de chegar ao log:

- `Authorization`
- `Cookie`
- senha / password
- access token / refresh token / JWT
- Access token do Mercado Pago
- Database URL
- Storage keys / presigned URLs

---

## Métricas operacionais mínimas

Não exigem Prometheus, podem ser emitidas como log estruturado, mas devem existir:

- `requests_total`
- `requests_duration_ms`
- `uploads_total` / `uploads_failed`
- `auth_failures`
- `db_query_duration_ms`

---

## Error budget: metas operacionais iniciais

- Disponibilidade: **99,5%**
- Erros 5xx: **< 1%**
- Tempo médio de API: **< 500 ms**

---

## Arquivos principais

```
backend/src/shared/
  logger.ts             ← pino com serializers de req/res
  request-id.ts         ← hook de geração de correlation ID
  health.routes.ts      ← /health/live e /health/ready

.github/workflows/
  ci.yml                ← type-check + lint + test
  deploy-backend.yml    ← deploy no Render em push na main
  deploy-frontend.yml   ← build Vite → GitHub Pages

backend/src/shared/middleware/
  error-handler.ts      ← captura erros não tratados, loga e retorna 500 sem stack
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Log de dados sensíveis | Redact automático no serializer do pino (ver lista de redact) |
| CI lento > 5 min desmotiva uso | Paralelizar type-check e testes |
| Health check retorna 200 mas DB está lento | `/health/ready` inclui query simples ao Postgres |
| Banco saudável mas storage indisponível | `/health/ready` testa também o storage (S11/S29 dependem dele) |
| Rollback escrito mas nunca testado | Executar rollback em staging como parte do sprint |

---

## Critérios de aceite

- [ ] Push na `main` dispara CI e deploy automático sem intervenção manual
- [ ] CI falha se type-check ou testes falham (sem `continue-on-error`)
- [ ] `/health/live` retorna `{ status: "ok" }` em < 200ms
- [ ] `/health/ready` verifica conexão real com Postgres **e** com o storage
- [ ] Erros 5xx geram log JSON com stack + req_id + trace_id + tenant_id
- [ ] Toda operação autenticada loga `tenant_id`
- [ ] Job assíncrono preserva `origin_req_id` do request original
- [ ] Campos sensíveis (Authorization, Cookie, tokens, secrets, storage keys) não aparecem em nenhum log
- [ ] Métricas mínimas (requests_total, uploads_failed, auth_failures, etc.) emitidas
- [ ] Rollback executado com sucesso em staging em < 2 minutos, com procedimento documentado
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
