# SPRINT-04-RESULT · Billing & Planos

> Artefato de memória pós-execução. Evidência verificável de tudo abaixo foi coletada na sessão de fechamento.

**Sprint:** S04 · Billing & Planos
**Status:** Concluído (núcleo) — 5 gaps de hardening abertos (ver abaixo)
**Data de fechamento:** 2026-06-12
**Commit(s):** pendente — alterações ainda no working tree (não commitadas em `b7707e3`)

---

## Objetivo (entregue?)

Enforcement de limites de plano por tenant, tracking de uso real (sem `COUNT` por request), entitlements com fallback seguro, e robustez de webhooks (idempotência + dead-letter). **Núcleo entregue e testado.** Hardening operacional (retry/expiry jobs) fica para follow-up.

## Arquivos alterados

- `src/core/billing/entitlements.ts` — **novo.** `getTenantEntitlements()` lê `tenant_entitlements` com fallback a `BILLING_PLANS[plan].limits`
- `src/core/billing/usage-tracker.ts` — **novo.** `ensureUsageRecord` + `incrementProjectCount/StorageBytes/UserCount/ScenarioCount`
- `src/core/billing/plan-limits.ts` — `PlanLimitError` agora 403 com `{code, resource, limit, current}`; asserts usam entitlements + `tenant_usage`
- `src/modules/files/files.service.ts` + `files.routes.ts` — `incrementStorageBytes` em ambos os paths de upload
- `src/modules/projects/projects.service.ts` — `incrementProjectCount` no create
- `src/modules/billing/billing.routes.ts` — insert em `failed_webhooks` no catch
- `src/modules/billing/billing.service.ts` — `trialEndsAt` = NOW + 14 dias na inicialização free tier
- `src/modules/{projects.controller,ifc.controller,workspaces.routes}.ts` — resposta de erro no formato estruturado

## Migrations adicionadas

- `036_tenant_usage_failed_webhooks.sql` — aplicada: **sim** (psql). Cria `tenant_usage` (counters) + `failed_webhooks` (dead-letter). Reversível: **sim** (drop tables)

## Critérios de aceite — passou?

| Critério | Resultado | Evidência |
|---|---|---|
| Free tier limita a 3 projetos, 4º → 403 | ✅ | `billing-limits` / `billing-e2e` |
| 403 com payload `PLAN_LIMIT_REACHED {resource,limit,current}` | ✅ | `billing-downgrade` assert `limit:3, current:5` |
| Upgrade enterprise remove limite | ✅ | `billing-limits` |
| Upload incrementa `tenant_usage.storage_bytes` | ✅ | `billing-storage` (+1024 bytes) |
| Webhook reprocessado não duplica (idempotência) | ✅ | `billing-webhooks` |
| Downgrade preserva dados (soft-block) | ✅ | `billing-downgrade` (5 projetos intactos) |

## Testes executados

```
vitest run billing-limits billing-downgrade billing-e2e billing-storage billing-webhooks
Test Files  5 passed (5)
     Tests  11 passed (11)
tsc --noEmit: 0 errors
```

## Limitações conhecidas

- `failed_webhooks` é gravado mas **não há worker que reprocessa**.
- `trialEndsAt` é setado mas **nenhum job converte/bloqueia trial expirado**.
- Idempotência de webhook depende da constraint UNIQUE em `event_id`; **não há validador que rejeita antes de processar** (confia no erro do insert).

## Decisões arquiteturais alteradas

- `PlanLimitError` mudou de **402 → 403** (limite de plano é autorização, não pagamento pendente).
- Usage tracking passou de `COUNT(*)` por request para **counters incrementais** em `tenant_usage` (evita full scan em tenants grandes).

## Riscos para o próximo sprint

- Counters de `tenant_usage` podem divergir do real se um insert/delete escapar do tracker. Precisa de um job de reconciliação eventual.
- Sem expiry job, trials nunca expiram → usuários ficam em free indefinidamente.

## Passos de rollback

- Reverter as alterações do working tree (não commitadas).
- `DROP TABLE failed_webhooks, tenant_usage;` (migration 036).

## Notas de demo

Criar 3 projetos em tenant free (201), 4º retorna 403 `PLAN_LIMIT_REACHED`; `UPDATE billing_subscriptions SET plan='enterprise'` e o 4º passa.

---

## Gaps abertos (follow-up S04.1)

1. Retry worker para `failed_webhooks`
2. Subscription expiry check (job sobre `trialEndsAt`)
3. Validador de idempotência (rejeita `event_id` duplicado antes de processar)
4. Teste E2E de portal session reuse
5. Teste E2E de checkout completo (start → webhook → upgrade)
