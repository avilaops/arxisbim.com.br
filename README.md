# ArxisVR

Plataforma de decisão baseada em modelos BIM, IFC nativo, cenários 4D/5D, SINAPI integrado.

**Produção:** [arxisvr.avilaops.com](https://arxisvr.avilaops.com) · API: `api.arxisvr.avilaops.com`

---

## Arquitetura

```
arxisvr.avilaops.com       (GitHub Pages)
Frontend: Vite MPA + Three.js + IFC

        │ HTTPS / WSS

api.arxisvr.avilaops.com   (Render, Fastify)
Backend: auth · tenants · BIM · observability
WebSocket (signaling/realtime: rooms, avatar_update, chat) no mesmo serviço
PostgreSQL (Render managed) · R2 Storage
```

> Só existem 2 serviços em produção: o frontend (GitHub Pages) e o backend
> (Render). NÃO há serviço de signaling separado, o WebSocket é servido pelo
> backend. O diretório `signaling-server/` é apenas dev local (porta 3002).

> **Domínio canônico:** `avilaops.com`. Nunca usar `avila.inc`.

---

## Quick start

```bash
# Infra local (Postgres + MinIO)
docker compose -f docker-compose.dev.yml up -d

# Backend
cd backend
cp .env.example .env     # ajustar DATABASE_URL
npm install
npm run migrate
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Node: ver `.nvmrc` (20.x). Package manager: `npm`.

---

## Variáveis de ambiente

### Frontend (Vite / GitHub Actions)

| Var | Produção |
|---|---|
| `VITE_API_URL` | `https://api.arxisvr.avilaops.com` |
| `VITE_WS_URL` | `wss://api.arxisvr.avilaops.com` |

### Backend (Render)

| Var | Descrição |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret para access tokens (HS256) |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `STORAGE_DRIVER` | `r2` em produção, `local` em dev |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Bucket de modelos IFC |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GITHUB_CLIENT_ID` | OAuth GitHub |
| `BILLING_PROVIDER` | `mercadopago` (padrão) ou `internal` (aprovação manual, sem cobrança) |
| `MP_ACCESS_TOKEN` | Billing, access token da conta Mercado Pago da Avila Ops (assinaturas / preapproval) |
| `MP_WEBHOOK_SECRET` | Billing, segredo da assinatura `x-signature` das notificações do Mercado Pago |
| `BILLING_PROVIDER_SYNC_INTERVAL_MS` | Billing, cadência da sincronização com o Mercado Pago (padrão 6h; a notificação do MP não é garantida) |

> **CRÍTICO Render:** `PUT /env-vars` substitui TODAS as variáveis. Sempre enviar a lista completa.

---

## Deploy

| Serviço | Trigger | Como |
|---|---|---|
| Frontend | Push em `main` em `frontend/**` | GitHub Actions → GitHub Pages |
| Backend | Push em `main` | Render auto-deploy |
| Signaling | Manual | Render, sempre ligado |

Signaling no plano free dorme após 15 min inativo. Frontend envia ping a cada 25s.

---

## Auth

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
GET  /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
GET  /api/v1/auth/google
GET  /api/v1/auth/github
GET  /api/v1/auth/verify-email
```

Segurança: rate limit 10 req/min · bcrypt rounds 12 · JWT access 15min + refresh 30d · reuse detection.

---

## Multiplayer (WebSocket: signaling-server)

| Client → Server | Campos |
|---|---|
| `join_room` | `roomId, userId, displayName, [accessToken]` |
| `avatar_update` | `avatarConfig: AvatarState` |
| `chat_message` | `content` |

| Server → Client | Campos |
|---|---|
| `room_joined` | `roomId, participantId, members[]` |
| `user_joined` / `user_left` | `participantId, userId` |
| `avatar_update` | `participantId, avatarConfig, timestamp` |
| `chat_message` | `participantId, content, timestamp` |

Testar local: `PORT=3002 node signaling-server/server.js` + `VITE_WS_URL=ws://localhost:3002`

---

## Checklist de sessão

```bash
# 1. Backend vivo?
curl https://api.arxisvr.avilaops.com/health

# 2. Último deploy frontend
# → github.com/AvilaOps/arxisvr/actions

# (O WebSocket/signaling é o próprio backend: coberto pelo check 1.
#  Keep-alive externo: Cloudflare Worker arxisvr-keepalive, cron */10.)
```

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [`documentation/vision.md`](documentation/vision.md) | Tese, posicionamento, mercado |
| [`documentation/business.md`](documentation/business.md) | Pricing, competidores, riscos |
| [`documentation/roadmap/ROADMAP.md`](documentation/roadmap/ROADMAP.md) | 32 sprints com critérios de aceite |
| [`documentation/changelog.md`](documentation/changelog.md) | Decisões com data e motivo |
| [`documentation/CI-CD-ESTRATEGIA.md`](documentation/CI-CD-ESTRATEGIA.md) | Pipeline CI/CD + como rodar local |
| [`documentation/CUIDADOS_BEFORE_GIT.md`](documentation/CUIDADOS_BEFORE_GIT.md) | Checklist pré-commit |
