# S26 ★ · Primeira Comparação Temporal de Cenários

**Fase:** 4D BIM  
**Status:** Pendente  
**Depende de:** S25 (schedules), S18 (split-view)  
**Bloqueia:** S27 (animação completa), S30 (comparação financeira usa duração por cenário)

**Marco crítico:** Valida "Diferença de prazo entre cenários importa para decisão?"

---

## Objetivo

Slider de data que anima a construção. Split-view A|B mostra diferença de prazo. Data de conclusão calculada por cenário. Atraso em cascata para sucessoras.

---

## Por que importa a longo prazo

Esta é a primeira vez que o produto mostra valor de 4D real: não apenas uma animação bonita, mas uma ferramenta de comparação de alternativas de cronograma. "Se mudarmos o método de fundação, atrasamos 30 dias ou adiantamos 15?"

O engine de propagação de datas (quando atividade atrasa, suas sucessoras atrasam) é a lógica mais complexa do 4D. Uma implementação ingênua que recalcula tudo a cada mudança não escala para cronogramas de 500 atividades. O algoritmo correto é topological sort + propagação forward pass/backward pass do CPM (Critical Path Method).

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Algoritmo de propagação | CPM forward pass simplificado | Padrão da indústria (MS Project, Primavera) |
| Animação | Estado do viewer muda por `currentDate` no slider | Simples e responsivo |
| Estado por data | `elementStateAtDate(expressID, date)` → `'not_started' \| 'active' \| 'complete'` | Determinístico, cacheável |
| Comparação de datas | A termina em data X, B termina em Y → delta em dias | Calculado pelo backend |
| Câmera | Câmeras sincronizadas como no S18 | Reusa SplitView |

---

## Algoritmo de estado por data

```typescript
function getElementStateAtDate(
  activity: Activity,
  date: Date
): 'not_started' | 'active' | 'complete' {
  if (date < activity.planned_start) return 'not_started'
  if (date > activity.planned_end)   return 'complete'
  return 'active'
}

function getScenarioCompletionDate(schedule: Schedule): Date {
  // Max de planned_end entre todas as atividades sem sucessoras
  return maxDate(schedule.activities
    .filter(a => !hasSucessors(a))
    .map(a => a.planned_end))
}
```

---

## Arquivos principais

```
backend/src/modules/scheduling/
  cpm.service.ts              ← forward pass + backward pass simplificado
  scenario-comparison.routes.ts ← GET /scenarios/:a/:b/timeline-comparison

frontend/src/
  timeline/
    TimelineSlider.ts         ← slider de data com play/pause
    ElementStateResolver.ts   ← estado de cada elemento em uma data
    TimelineComparison.ts     ← split-view com duas timelines sincronizadas
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| CPM com cronograma de 500 atividades lento | Pré-computar datas calculadas no backend, não recalcular no frontend |
| Slider causa recálculo a cada pixel arrastado | Debounce de 100ms no slider |
| Atividade sem predecessores e sem data → quebra CPM | Validar schedule antes de calcular |

---

## Critérios de aceite

- [ ] Slider de data muda estado visual dos elementos (não iniciado / ativo / concluído)
- [ ] Split-view A|B mostra dois cronogramas com datas diferentes
- [ ] Data de conclusão calculada corretamente para cada cenário
- [ ] Atraso em atividade predecessor propaga para sucessoras (CPM forward pass)
- [ ] Delta de prazo entre cenários exibido em dias
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
