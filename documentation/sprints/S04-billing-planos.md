# S04 · Billing e Planos

**Fase:** Fundação SaaS  
**Status:** Em andamento (infraestrutura de limites entregue em 2026-06-11)  
**Depende de:** S01 (tenant), S03 (limites por recurso)  
**Bloqueia:** S05 (checkout no onboarding)

---

## Objetivo

Planos cobrados pelo Mercado Pago (assinatura recorrente) com limites reais aplicados. Feature gating por plano sem hard-code espalhado pelo código.

> **Nota para o agente:** Este sprint **não implementa pagamentos; implementa autorização comercial.** O Mercado Pago é apenas a fonte de verdade da assinatura. O produto deve depender exclusivamente do sistema interno de limites e entitlements — nunca consultar `plan` diretamente numa feature.

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar aqui**:

- Cobrança por uso (usage-based billing)
- Cupons / descontos
- Afiliados
- Marketplace
- Nota fiscal
- Múltiplos métodos de pagamento
- Faturamento anual
- Split billing
- Multi-moeda

---

## Por que importa a longo prazo

O sistema de feature gating escolhido aqui determina o quanto custa adicionar um novo limite no futuro (ex.: máximo de cenários por plano em S12, máximo de modelos federados em S29). Se cada feature verifica o plano diretamente, mudar um limite exige busca em todos os controllers. Um sistema central de limites resolve isso em um lugar.

Webhooks de cobrança mal projetados causam estados inconsistentes (assinatura ativa no Mercado Pago, plano free no banco) que são difíceis de corrigir em produção.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Camada de autorização | Produto consulta **entitlements**, nunca `plan` | Plano só define entitlements iniciais; suporta add-ons futuros |
| Limites centralizados | `plan_limits.ts` com objeto de configuração por plano | Mudar limite = mudar em 1 lugar |
| Idempotência de webhook | id da notificação único em `billing_provider_events` | Reprocessar webhook não duplica upgrade |
| Webhook dead-letter | Falhas persistidas em `failed_webhooks` | Nunca perder notificação do Mercado Pago, mesmo sem retry sofisticado |
| Estado de assinatura | `subscription_status` explícito | Diferencia `trialing` de `active` mesmo com limites iguais |
| Trial | 14 dias com plano Pro, status `trialing` | Converte sem fricção de cartão |
| Medição de uso | Tabela `tenant_usage` com contadores | Evita `COUNT` gigante a cada verificação de limite |
| Resposta de limite | `403` com payload estruturado, **não 402** | 402 é tratado de forma inconsistente por SDKs e proxies |
| Downgrade | Preserva dados, bloqueia criação nova | Nunca deletar dado de cliente |
| Verificação de limite | Middleware `checkPlanLimit('models')` no route | Reutilizável em qualquer resource |
| Gestão da assinatura | Tela própria (pausar, retomar, cancelar) sobre a API de preapproval | O Mercado Pago não tem portal do cliente |

---

## Planos e limites

```typescript
// plan_limits.ts
export const PLAN_LIMITS = {
  starter: {
    projects: 3,
    models_per_project: 5,
    model_size_mb: 100,
    users: 1,
    scenarios: 2,
    storage_gb: 1,
  },
  pro: {
    projects: 20,
    models_per_project: 20,
    model_size_mb: 500,
    users: 10,
    scenarios: 10,
    storage_gb: 10,
  },
  business: {
    projects: Infinity,
    models_per_project: Infinity,
    model_size_mb: 2048,
    users: 50,
    scenarios: Infinity,
    storage_gb: 100,
  },
  enterprise: {
    projects: Infinity,
    models_per_project: Infinity,
    model_size_mb: 10240,
    users: Infinity,
    scenarios: Infinity,
    storage_gb: Infinity,
  },
}
```

> Os valores de `PLAN_LIMITS` são apenas o **seed inicial de entitlements** de cada plano. O produto nunca lê este objeto direto — lê os entitlements efetivos do tenant (`can_create_project`, `max_storage_gb`, etc.), que começam iguais ao plano mas podem ser sobrescritos por add-ons no futuro.

---

## Entitlements e medição de uso

