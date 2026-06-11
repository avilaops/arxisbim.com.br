# S09 · Viewer — Navegação e Câmera

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S08 (geometria carregada no canvas)  
**Bloqueia:** S10 (filtros), S12 (cenários salvam estado de câmera)

---

## Objetivo

Navegação 3D profissional: orbit, pan, zoom, seleção de elemento com highlight, presets de câmera.

---

## Por que importa a longo prazo

O sistema de câmera criado aqui é a base do Presentation Studio (S31). Câmeras salvas em S12 (cenários), percursos em S31, e animação 4D em S27 — todos dependem de um modelo de câmera serializável desde o início.

Se a câmera for implementada como estado não-serializável (ex.: referência direta ao objeto Three.js `PerspectiveCamera`), todos os sprints que precisam salvar/restaurar câmera terão que ser refeitos.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Controles | OrbitControls customizado | Three.js padrão é bom base, mas precisa de extensões |
| Serialização de câmera | `{ position: Vec3, target: Vec3, fov: number }` | Mínimo para restaurar estado exato |
| Presets | `front, top, iso, side-left, side-right` | Padrão AEC |
| Seleção | Raycasting em mouseup com threshold de tolerância | Touch em mobile precisa de área maior |
| Highlight de seleção | Outline pass (EffectComposer) ou troca de material | Outline visualmente mais limpo |
| Câmera animada | GSAP ou lerp manual para transições suaves | Evita corte brusco em preset |

---

## Estado de câmera serializável

```typescript
interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  near: number
  far: number
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
```

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
- [ ] Preset `iso` centra o modelo com câmera isométrica em < 300ms
- [ ] Reset retorna ao estado inicial do modelo
- [ ] `camera.getState()` retorna objeto serializável (JSON.stringify funciona)
- [ ] `camera.setState()` restaura câmera exata
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
