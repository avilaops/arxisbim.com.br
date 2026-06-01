# 09- Viewer 3D

## Objetivo
Definir a arquitetura, responsabilidades e integrações do módulo Viewer 3D, responsável pela visualização, manipulação e interação com modelos BIM/IFC em 3D.

## Responsabilidades
- Inicializar e gerenciar o ciclo de vida do Three.js, incluindo criação de cena, câmera, renderizador e loop de animação.
- Carregar e renderizar modelos IFC, GLB e outros formatos, suportando múltiplos modelos simultâneos.
- Gerenciar controles de navegação (FPS, drone, orbit), alternando entre modos conforme interação do usuário.
- Integrar seleção, inspeção e manipulação de objetos 3D, incluindo raycasting, bounding box e destaques visuais.
- Suportar múltiplos modos de visualização e LOD (Level of Detail), otimizando performance para grandes modelos.
- Expor API para integração com controllers, UI e serviços, permitindo comandos externos e callbacks.
- Gerenciar recursos gráficos, descarregando modelos/texturas não utilizados para otimizar memória.

## APIs/Contratos
- Métodos principais:
  - `init(canvas: HTMLCanvasElement): void` — Inicializa o viewer no canvas informado.
  - `loadModel(file: File | string, type: 'ifc' | 'glb'): Promise<Model>` — Carrega modelo 3D e retorna referência.
  - `setControls(mode: 'fps' | 'drone' | 'orbit'): void` — Alterna modo de navegação.
  - `selectObject(id: string): void` — Seleciona objeto pelo ID (ex: expressID IFC).
  - `highlightObject(id: string): void` — Destaca objeto visualmente.
  - `setLOD(level: 'auto' | 0 | 1 | 2): void` — Define nível de detalhe.
  - `dispose(): void` — Libera recursos e encerra viewer.
- Eventos:
  - `onModelLoaded(model: Model)` — Disparado ao carregar modelo.
  - `onSelectionChanged(object: Object3D)` — Disparado ao selecionar objeto.
  - `onError(error: Error)` — Disparado em caso de erro.
  - `onPerformanceStats(stats: { fps: number, memory: number })` — Métricas de performance.

## Fluxos Principais
1. **Inicialização:**
   - Chamada de `init` com referência ao canvas.
   - Criação de cena, câmera, luzes e renderizador.
2. **Carregamento de Modelo:**
   - Chamada de `loadModel` com arquivo ou URL.
   - Parsing (pode usar web worker), criação de mesh e adição à cena.
   - Disparo do evento `onModelLoaded`.
3. **Navegação:**
   - Chamada de `setControls` para alternar entre FPS, drone ou orbit.
   - Atualização de listeners e controles ativos.
4. **Seleção/Inspeção:**
   - Raycasting no canvas ao clicar.
   - Chamada de `selectObject` e disparo de `onSelectionChanged`.
   - Destaque visual via `highlightObject`.
5. **LOD e Performance:**
   - Chamada de `setLOD` conforme zoom/distância.
   - Carregamento/descarregamento de detalhes.
   - Monitoramento de stats via `onPerformanceStats`.
6. **Liberação de Recursos:**
   - Chamada de `dispose` ao fechar/trocar modelo.
   - Remoção de meshes, listeners e limpeza de memória.

## Exemplos de Uso
```typescript
// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  viewer3D.init(document.getElementById('canvas3d'));
});

// Carregar modelo IFC
await viewer3D.loadModel(file, 'ifc');

// Trocar modo de navegação
viewer3D.setControls('fps');

// Selecionar objeto
viewer3D.selectObject('expressID:1234');

// Destacar objeto
viewer3D.highlightObject('expressID:5678');

// Ajustar LOD
document.getElementById('lodSlider').oninput = (e) => {
  viewer3D.setLOD(e.target.value);
};

// Limpar viewer
viewer3D.dispose();
```

