# S30 ★ · Primeira Comparação Financeira de Cenários

**Fase:** Motor de Cenários  
**Status:** Pendente  
**Depende de:** S24 (painel de custos), S26 (comparação temporal), S29 (branching)  
**Bloqueia:** S31 (Presentation Studio usa comparação como slide principal)

**Marco crítico:** Valida "Diferença de custo entre cenários é o argumento de venda do produto"

---

## Objetivo

Split-view com custo total, breakdown por categoria e curva S lado a lado para dois cenários. Export de relatório comparativo em PDF. Recomendação automática baseada em custo × prazo.

> **Nota para o agente:** Aqui **fecha o loop completo do produto**: IFC → cenário → custo → comparação → decisão. Tudo desde o S01 converge. Reusa `SplitView` (S18) e o painel de custos (S24) sem duplicar. A recomendação deve ser **transparente** (algoritmo explicável, nunca caixa-preta de ML). O PDF não é opcional — é exigência de documentação de decisão em licitação pública (Lei 14.133/2021).

---

## Fora de Escopo

Pertencem a sprints futuros — **não implementar aqui**:

- Presentation Studio (S31)
- Recomendação por ML / otimização multiobjetivo
- Comparação de 3+ cenários no mesmo relatório
- Integração com ERP / exportação para sistemas de licitação
- Digital Twin / dados de execução real

---

## Por que importa a longo prazo

Este é o sprint que finaliza o loop completo do produto: IFC → cenário → custo → comparação → decisão. Tudo que foi construído desde o S01 converge aqui.

A comparação financeira de cenários é o argumento de venda diferencial do ArxisVR frente a qualquer viewer IFC. Um engenheiro de custos gasta dias comparando orçamentos no Excel. O S30 faz isso em segundos, visualmente, com rastreabilidade até o elemento IFC.

O relatório PDF não é opcional: construtoras precisam documentar a decisão de qual cenário foi escolhido para licitação pública (exigência da Lei 14.133/2021, nova Lei de Licitações).

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Layout | Split-view igual ao S18/S26, reutilizando `SplitView` component | Consistência; não reinventar a roda |
| Curva S | Distribuição de custo por mês baseada no schedule vinculado | Requer schedule + cost_table no mesmo cenário |
| Recomendação | Algoritmo simples: menor custo × menor prazo = score | Transparente, sem black box de ML |
| PDF | `@react-pdf/renderer` no backend, não no browser | PDF idêntico em todos os browsers; sem dependência de print |
| Formato do PDF | A4, com logo do cliente (tenant), tabela comparativa, gráfico de barras | Profissional para apresentação em licitação |

---

## Algoritmo de recomendação

```typescript
interface ScenarioScore {
  scenario_id: string
  cost_score: number    // 0-100: 100 = mais barato
  time_score: number    // 0-100: 100 = mais rápido
  composite: number     // (cost_weight * cost_score + time_weight * time_score) / 100
}

function rankScenarios(
  scenarios: { id: string; total_cost: number; duration_days: number }[],
  weights = { cost: 0.6, time: 0.4 }
): ScenarioScore[] {
  const maxCost = Math.max(...scenarios.map(s => s.total_cost))
  const maxDays = Math.max(...scenarios.map(s => s.duration_days))

  return scenarios.map(s => {
    const cost_score = 100 * (1 - s.total_cost / maxCost)
    const time_score = 100 * (1 - s.duration_days / maxDays)
    return {
      scenario_id: s.id,
      cost_score,
      time_score,
      composite: weights.cost * cost_score + weights.time * time_score
    }
  }).sort((a, b) => b.composite - a.composite)
}
```

---

## Estrutura do relatório PDF

```
[Logo do tenant]          Relatório de Comparação de Cenários
[Nome do projeto]         [Data de geração]

──────────────────────────────────────────────────
              Cenário A          Cenário B
──────────────────────────────────────────────────
Custo total   R$ 2.450.000      R$ 2.180.000  ✓
Prazo         180 dias          210 dias      ✓
Score         72,4              68,1

[Gráfico de barras: custo por categoria A vs B]
[Gráfico de linha: curva S de ambos os cenários]
[Tabela: top 10 itens com maior diferença de custo]

Recomendação: Cenário A (score 72,4/100)
Razão: menor custo (R$270k menor) com prazo apenas 30 dias menor
──────────────────────────────────────────────────
```

---

## Arquivos principais

```
backend/src/modules/scenarios/
  financial-comparison.service.ts  ← calcula comparativo financeiro completo
  scenario-pdf.service.ts          ← gera PDF com @react-pdf/renderer
  comparison.routes.ts             ← GET /scenarios/:a/compare/:b/financial

frontend/src/scenarios/
  FinancialComparison.tsx          ← split-view com custo, breakdown, curva S
  ScoreCard.tsx                    ← cards de recomendação com score
  ComparisonExport.tsx             ← botão de export PDF
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Curva S sem schedule vinculado | Mostrar custo total sem curva; curva como feature opt-in |
| PDF com gráfico de barras complexo de renderizar no servidor | Usar `recharts` headless via `@react-pdf/renderer`; fallback para tabela simples |
| Pesos de recomendação (60% custo, 40% prazo) questionados pelo usuário | Permitir ajuste de pesos na UI |

---

## Telemetria de produto

Marco crítico final — medir o valor central do produto: `financial_comparison_opened`, `recommendation_viewed`, `comparison_pdf_exported`, `recommendation_weights_adjusted`.

## Definição de validado

- **Tecnicamente** quando o relatório compara custo e prazo de dois cenários e gera PDF.
- **Comercialmente** quando um usuário usa a comparação financeira para decidir qual cenário levar à obra — a hipótese central do ArxisVR comprovada.

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Split-view exibe custo total e breakdown lado a lado para dois cenários
- [ ] Curva S calculada corretamente quando schedule vinculado ao cenário
- [ ] Score de recomendação calculado e explicado (não caixa preta)
- [ ] Export PDF gerado em < 10s com gráfico de barras e tabela comparativa
- [ ] PDF inclui logo do tenant (se cadastrado) e data de geração
- [ ] Usuário pode ajustar pesos da recomendação (custo × prazo)
- [ ] Build e lint passam
- [ ] Demo completa em até 5 minutos: IFC → cenários → comparação → PDF
