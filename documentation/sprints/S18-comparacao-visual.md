# S18 ★ · Primeira Comparação Visual de Cenários

**Fase:** 5D BIM  
**Status:** ✅ **CONCLUÍDO 04/09/2026** · ★ **MARCO ATINGIDO**  
**Backend:** parcial · **Interface:** nao  
**Verificado em:** 04/09/2026 — provado em browser real, 9/9 passos.  
**Prova:** `documentation/S18-PROVA-BROWSER.md`
**Rodada 2 (08/09/2026):** exportar imagem ✅ · comparação sobrevive ao reload (A/B na URL) ✅ · diferenças destacadas ⏸ (não há estado de visibilidade para diferir; ver a prova, "O que continua fora").

> **Zero backend novo.** O `GET /scenarios/:idA/diff/:idB`, que o
> PENDENCIAS.md apontava como "o backend do S18", devolve `schedule` e `cost`:
> é 4D/5D (S26/S30), não visual. Não foi usado. A comparação lê o que o S12 já
> salvou em `camera` e `metadata.hidden`.
>
> `CameraSync` veio do frontend órfão quase inteiro (68 linhas, sem DOM). É a
> terceira peça órfã aproveitada em dois sprints.
**Depende de:** S12 (dois cenários com estados diferentes)  
**Bloqueia:** S24 (painel de custos usa split-view), S26 (comparação temporal usa split-view)

**Marco crítico:** Valida "Side-by-side resolve a decisão visual?"

---

## Objetivo

Split-view A|B com câmera sincronizada. Diferenças entre cenários destacadas. Comparação exportável como imagem.

> **Nota para o agente:** O `SplitView` construído aqui é **componente reutilizável**, não tela única. S24 (custos), S26 (prazo) e S30 (financeiro) renderizam dentro dele. Projete a API do SplitView para receber qualquer par de cenários + qualquer camada de overlay (diff, heatmap, timeline) sem reescrita. A decisão de 1 WebGL context com 2 viewports é arquitetural e vincula todos esses sprints.

---

## Fora de Escopo

Pertencem a sprints futuros, **não implementar aqui**:

- Comparação de custo (S24, S30), reusa este SplitView
- Comparação temporal / 4D (S26)
- Comparação de mais de 2 cenários simultâneos
- Branching/merge de cenários (S29)
- Relatório PDF (S30)

---

## Por que importa a longo prazo

O split-view criado aqui é a UI central do produto para tomada de decisão. S24 (custos), S26 (prazo) e S30 (financeiro) todos vivem dentro ou ao lado do split-view. A arquitetura escolhida aqui, dois WebGL contexts vs um com viewport split, tem implicações de performance para todos os sprints futuros.

**Dois WebGL contexts:** mais isolado, mais simples, mais memória  
**Um context com viewport split:** mais eficiente, mais complexo, compartilha geometria

Para modelos grandes (500 MB), um context é obrigatório, dois contexts duplicariam o uso de memória GPU. A decisão correta é um context com viewports.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Renderização | Um WebGL context, dois viewports | Memória GPU não duplicada para modelos grandes |
| Sincronização de câmera | Evento `camera.onChange` propaga para os dois viewports | Lock/unlock de câmera configurável |
| Diferenças visuais | Elementos presentes em A mas ausentes em B → cor de destaque | Usa VisibilityState do S10 |
| Layout | Divisor arrastável com proporção salva | UX padrão de diff tools |
| Export | `canvas.toBlob()` dos dois viewports lado a lado | PNG de alta resolução |
| Cenário de referência | A = base, B = alternativa | Convenção consistente |

---

## Algoritmo de diff visual

```typescript
// visibility vem de scenario_state.visibility (DTO unificado do S12)
function computeScenarioDiff(scenarioA: Scenario, scenarioB: Scenario): DiffResult {
  const hiddenInA = new Set(scenarioA.scenario_state.visibility.hiddenElements)
  const hiddenInB = new Set(scenarioB.scenario_state.visibility.hiddenElements)

  return {
    onlyInA: [...hiddenInB].filter(id => !hiddenInA.has(id)),   // vermelho no B
    onlyInB: [...hiddenInA].filter(id => !hiddenInB.has(id)),   // verde no A
    inBoth:  elements.filter(id => !hiddenInA.has(id) && !hiddenInB.has(id))
  }
}
```

---

## Arquivos principais

```
frontend/src/viewer/
  SplitView.ts          ← dois viewports no mesmo renderer
  CameraSync.ts         ← sincroniza câmera entre viewports
  DiffHighlighter.ts    ← aplica cores de diff
  ComparisonExport.ts   ← export PNG do split-view

frontend/src/
  comparison/
    ComparisonPage.ts   ← layout de comparação com seletor de cenários
    ScenarioPicker.ts   ← dropdown de seleção de A e B
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| FPS caindo com dois viewports | Um context com viewports separados compartilha geometria na GPU |
| Câmera sync com lag visual | Usar mesmo frame loop, não eventos assíncronos |
| Export PNG com baixa resolução | Usar `pixelRatio: 2` no canvas durante export |

---

## Telemetria de produto

Marco crítico, precisa medir adoção: `comparison_opened`, `comparison_camera_unlocked`, `comparison_exported`, com `tenant_id`, `project_id`, `scenario_a`, `scenario_b`.

## Definição de validado

- **Tecnicamente** quando o split-view sincroniza câmera e destaca diferenças entre dois cenários.
- **Comercialmente** quando usuários reais abrem a comparação voluntariamente para decidir, sem instrução.

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] `SplitView` aceita par de cenários + camada de overlay plugável (reuso por S24/S26/S30)
- [ ] Split-view exibe dois cenários lado a lado com câmera sincronizada (mesmo frame loop, sem lag)
- [ ] Arrastar divisor central ajusta proporção dos viewports
- [ ] Elementos presentes em A mas ausentes em B destacados em vermelho
- [ ] Câmera pode ser desacoplada (free mode) e reacoplada
- [ ] Um único WebGL context (memória GPU não duplicada)
- [ ] Export PNG gera imagem de alta resolução (`pixelRatio: 2`) com os dois viewports
- [ ] FPS > 25 em modelo de 10.000 elementos no split-view
- [ ] Telemetria de comparação emitida
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
