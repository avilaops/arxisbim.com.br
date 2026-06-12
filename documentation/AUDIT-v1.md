# Auditoria APIs v1 — drizzle / zod / migrations / schemas / queries

Data: 2026-06-12. Escopo: superfície `/api/v1` registrada em `backend/src/index.ts`.

## Veredito

Sem buracos de segurança em rotas **vivas**. Todas as rotas registradas têm auth + tenant scoping. Build limpo, 101 testes verdes, tsc 0 erros.

## Corrigido

| Item | Severidade | Fix |
|---|---|---|
| `memberships` + `workspace_invites` sem migration (queries quebram em prod) | 🔴 Alta | Migration `039` + `workspaces.spec.ts` |
| `.js` stale em `src/routes/v1/` shadowavam `.ts` nos imports | 🟠 Média | Removidos (11 arquivos) |
| 4 route files órfãos `routes/v1/{projects,scenarios,notifications,federated-models}.ts` | 🟡 Baixa | Removidos |
| Sem zod (cast `request.body as`) em rotas vivas: companies, tenants, scheduling, ifc-models, files | 🟡 Baixa | Zod safeParse adicionado |
| `tenants.spec` + `scheduling.spec` testavam dupes mortas | 🟡 Baixa | Repontados p/ rotas vivas |
| `scheduling.controller` lia `projectId` da query em vez do path param | 🟡 Baixa | Path param + fallback query |

## Verificado OK (sem ação)

- **drizzle**: 100% dos queries via drizzle. Zero `sql.unsafe`/raw (sem injection).
- **tenant scoping**: rotas vivas filtram por `tenantId` (direto ou via join `project.tenantId`).
- **storage** (`core/storage/storage.routes.ts`): auth + `isKeyAllowedForTenant` (`tenants/${tenantId}/`).
- **analytics `/track`**: ingest público anônimo, clamp por campo + filtro — padrão correto, não usa zod de propósito.
- **workspaces**: checagens manuais (`!name`, `email.includes('@')`).
- **schema↔DB**: 62 tabelas, todas batem (após mig 039).

## Débito de código morto (NÃO removido — risco de barrel exports)

Route files duplicados, não-registrados (versão viva entre parênteses):

- `modules/tenants/tenants.routes.ts` + controller (vivo: `routes/v1/tenants.ts`)
- `modules/scheduling/scheduling.routes.ts` + controller (vivo: `routes/v1/scheduling.ts`)
- `modules/companies/companies.routes.ts` + controller (vivo: `routes/v1/companies.ts`)
- `modules/storage/storage.routes.ts` (Express leftover comentado; vivo: `core/storage/storage.routes.ts`)
- `modules/tenants/notifications.routes.ts` (vivo: `modules/notifications/notifications.routes.ts`)

Risco: edição no arquivo errado, confusão. Remover requer destrinchar `modules/tenants/index.ts` (re-exporta `taskElementLinks` que É usado). Tarefa separada deliberada.

## Migrations pendentes em prod

`037` (grace_period), `038` (storage_bytes bigint), `039` (workspaces) — auto-aplicam no boot via `runMigrations()`. Pendentes até deploy.

## Bloqueio

Deploy Render travado (autoDeploy não dispara — billing). 5 commits em `main` esperando build manual.
