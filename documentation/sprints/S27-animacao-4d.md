# S27 · Animação 4D no Viewer

**Fase:** 4D BIM  
**Status:** Pendente  
**Depende de:** S26 (comparação temporal), S08 (viewer geometria)  
**Bloqueia:** S29 (branching de cenários usa animação como preview)

---

## Objetivo

Animação contínua da construção com play/pause/speed, cores por estado (não iniciado / ativo / concluído / removido), e câmera segue atividade ativa.

---

## Por que importa a longo prazo

O S26 prova que o produto calcula datas corretamente. O S27 torna isso visível e vendável: a demo de "construção acontecendo no browser" é o maior argumento de venda para construtoras que usam Navisworks (pago, desktop, pesado).

A implementação precisa de um loop de animação que não bloqueie o render thread. Cada tick do slider de data precisa recalcular o estado de até 50.000 elementos em < 16ms (60fps). A solução é pré-computar um array de estados por frame no worker e deixar o render thread só aplicar cores.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Loop de animação | `requestAnimationFrame` com delta time | Mantém 60fps independente do intervalo |
| Cálculo de estado | Pré-computado em Web Worker antes da animação | Evita cálculo durante render |
| Estrutura de dados | `Map<expressID, StateArray>` indexada por frame | Lookup O(1) por frame |
| Câmera | Foco automático na bounding box da atividade ativa | UX semelhante ao Navisworks |
| Velocidade | 1x = 1 dia/segundo, configurável 0.1x–10x | Cobrindo desde inspeção lenta até overview rápido |
| Cores | `not_started`=cinza, `active`=amarelo, `complete`=verde, `removed`=vermelho | Paleta compatível com Navisworks |

---

## Pipeline de pré-computação

```typescript
// Web Worker — roda antes de iniciar animação
function precomputeFrames(activities: Activity[], fps: number): StatesByFrame {
  const startDate = minDate(activities.map(a => a.planned_start))
  const endDate   = maxDate(activities.map(a => a.planned_end))
  const totalDays = diffDays(startDate, endDate)
  const frames    = totalDays * fps  // fps = frames por dia simulado

  const result: Map<number, Map<number, ElementState>> = new Map()

  for (let f = 0; f <= frames; f++) {
    const currentDate = addDays(startDate, f / fps)
    const frameStates = new Map<number, ElementState>()

    for (const activity of activities) {
      const state = getElementStateAtDate(activity, currentDate)
      for (const globalId of activity.elements) {
        frameStates.set(globalId, state)
      }
    }
    result.set(f, frameStates)
  }
  return result
}
```

---

## Arquivos principais

```
frontend/src/
  timeline/
    AnimationController.ts    ← play/pause/seek/speed
    TimelineWorker.ts         ← Web Worker de pré-computação
  viewer/
    ElementStateRenderer.ts   ← aplica cores por estado no Three.js
    CameraFollower.ts         ← câmera segue atividade ativa
  components/
    TimelineControls.tsx      ← UI play/pause/slider/speed
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Pré-computação de 50k elementos × 365 frames = memória alta | Pré-computar por janela de 30 dias, stream sob demanda |
| Câmera seguindo atividade distrai usuário | Opção de desligar câmera automática |
| Animação dessincronizada entre cenário A e B no split-view | Ticker compartilhado por referência entre os dois viewers |

---

## Critérios de aceite

- [ ] Play/pause/speed (0.1x, 1x, 5x, 10x) funcionam sem frame drops
- [ ] Cores aplicadas corretamente: cinza/amarelo/verde/vermelho por estado
- [ ] Câmera foca automaticamente na atividade ativa (desativável)
- [ ] Split-view A|B animam com ticker sincronizado
- [ ] Pré-computação de cronograma de 200 atividades em < 3s
- [ ] Nenhuma queda de FPS durante animação em modelo de 10k elementos
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
