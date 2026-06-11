# S19 · Modelo de Dados de Custos

**Fase:** 5D BIM  
**Status:** Pendente  
**Depende de:** S12 (cenário — costs pertencem a um cenário)  
**Bloqueia:** S20 (takeoff vincula a CostItem), S21 (SINAPI preenche CostTable), S22 (engine calcula sobre esse schema)

---

## Objetivo

Schema de custos que suporte cenários independentes, tabelas customizadas e SINAPI. Nenhuma UI ainda — apenas o modelo de dados e API.

---

## Por que importa a longo prazo

Este é o sprint mais crítico da Fase 5D. O schema definido aqui precisa suportar:
- **Cenários independentes**: Cenário A tem tabela de preços SP, Cenário B tem tabela RJ
- **SINAPI com versionamento**: Planilha de jan/2026 vs fev/2026 (preços mudam mensalmente)
- **Preços customizados**: Cliente pode substituir preço SINAPI por preço de cotação real
- **Override por elemento**: Um elemento específico pode ter preço diferente do tipo

Se qualquer uma dessas necessidades não estiver no schema agora, a migração em produção com clientes ativos é custosa e arriscada.

---

## Schema

```sql
-- Tabela de preços (SINAPI ou customizada)
cost_tables (
  id          UUID PK,
  project_id  UUID FK projects NOT NULL,
  scenario_id UUID FK scenarios,          -- NULL = compartilhada entre cenários
  name        VARCHAR(255),               -- "SINAPI SP Jan/2026" ou "Cotação Fornecedor X"
  source      VARCHAR(50),                -- 'sinapi' | 'custom' | 'import'
  state_code  VARCHAR(2),                 -- UF para SINAPI
  reference_month DATE,                   -- mês de referência SINAPI
  created_at  TIMESTAMP
)

-- Item de custo (linha da tabela)
cost_items (
  id           UUID PK,
  cost_table_id UUID FK cost_tables NOT NULL,
  code         VARCHAR(50),              -- código SINAPI ex: "74209/001"
  description  TEXT NOT NULL,
  unit         VARCHAR(20) NOT NULL,     -- 'm²', 'm³', 'un', 'kg'
  unit_price   DECIMAL(12,4) NOT NULL,
  created_at   TIMESTAMP
)

-- Vínculo: elemento IFC ↔ item de custo + quantidade
element_cost_links (
  id             UUID PK,
  scenario_id    UUID FK scenarios NOT NULL,
  cost_item_id   UUID FK cost_items NOT NULL,
  global_id      VARCHAR(22) NOT NULL,   -- âncora no elemento IFC
  quantity       DECIMAL(14,4) NOT NULL, -- calculado no S20
  quantity_unit  VARCHAR(20),
  override_price DECIMAL(12,4),          -- NULL = usa unit_price do cost_item
  note           TEXT,
  created_at     TIMESTAMP
)
```

---

## Arquivos principais

```
backend/db/schema/
  costs.ts              ← cost_tables, cost_items, element_cost_links

backend/src/modules/costs/
  cost-tables.routes.ts ← CRUD /projects/:id/cost-tables
  cost-tables.service.ts
  cost-items.routes.ts  ← CRUD /cost-tables/:id/items

backend/db/migrations/
  XXXX_costs.sql
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Preço SINAPI com 4 decimais causa erro de precisão | `DECIMAL(12,4)` nativo no Postgres, nunca `FLOAT` |
| Override por elemento não rastreado | `note` obrigatório ao inserir override |
| Cenário sem tabela de custos | `cost_table_id` nullable em `scenarios`, mostrar aviso na UI |

---

## Critérios de aceite

- [ ] `POST /cost-tables` cria tabela vinculada a cenário
- [ ] `POST /cost-tables/:id/items` adiciona itens com código, descrição, unidade, preço
- [ ] `element_cost_links` aceita quantidade + override de preço por elemento
- [ ] Migration reversível sem perda de dados
- [ ] Dois cenários podem ter tabelas de preços diferentes para o mesmo projeto
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
