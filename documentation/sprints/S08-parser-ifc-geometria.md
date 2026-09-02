# S08 · Parser IFC: Geometria

**Fase:** IFC Core  
**Status:** ✅ Entregue (chega ao usuário)  
**Backend:** sim · **Interface:** sim  
**Verificado em:** 02/09/2026 — Geometria renderiza no /app.
**Depende de:** S07 (estrutura e IFCElement com expressIDs)  
**Bloqueia:** S09 (viewer precisa de geometria para renderizar)

---

## Objetivo

Extrair geometria de cada IfcProduct e convertê-la para Three.js BufferGeometry. Modelo visível no canvas.

> **Nota para o agente:** Este sprint **não existe para produzir gráficos bonitos.** Ele existe para estabelecer uma correspondência confiável entre entidades BIM e objetos renderizados. Performance e fidelidade visual importam, mas a prioridade máxima é **preservar a identidade de cada elemento** do modelo dentro do viewer.

---

## Fora de Escopo

O objetivo é: modelo carregado → visualmente correto → performance aceitável. Pertencem a sprints futuros, **não implementar aqui**:

- Streaming de geometria (preparar estrutura, não implementar)
- Texturas PBR / renderização fotorrealista
- LOD avançado (S23)
- WebGPU
- XR / VR
- Comparação de cenários (S18)
- Timeline 4D (S26, S27)

---

## Por que importa a longo prazo

A estratégia de geometria escolhida aqui determina o limite de tamanho de modelo que o viewer aguenta. Há dois caminhos:

1. **Tudo em memória**, simples, quebra em modelos > 50 MB
2. **Streaming + LOD**, complexo, escala para modelos de 500 MB

O ArxisVR precisa do caminho 2 para obras reais (grandes construtoras têm modelos de 200–500 MB). Mas implementar streaming no S08 é over-engineering. A decisão correta é: **implementar estrutura preparada para streaming agora, sem implementar streaming ainda**.

Instancing (InstancedMesh) é crítico para modelos com muitos elementos repetidos (ex.: 2000 janelas idênticas). Sem instancing, cada janela é uma draw call separada e o FPS colapsa.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Geometria por elemento | `BufferGeometry` por expressID | Permite seleção, highlight e ocultação individual |
| Elementos repetidos | `InstancedMesh` quando **geometria + material idênticos**, só transformação difere | Tipo IFC igual NÃO basta: duas `IfcWall` podem ter material/fase/custo diferentes |
| Persistência | `.glb` por modelo como **cache de renderização** | Fonte de verdade = IFC original + IFCStructure (S07); GLB regenerável a qualquer momento |
| Compressão futura | Pipeline preparado para Draco ou Meshopt | Não implementar agora, mas não tomar decisão incompatível |
| Nível de detalhe | LOD simples (full / simplified) no S08 | LOD avançado entra no S23 |
| Materiais | Material por tipo IFC (IfcWall = cinza, IfcBeam = bege) | Visual informativo sem textura |
| Bounds | BoundingBox **e BoundingSphere** por elemento e por modelo | Sphere usado por Three.js em frustum culling, framing e raycasting |
| Separação de camadas | `ModelLoader` carrega assets; serviços IFC entendem BIM; Viewer conecta os dois | `ModelLoader` não pode conter lógica BIM, protege S13/S19/S22/S27 do acoplamento ao Three.js |

---

## Pipeline de geometria

```
web-ifc.getGeometry(expressID)
  → vértices + índices (coordenadas do modelo)
  → normalizar unidades (mm → m)
  → criar BufferGeometry
  → agrupar por tipo para InstancedMesh
  → serializar para GLB (one-time, cached)
  → retornar Map<expressID, MeshReference>
```

### MeshReference

```typescript
interface MeshReference {
  expressID: number
  globalId: string
  meshId: string
  type: string
  bounds: BoundingBox
  boundingSphere: BoundingSphere
}
```

Esta é a ponte entre BIM e renderização. Reusada em S10 (filtros), S13 (propriedades), S15 (busca), S18 (comparação), S22 (custos), S24/S26 (timeline). Manter estável.

---

## Arquivos principais

```
backend/src/modules/ifc/
  ifc-geometry.worker.ts  ← extrai geometria, serializa GLB
  ifc-geometry.service.ts ← orquestra, salva GLB no storage

frontend/src/viewer/
  ModelLoader.ts          ← carrega GLB do storage, reconstrói meshes
  InstanceManager.ts      ← gerencia InstancedMesh por tipo
  ElementIndex.ts         ← Map<expressID, mesh reference>
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| GLB de modelo grande > 500 MB sem streaming | Implementar chunking no S11 antes de habilitar modelos grandes |
| Elementos sem geometria (IfcSpace, IfcZone) | Criar bounding box visual como placeholder |
| Unidades do IFC em polegadas (projetos americanos) | Normalizar para metros no parser |
| FPS baixo em modelos complexos | Implementar frustum culling básico + instancing |
| Tempo de carregamento inicial alto (pior que FPS para o usuário) | Medir tempo até primeiro frame; 30 FPS após 3s é melhor que 60 FPS após 40s |

---

## Máquina de referência (para critérios de performance)

- 8 vCPU · 16 GB RAM · GPU integrada moderna
- Modelo de teste: 10.000 elementos

---

## Critérios de aceite

- [ ] Modelo visível no canvas após carregar GLB
- [ ] Cada elemento tem mesh identificável por expressID
- [ ] **Clique em mesh retorna o expressID correto** (valida toda a cadeia IFC→geometry→mesh→index)
- [ ] Instancing só ocorre com geometria + material idênticos (não apenas tipo IFC)
- [ ] `MeshReference` carrega expressID, globalId, type, bounds e boundingSphere
- [ ] FPS médio > 30 em modelo de 10.000 elementos na máquina de referência
- [ ] Tempo até primeiro frame renderizado < 5 segundos
- [ ] `ModelLoader` não contém lógica BIM
- [ ] Nenhum elemento sumindo, invertido ou fora de escala
- [ ] BoundingBox e BoundingSphere do modelo calculados corretamente
- [ ] GLB regenerável a partir do IFC original a qualquer momento
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
