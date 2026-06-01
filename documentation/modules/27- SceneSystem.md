# 27- SceneSystem

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo SceneSystem, responsável por gerenciar a cena 3D, objetos, luzes, câmeras, ambientes e configurações globais do viewer BIM/IFC.

## Responsabilidades Detalhadas
- Gerenciar cena 3D (Three.js Scene), objetos, hierarquia e transformações
- Controlar iluminação (ambient, directional, point, spot, hemisphere, IES, HDRI)
- Gerenciar câmeras (perspective, orthographic, orbit controls, FPS, drone, XR)
- Configurar ambiente (background, fog, skybox, environment map, shadows)
- Expor API para adicionar/remover objetos, configurar luzes, câmeras e ambiente
- Suportar múltiplas camadas (layers), grupos e LOD (Level of Detail)
- Integrar com Viewer 3D, IFCService, NavigationService, UI, controllers e plugins
- Suportar cenas federadas (multi-model, multi-projeto, multi-tenant)
- Emitir eventos de mudança de cena, objeto, luz, câmera e ambiente
- Permitir extensões/plugins para novos tipos de objeto, luz, câmera e ambiente
- Gerenciar performance (frustum culling, instancing, batching, occlusion culling)
- Suportar snapshots, exportação e renderização offline

## APIs/Contratos
- Métodos principais:
  - `addObject(object: THREE.Object3D, layer?: string): void` — Adicionar objeto
  - `removeObject(object: THREE.Object3D): void` — Remover objeto
  - `getObjects(filter?: SceneFilter): THREE.Object3D[]` — Consultar objetos
  - `addLight(light: THREE.Light): void` — Adicionar luz
  - `removeLight(light: THREE.Light): void` — Remover luz
  - `setCamera(camera: THREE.Camera): void` — Definir câmera ativa
  - `getCamera(): THREE.Camera` — Obter câmera ativa
  - `setEnvironment(config: EnvironmentConfig): void` — Configurar ambiente
  - `setBackground(color: THREE.Color | THREE.Texture): void` — Background
  - `setFog(fog: THREE.Fog): void` — Fog
  - `onSceneChange(callback: (event: SceneEvent) => void): UnsubscribeFn` — Eventos
  - `createLayer(name: string): void` — Criar camada
  - `setLayerVisibility(layer: string, visible: boolean): void` — Visibilidade de camada
  - `takeSnapshot(options?: SnapshotOptions): Promise<Blob>` — Snapshot
  - `exportScene(format: 'gltf' | 'glb' | 'obj'): Promise<Blob>` — Exportação
- Suporte a integração com Viewer 3D, NavigationService, UI, plugins, storage

## Fluxos Detalhados
### Gerenciamento de Objetos
1. Adição/remoção de objetos à cena (modelos IFC, helpers, overlays)
2. Suporte a grupos, hierarquia e transformações
3. Controle de visibilidade por camadas (layers)
4. Eventos de mudança para UI e controllers

### Iluminação e Ambiente
1. Configuração de múltiplas luzes (ambient, directional, point, spot)
2. Suporte a HDRI, IES profiles e environment maps
3. Configuração de background, fog e skybox
4. Atualização em tempo real conforme navegação

### Câmeras e Controles
1. Gerenciamento de múltiplas câmeras (perspective, orthographic)
2. Integração com NavigationService para modos (orbit, FPS, drone, XR)
3. Suporte a camera animations e transições
4. Configuração de FOV, near, far e aspect ratio

### Performance e Otimização
1. Frustum culling, instancing e batching
2. LOD (Level of Detail) para grandes modelos
3. Occlusion culling e spatial indexing
4. Monitoramento de FPS e performance

### Snapshots e Exportação
1. Captura de snapshots (PNG, JPEG) com resolução customizada
2. Exportação de cena para GLTF/GLB/OBJ
3. Suporte a renderização offline e high-res

### Cenas Federadas
1. Suporte a múltiplos modelos na mesma cena
2. Isolamento por camadas e grupos
3. Integração com FederationService

## Exemplos de Uso Avançados
```typescript
// Adicionar objeto com camada
sceneSystem.addObject(model, 'architecture');

// Configurar iluminação HDRI
sceneSystem.addLight(new THREE.HemisphereLight(0xffffff, 0x444444));
sceneSystem.setEnvironment({ hdri: 'env.hdr' });

// Criar e controlar camadas
sceneSystem.createLayer('structure');
sceneSystem.setLayerVisibility('structure', false);

// Snapshot customizado
const snapshot = await sceneSystem.takeSnapshot({ width: 1920, height: 1080, format: 'png' });

// Exportar cena
const glb = await sceneSystem.exportScene('glb');
```

## Pontos de Integração Detalhados
- **Viewer 3D:** Renderização, loop de animação, eventos
- **IFCService:** Carregamento de modelos IFC na cena
- **NavigationService:** Controles de câmera, modos de navegação
- **UI:** Painéis de configuração, controles de luz/câmera
- **Controllers:** Orquestração de cena, workflows
- **State Manager:** Estado global de cena, configurações
- **StorageService:** Persistência de snapshots, exportações
- **FederationService:** Cenas federadas, múltiplos modelos
- **Plugins/Extensões:** Novos tipos de objeto, luz, câmera

## Critérios de Qualidade
- Renderização performática e fluida (60 FPS target)
- Suporte a múltiplos objetos, luzes, câmeras e ambientes
- Sincronização robusta entre viewer, UI e state manager
- Testes unitários e de integração para todos os fluxos de cena
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos tipos, integrações e plugins
- Performance otimizada com culling, instancing e LOD

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo SceneSystem do frontend, cobrindo gerenciamento avançado de cena 3D, iluminação, câmeras, ambiente, performance, federação e critérios de qualidade.
