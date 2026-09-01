# S22 · Engine de Cálculo 5D

**Fase:** 5D BIM  
**Status:** Pendente  
**Depende de:** S19 (schema), S20 (quantitativos), S21 (preços SINAPI)  
**Bloqueia:** S23 (performance), S24 (painel de custos), S30 (comparação financeira)

---

## Objetivo

Calcular custo total do projeto por cenário a partir de `quantidade × preço_unitário` por elemento, com breakdown por hierarquia IFC.

> **Nota para o agente:** A engine é o **coração do 5D**, precisa ser incremental, auditável e scenario-aware. O risco máximo é **drift silencioso**: preço muda e o número exibido fica errado sem ninguém saber. Por isso: calcular on-demand ou invalidar cache explicitamente, nunca persistir resultado sem versão. Todo cálculo monetário em Decimal, jamais FLOAT.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Otimização de performance / cache em larga escala (S23)
- Painel/heatmap de custo (S24)
- Comparação financeira entre cenários (S30)
- Curva S detalhada (depende de schedule, S25+)
- BDI configurável por composição

---

## Por que importa a longo prazo

A engine de cálculo é o coração do 5D. Ela precisa ser incremental (recalcular apenas o que mudou), auditável (memória de cálculo completa) e scenario-aware (Cenário A e B têm resultados independentes).

O maior risco de longo prazo é o drift entre o banco e o resultado calculado: se um preço SINAPI muda mas o cálculo não recalcula, o cliente vê números errados sem saber. A solução é calcular on-demand ou invalidar cache explicitamente, nunca persistir resultado calculado sem versionamento.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Estratégia | Calcular on-demand + cache Redis com TTL | Nunca stale sem versionamento |
| Invalidação | Mudança em `cost_items` ou `element_cost_links` invalida cache | Cache key = `scenario_id + cost_table_version` |
| Granularidade | Por elemento → por tipo → por pavimento → por cenário | Cada nível é somado do inferior |
| Curva S | Distribuição de custo por fase de tempo (se schedule vinculado) | Entra no S25+ |
| Exportação | `memória de cálculo` = planilha com expressID, quantidade, preço, total por linha | Auditável |
| Moeda | BRL com 2 casas decimais, DECIMAL(14,2) | Nunca FLOAT para dinheiro |

---

## Resultado do cálculo

```typescript
interface CostCalculation {
  scenario_id: string
  calculated_at: string
  total_cost: number              // BRL
  breakdown: {
    by_type: Record<string, { quantity: number; unit: string; total: number }>
    by_storey: Record<string, { total: number }>
    by_category: Record<string, { total: number }>  // structural, mep, etc.
  }
  s_curve: { month: string; cumulative: number }[]  // preenchido no S25
  elements: {
    global_id: string
    ifc_type: string
    quantity: number
    unit: string
    unit_price: number
    total: number
  }[]
}
```

---

## Arquivos principais

```
backend/src/modules/costs/
  cost-calculator.service.ts  ← orquestra cálculo, usa Redis para cache
  cost-calculation.routes.ts  ← GET /scenarios/:id/cost-calculation
  cost-export.service.ts      ← gera XLSX de memória de cálculo

backend/src/shared/
  cache.service.ts            ← wrapper de Redis com TTL e invalidação
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Cálculo de 50k elementos lento sem cache | Sprint S23 dedicado a otimização |
| Resultado cached após mudança de preço | Invalidar cache em qualquer mutação de cost_items |
| FLOAT causando erro de arredondamento em totais | Usar Decimal.js para todos os cálculos monetários |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Custo total calculado corretamente para projeto de referência (validado manualmente)
- [ ] Recálculo após mudança de preço unitário em < 5s (com cache invalidado)
- [ ] Breakdown por tipo, pavimento e categoria corretos
- [ ] Export XLSX de memória de cálculo abre no Excel sem erro
- [ ] Dois cenários têm cálculos independentes (mudar preço do cenário A não afeta B)
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
