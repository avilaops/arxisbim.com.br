# S01 · Auth e Multi-tenant Base

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Bloqueia:** S02, S03, S04, S05, toda a fundação depende de identidade funcional

---

## Objetivo

Estabelecer identidade, sessões e isolamento de workspace. Nenhuma feature de produto antes disso.

---

## Fora de Escopo

Os itens abaixo são de sprints futuros. **Devem ser ignorados neste sprint**, não implementar, não criar abstração antecipada além da já especificada, não gastar contexto neles:

- SSO (Google, Microsoft, GitHub) e OAuth Providers
- MFA / 2FA
- Convites por email e onboarding de membros (S17)
- RBAC avançado / papéis customizados (S17)
- Billing e planos (S04)
- Auditoria completa / audit log
- Redis (rate limiting fica in-memory até S06)

---

## Regra de Ouro

**Nenhuma query de negócio pode acessar tabelas multi-tenant sem um tenant context válido.**

O isolamento deve ser garantido pelo **banco (RLS)** e não apenas pela aplicação. Filtro por `tenant_id` no código da aplicação é defesa secundária, nunca a única. Esta regra vale para todas as tabelas criadas em qualquer sprint futuro.

---

## Fluxo de criação de tenant

Modelo explícito (SaaS B2B com menor atrito):

```
Register
  → cria tenant (org)
  → cria usuário como Owner do tenant
  → cria sessão (access + refresh token)
```

Não existe tenant pré-provisionado. Todo `register` é a criação simultânea de um novo workspace e seu Owner, dentro de uma única transação atômica (ou tudo, ou nada).

---

## Por que importa a longo prazo

O padrão de multi-tenancy escolhido aqui se propaga por todos os 32 sprints. Uma decisão errada em isolamento (ex.: filtrar por `tenantId` na aplicação em vez do banco) vaza dados entre clientes anos depois. O modelo JWT escolhido aqui determina como cenários, modelos e permissões são assinados em S12, S17, S29.

A estratégia de refresh token (rotação com reuse detection) precisa existir desde o início, adicionar depois exige migrar sessões ativas em produção.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Isolamento de tenant | `tenant_id` em todas as tabelas + RLS no Postgres | Mais seguro que filtro na aplicação |
| JWT access token | 15 minutos, HS256 | Curto o suficiente para limitar janela de comprometimento |
| Refresh token | 30 dias, rotação + reuse detection | Detecta roubo de token |
| bcrypt rounds | 12 | Equilíbrio segurança/performance em 2026 |
| Rate limiting | Interface `RateLimiter` + `MemoryRateLimiter` | Nenhum código de auth depende da implementação; `RedisRateLimiter` entra no S06 sem refatorar auth |
| Identificador de tenant | `tenant_id` slug + UUID interno | Slug para URL, UUID para FK |

---

## Arquivos principais

```
backend/src/core/auth/
  auth.service.ts       ← JWT, bcrypt, reuse detection
  auth.routes.ts        ← register, login, logout, refresh, me
  auth.schema.ts        ← validação Zod dos payloads
  middleware.ts         ← authenticateRequest (lazy init)

backend/src/core/tenants/
  tenants.service.ts    ← criação de org, lookup por slug
  tenants.schema.ts

backend/db/schema/
  auth.ts               ← users, sessions, refresh_tokens
  tenants.ts            ← tenants, tenant_users

backend/tests/e2e/
  auth-security.spec.ts ← S01–S19 dos testes de segurança
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| RLS desativado acidentalmente em migrations futuras | Teste de isolamento no CI que tenta acessar tenant errado |
| Rate limit in-memory perde estado no restart | Documentado como limitação; Redis entra no S06 |
| Refresh token reuse detection com falso positivo | Log e alerta antes de invalidar todas as sessões |

---

## Metas de performance

| Operação | Alvo |
|---|---|
| Login | < 500 ms |
| Refresh | < 300 ms |
| Register | < 1 s |
| Hash bcrypt | < 250 ms |

---

## Critérios de aceite

- [ ] Register cria tenant + Owner + sessão atomicamente (rollback se qualquer passo falha)
- [ ] Register → login → logout funcionam
- [ ] Token refresh sem re-login
- [ ] **Isolamento garantido pelo banco (RLS):** usuário autenticado do tenant A não consegue ler, alterar ou deletar recursos do tenant B **mesmo manipulando IDs manualmente** na requisição
- [ ] RLS ativo: query sem tenant context não retorna linhas de tabela multi-tenant
- [ ] Reuse detection: usar refresh revogado invalida todas as sessões do usuário
- [ ] Rate limiting via interface `RateLimiter`; nenhum import direto de `MemoryRateLimiter` no código de auth
- [ ] Testes de auth-security (S01–S19) passando
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
