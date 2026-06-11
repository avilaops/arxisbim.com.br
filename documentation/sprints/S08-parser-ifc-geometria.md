# S08 · Parser IFC — Geometria

**Fase:** IFC Core  
**Status:** Pendente  
**Depende de:** S07 (estrutura e IFCElement com expressIDs)  
**Bloqueia:** S09 (viewer precisa de geometria para renderizar)

---

## Objetivo

Extrair geometria de cada IfcProduct e convertê-la para Three.js BufferGeometry. Modelo visível no canvas.

---

## Por que importa a longo prazo

A estratégia de geometria escolhida aqui determina o limite de tamanho de modelo que o viewer aguenta. Há dois caminhos:

1. **Tudo em memória** — simples, quebra em modelos > 50 MB
2. **Streaming + LOD** — complexo, escala para modelos de 500 MB

O ArxisVR precisa do caminho 2 para obras reais (grandes construtoras têm modelos de 200–500 MB). Mas implementar streaming no S08 é over-engineering. A decisão correta é: **implementar estrutura preparada para streaming agora, sem implementar streaming ainda**.

Instancing (InstancedMesh) é crítico para modelos com muitos elementos repetidos (ex.: 2000 janelas idênticas). Sem instancing, cada janela é uma draw call separada e o FPS colapsa.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Geometria por elemento | `BufferGeometry` por expressID | Permite seleção, highlight e ocultação individual |
| Elementos repetidos | `InstancedMesh` por tipo idêntico | 2000 janelas = 1 draw call |
| Formato de persistência | Geometria serializada em `.glb` por modelo | Re-parse evitado em re-abertura |
| Nível de detalhe | LOD simples (full / simplified) no S08 | LOD avançado entra no S23 |
| Materiais | Material por tipo IFC (IfcWall = cinza, IfcBeam = bege) | Visual informativo sem textura |
| Bounds | BoundingBox por elemento e por modelo | Usado em câmera e filtros |

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

---

## Critérios de aceite

- [ ] Modelo visível no canvas após carregar GLB
- [ ] Cada elemento tem mesh identificável por expressID
- [ ] Elementos do mesmo tipo agrupados em InstancedMesh
- [ ] FPS > 30 em modelo com 10.000 elementos (testar em máquina de referência)
- [ ] Nenhum elemento sumindo, invertido ou fora de escala
- [ ] BoundingBox do modelo calculado corretamente
- [ ] Build e lint passam
- [ ] Demo em até 5 minutos
