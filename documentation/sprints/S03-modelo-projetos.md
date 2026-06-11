# S03 · Modelo de Dados — Projetos

**Fase:** Fundação SaaS  
**Status:** Pendente  
**Depende de:** S01 (tenant), S02 (storage)  
**Bloqueia:** S05 (dashboard), S07 (IFC precisa de project + model IDs)

---

## Objetivo

Definir o schema central do produto: Project → Model → Version. Todas as entidades futuras (cenários, atividades, custos) pendurarão nessa hierarquia.

---

## Por que importa a longo prazo

O modelo de dados de projetos é a espinha dorsal do banco. Decisões tomadas aqui — como versioning de modelos, soft-delete, e a relação entre `project` e `scenario` — se propagam para todos os sprints de 5D e 4D. Errar aqui significa migrations destrutivas em produção com clientes ativos.

Em especial: a relação `Project 1→N Model 1→N Version` precisa ser pensada para acomodar cenários no S12 (`Scenario 1→1 ModelVersion` como base) sem quebrar o schema existente.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Hierarquia | `tenant → project → model → model_version` | Versioning explícito para suportar reimport |
| Soft-delete | `deleted_at TIMESTAMP NULL` em todas as entidades | Auditoria e recuperação |
| Status de modelo | `enum: uploading, processing, ready, failed` | Alimenta S11 (processamento assíncrono) |
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
  name VARCHAR(255) NOT NULL,
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
  metadata JSONB,               -- ifc_schema, bounds, element_count
  processed_at TIMESTAMP,
  created_at TIMESTAMP
)
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

- [ ] `POST /projects` cria projeto com slug gerado automaticamente
- [ ] `GET /projects` lista apenas projetos do tenant autenticado
- [ ] `POST /projects/:id/models` cria model + versão com status `uploading`
- [ ] Paginação funciona em listas com > 100 projetos
- [ ] Soft-delete: projeto deletado não aparece na listagem, mas existe no banco
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