## Pontos de Integração
- **StorageService:** Upload/download de arquivos 3D.
- **IFCService:** Parsing, extração de propriedades e metadados.
- **Controllers:** Orquestração de fluxos (ex: abrir modelo, selecionar, exportar).
- **UI Components:** Canvas, painéis de propriedades, toolbars, sliders de LOD.
- **SelectionService:** Lógica de seleção, múltipla seleção, callbacks customizados.
- **PerformanceService:** Coleta e exibição de métricas.

## Critérios de Qualidade
- Performance fluida (mínimo 30 FPS com modelos grandes).
- Modularidade: engine desacoplada da UI e de outros serviços.
- Testes unitários para métodos críticos (carregamento, seleção, LOD).
- Testes de integração com outros módulos (controllers, UI, storage).
- Documentação clara da API e exemplos de uso.
- Facilidade de extensão para novos formatos, modos e integrações futuras.
- Monitoramento de uso de memória e prevenção de vazamentos.

## Guia Rápido de Integração

### Como Testar o Viewer 3D

1. Abra o arquivo `frontend/example-viewer3d-upload.html` em seu navegador (em ambiente de desenvolvimento com Vite ou similar).
2. Faça upload de um arquivo `.glb` (GLTF) ou `.ifc` (mock IFC) usando o input de arquivo.
3. O modelo será carregado e exibido no canvas 3D, com eventos de sucesso/erro disparados.

### APIs Disponíveis

- `loadModel(file, type)`: Carrega modelo 3D (GLB real, IFC mock)
- `selectObject(id)`, `highlightObject(id)`, `setLOD(level)`
- Eventos: `onModelLoaded`, `onError`, `onSelectionChanged`

### Exemplos de Uso

Veja os arquivos:
- `src/viewer/example-viewer3d-upload.ts` (upload e visualização)
- `src/viewer/example-viewer3d-functional.ts` (uso programático)

### Como Expandir

- Implementar parsing real de arquivos IFC no `IFCSimpleLoader` (usar biblioteca como web-ifc)
- Adicionar testes automatizados para os fluxos principais
- Integrar com backend/storage para upload persistente
- Refinar UI/UX para produção

## Checklist de Implementação

### APIs/Contratos do Documento

- [x] init(canvas: HTMLCanvasElement): void
- [x] setControls(mode: 'fps' | 'drone' | 'orbit'): void (setControlMode)
- [x] dispose(): void (destroy)
- [x] Suporte a eventos de navegação e integração
- [x] Gerenciamento de ciclo de vida Three.js
- [x] Controles FPS, Drone, Orbit, Third Person
- [x] Integração com BIMEnvironment, BackgroundManager, ClippingGeometry, AvatarSystem
- [x] Suporte a WebRTC (multiplayer)
- [x] Observação de resize e grid
- [x] loadModel(file: File | string, type: 'ifc' | 'glb'): Promise<Model>
- [x] selectObject(id: string): void
- [x] highlightObject(id: string): void
- [x] setLOD(level: 'auto' | 0 | 1 | 2): void
- [x] Eventos: onModelLoaded, onSelectionChanged, onError, onPerformanceStats

### Pontos Já Implementados

- Estrutura do ViewerHost cobre inicialização, ciclo de vida, controles e integração BIM/IFC
- Controles FPS, Drone, Orbit e Third Person presentes
- Observação de resize, grid, background e debug global
- Integração com WebRTC e AvatarSystem
- API loadModel (IFC/GLB) e eventos onModelLoaded/onError
- selectObject, highlightObject, setLOD implementados
- Eventos customizados (onSelectionChanged, onPerformanceStats) expostos

### Pontos Pendentes para Aderência Total

- Implementar parsing real de arquivos IFC no `IFCSimpleLoader` (usar biblioteca como web-ifc)
- Adicionar testes automatizados para os fluxos principais
- Integrar com backend/storage para upload persistente
- Refinar UI/UX para produção

---
> Este documento serve como guia para implementação, testes e evolução do módulo Viewer 3D.
