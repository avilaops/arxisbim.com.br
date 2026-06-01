# 11- Controllers

## Objetivo
Definir a arquitetura, responsabilidades e integrações dos Controllers, responsáveis por orquestrar fluxos entre UI, serviços (ex: Viewer, Storage, IFC, Budget) e manter a lógica de negócio desacoplada da apresentação.

## Responsabilidades Detalhadas
- Receber eventos da UI (ex: clique, upload, seleção, submit) e acionar serviços correspondentes
- Orquestrar fluxos complexos multi-etapa (ex: upload → processamento → visualização → exportação)
- Gerenciar estado local/transiente de fluxos: progresso, erros, seleção, status de operações
- Encapsular regras de negócio, validações e lógica de decisão (ex: permissões, limites, dependências)
- Emitir eventos para UI, outros controllers e serviços (ex: progresso, sucesso, erro, atualização de estado)
- Facilitar testes unitários e de integração, isolando lógica da camada visual
- Permitir extensão via herança/composição para novos fluxos e domínios

## APIs/Contratos
- Métodos típicos (por domínio):
  - `openModel(file: File): Promise<void>` — Upload, processamento e visualização
  - `saveSnapshot(): Promise<string>` — Gera snapshot PNG e armazena
  - `selectObject(id: string): void` — Atualiza seleção no viewer e UI
  - `exportGLB(): Promise<string>` — Exporta modelo atual e armazena
  - `handleLogin(credentials): Promise<User>` — Orquestra login e atualização de estado
  - `handleError(error: Error, context?: object): void` — Centraliza tratamento de erros
  - `reset(): void` — Limpa estado local do controller
- Eventos/Callbacks:
  - `onProgress(progress: number, context?: object)`
  - `onError(error: Error, context?: object)`
  - `onSuccess(result: object, context?: object)`
  - `onStateChange(state: object)`

## Fluxos Detalhados
### Abertura de Modelo
1. Recebe arquivo da UI
2. Valida tipo, tamanho, permissões
3. Faz upload via StorageService (com callback de progresso)
4. Processa via IFCService (parsing, extração de propriedades)
5. Carrega no Viewer 3D
6. Atualiza UI com progresso, status e resultado
7. Emite eventos para outros módulos (ex: atualização de lista de modelos)

### Exportação e Snapshots
1. Aciona exportação no viewer (GLB, PNG)
2. Salva arquivo via StorageService
3. Atualiza UI com link/preview
4. Emite evento de sucesso/erro

### Seleção e Inspeção
1. Recebe seleção da UI (ex: clique em objeto)
2. Atualiza viewer e painel de propriedades
3. Emite eventos para outros módulos (ex: atualização de seleção global)

### Login e Autenticação
1. Recebe credenciais da UI
2. Chama AuthService
3. Atualiza estado global e UI
4. Emite eventos de sucesso/erro

### Fluxos Avançados
- **Batch Controllers:** Orquestram operações em lote (ex: upload/download múltiplos arquivos)
- **Undo/Redo Controllers:** Gerenciam histórico de ações e permitem desfazer/refazer operações
- **Controllers Compositores:** Combinam múltiplos controllers para fluxos complexos (ex: importação + validação + visualização)

## Exemplos de Uso Avançados
```typescript
// Controller de modelo
modelController.onProgress = (progress, ctx) => updateProgressBar(progress, ctx);
modelController.onError = (err, ctx) => showError(err.message, ctx);
modelController.onSuccess = (result, ctx) => showSuccess(result, ctx);
await modelController.openModel(file);

// Controller de exportação
exportController.onSuccess = (url) => showDownloadLink(url);
const url = await exportController.exportGLB();

// Controller de seleção
selectionController.onStateChange = (state) => updateSelectionPanel(state);
selectionController.selectObject('expressID:1234');

// Controller de batch
batchController.onProgress = (progress, ctx) => updateBatchProgress(progress, ctx);
await batchController.uploadFiles(files);
```

## Pontos de Integração Detalhados
- **UI Components:** Inputs, botões, painéis, feedback visual de progresso/erro
- **Viewer 3D:** Carregamento, seleção, exportação, atualização de visualização
- **StorageService:** Upload/download, operações em lote, versionamento
- **IFCService:** Parsing, extração de propriedades, validação de modelos
- **BudgetService:** Orçamento 5D, integração com modelos
- **AuthService:** Login, permissões, auditoria
- **State Manager:** Atualização de estado global, sincronização entre controllers
- **EventBus/PubSub:** Comunicação desacoplada entre controllers e módulos

## Critérios de Qualidade
- Lógica desacoplada da UI, facilitando testes e manutenção
- Fluxos robustos, com tratamento de erros, retries e feedback claro
- APIs e eventos bem documentados, com exemplos de uso
- Modularidade: controllers por domínio, composição para fluxos complexos
- Testes unitários e de integração para todos os fluxos críticos
- Facilidade de extensão para novos fluxos, domínios e integrações
- Monitoramento de estado, logs de operações e auditoria de ações

## Guia de Uso e Integração

### BaseController

#### Basic Usage