```sql
-- Entitlements efetivos do tenant (seed = plano, sobrescrevível por add-on)
tenant_entitlements (
  tenant_id   UUID PK FK tenants,
  max_projects        INT,
  max_storage_gb      INT,
  max_users           INT,
  max_scenarios       INT,
  max_model_size_mb   INT,
  updated_at  TIMESTAMP
)

-- Contadores de uso — evita COUNT a cada checkPlanLimit
tenant_usage (
  tenant_id        UUID PK FK tenants,
  projects_count   INT DEFAULT 0,
  storage_bytes    BIGINT DEFAULT 0,
  users_count      INT DEFAULT 0,
  scenarios_count  INT DEFAULT 0,
  updated_at       TIMESTAMP
)

-- Estado de assinatura explícito
-- subscription_status: trialing | active | past_due | canceled | expired

-- Notificações do Mercado Pago que falharam ao processar (dead-letter)
failed_webhooks (
  id         UUID PK,
  event_id   VARCHAR(255),
  payload    JSONB,
  error      TEXT,
  attempts   INT DEFAULT 0,
  created_at TIMESTAMP
)
```

### Resposta padrão de limite atingido

```json
// HTTP 403 — NÃO 402
{
  "code": "PLAN_LIMIT_REACHED",
  "resource": "storage",
  "limit": 10,
  "current": 10
}
```

---

## Compatibilidade futura — billing híbrido

O sistema deve permitir, sem reescrita do schema, billing híbrido:

```
base subscription  (ex.: R$ 237/mês)
  + usage based    (ex.: R$ X por GB extra, R$ X por cenário extra)
```

Por isso entitlements são separados do plano: um add-on de storage incrementa `tenant_entitlements.max_storage_gb` sem trocar o plano do tenant.

---

## Arquivos principais

```
backend/src/core/billing/
  billing.service.ts    ← createCheckout, handleWebhook, getPortalUrl
  billing.routes.ts     ← POST /billing/checkout, POST /billing/webhook
  plan-limits.ts        ← PLAN_LIMITS centralizado

backend/src/shared/middleware/
  check-plan-limit.ts   ← middleware reutilizável por resource

backend/db/schema/
  billing.ts            ← subscriptions, billing_provider_events, failed_webhooks
  entitlements.ts       ← tenant_entitlements, tenant_usage

frontend/src/
  billing/checkout.ts   ← redirect para o cadastro do cartão no Mercado Pago (init_point)
  billing/success.ts    ← página de confirmação pós-upgrade
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Webhook chega antes do redirect (race condition) | Página de sucesso polling até plano atualizar |
| Mercado Pago indisponível bloqueia criação de checkout | Tratar erro graciosamente, retry automático |
| Limite de `Infinity` causando bug em comparações | Helper `isWithinLimit(current, limit)` trata Infinity |

---

## Critérios de aceite

- [x] Limite atingido retorna `403` com payload `{ code, resource, limit, current }` (não 402)
- [x] Criação de projeto bloqueada quando limite de projetos atingido
- [x] Verificação de limite lê `tenant_usage`, não faz `COUNT` na hora
- [ ] Assinatura no Mercado Pago (credencial de teste) autoriza e notificação atualiza plano no banco
- [ ] Produto consulta entitlements, nunca `plan` diretamente (sem `if (plan === ...)` em features)
- [ ] Upgrade reflete novos limites imediatamente
- [ ] Downgrade reflete novos limites imediatamente; dados existentes preservados
- [ ] `subscription_status` distingue `trialing` de `active`
- [ ] Webhook idempotente: reprocessar mesmo evento não duplica upgrade
- [ ] Webhook que falha ao processar é gravado em `failed_webhooks` (não perdido)
- [ ] Portal de billing abre sem re-login
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos

## Implementação (entregue 2026-06-11)

### Arquivos criados:
- `backend/migrations/036_tenant_usage_failed_webhooks.sql` — tabelas tenant_usage e failed_webhooks
- `backend/src/core/billing/usage-tracker.ts` — helpers para incrementar contadores (projects, storage, users, scenarios)
- `backend/tests/e2e/billing-limits.spec.ts` — testes de enforçamento de limites (3/3 ✓)

### Arquivos modificados:
- `backend/src/core/billing/plan-limits.ts` — statusCode 402→403, resposta estruturada {code, resource, limit, current}, lê tenant_usage em vez de COUNT
- `backend/src/modules/billing/billing.service.ts` — inicializa tenant_usage em initializeTenantFreeTier()
- `backend/src/modules/projects/projects.service.ts` — incrementa projects_count ao criar projeto
- `backend/src/modules/projects/projects.controller.ts` — retorna payload estruturado em PlanLimitError
- `backend/src/shared/database/schema/billing.ts` — adiciona tenantUsage e failedWebhooks

### Testes (2026-06-11):
- ✅ 11/11 S03 (projects-models) passam
- ✅ 3/3 S04 (billing-limits) passam
- ✅ 69/71 total passam
