# ArxisVR — Documentação Técnica Consolidada
> Atualizado: 2026-06-07 | Branch: main

---

## 1. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│  arxisvr.avilaops.com  (GitHub Pages)                   │
│  Frontend: Vite MPA + Three.js/IFC + React (islands)    │
│                                                          │
│  Páginas: app.html · login.html · register.html         │
│           join.html · admin.html · oauth-callback.html  │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS / WSS
┌───────────────▼─────────────────────────────────────────┐
│  api.arxisvr.avilaops.com  (Render — Fastify)           │
│  backend/  → auth · tenants · sessions · observability  │
│  PostgreSQL (Render managed)                             │
└───────────────┬─────────────────────────────────────────┘
                │ WebSocket
┌───────────────▼─────────────────────────────────────────┐
│  arxisvr-signaling.onrender.com  (Render — Node WS)     │
│  signaling-server/server.js → rooms, avatar_update      │
└─────────────────────────────────────────────────────────┘
```

**REGRA DE DOMÍNIO CRÍTICA:** Usar SEMPRE `avilaops.com`. NUNCA `avila.inc`.

---

## 2. Env Vars

### Frontend (Vite build / GitHub Actions)
| Var | Valor produção |
|-----|---------------|
| `VITE_API_URL` | `https://api.arxisvr.avilaops.com` |
| `VITE_WS_URL` | `wss://arxisvr-signaling.onrender.com` |
| `VITE_WS_SERVER` | `wss://arxisvr-signaling.onrender.com` |

