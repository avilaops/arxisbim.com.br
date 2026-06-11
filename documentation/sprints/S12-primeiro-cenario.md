# S12 ★ · Primeiro Cenário Salvo

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S09 (câmera serializável), S10 (visibilidade serializável), S11 (modelo `ready`)  
**Bloqueia:** S18 (comparação visual), S27 (animação por cenário), S29 (branching)

**Marco crítico:** Valida a hipótese central — "Usuários querem comparar alternativas?"

---

## Objetivo

Usuário cria Cenário A com uma configuração, Cenário B com outra, alterna entre eles. Hipótese central do produto validada antes de qualquer feature de 5D ou 4D.

---

## Por que importa a longo prazo

Este é o sprint mais importante do roadmap. O modelo de dados de `Scenario` definido aqui é o objeto central do produto. Cada sprint futuro adiciona mais estado ao cenário:

- S18: adiciona `comparison_partner_id`
- S19–S22: adiciona `cost_table_id`
- S25–S26: adiciona `schedule_id`
- S29: adiciona `parent_scenario_id` (branching)

Se o modelo de `Scenario` for anêmico agora, todos esses sprints exigem migrations. Se for extensível (JSONB para estado customizado), crescem sem migrations.

---

## Modelo de dados — Scenario

```sql
scenarios (
  id          UUID PK,
  project_id  UUID FK projects NOT NULL,
  tenant_id   UUID FK tenants NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  model_version_id  UUID FK model_versions NOT NULL,

  -- Estado do viewer (serializável, cresce com o produto)
  camera_state    JSONB,   -- CameraState do S09
  visibility_state JSONB,  -- VisibilityState do S10

  -- Futuro (NULL por enquanto, preenchido em sprints posteriores)
  cost_table_id    UUID FK cost_tables,    -- S19
  schedule_id      UUID FK schedules,      -- S25
  parent_id        UUID FK scenarios,      -- S29 branching

  -- Metadados
  is_base_scenario BOOLEAN DEFAULT false,
  sort_order       INT DEFAULT 0,
  created_by       UUID FK users,
  created_at       TIMESTAMP,
  updated_at       TIMESTAMP,
  deleted_at       TIMESTAMP
)
```

---

## Fluxo no produto

```
Dashboard de projeto → "Cenários" → Lista vazia
→ "Criar cenário" → Nome + modelo base → Cenário A criado
→ Viewer abre no Cenário A → Usuário ajusta câmera + filtros
→ "Salvar estado do cenário" → CameraState + VisibilityState persistidos
→ "Criar Cenário B" → Clone do A → Usuário faz ajuste diferente → Salva
→ Botão "A / B" alterna → Viewer restaura estado exato de cada cenário
```

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Cenário base | `is_base_scenario = true` para o modelo original | Sempre há um ponto de referência |
| Clone | Copia estado do cenário base, não do último cenário | Consistência |
| Limite por plano | Starter: 2 · Pro: 10 · Business: ∞ | Via `checkPlanLimit('scenarios')` do S04 |
| Alternância | Troca de cenário ≤ 1s | Apenas restaura estado — não recarrega GLB |
| Persistência imediata | Auto-save do estado ao clicar em "Salvar" | Não exigir save manual |

---

## Arquivos principais

```
backend/src/modules/scenarios/
  scenarios.routes.ts   ← CRUD /projects/:id/scenarios
  scenarios.service.ts  ← create, clone, updateState

backend/db/schema/
  scenarios.ts          ← schema completo com FKs futuras nullable

frontend/src/
  scenarios/
    ScenarioSwitcher.ts ← UI de alternância A/B
    ScenarioList.ts     ← lista lateral de cenários
  viewer/
    ViewerHost.ts       ← loadScenario(scenario), saveScenario()
```

---

## Critérios de aceite

- [ ] Criar cenário a partir de modelo base salva câmera + visibilidade
- [ ] Alternar A↔B restaura estado exato em < 1s (sem recarregar GLB)
- [ ] Cenários persistem entre sessões e dispositivos
- [ ] Clone de cenário parte do estado base, não do último estado
- [ ] Limite de plano aplicado (Starter: máximo 2 cenários)
- [ ] Primeiro usuário real consegue criar e alternar sem instrução
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
