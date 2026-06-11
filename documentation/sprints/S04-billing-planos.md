# S04 · Billing e Planos

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (tenant), S03 (limites por recurso)  
**Bloqueia:** S05 (checkout no onboarding)

---

## Objetivo

Planos Stripe funcionais com limites reais aplicados. Feature gating por plano sem hard-code espalhado pelo código.

---

## Por que importa a longo prazo

O sistema de feature gating escolhido aqui determina o quanto custa adicionar um novo limite no futuro (ex.: máximo de cenários por plano em S12, máximo de modelos federados em S29). Se cada feature verifica o plano diretamente, mudar um limite exige busca em todos os controllers. Um sistema central de limites resolve isso em um lugar.

Stripe webhooks mal projetados causam estados inconsistentes (assinatura ativa no Stripe, plano free no banco) que são difíceis de corrigir em produção.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Limites centralizados | `plan_limits.ts` com objeto de configuração por plano | Mudar limite = mudar em 1 lugar |
| Idempotência de webhook | `stripe_event_id` único no banco | Reprocessar webhook não duplica upgrade |
| Trial | 14 dias com plano Pro automático | Converte sem fricção de cartão |
| Downgrade | Preserva dados, bloqueia criação nova | Nunca deletar dado de cliente |
| Verificação de limite | Middleware `checkPlanLimit('models')` no route | Reutilizável em qualquer resource |
| Portal de billing | Stripe Customer Portal | Não reimplementar gestão de assinatura |

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
  billing.ts            ← subscriptions, stripe_events

frontend/src/
  billing/checkout.ts   ← redirect para Stripe Checkout
  billing/success.ts    ← página de confirmação pós-upgrade
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Webhook chega antes do redirect (race condition) | Página de sucesso polling até plano atualizar |
| Stripe indisponível bloqueia criação de checkout | Tratar erro graciosamente, retry automático |
| Limite de `Infinity` causando bug em comparações | Helper `isWithinLimit(current, limit)` trata Infinity |

---

## Critérios de aceite

- [ ] Checkout Stripe em test mode completa e webhook atualiza plano no banco
- [ ] Upload bloqueado com 402 quando limite de storage atingido
- [ ] Criação de projeto bloqueada quando limite de projetos atingido
- [ ] Downgrade: dados existentes preservados, novos recursos bloqueados
- [ ] Webhook idempotente: reprocessar mesmo evento não duplica upgrade
- [ ] Portal de billing abre sem re-login
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
