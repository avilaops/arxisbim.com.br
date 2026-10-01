# S12 ★ · Primeiro Cenário Salvo

**Fase:** IFC Core  
**Status:** ✅ **CONCLUÍDO 03/09/2026** · ★ **MARCO ATINGIDO**  
**Backend:** sim (nada novo foi escrito) · **Interface:** sim, publicada  
**Prova:** `documentation/S12-PROVA-BROWSER.md` — 9/9 passos em browser real  
**Verificado em:** 02/09/2026 — nenhuma tela viva menciona cenário.  
**Plano:** `documentation/S12-MATRIZ-INTEGRACAO.md`

> **Alvo do sprint, e nada além dele:**
> `/app → criar cenário → salvar câmera/visibilidade → trocar A/B → recarregar → restaurar estado`
>
> Regras duras: **zero backend novo** e **zero S18/S29 de carona**.
>
> **Achado que mudou o plano (02/09):** o CRUD plano `/api/v1/scenarios`, apesar
> do `scenarios-v12.service.ts` no nome, **não salva estado do viewer**. O
> `PATCH` dele aceita um `config` fechado por zod (movementSpeed, minimap...) e
> o `POST /scenarios/:id/update` é tick de game loop (`deltaTime`), não
> "salvar". Quem aceita `camera`, `player` e `metadata` é o CRUD aninhado
> `/api/v1/projects/:id/scenarios`. É ele que o S12 usa, só com
> create/list/get/update.
>
> **Andamento:** `src/services/scenarios.service.ts` escrito e compilando (ainda
> não provado contra a API). Próximo: a ponte no `ViewerCanvas`, onde câmera e
> `OrbitControls` hoje vivem presos dentro de um `useEffect`, sem `ref` nem
> `useImperativeHandle`. É a única parte invasiva.
**Depende de:** S09 (câmera serializável), S10 (visibilidade serializável), S11 (modelo `ready`)  
**Bloqueia:** S18 (comparação visual), S27 (animação por cenário), S29 (branching)

**Marco crítico:** Valida a hipótese central, "Usuários querem comparar alternativas?"

---

## Objetivo

Usuário cria Cenário A com uma configuração, Cenário B com outra, alterna entre eles. Hipótese central do produto validada antes de qualquer feature de 5D ou 4D.

---

## Por que importa a longo prazo

Este é o sprint mais importante do roadmap. O modelo de dados de `Scenario` definido aqui é o objeto central do produto. Cada sprint futuro adiciona mais estado ao cenário:

- S18: adiciona estado de comparação
- S19–S22: adiciona vínculo de custo
- S25–S26: adiciona vínculo de cronograma
- S29: adiciona `parent_id` (branching)

Se o modelo de `Scenario` for anêmico agora, todos esses sprints exigem migrations. A solução é um **único JSONB serializável (`scenario_state`) + `state_version`**: o banco enxerga apenas um estado opaco, e o produto evolui o formato sem alterar schema.

---

## Hierarquia conceitual

Vários cenários nascem do **mesmo modelo**. A hierarquia correta é:

```
Project
 └── ModelVersion
      ├── Cenário Base
      ├── Cenário Econômico
      ├── Cenário Acelerado
      └── Cenário Conservador
```

`Scenario` referencia `ModelVersion` (não `Project` direto), isso simplifica comparação (S18) e branching (S29), que operam sobre cenários do mesmo modelo.

---

## Modelo de dados: Scenario

```sql
scenarios (
  id          UUID PK,
  project_id  UUID FK projects NOT NULL,
  tenant_id   UUID FK tenants NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  model_version_id  UUID FK model_versions NOT NULL,

  -- Estado serializável ÚNICO, cresce sem migration
  scenario_state JSONB NOT NULL DEFAULT '{}',
  state_version  INT  NOT NULL DEFAULT 1,    -- permite migrar formatos antigos

  -- FKs estruturais futuras (NULL por enquanto)
  parent_id        UUID FK scenarios,        -- S29 branching

  -- Metadados
  is_base_scenario BOOLEAN DEFAULT false,
  sort_order       INT DEFAULT 0,
  created_by       UUID FK users,
  created_at       TIMESTAMP,
  updated_at       TIMESTAMP,
  deleted_at       TIMESTAMP
)
```

### Formato de `scenario_state`

```jsonc
// state_version = 1 (hoje)
{ "camera": { /* CameraState S09 */ }, "visibility": { /* VisibilityState S10 */ } }

// state_version futuro (sem mudar schema)
{ "camera": {}, "visibility": {}, "comparison": {}, "cost": {}, "schedule": {}, "presentation": {} }
```

> Custo e cronograma entram como **chaves dentro de `scenario_state`** (ou FKs adicionadas só quando a relação exigir integridade referencial real, em S19/S25). Nenhuma coluna nullable especulativa agora.

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
| Alternância | Troca de cenário ≤ 1s | Apenas restaura estado, não recarrega GLB |
| Persistência imediata | Auto-save do estado ao clicar em "Salvar" | Não exigir save manual |
| Captura/restauração | `ScenarioSnapshotService` com `capture()/restore()/validate()/migrate()` | Viewer não persiste direto; S18/S24/S28/S30 reusam a mesma abstração |

---

## Arquivos principais

```
backend/src/modules/scenarios/
  scenarios.routes.ts          ← CRUD /projects/:id/scenarios
  scenarios.service.ts         ← create, clone, updateState
  scenario-snapshot.service.ts ← capture/restore/validate/migrate de scenario_state

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

## Telemetria de produto

Este sprint valida uma hipótese de negócio, portanto **precisa ser medido**. Eventos com `tenant_id`, `project_id`, `scenario_id`, `duration_ms`:

- `scenario_created`
- `scenario_cloned`
- `scenario_loaded`
- `scenario_saved`
- `scenario_switched`

Permite responder: quantos usuários criam cenários? quantos criam mais de um? quantos alternam A/B? quantos nunca usam?

---

## Definição de validado

- **Validado tecnicamente** quando um usuário consegue criar, salvar e alternar entre dois cenários.
- **Validado comercialmente** quando usuários reais criam voluntariamente **mais de um cenário** no mesmo projeto **sem serem instruídos**.

Entregar a feature ≠ comprovar a hipótese. O sprint pode estar tecnicamente concluído e a hipótese de produto ainda não comprovada, a telemetria acima é o que distingue os dois.

---

## Critérios de aceite

- [ ] Criar cenário a partir de modelo base salva câmera + visibilidade em `scenario_state`
- [ ] `scenario_state` é um único JSONB com `state_version`
- [ ] Alternar A↔B restaura estado exato em < 1s (sem recarregar GLB)
- [ ] Cenários persistem entre sessões e dispositivos
- [ ] Reabrir o navegador restaura exatamente o último estado salvo do cenário
- [ ] Clone de cenário parte do estado base, não do último estado
- [ ] `ScenarioSnapshotService` captura e restaura sem o viewer persistir direto
- [ ] Limite de plano aplicado (Starter: máximo 2 cenários)
- [ ] Eventos de telemetria (`scenario_created/cloned/switched`) emitidos
- [ ] Primeiro usuário real consegue criar e alternar sem instrução
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
