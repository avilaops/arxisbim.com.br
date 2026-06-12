# S03 · Modelo de Dados — Projetos

**Fase:** Fundação SaaS  
**Status:** Em andamento (core entregue em 2026-06-11 — migration 035, módulo models, testes 9/9)  
**Depende de:** S01 (tenant), S02 (storage)  
**Bloqueia:** S05 (dashboard), S07 (IFC precisa de project + model IDs)

---

## Objetivo

Definir o schema central do produto: Project → Model → Version. Todas as entidades futuras (cenários, atividades, custos) pendurarão nessa hierarquia.

> **Nota para o agente:** Este sprint define a estrutura de dados que será usada pelos módulos 4D, 5D, Cenários, Presentation Studio e Digital Twin. **Evite decisões que acoplem o schema apenas ao upload de IFC.** O modelo deve representar a evolução futura da obra, não apenas o armazenamento de arquivos.

---

## Fora de Escopo

Pertencem a sprints posteriores — **não implementar aqui**:

- Cenários (S12)
- Custos / cost tables (S19)
- Cronogramas (S25)
- Compartilhamento público (S17)
- Comentários (S16)
- Controle de versões visual / diffs entre modelos (S18, S29)

---

## Por que importa a longo prazo

O modelo de dados de projetos é a espinha dorsal do banco. Decisões tomadas aqui — como versioning de modelos, soft-delete, e a relação entre `project` e `scenario` — se propagam para todos os sprints de 5D e 4D. Errar aqui significa migrations destrutivas em produção com clientes ativos.

Em especial: a relação `Project 1→N Model 1→N Version` precisa ser pensada para acomodar cenários no S12 (`Scenario 1→1 ModelVersion` como base) sem quebrar o schema existente.

---

## Compatibilidade futura — cadeia de domínio

A hierarquia deste sprint é a base de toda a cadeia de valor do ArxisVR:

```
Tenant → Project → Model → ModelVersion
                              → Scenario        (S12)
                                 → Schedule     (S25)
                                 → Cost Table    (S19)
                                 → Presentation  (S31)
```

Regra explícita para evitar acoplamento errado: **Scenario referencia ModelVersion, NÃO Project.** O fluxo correto é `Project → Model → ModelVersion → Scenario`. Não modelar `Project → Scenario` direto.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Hierarquia | `tenant → project → model → model_version` | Versioning explícito para suportar reimport |
| Soft-delete | `deleted_at TIMESTAMP NULL` em todas as entidades | Auditoria e recuperação |
| Filtro de soft-delete | Responsabilidade do repository, nunca do controller | Nenhuma query de listagem retorna entidades com `deleted_at` preenchido |
| Status de modelo | `enum: uploading, processing, ready, failed` | Alimenta S11 (processamento assíncrono) |
| Status de projeto | `status` derivado/cacheado da versão ativa | Dashboard (S05) lista estado sem varrer todas as versões |
| Código de projeto | `project_code VARCHAR(100)` | Obras usam códigos (PJ-2026-014) em ERP, contratos, relatórios |
| Integridade de versão | `sha256` em `model_versions` | Detecta upload duplicado, corrupção, evita reprocessamento (S11) |
| Slug de projeto | `slug UNIQUE por tenant` | URL amigável `/projects/torre-a` |
| Metadados do modelo | `JSONB: size, units, ifc_schema, bounds` | Extraídos no S07, não requer coluna fixa |
| Índices | `(tenant_id, deleted_at)` em todas as queries de listagem | Performance em grandes portfólios |

---

## Arquivos principais

```
backend/db/schema/
  projects.ts           ← projects, models, model_versions

backend/src/modules/projects/
  projects.routes.ts    ← CRUD /projects
  projects.service.ts

backend/src/modules/models/
  models.routes.ts      ← GET/POST /projects/:id/models
  models.service.ts     ← cria model_version após upload

backend/db/migrations/
  XXXX_projects.sql
```

---

## Schema de referência

```sql
projects (
  id UUID PK,
  tenant_id UUID FK tenants NOT NULL,
  slug VARCHAR(100) NOT NULL,
  project_code VARCHAR(100),          -- código de obra: PJ-2026-014, OBR-0048
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'empty', -- cache derivado da versão ativa: empty/processing/ready/failed
  deleted_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE(tenant_id, slug)
)

models (
  id UUID PK,
  project_id UUID FK projects NOT NULL,
  name VARCHAR(255),
  current_version_id UUID FK model_versions,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
)

model_versions (
  id UUID PK,
  model_id UUID FK models NOT NULL,
  version INT NOT NULL,
  status VARCHAR(20) NOT NULL,  -- uploading/processing/ready/failed
  storage_key VARCHAR(500),
  file_size BIGINT,
  sha256 CHAR(64),              -- integridade; detecta duplicação e corrupção
  metadata JSONB,               -- ifc_schema, bounds, element_count
  processed_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE(model_id, version)
)

CREATE INDEX idx_model_versions_status ON model_versions(status);
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Schema rígido dificulta adição de campos futuros | Usar JSONB `metadata` para campos variáveis |
| `current_version_id` circular reference | Nullable na criação, atualizado após processamento |
| Slug conflict entre tenants diferentes | UNIQUE(tenant_id, slug) resolve no banco |

---

## Critérios de aceite

- [x] `POST /projects` cria projeto com slug gerado automaticamente *(teste C01/C01b)*
- [x] `GET /projects` lista apenas projetos do tenant autenticado *(teste C02)*
- [x] `POST /projects/:id/models` cria model + versão com status `uploading` *(teste C03)*
- [x] Upload subsequente do mesmo model cria nova `model_version` *(teste C04)*
- [x] Número de versão incrementa automaticamente (UNIQUE por model) *(teste C04 + UNIQUE no banco)*
- [x] `current_version_id` aponta para a versão mais recente após processamento *(teste C06; status do projeto cacheado junto)*
- [x] Paginação funciona em listas com > 100 projetos *(teste C07; page/pageSize/total)*
- [x] Soft-delete: projeto deletado não aparece na listagem, mas existe no banco *(teste C08)*
- [x] Filtro de `deleted_at` aplicado no repository, não no controller *(`ProjectsService.notDeleted()`)*
- [x] Build e lint passam
- [ ] Demo em até 5 minutos

## Implementação (2026-06-11)

| Item | Arquivo |
|---|---|
| Migration (slug, project_code, deleted_at, models, model_versions, RLS) | `backend/migrations/035_projects_models_versions.sql` |
| Schema Drizzle (projects estendido + models + modelVersions) | `backend/src/shared/database/schema/projects.ts` |
| ProjectsService (slug, soft-delete no repository, paginação) | `backend/src/modules/projects/projects.service.ts` |
| Módulo models (CRUD + versões + status → current_version_id) | `backend/src/modules/models/` |
| Testes E2E (9 critérios) | `backend/tests/e2e/projects-models.spec.ts` |

Notas:
- `projects.company_id` virou nullable (fluxo self-service cria projeto sem company).
- Status do projeto é cache derivado: `empty` na criação, `processing/ready/failed` conforme a versão ativa.
- Escritas em models/model_versions usam `withTenant()` (RLS via `app.tenant_id`).
- **Pendente produção:** aplicar migrations 032–035 (deploy manual).
