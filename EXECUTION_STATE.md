# EXECUTION STATE — ARXISVR AUTH SECURITY

> Atualizado automaticamente após cada ação relevante.
> **Ao retornar: ler este arquivo primeiro. Continuar da "Próxima ação exata".**

---

# Estado Atual

| Campo | Valor |
|---|---|
| Sprint | 2 |
| Tarefa | A3 ✅ + A4 🔧 + A5 🔧 (debug em andamento) |
| Subtarefa | Aguardando deploy `dep-d8gh6jhkh4rs73amla30` (diagnóstico + fix DELETE) |
| Status | 🟡 AGUARDANDO DEPLOY — 3ª iteração de correção |
| Timestamp | 2026-06-04T06:02 UTC |

---

## Sprint 1 — CONCLUÍDO E APROVADO ✅

| Item | Commit | Status |
|---|---|---|
| A1 Rate limit por rota auth | `8e944d9` | ✅ evidência aprovada |
| A2 Remover fallback JWT secrets | `f79373d` | ✅ evidência aprovada |
| A6 Timing attack fix (dummy bcrypt) | `f79373d` | ✅ evidência aprovada |
| M1 bcrypt rounds 10→12 | `f79373d` | ✅ evidência aprovada |
| fix /auth/me sem preHandler | `e84fe3d` | ✅ bug encontrado durante validação |

---

## Sprint 2 — EM EXECUÇÃO 🔄

### Última ação executada

- **Commit:** `8dd8574`
- **Mensagem:** `security(auth): Sprint 2 — logout real, sessões rastreáveis, refresh rotation`
- **Arquivos alterados:**
  - `backend/src/core/auth/auth.service.ts` → +160 -11 linhas
  - `backend/src/core/auth/auth.routes.ts` → +115 -6 linhas
- **Deploy disparado:** `dep-d8gguheq1p3s739j0el0`
- **Status deploy:** `build_in_progress` às 02:38 UTC

### O que foi implementado neste commit

```
A3 — POST /auth/logout
     - Revoga refresh token na tabela user_sessions
     - Logout real server-side
     - Access token expira naturalmente (max 15min)

A4 — user_sessions já existia no banco (migration 012)
     - login() agora cria entrada com ip + user-agent
     - GET  /auth/sessions          (listar sessões ativas)
     - DELETE /auth/sessions/:id    (revogar sessão específica)
     - DELETE /auth/sessions        (revogar todas exceto atual)

A5 — Refresh Token Rotation
     - /refresh valida token contra user_sessions (isRevoked=false)
     - Revoga sessão antiga, cria nova
     - Reuso detectado → revoga TODAS as sessões → HTTP 401 TOKEN_REUSE_DETECTED
```

### Pré-condições confirmadas antes do commit

- [x] Tabela `user_sessions` existe no banco com schema correto (verificado via psql)
- [x] Schema Drizzle `userSessions` existe em `observability.ts`
- [x] Build local PASS — 250ms, 0 erros
- [x] Nenhuma migration necessária

---

## Evidências pendentes (Sprint 2)

> Estes testes devem ser executados APÓS o deploy `dep-d8gguheq1p3s739j0el0` ficar live

### A3 — Logout real
```
Cenário:
1. Login → obter refresh token
2. Logout com o refresh token
3. Tentar /auth/refresh com o mesmo token
Esperado: HTTP 401 no passo 3
```

### A4 — Sessões
```
Cenário:
1. Login → obter refresh token
2. GET /auth/sessions → listar sessões ativas
3. DELETE /auth/sessions/:id → revogar
4. GET /auth/sessions → confirmar que sumiu
Esperado: contagem reduz após revogação
```

### A5 — Refresh Token Rotation
```
Cenário 1 — rotação normal:
1. Login → refresh_token_A
2. POST /auth/refresh com refresh_token_A → novo par (token_B, refresh_token_B)
3. POST /auth/refresh com refresh_token_A (reuso)
Esperado: HTTP 401 TOKEN_REUSE_DETECTED

Cenário 2 — token expirado/inválido:
1. POST /auth/refresh com token aleatório
Esperado: HTTP 401 Invalid refresh token
```

---

## Evidências já coletadas (Sprint 1) — NÃO REPETIR

- Rate limit login: req 1-10 → 401, req 11-13 → 429 ✅
- Rate limit forgot-password: req 1-5 → 200, req 6-8 → 429 ✅
- Rate limit register: req 1-5 → 201, req 6-7 → 429 ✅
- Timing attack: diferença 56ms → 1ms ✅
- JWT forjado: HTTP 401 `Invalid or expired token` ✅
- Token legítimo /auth/me: HTTP 200, user retornado ✅

---

## Próxima ação exata

**Quando deploy `dep-d8gguheq1p3s739j0el0` estiver `live`:**

Executar testes de evidência do Sprint 2 nesta ordem:

```bash
# 1. Login e capturar tokens
# 2. A3: logout + tentar reuse
# 3. A4: listar sessões, revogar, confirmar
# 4. A5: refresh rotation + reuse detection
# 5. Coletar logs do servidor
# 6. Atualizar este arquivo com resultados
```

---

## Regras de parada automática

PARAR e NÃO continuar se:
- [ ] Deploy falhar (update_failed)
- [ ] Build quebrar
- [ ] Erro de autenticação em produção após deploy
- [ ] Tabela de banco não encontrada
- [ ] Mais de 3 correções no mesmo problema
- [ ] Qualquer alteração de schema/infra sem confirmação

---

## Histórico de commits Sprint

| Hash | Mensagem | Data |
|---|---|---|
| `e84fe3d` | fix: preHandler authenticate em /auth/me | 2026-06-04 |
| `8e944d9` | fix: rate limit preHandler corrigido | 2026-06-04 |
| `f79373d` | Sprint 1: rate limit, timing, bcrypt, JWT | 2026-06-04 |
| `8dd8574` | Sprint 2: logout, sessões, refresh rotation | 2026-06-04 |
| `047aa2b` | fix: diagnóstico refresh + DELETE sem body | 2026-06-04 |

---

## Riscos conhecidos ainda abertos

| Risco | Sprint | Observação |
|---|---|---|
| Rate limit in-memory (não compartilhado entre instâncias) | Residual S1 | OK no free tier (1 instância) |
| `meetings.gateway.ts` com fallback JWT | Residual S1 | Afeta só WebSocket de reuniões |
| bcrypt de senhas antigas com rounds=10 | Residual S1 | Normaliza no próximo login/reset |
| Sprint 3+ não iniciada (M3, M4, M5, M6, M7) | Futuro | Aguarda aprovação Sprint 2 |