```typescript
import BaseController from '@/controllers/BaseController';

const controller = new BaseController({ name: 'MyController' });

// Set event callbacks
controller.setProgressCallback((progress, context) => {
  console.log(`Progress: ${progress}%`, context);
});

controller.setErrorCallback((error, context) => {
  console.error('Error:', error, context);
});

controller.setSuccessCallback((result, context) => {
  console.log('Success:', result, context);
});

controller.setStateChangeCallback((state) => {
  console.log('State changed:', state);
});

// Execute async operation
await controller.executeAsync(async () => {
  // Your operation here
  return { data: 'result' };
}, { context: 'value' });
```

### ModelController

```typescript
import { ModelController } from '@/controllers';

const modelController = new ModelController();

// Open model with progress
modelController.onProgress = (progress, ctx) => updateProgressBar(progress, ctx);
modelController.onError = (err, ctx) => showError(err.message, ctx);
modelController.onSuccess = (result, ctx) => showSuccess(result, ctx);
await modelController.openModel(file);

// Get model properties
const properties = modelController.getModelProperties();

// Reload model
await modelController.reloadModel();

// Close model
modelController.closeModel();
```

### SelectionController

```typescript
import { SelectionController } from '@/controllers';

const selectionController = new SelectionController(viewer);

// Select single object
selectionController.selectObject('expressID:1234');

// Select multiple objects
selectionController.selectObjects(['id1', 'id2', 'id3']);

// Deselect object
selectionController.deselectObject('id1');

// Clear selection
selectionController.clearSelection();

// Toggle selection
selectionController.toggleSelection('id1');

// Enable multi-select mode
selectionController.setMultiSelectMode(true);

// Query selection
const selectedIds = selectionController.getSelectedIds();
const selectedObjects = selectionController.getSelectedObjects();

// Select by type
selectionController.selectByType('IfcWall');

// Select by property filter
selectionController.selectByProperty('Name', 'Wall*');
```

### ExportController

```typescript
import { ExportController } from '@/controllers';

const exportController = new ExportController(viewer, storageService);

// Export GLB
exportController.onProgress = (progress) => updateProgressBar(progress);
const glbUrl = await exportController.exportGLB();

// Save PNG snapshot
exportController.onProgress = (progress) => updateProgressBar(progress);
const pngUrl = await exportController.saveSnapshot();

// Export model data as JSON
const jsonData = await exportController.exportJSON();
```

### BatchController

```typescript
import { BatchController } from '@/controllers';

const batchController = new BatchController();

// Upload multiple files
batchController.onProgress = (progress, ctx) => updateBatchProgress(progress, ctx);
const operationId = await batchController.uploadFiles(files);

// Download multiple files
const downloadOpId = await batchController.downloadFiles(paths);

// Process multiple items
const processOpId = await batchController.processItems(items);

// Get operation by ID
const operation = batchController.getOperation(operationId);

// Get operations by status
const pendingOps = batchController.getOperationsByStatus('pending');

// Cancel operation
batchController.cancelOperation(operationId);

// Clear completed operations
batchController.clearCompleted();
```

### UndoRedoController

```typescript
import { UndoRedoController } from '@/controllers';

const undoRedoController = new UndoRedoController({ maxHistory: 50 });

// Record action
undoRedoController.recordAction({
  type: 'select',
  data: { objectId: '123' },
  undo: () => deselectObject('123'),
  redo: () => selectObject('123'),
});

// Undo
undoRedoController.undo();

// Redo
undoRedoController.redo();

// Clear history
undoRedoController.clearHistory();

// Get current history
const history = undoRedoController.getHistory();

// Jump to specific point
undoRedoController.jumpTo(5);
```

### CompositeController

```typescript
import { CompositeController } from '@/controllers';

const compositeController = new CompositeController();

// Register controllers
compositeController.registerController('model', modelController);
compositeController.registerController('export', exportController);

// Add flow steps
compositeController.addStep({
  name: 'upload',
  execute: async () => {
    await modelController.openModel(file);
  },
  rollback: async () => {
    modelController.closeModel();
  },
});

compositeController.addStep({
  name: 'export',
  execute: async () => {
    await exportController.exportGLB();
  },
});

// Execute flow
await compositeController.executeFlow();

// Clear steps
compositeController.clearSteps();
```

### ControllerRegistry

```typescript
import { ControllerFactory } from '@/controllers';

// Create or get controller
const modelController = ControllerFactory.model(viewer);
const selectionController = ControllerFactory.selection(viewer);
const exportController = ControllerFactory.export(viewer, storageService);
const batchController = ControllerFactory.batch();
const undoRedoController = ControllerFactory.undoRedo();
const compositeController = ControllerFactory.composite();

// Register custom factory
ControllerRegistry.registerFactory('custom', (deps) => new CustomController(deps));

// Create custom controller
const customController = ControllerFactory.custom(deps);

// Remove controller
ControllerRegistry.remove('custom');

// Get all registered types
const types = ControllerRegistry.getRegisteredTypes();
```

### Integration with React

```typescript
import { useState, useEffect } from 'react';
import { ModelController } from '@/controllers';

function ModelUploader() {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new ModelController();

    controller.onProgress = (p) => setProgress(p);
    controller.onError = (e) => setError(e);
    controller.onSuccess = (r) => console.log('Success:', r);

    return () => controller.reset();
  }, []);

  const handleUpload = async (file: File) => {
    const controller = new ModelController();
    await controller.openModel(file);
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {progress > 0 && <div>Progress: {progress}%</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

---
> Este documento serve como guia aprofundado para implementação, testes e evolução dos controllers do frontend, cobrindo fluxos avançados, integração, eventos e critérios de qualidade.
