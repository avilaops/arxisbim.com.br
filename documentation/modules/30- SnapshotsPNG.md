# 30- SnapshotsPNG

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo SnapshotsPNG, responsável por capturar, gerenciar e exportar snapshots (imagens) do viewer 3D BIM/IFC para documentação, apresentações e colaboração.

## Responsabilidades Detalhadas
- Capturar snapshots do viewer 3D em alta resolução (PNG, JPEG, WebP)
- Suportar múltiplas resoluções e aspect ratios (custom, presets, 4K, 8K)
- Gerenciar metadados de snapshots (data, câmera, seleção, contexto, projeto)
- Expor API para captura, preview, download, upload e gerenciamento de snapshots
- Integrar com SceneSystem, NavigationService, SelectionService, UI, StorageService e plugins
- Suportar captura com overlays (anotações, marcações, legendas, watermark)
- Emitir eventos de captura, progresso, conclusão e erro
- Permitir extensões/plugins para novos formatos, overlays e integrações
- Suportar captura em lote (múltiplas vistas, tour automático)
- Gerenciar galeria, histórico e organização de snapshots

## APIs/Contratos
- Métodos principais:
  - `captureSnapshot(options?: SnapshotOptions): Promise<Blob>` — Captura principal
  - `captureWithOverlay(overlay: OverlayConfig, options?: SnapshotOptions): Promise<Blob>` — Com overlay
  - `captureBatch(views: CameraView[], options?: SnapshotOptions): Promise<Blob[]>` — Captura em lote
  - `previewSnapshot(blob: Blob): Promise<string>` — Preview (URL temporária)
  - `downloadSnapshot(blob: Blob, filename: string): void` — Download
  - `uploadSnapshot(blob: Blob, metadata: SnapshotMetadata): Promise<string>` — Upload
  - `listSnapshots(filter?: SnapshotFilter): SnapshotInfo[]` — Listagem
  - `deleteSnapshot(id: string): void` — Remoção
  - `onSnapshotCaptured(callback: (blob: Blob) => void): UnsubscribeFn` — Evento
  - `onCaptureProgress(callback: (progress: number) => void): UnsubscribeFn` — Progresso
  - `setSnapshotDefaults(options: SnapshotOptions): void` — Configurações padrão
  - `registerOverlay(type: string, handler: OverlayHandler): void` — Extensão
- Suporte a integração com SceneSystem, NavigationService, SelectionService, UI, storage

## Fluxos Detalhados
### Captura de Snapshot
1. Configura opções (resolução, formato, qualidade)
2. Captura renderização do viewer 3D
3. Aplica pós-processamento (se necessário)
4. Gera blob e metadados
5. Emite evento de conclusão
6. Suporte a preview, download ou upload

### Captura com Overlays
1. Recebe configuração de overlay (anotações, marcações, watermark)
2. Renderiza viewer 3D
3. Aplica overlay sobre a imagem
4. Gera snapshot final
5. Suporte a overlays customizados via plugins

### Captura em Lote
1. Recebe lista de vistas (posições de câmera)
2. Itera sobre vistas e captura cada uma
3. Aplica metadados e contexto
4. Retorna array de blobs
5. Suporte a tour automático e apresentações

### Metadados e Contexto
1. Captura estado da câmera (posição, rotação, target)
2. Captura seleção ativa (elementos destacados)
3. Captura contexto (projeto, modelo, data, usuário)
4. Armazena metadados para organização e busca

### Preview e Download
1. Geração de URL temporária para preview
2. Download direto do blob
3. Upload para StorageService com metadados
4. Integração com UI para galeria

### Galeria e Organização
1. Listagem de snapshots com filtros (data, projeto, usuário)
2. Organização por pastas, tags, projetos
3. Busca por metadados
4. Suporte a histórico e versões

## Exemplos de Uso Avançados
```typescript
// Captura em alta resolução
const snapshot = await snapshotsPNG.captureSnapshot({
  width: 3840,
  height: 2160,
  format: 'png',
  quality: 1.0,
  includeMetadata: true
});

// Captura com watermark
const withWatermark = await snapshotsPNG.captureWithOverlay({
  type: 'watermark',
  text: 'Confidential - Project X',
  position: 'bottom-right'
});

// Captura em lote (tour)
const views = [
  { position: [0, 10, 20], target: [0, 0, 0] },
  { position: [20, 10, 0], target: [0, 0, 0] }
];
const batch = await snapshotsPNG.captureBatch(views);

// Upload com metadados
const url = await snapshotsPNG.uploadSnapshot(snapshot, {
  projectId: 'p1',
  viewName: 'Fachada Principal',
  tags: ['apresentação', 'cliente']
});
```

## Pontos de Integração Detalhados
- **SceneSystem:** Acesso à cena 3D, renderização
- **NavigationService:** Estado da câmera, vistas salvas
- **SelectionService:** Captura de seleção ativa
- **UI:** Painéis de captura, galeria, preview
- **Controllers:** Orquestração de captura, workflows
- **StorageService:** Upload e persistência de snapshots
- **Plugins/Extensões:** Novos overlays, formatos, integrações

## Critérios de Qualidade
- Captura de alta qualidade e resolução
- Suporte a múltiplos formatos, resoluções e overlays
- Performance otimizada para captura em lote
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos overlays e integrações
- Monitoramento de progresso, logs de captura e erros

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo SnapshotsPNG do frontend, cobrindo captura avançada de snapshots, overlays, metadados, lote, galeria e critérios de qualidade.