### Backend (Render env vars)
| Var | Descrição |
|-----|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret para access tokens (HS256) |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GITHUB_CLIENT_ID` | OAuth GitHub |
| `GITHUB_CLIENT_SECRET` | OAuth GitHub |
| `DEEPSEEK_API_KEY` | IA Copilot |
| `GROQ_API_KEY` | IA alternativa |

---

## 3. Deploy

### Frontend → GitHub Pages (automático)
Push para `main` em `frontend/**` → `.github/workflows/deploy-frontend.yml` → build Vite → `peaceiris/actions-gh-pages@v4` → CNAME `arxisvr.avilaops.com`

### Backend → Render (manual ou auto-deploy)
Push para `main` → Render detecta `backend/` → `npm run build && npm start`

### Signaling → Render (sempre on)
`signaling-server/` → Node.js WS server → porta `3002`  
**Cuidado:** Render free tier dorme após 15min inativo. O frontend envia ping a cada 25s para manter vivo.

---

## 4. Auth (Sprint 1 ✅ + Sprint 2 ✅)

### Endpoints
```
POST /api/v1/auth/register     → { name, email, password, companyName }
POST /api/v1/auth/login        → { email, password }
POST /api/v1/auth/logout       → { refreshToken } (revoga sessão)
POST /api/v1/auth/refresh      → { refreshToken } (rotação)
GET  /api/v1/auth/me           → perfil do usuário autenticado
GET  /api/v1/auth/sessions     → sessões ativas do usuário
DELETE /api/v1/auth/sessions/:id → revoga sessão específica
GET  /api/v1/auth/google       → OAuth Google redirect
GET  /api/v1/auth/github       → OAuth GitHub redirect
```

### Segurança implementada
- **Rate limiting:** 100 req/min por IP (custom preHandler in-memory)
- **Timing attack:** `DUMMY_HASH` — bcrypt.compare sempre executado mesmo sem user
- **bcrypt rounds:** 12
- **JWT:** access (15min) + refresh (30d) com `jti` único
- **Rotação de tokens:** refresh antigo revogado ao gerar novo (`is_revoked=true`)
- **Reuse detection:** refresh revogado detecta possível roubo → invalida todas as sessões

### Pendente (Sprint 3)
- [ ] Verificação de e-mail (nodemailer / Resend)
- [ ] Rate limit persistente (Redis) — atual é in-memory, perde no restart
- [ ] CSRF tokens para formulários OAuth

---

## 5. Multiplayer (WebSocket)

### Protocolo (signaling-server/server.js)

| Mensagem (client→server) | Campos |
|--------------------------|--------|
| `join_room` | `roomId, userId, displayName, [accessToken]` |
| `avatar_update` | `avatarConfig: AvatarState` |
| `chat_message` | `content` |
| `ping` | — |

| Mensagem (server→client) | Campos |
|--------------------------|--------|
| `room_joined` | `roomId, participantId, userId, role, members[]` |
| `user_joined` | `participantId, userId, displayName, role` |
| `user_left` | `participantId` |
| `avatar_update` | `participantId, userId, avatarConfig, timestamp` |
| `position_update` | `userId, x, y, z, yaw` |
| `chat_message` | `participantId, userId, content, timestamp` |

### Bugs corrigidos (commit 70b614a)
1. **Colisão de ID:** `join-main.ts` agora sempre gera `guest_<random>_<timestamp>` — nunca usa `user.id`
2. **Formato avatar_update:** sender envia `{ type: 'avatar_update', avatarConfig: state }` — não `data.state`

### Status atual
- ✅ Pipeline correto (send + receive + ID único)
- ⚠️ Teste visual de cursors 3D pendente (bloqueado por port 3002 em produção dormindo)
- 📌 Para testar local: `PORT=3002 node signaling-server/server.js` + `VITE_WS_URL=ws://localhost:3002 npm run dev`

---

## 6. Renderização 3D — Estado AAA

### Implementado ✅

#### PhysicalSkyEnvironment (`frontend/src/viewer/PhysicalSkyEnvironment.ts`)
- **Modelo atmosférico:** Preetham scattering via `THREE.Sky`
- **IBL:** PMREMGenerator — reflections automáticas do céu no modelo IFC
- **Fog:** FogExp2 com cor derivada do horizonte (sem hardcode)
- **Sombras:** PCFSoftShadowMap 4096×4096, DirectionalLight posicionado pelo sol
- **5 presets:** `noon · morning · golden-hour · overcast · dusk`
- **Integração:** `BackgroundManager.ts` detecta tipo `physical-sky-*`
- **UI:** `BackgroundSelector` lista os presets

#### BackgroundManager + BackgroundPresets
- Tipos: `solid-color · gradient · hdri · skybox · physical-sky`
- Presets physical-sky incluídos: 5 atmosféricos

### ✅ Pipeline AAA COMPLETO — `frontend/src/engine/PostProcessingPipeline.ts`

**Já implementado e integrado no ViewerHost:**

| Pass | Status | Arquivo |
|------|--------|---------|
| EffectComposer + RenderPass | ✅ | `PostProcessingPipeline.ts` |
| SAO (Scalable Ambient Occlusion) | ✅ ativo pós-load IFC | idem |
| UnrealBloomPass | ✅ 4 presets de qualidade | idem |
| BokehPass (DoF) | ✅ cinematográfico | idem |
| SMAAPass / FXAAPass | ✅ AA adaptativo | idem |
| FilmPass (grain) | ✅ medium/high/ultra | idem |
| VignetteShader | ✅ | idem |
| ChromaticAberrationShader | ✅ | `engine/ChromaticAberrationShader.ts` |
| AtmosphericPerspectiveShader | ✅ | `engine/AtmosphericPerspectiveShader.ts` |
| GodRaysShader | ✅ high/ultra | `engine/GodRaysShader.ts` |
| CascadedShadowManager (CSM) | ✅ | `engine/CascadedShadowManager.ts` |
| AdaptiveQualityManager | ✅ | `engine/AdaptiveQualityManager.ts` |

**Presets de qualidade:** `low · medium · high · ultra` — trocáveis em runtime via `setQuality()`

**Integração ViewerHost:**
- `enableAO()` chamado após modelo IFC carregar (evita SAO em cena vazia)
- `postProcess.render()` no loop principal (linha 560)
- `window.__postProcess` exposto para debug

### Pendente AAA (polish)
- [ ] **Stars / Night Sky preset** — `PhysicalSkyEnvironment.ts` — adicionar preset `dusk-night` com estrelas procedurais
- [ ] **SSR (Screen Space Reflections)** — reflexos em pisos molhados — Three.js não tem built-in, precisa shader custom
- [ ] **Lens Flare** — anamorphic flare no sol — `PhysicalSkyEnvironment.ts`
- [ ] **LUT Color Grading** — carregar `.cube` file para look cinematográfico específico

---

## 7. UI/UX Implementado

### Dark Theme
- Background: `#111827` | Surface: `#1F2937` | Primary: `#2563EB` | AI: `#8B5CF6`
- CSS variables em `app.html`

### Welcome Overlay (`ArxisWelcome`)
- Cartões de projeto com thumbnail, badge IFC, progress bar, avatares de colaboradores
- `ArxisWelcome.hide()` chamado no load de IFC, drag-drop, e load do backend
- Lê username do JWT localStorage — sem hardcode

### Status Bar
- Objeto selecionado / Coordenadas / FPS / Memory / WebGL tier

### Mobile Bottom Sheet
- 3 estados: peek (72px) → medium (45vh) → full (92vh)
- Maps-style snap com swipe gesture
- Botão central AI elevado (Discord-style)

### AI Contextual Panel
- `window.__arxisCopilot.toggle()`
- Texto do botão muda: "Analisar Pilar A-32" conforme seleção

---

## 8. Admin Panel (`frontend/admin.html`)

### Status atual ✅
- Existe em `frontend/admin.html` (806 linhas)
- Auth gate: login com conta admin antes de acessar
- Layout Apple-style (DM Sans, sidebar, cards)
- Rota backend: `backend/src/core/admin/admin.routes.ts`

### O que captura (sem dados sensíveis)
- Usuários: nome, email, plano, tenant, data de criação
- Sessões ativas por usuário
- Audit logs: ações realizadas (tipo, timestamp, IP anonimizado)
- Métricas de performance: latência API, uso de memória
- Error logs: tipo de erro, stacktrace, frequência
- API usage: endpoints mais usados, volume de req/dia
- Preferências/habitos: features mais acessadas, tempo médio de sessão

### Pendente
- [ ] Gráficos de uso (Chart.js ou Recharts) em vez de tabelas
- [ ] Filtros por período (7d / 30d / 90d)
- [ ] Export CSV das métricas
- [ ] Alertas automáticos (error rate > threshold)

---

## 9. DB Schema (Drizzle ORM)

### Schemas ativos
| Arquivo | Tabelas principais |
|---------|--------------------|
| `schema/auth.ts` | `users, tenant_users` |
| `schema/tenants.ts` | `tenants, timeline_simulations, task_element_links` |
| `schema/observability.ts` | `user_sessions, audit_logs, metrics, error_logs, performance_metrics, api_usage, user_preferences, system_settings` |

### Migração aplicada
- `025_observability_tables.sql` — criação completa das tabelas de observabilidade
- Migration Drizzle: `0000_pink_mandroid.sql` (única, schema inicial)

### Fixes aplicados
- `timeline_simulations`: colunas `scheduleId, simulationDate, snapshot` corrigidas
- `task_element_links`: removido `tenantId`, renomeado `linkType→action`, `elementId` tipo correto
- `user_sessions`: adicionados `isActive, accessTokenJti, userAgent`

---

## 10. Landing Page

### Status
- Arquivo principal: `frontend/index.html` (ou `landing/`)
- 30 defeitos identificados pela revisão
- **Implementação das correções: PENDENTE** — tarefa interrompida antes de commit

### Top 5 defeitos críticos a corrigir primeiro
1. CTA acima do fold com contraste insuficiente
2. Seção de features sem ícones reais (placeholder text)
3. Ausência de social proof / logos de clientes
4. Formulário de contato sem validação client-side
5. Mobile: nav collapsa mal em < 375px

---

## 11. Checklist de Sessão (Session Start)

```bash
# 1. Verificar backend
curl https://api.arxisvr.avilaops.com/health

# 2. Verificar último deploy frontend
# → https://github.com/AvilaOps/arxisvr/actions

# 3. Verificar signaling (pode estar dormindo)
# → curl https://arxisvr-signaling.onrender.com/health ou abrir no browser

# 4. Para dev local
cd frontend && npm run dev
# Em outro terminal:
cd signaling-server && PORT=3002 node server.js
# VITE_WS_URL=ws://localhost:3002 (já no .env.local)

# 5. Armadilhas conhecidas
# - DELETE /auth/sessions/:id: preParsing hook remove Content-Type (necessário)
# - refresh token: requer jti único — já implementado
# - join.html: guestId sempre gerado fresh (nunca user.id)
# - Signaling dorme no Render free → testar com local primeiro
```

---

## 12. Próximas Tarefas (Prioridade)

| # | Tarefa | Impacto | Esforço |
|---|--------|---------|---------|
| 1 | **Landing page: implementar 30 fixes** | 🔴 alto (conversão) | ~4h |
| 2 | **Admin panel: gráficos Chart.js + filtros** | 🟠 médio (UX admin) | ~2h |
| 3 | **Google OAuth: registrar redirect URI** | 🟠 médio (auth) | ~30min |
| 4 | **Teste visual cursors 3D multiplayer** | 🟠 médio (multiplayer) | ~1h |
| 5 | **Email verification (Sprint 3 auth)** | 🟡 médio (segurança) | ~3h |
| 6 | **Stars / Night Sky preset** | 🟢 baixo (AAA feature) | ~1h |
| 7 | **Lens Flare no sol** | 🟢 baixo (AAA polish) | ~1h |
| 8 | **LUT Color Grading** | 🟢 baixo (AAA polish) | ~2h |
| 9 | **SSR Shader custom** | 🟢 baixo (AAA avançado) | ~5h |
| 10 | **Porkbun DNS CNAME audit** | 🟡 médio (infra) | ~30min |

> **Nota:** EffectComposer + SSAO + Bloom + CSM + God Rays + DoF + Chromatic Aberration já estão implementados e funcionando.
