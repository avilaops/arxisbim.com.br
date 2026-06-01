# 29- ExportacaoGLB

## Objetivo
Definir arquitetura, responsabilidades e integrações do módulo ExportacaoGLB, responsável por exportar modelos BIM/IFC para formato GLB/glTF para uso em viewers 3D, AR/VR e integrações externas.

## Responsabilidades Detalhadas
- Exportar modelos IFC para GLB/glTF com geometria, materiais e texturas
- Suportar exportação de seleção (submodelos, filtros, elementos específicos)
- Otimizar geometria (simplificação, compressão, instancing, merge)
- Gerenciar materiais e texturas (PBR, conversão, embedding)
- Expor API para exportação, configuração, preview e download
- Integrar com IFCService, SceneSystem, SelectionService, UI, StorageService e plugins
- Suportar múltiplas opções de exportação (LOD, draco compression, binary vs JSON)
- Emitir eventos de progresso, conclusão, erro e cancelamento
- Permitir extensões/plugins para novos formatos, otimizações e integrações
- Suportar exportação federada (multi-model, cross-project)
- Gerenciar performance, memória e streaming para grandes modelos

## APIs/Contratos
- Métodos principais:
  - `exportToGLB(modelId: string, options?: GLBExportOptions): Promise<Blob>` — Exportação principal
  - `exportSelection(expressIds: number[], options?: GLBExportOptions): Promise<Blob>` — Exportar seleção
  - `exportByFilter(filter: IFCQuery, options?: GLBExportOptions): Promise<Blob>` — Exportar por filtro
  - `previewGLB(blob: Blob): Promise<string>` — Preview (URL temporária)
  - `onExportProgress(callback: (progress: number) => void): UnsubscribeFn` — Progresso
  - `onExportComplete(callback: (blob: Blob) => void): UnsubscribeFn` — Conclusão
  - `onExportError(callback: (error: Error) => void): UnsubscribeFn` — Erro
  - `cancelExport(): void` — Cancelar
  - `setExportDefaults(options: GLBExportOptions): void` — Configurações padrão
  - `registerExporter(type: string, handler: ExportHandler): void` — Extensão
- Suporte a integração com IFCService, SceneSystem, SelectionService, UI, storage

## Fluxos Detalhados
### Exportação Completa
1. Recebe modelo IFC e opções de exportação
2. Extrai geometria, materiais e texturas via IFCService/SceneSystem
3. Aplica otimizações (simplificação, compressão, merge)
4. Converte para GLB/glTF
5. Gera blob e emite evento de conclusão
6. Suporte a download ou envio para StorageService

### Exportação de Seleção
1. Recebe seleção de elementos (expressIds)
2. Extrai apenas geometria dos elementos selecionados
3. Aplica transformações e otimizações
4. Exporta para GLB
5. Integração com SelectionService

### Exportação por Filtro
1. Recebe filtro (ex: tipo, propriedade, query)
2. Executa query via IFCService
3. Exporta elementos que atendem ao filtro
4. Suporte a queries complexas e federadas

### Otimizações e Compressão
1. Simplificação de geometria (redução de polígonos)
2. Draco compression para geometria
3. Instancing para elementos repetidos
4. Merge de geometrias similares
5. Embedding de texturas (base64) ou externas

### Preview e Download
1. Geração de preview (URL temporária para visualização)
2. Download direto do blob
3. Upload para StorageService
4. Integração com UI para feedback

### Exportação Federada
1. Exportação de múltiplos modelos combinados
2. Transformações e posicionamento relativo
3. Integração com FederationService

## Exemplos de Uso Avançados
```typescript
// Exportação completa com opções
const glb = await exportacaoGLB.exportToGLB(modelId, {
  dracoCompression: true,
  simplify: true,
  simplifyRatio: 0.5,
  embedTextures: true,
  binary: true
});

// Exportar seleção
const selection = selectionService.getSelection();
const glb = await exportacaoGLB.exportSelection(selection, { dracoCompression: true });

// Exportar por filtro
const glb = await exportacaoGLB.exportByFilter({ type: 'IFCWALL' }, { simplify: true });

// Preview e download
const url = await exportacaoGLB.previewGLB(glb);
downloadBlob(glb, 'modelo.glb');

// Ouvir progresso
exportacaoGLB.onExportProgress((progress) => updateProgressBar(progress));
```

## Pontos de Integração Detalhados
- **IFCService:** Extração de geometria, materiais, propriedades
- **SceneSystem:** Acesso à cena 3D, objetos, transformações
- **SelectionService:** Exportação de seleção, filtros
- **UI:** Painéis de exportação, preview, download
- **Controllers:** Orquestração de exportação, workflows
- **StorageService:** Upload de GLBs exportados
- **FederationService:** Exportação federada cross-model
- **Plugins/Extensões:** Novos formatos, otimizações, integrações

## Critérios de Qualidade
- Exportação confiável e precisa de geometria e materiais
- Suporte a múltiplas opções de otimização e compressão
- Performance otimizada para grandes modelos
- Testes unitários e de integração para todos os fluxos
- Documentação clara da API, exemplos de uso e extensibilidade
- Facilidade de extensão para novos formatos e otimizações
- Monitoramento de progresso, logs de exportação e erros

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo ExportacaoGLB do frontend, cobrindo exportação avançada para GLB, otimizações, seleção, filtros, federação e critérios de qualidade.
