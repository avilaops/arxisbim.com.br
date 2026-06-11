# S25 · Modelo de Dados 4D — Atividades

**Fase:** 4D BIM  
**Status:** Pendente  
**Depende de:** S12 (cenário — schedules pertencem a um cenário), S07 (elementos IFC para vínculo)  
**Bloqueia:** S26 (comparação temporal), S27 (animação), S28 (import de MSP)

---

## Objetivo

Schema de atividades e cronograma com vínculo muitos-para-muitos entre atividades e elementos IFC. Import de CSV e MS Project XML.

---

## Por que importa a longo prazo

O vínculo entre atividade e elemento IFC é a relação mais complexa do produto. Uma atividade pode afetar múltiplos elementos ("Concretagem da laje do 3° pavimento" = todos os `IfcSlab` do `IfcStorey[3]`). Um elemento pode aparecer em múltiplas atividades ("Forma, armação, concretagem e cura" para o mesmo pilar).

O schema precisa suportar essa relação N:N desde o início. Além disso, o vínculo precisa ser serializável por cenário — Cenário A tem cronograma de 180 dias, Cenário B tem 210 dias — usando o mesmo conjunto de elementos IFC.

---

## Schema

```sql
schedules (
  id           UUID PK,
  project_id   UUID FK projects NOT NULL,
  scenario_id  UUID FK scenarios,      -- NULL = base, copiado por cenário
  name         VARCHAR(255),
  start_date   DATE NOT NULL,
  source       VARCHAR(20),            -- 'manual' | 'csv' | 'msp' | 'primavera'
  created_at   TIMESTAMP
)

activities (
  id            UUID PK,
  schedule_id   UUID FK schedules NOT NULL,
  external_id   VARCHAR(100),          -- ID do MS Project / Primavera
  name          VARCHAR(500) NOT NULL,
  planned_start DATE NOT NULL,
  planned_end   DATE NOT NULL,
  actual_start  DATE,
  actual_end    DATE,
  duration_days INT GENERATED AS (planned_end - planned_start),
  percent_complete DECIMAL(5,2) DEFAULT 0,
  wbs_code      VARCHAR(100),          -- ex: "1.2.3.4"
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMP
)

activity_predecessors (
  activity_id     UUID FK activities NOT NULL,
  predecessor_id  UUID FK activities NOT NULL,
  lag_days        INT DEFAULT 0,
  type            VARCHAR(10) DEFAULT 'FS',  -- FS, FF, SS, SF
  PRIMARY KEY (activity_id, predecessor_id)
)

-- Vínculo N:N atividade ↔ elemento IFC
activity_elements (
  activity_id  UUID FK activities NOT NULL,
  global_id    VARCHAR(22) NOT NULL,    -- GlobalId do elemento IFC
  state_during VARCHAR(20) DEFAULT 'active',  -- 'active' | 'temporary' | 'removed'
  PRIMARY KEY (activity_id, global_id)
)
```

---

## Arquivos principais

```
backend/src/modules/scheduling/
  scheduling.routes.ts      ← CRUD /projects/:id/schedules
  activities.routes.ts      ← CRUD /schedules/:id/activities
  activity-links.routes.ts  ← POST /activities/:id/elements
  schedule-import.service.ts ← parser CSV e MSP XML

backend/db/schema/
  scheduling.ts
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| GlobalId de elemento IFC mudando após reimport | Alertar quando vínculo orphan detectado |
| Ciclo em predecessores (A depende de B, B depende de A) | Detectar ciclo no insert, retornar 422 |
| Import MSP XML com encoding Windows-1252 | Parser com detecção de encoding |

---

## Critérios de aceite

- [ ] Import CSV com colunas `id, name, start, end, predecessors` funciona
- [ ] Import MS Project `.xml` (formato 2003 e 2019) funciona
- [ ] Vínculo atividade ↔ GlobalId IFC salvo e recuperável
- [ ] Predecessores com tipo FS/FF/SS/SF e lag em dias
- [ ] `GET /schedules/:id` retorna cronograma completo com atividades e vínculos
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
