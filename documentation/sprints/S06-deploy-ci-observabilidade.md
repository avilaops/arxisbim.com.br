# S06 · Deploy, CI e Observabilidade

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01–S05  
**Bloqueia:** Qualquer usuário real antes disso

---

## Objetivo

Pipeline de deploy estável, logs estruturados, alertas de erro e rollback testado. Nenhum usuário real antes de passar por este sprint.

---

## Por que importa a longo prazo

Observabilidade instalada desde o início é o que separa um produto que evolui com confiança de um que tem medo de cada deploy. Logs estruturados (JSON) desde o S06 permitem busca e alertas nos sprints seguintes sem retrofitting.

O padrão de tracing escolhido aqui (correlation ID nos logs) permite rastrear uma requisição de upload do S11, um cálculo de custo do S22, ou uma animação 4D do S27 — todos usando o mesmo padrão de log.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Formato de log | JSON estruturado com `level`, `msg`, `req_id`, `tenant_id` | Parseable por qualquer agregador |
| Correlation ID | `X-Request-Id` gerado no gateway, propagado por toda requisição | Rastrear req end-to-end |
| Alertas | Render alertas nativos + webhook Slack/Discord | Sem dependência de Datadog no início |
| Health check | `/health/live` (processo OK) + `/health/ready` (DB OK) | Render usa `/health/live` |
| CI | GitHub Actions: type-check + lint + testes + deploy | Sem Docker no CI ainda |
| Rollback | Render previous deploy via dashboard | < 2 min |

---

## Logs obrigatórios desde o S06

Todo evento relevante deve logar:
- `req_id`: ID único da requisição
- `tenant_id`: quando em contexto autenticado
- `duration_ms`: tempo de execução
- `status`: resultado da operação
- Erros: `stack` completo em `debug`, mensagem sanitizada em `error`

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
| Log de dados sensíveis (JWT, senha) | Redact automático no serializer do pino |
| CI lento > 5 min desmotiva uso | Paralelizar type-check e testes |
| Health check retorna 200 mas DB está lento | `/health/ready` inclui query simples ao Postgres |

---

## Critérios de aceite

- [ ] Push na `main` dispara CI e deploy automático sem intervenção manual
- [ ] CI falha se type-check ou testes falham (sem `continue-on-error`)
- [ ] `/health/live` retorna `{ status: "ok" }` em < 200ms
- [ ] `/health/ready` verifica conexão real com Postgres
- [ ] Erros 5xx geram log JSON com stack + req_id + tenant_id
- [ ] Rollback para deploy anterior executável em < 2 minutos
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
