# S29 · Motor de Cenários: Branching Completo

**Fase:** Motor de Cenários  
**Status:** Pendente  
**Depende de:** S12 (cenários base), S22 (custos por cenário), S26 (datas por cenário)  
**Bloqueia:** S30 (comparação financeira usa branching)

---

## Objetivo

Fork de cenário com deep copy de schedule e cost_table. Diff textual e visual entre dois cenários. Merge de cenário vencedor como novo baseline do projeto.

> **Nota para o agente:** Completa o conceito de cenário iniciado no S12. O risco máximo é o **deep copy**: fork por referência vaza mudanças entre cenários. A cópia precisa ser **atômica** (transação, ou tudo ou nada). Cenários **nunca são deletados**, apenas arquivados (auditabilidade: "por que escolhemos este cronograma?"). Reusa `ScenarioSnapshotService` do S12.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Comparação financeira com PDF (S30)
- Presentation Studio (S31)
- Merge de 3+ cenários simultâneos
- Versionamento git-like com histórico de commits de cenário
- Colaboração simultânea em fork

---

## Por que importa a longo prazo

O S12 criou o conceito de cenário. O S29 torna o sistema de cenários completo: um gerente de obras precisa criar "Cenário A: fundação convencional" e "Cenário B: fundação com estacas", comparar prazo e custo, e transformar o vencedor no plano oficial.

O deep copy é o risco maior: um cenário bifurca schedule (cronograma) e cost_table (orçamento) inteiros. Usar referência em vez de cópia faria mudanças num cenário vazar para o outro. A cópia precisa ser atômica, ou tudo ou nada.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Fork | Deep copy atômica em transação Postgres | Garantia de integridade; sem leak entre cenários |
| Diff | Comparar schedules e cost_tables linha a linha no backend | Frontend recebe diff estruturado, não calcula |
| Merge | Cenário vencedor passa a ser `base_scenario_id` do projeto | Outros cenários ficam arquivados, não deletados |
| Histórico | Cenários nunca são deletados, apenas arquivados (`archived_at`) | Auditabilidade: "por que escolhemos esse cronograma?" |
| Limite | Plano Starter: 2 cenários por projeto; Pro: 10; Enterprise: ilimitado | Controlado por `PLAN_LIMITS` do S04 |

---

## Schema de fork

```sql
-- Ao fazer fork do Cenário A para criar Cenário B:
BEGIN;

INSERT INTO scenarios (id, project_id, name, parent_scenario_id ...)
VALUES (new_id, project_id, 'Cenário B', scenario_a_id ...);

-- Deep copy do schedule
INSERT INTO schedules SELECT gen_random_uuid(), project_id, new_id, name, start_date, source, now()
FROM schedules WHERE scenario_id = scenario_a_id;

-- Deep copy das atividades (mapeando IDs novos)
-- ... via CTE com mapeamento old_id → new_id

-- Deep copy da cost_table e cost_items
-- ...

COMMIT;
```

---

## DTO de diff de cenários

```typescript
interface ScenarioDiff {
  scenario_a: { id: string; name: string }
  scenario_b: { id: string; name: string }
  schedule_diff: {
    added_activities: Activity[]
    removed_activities: Activity[]
    changed_activities: { activity_id: string; field: string; a: any; b: any }[]
    completion_date_a: string
    completion_date_b: string
    delta_days: number
  }
  cost_diff: {
    total_a: number
    total_b: number
    delta: number
    changed_items: { item_id: string; description: string; price_a: number; price_b: number }[]
  }
}
```

---

## Arquivos principais

```
backend/src/modules/scenarios/
  scenario-fork.service.ts     ← deep copy atômica em transação
  scenario-diff.service.ts     ← calcula diff entre dois cenários
  scenario-merge.service.ts    ← promove cenário vencedor como base
  scenarios.routes.ts          ← POST /scenarios/:id/fork, GET /scenarios/:a/diff/:b, POST /scenarios/:id/merge

frontend/src/scenarios/
  ScenarioBranchPanel.tsx      ← lista de cenários com fork/archive/merge
  ScenarioDiffView.tsx         ← exibe diff de schedule e custo lado a lado
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Deep copy de cronograma com 500 atividades lenta | Operação em transação com timeout de 30s; processar em job se > 200 atividades |
| IDs de atividades referenciados externamente quebrando após fork | Manter tabela de mapeamento `scenario_activity_map(original_id, forked_id)` |
| Usuário não entende qual cenário é o "base" | Interface mostra badge "Baseline" no cenário principal |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Fork de cenário cria deep copy independente de schedule e cost_table
- [ ] Alteração em Cenário B não afeta Cenário A
- [ ] `GET /scenarios/:a/diff/:b` retorna diff estruturado com delta de dias e custo
- [ ] Merge promove cenário como baseline e arquiva os demais
- [ ] Cenários arquivados continuam visíveis mas não editáveis
- [ ] Limite de plano aplicado no fork (Starter: 2, Pro: 10)
- [ ] Fork de 500 atividades completa em < 10s
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
