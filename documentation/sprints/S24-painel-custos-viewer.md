# S24 · Painel de Custos no Viewer

**Fase:** 5D BIM  
**Status:** ☐ Não iniciado  
**Backend:** nao · **Interface:** nao  
**Verificado em:** 02/09/2026 — CostHeatmapSystem.ts orfao; heatmap ausente do bundle.
**Depende de:** S22 (cálculo), S23 (performance), S18 (split-view)  
**Bloqueia:** S30 (comparação financeira usa dados deste painel)

---

## Objetivo

Heatmap de custo por elemento no viewer, painel de breakdown com hierarquia, ficha de custo por elemento ao clicar.

> **Nota para o agente:** Este é o **momento "uau" da demo**, onde o produto deixa de parecer um viewer IFC comum. Mas a prioridade arquitetural é projetar o painel de breakdown de forma que o S30 (comparação financeira) renderize **dois painéis lado a lado sem duplicar código**. Componentize pensando no split-view do S18.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Comparação financeira A|B (S30 reusa este painel)
- Timeline 4D / curva S animada (S26, S27)
- Edição de preços inline (volta ao S19/S21)
- Exportação de relatório PDF (S30)

---

## Por que importa a longo prazo

Este é o primeiro sprint onde o produto se torna visualmente diferente de um viewer IFC comum. O heatmap de custo, onde a cor de cada elemento representa seu custo relativo, é a visualização que engenheiros de custo nunca viram num viewer BIM. É o momento de "uau" da demo.

O painel de breakdown precisa ser projetado de forma que o S30 (comparação financeira) possa renderizar dois painéis lado a lado sem duplicar o código.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Escala de cor do heatmap | Verde (barato) → Amarelo → Vermelho (caro) | Intuitivo, vermelho = atenção |
| Normalização | Por tipo de elemento (paredes comparadas com paredes) | Comparar pilar com janela seria distorcido |
| Painel lateral | Árvore: Projeto → Pavimento → Tipo → Elemento | Drill-down natural |
| Ficha de elemento | Quantidade + Preço unitário + Total + Fonte (SINAPI/customizado) | Auditabilidade |
| Atualização | Painel atualiza em tempo real ao mudar filtros de visibilidade | Custo do pavimento visível muda com toggle |

---

## Heatmap: implementação

```typescript
// No CostHeatmap.ts
function applyCostHeatmap(elementCosts: Map<number, number>) {
  // elementCosts: expressID → normalized_cost (0 a 1)
  for (const [expressID, normalizedCost] of elementCosts) {
    const color = costToColor(normalizedCost) // verde → vermelho
    const mesh = elementIndex.getMesh(expressID)
    if (mesh) mesh.material.color.set(color)
  }
}

function costToColor(t: number): THREE.Color {
  // t=0: verde #22c55e, t=0.5: amarelo #eab308, t=1: vermelho #ef4444
  return new THREE.Color().lerpColors(GREEN, YELLOW, t < 0.5 ? t*2 : 0)
         .lerp(RED, t > 0.5 ? (t-0.5)*2 : 0)
}
```

---

## Arquivos principais

```
frontend/src/viewer/
  CostHeatmap.ts        ← aplica cores de custo nos meshes
  
frontend/src/costs/
  CostBreakdownPanel.ts ← árvore de breakdown com drill-down
  ElementCostCard.ts    ← ficha de custo ao selecionar elemento
  CostLegend.ts         ← escala visual verde→vermelho
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Heatmap lento em modelo com 50k materiais | InstancedMesh: atualizar cor por instância, não por material |
| Usuário confunde "caro" com "problemático" | Tooltip explica que a escala é relativa ao projeto |
| Painel não comunica clareza a leigos | Teste de usabilidade com não-engenheiros antes de marcar pronto |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Heatmap renderiza em modelo de 10k elementos sem queda de FPS
- [ ] Escala de cores visível com legenda de min/max
- [ ] Clicar em elemento abre ficha com quantidade, preço, total e fonte
- [ ] Painel lateral mostra breakdown por pavimento e tipo com valores somados
- [ ] Alternar visibilidade de pavimento atualiza total do painel em < 500ms
- [ ] Usuário leigo entende o painel sem instrução (testado com não-engenheiro)
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
