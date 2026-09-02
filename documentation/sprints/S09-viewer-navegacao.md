# S09 · Viewer: Navegação e Câmera

**Fase:** IFC Core  
**Status:** 🟡 Parcial (chega em parte ao usuário)  
**Backend:** sim · **Interface:** parcial  
**Verificado em:** 02/09/2026 — Navegacao e selecao no ViewerCanvas. Presets de camera nao chegam.
**Depende de:** S08 (geometria carregada no canvas)  
**Bloqueia:** S10 (filtros), S12 (cenários salvam estado de câmera)

---

## Objetivo

Navegação 3D profissional: orbit, pan, zoom, seleção de elemento com highlight, presets de câmera.

> **Nota para o agente:** Este sprint **não existe para movimentar uma câmera.** Ele existe para transformar navegação 3D em estado persistente e reproduzível. Toda decisão deve favorecer serialização, reprodutibilidade e independência do motor gráfico antes de favorecer efeitos visuais ou conveniência de implementação.

---

## Fora de Escopo

O objetivo é: navegar → selecionar → salvar estado → restaurar estado. Pertencem a sprints futuros, **não implementar aqui**:

- Medições
- Comentários (S16)
- Filtros (S10)
- Clipping avançado
- Comparação de modelos (S18)
- Timeline 4D (S26, S27)
- VR / XR
- Caminhos de câmera / keyframes (S31)

---

## Por que importa a longo prazo

O sistema de câmera criado aqui é a base do Presentation Studio (S31). Câmeras salvas em S12 (cenários), percursos em S31, e animação 4D em S27, todos dependem de um modelo de câmera serializável desde o início.

Se a câmera for implementada como estado não-serializável (ex.: referência direta ao objeto Three.js `PerspectiveCamera`), todos os sprints que precisam salvar/restaurar câmera terão que ser refeitos.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Controles | OrbitControls customizado | Three.js padrão é bom base, mas precisa de extensões |
| Serialização de câmera | DTO `CameraState` com `version: 1` | Restaura estado exato; versionar protege S26/S31 |
| Fachada gráfica | `ViewerHost` é a única fachada; consumers nunca tocam OrbitControls/PerspectiveCamera/Object3D | Liberdade de trocar Three.js → Babylon/WebGPU sem quebrar a aplicação |
| Seleção desacoplada | `Selection` trabalha **só com expressID**; nunca expõe Mesh/Object3D/Material fora do Viewer | S13/S15/S22 não dependem do motor gráfico |
| Hover state | `onHover` desde já, mesmo simples | Tooltip/preview/highlight temporário sem retrabalho |
| Presets | Calculados **a partir do bounding box** do modelo, nunca coordenadas fixas | Casa 20m ≠ hospital 400m ≠ ponte 2km |
| Reset | Determinístico: recalcula do bounding box **atual**, não do último estado salvo | Remove ambiguidade |
| Raycasting | BVH (three-mesh-bvh) construído **uma vez** no load, nunca por seleção | Evita degradação de performance |
| Seleção | Raycasting em mouseup com threshold de tolerância | Touch em mobile precisa de área maior |
| Highlight de seleção | Outline pass (EffectComposer) ou troca de material | Outline visualmente mais limpo |
| Câmera animada | GSAP ou lerp manual para transições suaves | Evita corte brusco em preset |

---

## Estado de câmera serializável

```typescript
interface CameraState {
  version: 1                       // protege contra projectionMode/clippingPlane/cameraType futuros
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  near: number
  far: number
  focusExpressID?: number          // restaura "vista da fachada" mesmo se coords absolutas mudarem entre versões
}

// Estado de visualização do viewer (prepara S12/S18/S31, não persistir ainda)
interface ViewerState {
  camera: CameraState
  selectedExpressId?: number
}

// Usado em:
// - S12: Scenario.camera_state
// - S31: PresentationKeyframe.camera_state
// - S26: TemporalComparison.camera_sync
```

---

## Arquivos principais

```
frontend/src/viewer/
  Camera.ts             ← wrapper de PerspectiveCamera + serialização
  Controls.ts           ← OrbitControls estendido
  Selector.ts           ← raycasting + highlight
  CameraPresets.ts      ← front/top/iso/side
  ViewerHost.ts         ← integra todos, expõe API pública
```

---

## API pública do ViewerHost (estabelecida aqui)

```typescript
viewer.camera.getState(): CameraState
viewer.camera.setState(state: CameraState, animated?: boolean): void
viewer.camera.setPreset('front' | 'top' | 'iso'): void
viewer.selection.select(expressID: number): void
viewer.selection.clear(): void
viewer.selection.onSelect(callback: (id: number | null) => void): void
viewer.selection.onHover(callback: (id: number | null) => void): void
```

> Toda a API troca apenas `expressID` e `CameraState` - nunca tipos do Three.js. Consumers não importam Three.js.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Touch navigation em tablet perde gestos de dois dedos | Testar OrbitControls em iPad antes de marcar pronto |
| Raycasting lento em modelo com 50k elementos | Usar BVH (three-mesh-bvh) para acelerar |
| Câmera "salta" ao voltar de preset | Sempre animar transições com duração 300ms |

---

## Critérios de aceite

- [ ] Orbit, pan, zoom funcionam com mouse e touch
- [ ] Clique em elemento seleciona e destaca visualmente
- [ ] Clique no vazio deseleciona
- [ ] Seleção permanece correta após orbit, pan e zoom
- [ ] Hover destaca elemento temporariamente (sem persistir seleção)
- [ ] Presets calculados a partir do bounding box (funcionam em modelos de escalas diferentes)
- [ ] Preset `iso` centra o modelo com câmera isométrica em < 300ms
- [ ] Reset recalcula do bounding box atual (determinístico)
- [ ] BVH construído uma vez no load, não reconstruído por seleção
- [ ] `camera.getState()` retorna objeto serializável com `version` (JSON.stringify funciona)
- [ ] `camera.setState()` restaura câmera exata
- [ ] Nenhum consumer fora do Viewer importa Three.js
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
