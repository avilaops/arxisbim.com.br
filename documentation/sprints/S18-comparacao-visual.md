# S18 ★ · Primeira Comparação Visual de Cenários

**Fase:** 5D BIM  
**Status:** Pendente  
**Depende de:** S12 (dois cenários com estados diferentes)  
**Bloqueia:** S24 (painel de custos usa split-view), S26 (comparação temporal usa split-view)

**Marco crítico:** Valida "Side-by-side resolve a decisão visual?"

---

## Objetivo

Split-view A|B com câmera sincronizada. Diferenças entre cenários destacadas. Comparação exportável como imagem.

---

## Por que importa a longo prazo

O split-view criado aqui é a UI central do produto para tomada de decisão. S24 (custos), S26 (prazo) e S30 (financeiro) todos vivem dentro ou ao lado do split-view. A arquitetura escolhida aqui — dois WebGL contexts vs um com viewport split — tem implicações de performance para todos os sprints futuros.

**Dois WebGL contexts:** mais isolado, mais simples, mais memória  
**Um context com viewport split:** mais eficiente, mais complexo, compartilha geometria

Para modelos grandes (500 MB), um context é obrigatório — dois contexts duplicariam o uso de memória GPU. A decisão correta é um context com viewports.

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
function computeScenarioDiff(scenarioA: Scenario, scenarioB: Scenario): DiffResult {
  const hiddenInA = new Set(scenarioA.visibility_state.hiddenElements)
  const hiddenInB = new Set(scenarioB.visibility_state.hiddenElements)

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

## Critérios de aceite

- [ ] Split-view exibe dois cenários lado a lado com câmera sincronizada
- [ ] Arrastar divisor central ajusta proporção dos viewports
- [ ] Elementos presentes em A mas ausentes em B destacados em vermelho
- [ ] Câmera pode ser desacoplada (free mode) e reacoplada
- [ ] Export PNG gera imagem de alta resolução com os dois viewports
- [ ] FPS > 25 em modelo de 10.000 elementos no split-view
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
