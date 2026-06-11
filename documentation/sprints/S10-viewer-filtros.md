# S10 · Viewer — Filtros e Visibilidade

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S09 (viewer base), S07 (hierarquia espacial para filtro por pavimento)  
**Bloqueia:** S12 (cenário salva estado de visibilidade)

---

## Objetivo

Toggle de visibilidade por disciplina, por pavimento e por tipo de elemento. Corte transversal navegável.

---

## Por que importa a longo prazo

O estado de visibilidade precisa ser serializável para que cenários (S12) possam salvar e restaurar configurações diferentes. "Cenário A mostra apenas estrutura. Cenário B mostra estrutura + MEP." Sem visibilidade serializável, cenários só podem salvar câmera, não configuração visual.

O filtro de disciplina assume que elementos foram classificados corretamente no S14. Se a classificação mudar no S14, os filtros do S10 precisam se adaptar sem reescrita. Usar a taxonomia do S14 como configuração (não hard-code) resolve isso.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Estado de visibilidade | `Map<expressID, boolean>` + `Map<groupKey, boolean>` | Granular por elemento + rápido por grupo |
| Disciplinas | `structural, architectural, mep, site, furniture, other` | Baseado em tipos IFC, configurável no S14 |
| Filtro de pavimento | Por `storeyId` da hierarquia do S07 | Usa estrutura já extraída |
| Corte (Clipping Plane) | `THREE.Plane` com UI de slider | Three.js nativo, sem lib extra |
| Serialização de visibilidade | `{ groups: { structural: true, mep: false }, floors: [0,1], clip: null }` | Mínimo para restaurar estado |
| Não afetar outros usuários | Estado de visibilidade é por sessão, não persistido no servidor | Colaboração de visibilidade entra depois |

---

## Estado de visibilidade serializável

```typescript
interface VisibilityState {
  groups: {
    structural: boolean
    architectural: boolean
    mep: boolean
    site: boolean
    furniture: boolean
  }
  floors: number[]          // storeyIds visíveis; vazio = todos
  hiddenElements: number[]  // expressIDs ocultos individualmente
  clippingPlane: {
    normal: [number, number, number]
    constant: number
  } | null
}

// Usado em S12: Scenario.visibility_state
```

---

## Arquivos principais

```
frontend/src/viewer/
  VisibilityManager.ts    ← aplica/restaura VisibilityState no scene
  ClippingPlane.ts        ← THREE.Plane + UI slider
  FilterPanel.ts          ← componente UI de filtros
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Toggle de 10.000 elementos lento | Operar em grupos (disciplina), não elemento a elemento |
| Clipping plane afeta pós-processing (shadows) | Testar com pipeline AAA ativo |
| Estado de visibilidade de outro usuário vaza | Estado é estritamente local ao viewer, nunca enviado ao servidor |

---

## Critérios de aceite

- [ ] Toggle de disciplina oculta/mostra grupo em < 100ms
- [ ] Filtro de pavimento isola storey corretamente
- [ ] Clipping plane cria corte limpo navegável com slider
- [ ] `visibilityManager.getState()` retorna objeto serializável
- [ ] `visibilityManager.setState()` restaura configuração exata
- [ ] Visibilidade de um usuário não afeta outros na mesma sessão
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
