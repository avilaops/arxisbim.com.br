# ROADMAP — ArxisVR

**Última atualização:** 08/06/2026
**Status:** ✅ Produção estável · 🔐 Multi-tenant seguro · 👥 Colaboração realtime · 🧱 Persistência durável e Billing são os próximos gargalos

> Plataforma BIM (IFC) com viewer Three.js, colaboração multiplayer (WebXR),
> Copilot de IA e multi-tenant. Frontend MPA (Vite) no GitHub Pages; backend
> Fastify + Drizzle + Postgres no Render.

---

## 🏃 ANÁLISE DE SPRINTS

O projeto evolui por **sprints = sessões de trabalho** focadas. Cada sprint
fecha com deploy e verificação ao vivo.

| Sprint | Data | Tema | Resultado |
|---|---|---|---|
| **S1–S4** | 01–02/06 | Core BIM | Multi-tenant API, IFC parsing/streaming/LOD, Copilot routing, 5 features BIM (BIM Query, GLB, 5D, Snapshots, Painel Props), 22 E2E Playwright |
| **S5** | 08/06 | **Segurança & Colaboração** | Isolamento de tenant, API de modelos protegida, Workspaces/Convites (Fase 2), model-sync de reunião, AI unificado, fix import IFC, infra de deploy. **18 commits.** |
| **S6** | _próximo_ | **Billing** | Planos, limites por plano, checkout, cobrança de minutos de reunião |
| **S7** | _planejado_ | **Persistência durável** | Object storage R2/S3 (hoje /tmp efêmero) |
| **S8** | _planejado_ | **Hardening** | Auditoria de isolamento em todos os controllers + autoDeploy |

### Métrica de ritmo
- S5 entregou ~18 commits num dia, todos deployados e verificados ao vivo.
- Velocidade alta sustentada por: deploy manual (gh-pages + Render API),
  verificação E2E via Chrome MCP, e queries diretas ao Postgres para evidência.

---

## ✅ CONCLUÍDO

### Sprint 5 — Segurança & Colaboração (08/06/2026)

**🔐 Segurança / Multi-tenant**
- Isolamento real de tenant: email NUNCA define tenant. Cada usuário nasce no
  próprio tenant único (`u-<local>-<hash>`). Corrigido vazamento onde todo
  `@gmail.com` caía no mesmo tenant "gmail". (`core/tenancy/tenant-derivation.ts`)
- Cadastro não aceita mais `tenantId` do cliente (evita auto-atribuição a tenant alheio).
- API de modelos IFC com `authenticateRequest` + escopo por tenant/sessão em
  TODAS as rotas (era aberta anonimamente). (`routes/v1/ifc-models.ts`)

**👥 Workspaces & Convites (Fase 2)**
- Membership N:N (user ↔ tenant) + tabela de convites. (`schema/workspaces.ts`)
- Endpoints: criar workspace, convidar (email+role, email via Resend), aceitar,
  recusar, listar, **trocar workspace ativo** (re-emite JWT). (`modules/workspaces`)
- UI: `WorkspacePanel.js` (trocar/criar/convidar/aceitar) + `accept-invite.html`.
- Cadastro cria membership owner (register + OAuth).
- **E2E ao vivo: 10/10** (criar→convidar→isolamento→aceitar→trocar→403/409).

**🤝 Colaboração / Reunião**
- Demo removido → app 100% autenticado (sem sessão → landing).
- Painel de propriedades único (inspector embutido; eram 2 barras).
- Convidado entra **na reunião** (não no demo).
- **Model-sync**: modelo do anfitrião sincroniza para todos os participantes
  (= o "Multiplayer Realtime" que estava planejado). (`features/collaboration/ModelSyncService.ts`)

**🎨 Produto / UX**
- Landing: idioma consistente (PT default), card Reuniões XR, cookie enxuto, scroll-reveal.
- **1 assistente** (ArxisCopilot) com ícone flutuante único (eram 2 superfícies confusas).
- Fix import IFC (não carregava): render local primeiro + storage gravável.

**🛠️ Infra**
- Deploy destravado **sem GitHub Actions** (bloqueado por billing): frontend via
  push manual no `gh-pages`; backend via Render API.
- **Keep-alive** anti-sleep: backend se auto-pinga em /health a cada 14 min.

### Sprints 1–4 — Core BIM (01–02/06/2026)
- Multi-tenant APIs (tenants/companies/projects), IFC parsing/streaming/LOD,
  Copilot action routing, BIM Query Language, GLB Export, Quantitativos 5D,
  Snapshots PNG, Painel de Propriedades IFC, 22 testes E2E Playwright.

---

## 🎯 BACKLOG PRIORIZADO

### 🥇 Sprint 6 — Billing (próximo foco do dono)
- [ ] Planos (Free/Starter/Pro/Enterprise) e limites por plano (projetos, modelos, storage, participantes de reunião).
- [ ] Checkout e gestão de assinatura.
- [ ] Cobrança de minutos de reunião (já há `session_billing_usage` no schema).
- [ ] Enforcement dos limites nas rotas (entitlements — `requireEntitlement` já existe).
- Base existente: `modules/billing`, `schema/billing.ts`, `tenant_entitlements`.

### 🥈 Sprint 7 — Persistência durável de IFC
- [ ] `R2StorageService` (Cloudflare R2, S3-compatible) substituindo o disco
      local efêmero (/tmp no Render free → modelos somem em restart). Chip `task_33413c9c`.
- [ ] Avaliar upload direto via presigned URL para arquivos grandes (IFCs reais 15–128MB; limite atual 100MB no multipart).

### 🥉 Sprint 8 — Hardening de segurança
- [ ] Auditar isolamento de tenant nos demais controllers (scheduling,
      federated-models, model-elements, glb-export…). Chip `task_8c5d09b7`.
- [ ] Corrigir autoDeploy do Render (webhook GitHub→Render não dispara — hoje deploy manual).

### Contínuo / menor
- [ ] `05- Estado e Navegação` — otimizações de estado/navegação (em progresso).
- [ ] Migrar para storage durável também os snapshots/exports.
- [ ] Reativar CI quando billing do GitHub for ajustado (ou self-hosted runner).

---

## ⚠️ CONSTRAINTS (regras duras do dono)
- ❌ **Sem alterações manuais no banco de produção.** Schema/dados só via migração versionada.
- ✅ **Contas de usuário são permanentes** — nunca apagar.
- ✅ Register e Esqueci-senha **validados**.
- Deploy é manual (Actions bloqueado por billing): gh-pages + Render API. Spending limit do GitHub deve ficar em $0.

---

## 📈 ESTADO POR ÁREA

| Área | Estado |
|---|---|
| Core BIM (viewer, IFC, LOD, 5D, GLB, query) | ✅ |
| Multi-tenant + isolamento | ✅ seguro e verificado |
| Auth (JWT, OAuth, verificação email, reset) | ✅ |
| Workspaces & convites | ✅ (Fase 2) |
| Colaboração realtime + model-sync | ✅ |
| Copilot de IA | ✅ (assistente único) |
| Persistência de modelos | 🟠 efêmera (/tmp) → R2 pendente |
| Billing / planos | 🔴 próximo sprint |
| Hardening (auditoria tenant) | 🟠 pendente |
| CI/CD automático | 🔴 bloqueado (billing GitHub) → deploy manual |

> **Recomendação:** Sprint 6 = Billing (foco do dono) → Sprint 7 = R2 (destrava
> persistência real e download de modelo em reunião pós-restart) → Sprint 8 =
> Hardening. CI volta quando o billing do GitHub for resolvido.
