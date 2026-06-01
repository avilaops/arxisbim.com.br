# Passos obrigatórios para destravar o desenvolvimento do backend

1. **Configure o ambiente**
   - Copie o exemplo de variáveis:
     `cp backend/.env.example backend/.env`
   - Edite `backend/.env` e configure:
     `DATABASE_URL=postgres://usuario:senha@localhost:5432/arxisvr_dev`
     (Ajuste usuário, senha e banco conforme seu ambiente.)
   - Defina também `JWT_SECRET` (qualquer string longa para dev).

2. **Instale dependências por pacote (não use install no root)**
   - `pnpm --dir backend install --frozen-lockfile`
   - `pnpm --dir frontend install --frozen-lockfile`
   - `cd signaling-server && npm install --omit=dev`
   - O repo tem `.npmrc` com `ignore-workspace=true`, então `pnpm install` no root **não** popula `node_modules` nos sub-pacotes — sempre instale per-package.

3. **Rode as migrações**
   - `pnpm --dir backend run migrate`
   - Confirme que todas as tabelas foram criadas (schemas em `backend/src/shared/database/schema/`).

4. **Builds locais (mesma estratégia do CI e do Render)**
   - `pnpm --dir backend run build`  → gera `backend/dist/` via esbuild.
   - `pnpm --dir frontend run build` → gera `frontend/dist/` via Vite/rolldown.
   - `pnpm --dir backend run type-check` (não bloqueia o CI hoje, mas é o jeito de ver os erros TS pré-existentes).

5. **Smoke test do backend**
   - `cd backend && node dist/index.js`
   - `curl http://127.0.0.1:3001/health/live` → deve responder 200. É exatamente o que o CI checa.

6. **Testes E2E**
   - Com banco e variáveis prontos:
     `pnpm exec vitest run --config vitest.config.ts`
   - Specs em `backend/tests/e2e/` cobrem hoje: companies, federated-models, ifc-models, projects, notifications, model-elements, scenarios, schedule-tasks, scheduling, webhooks, timeline-simulations, tenants, task-element-links.
   - Pendentes (alta prioridade para adicionar): auth, admin, budgets, billing, collaboration, federation, ifc, storage, observability, virtual-meetings.

7. **Antes do push**
   - Veja `Docs/CUIDADOS_BEFORE_GIT.md`.
   - O workflow `.github/workflows/ci.yml` re-roda exatamente os passos 2–5; o `.github/workflows/deploy-prod.yml` tem um job `build` obrigatório antes de qualquer SSH para produção.

8. **Continue implementando endpoints e testes**
   - Para cada novo endpoint, espelhe a estrutura `modules/<dominio>/<dominio>.{routes,controller,service}.ts` (NÃO use `backend/src/services` ou `backend/src/controllers` — eles não existem no repo real).
   - Schemas Drizzle ficam em `backend/src/shared/database/schema/`.

Se travar em qualquer passo: leia `Docs/ComoRodarBackendETestes.md` e `Docs/03- Camadas e Serviços.md`.
