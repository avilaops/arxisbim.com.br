# 10- StorageService

## Objetivo
Definir a arquitetura, responsabilidades e integrações do módulo StorageService, responsável pelo upload, download e gerenciamento de arquivos (IFC, GLB, snapshots, etc) utilizando MinIO como backend de armazenamento.

## Responsabilidades
- Upload/download de arquivos grandes (multi-part upload, resumable uploads)
- Geração e validação de URLs assinadas para acesso seguro
- Listagem paginada e filtrada de arquivos por projeto, usuário, tipo e data
- Versionamento de arquivos (armazenar revisões, restaurar versões anteriores)
- Integração com AuthService para controle de permissões e auditoria
- Suporte a metadados customizados (ex: tags, owner, data de expiração)
- Monitoramento de uso (logs, métricas de acesso, alertas de quota)
- Suporte a operações em lote (upload/download/remover múltiplos arquivos)
- Fallback para outros backends (S3, Azure Blob) via interface comum

## APIs/Contratos
- Métodos principais:
  - `uploadFile(file: File, path: string, options?: { onProgress?: (progress: number) => void, metadata?: object }): Promise<string>`
  - `downloadFile(path: string, options?: { range?: [number, number] }): Promise<Blob>`
  - `listFiles(params?: { prefix?: string, limit?: number, marker?: string, filters?: object }): Promise<{ files: Array<{ name: string, url: string, size: number, lastModified: Date, metadata?: object }>, nextMarker?: string }>`
  - `deleteFile(path: string): Promise<void>`
  - `deleteFiles(paths: string[]): Promise<void[]>`
  - `getFileUrl(path: string, expiresIn?: number): Promise<string>`
  - `getFileMetadata(path: string): Promise<{ size: number, lastModified: Date, contentType: string, metadata?: object }>`
  - `getFileVersions(path: string): Promise<Array<{ versionId: string, lastModified: Date }>>`
  - `restoreFileVersion(path: string, versionId: string): Promise<void>`
- Eventos:
  - `onUploadProgress(progress: number, file: File)`
  - `onBatchOperationProgress(progress: number, current: number, total: number)`
  - `onError(error: Error, context?: object)`

## Fluxos Detalhados
### Upload de Arquivo
1. Validação de tipo, tamanho, permissões e quota
2. Início de upload multi-part (se arquivo grande)
3. Callback de progresso a cada parte enviada
4. Registro de metadados customizados (ex: projeto, usuário, tags)
5. Finalização e geração de URL assinada
6. Log de auditoria (quem enviou, quando, de onde)

### Download de Arquivo
1. Geração de URL assinada temporária (expiração configurável)
2. Download via streaming (suporte a range para downloads parciais)
3. Validação de permissões antes de liberar download
4. Log de acesso (quem baixou, quando, de onde)

### Listagem e Remoção
1. Listagem paginada, filtrada por prefixo, tags, datas, owner
2. Exibição de metadados e versões
3. Remoção simples ou em lote, com confirmação e log de auditoria

### Versionamento
1. Armazenamento de múltiplas versões de um arquivo
2. Listagem de versões e seleção para restauração
3. Restauração de versão anterior (rollback)

### Operações em Lote
1. Upload/download/remover múltiplos arquivos com feedback de progresso
2. Tratamento de erros individuais sem interromper o lote

## Exemplos de Uso Avançados
```typescript
// Upload com metadados e progresso
await storageService.uploadFile(file, 'projetos/123/modelos/model.ifc', {
  onProgress: (progress) => updateProgressBar(progress),
  metadata: { projetoId: 123, owner: 'user@empresa.com', tag: 'ifc' }
});

// Download parcial (range)
const blob = await storageService.downloadFile('projetos/123/modelos/model.ifc', { range: [0, 1048575] }); // 1MB

// Listagem paginada e filtrada
const { files, nextMarker } = await storageService.listFiles({ prefix: 'projetos/123/', limit: 50, filters: { tag: 'ifc' } });

// Remover múltiplos arquivos
await storageService.deleteFiles(['projetos/123/modelos/a.ifc', 'projetos/123/modelos/b.ifc']);

// Versionamento
const versions = await storageService.getFileVersions('projetos/123/modelos/model.ifc');
await storageService.restoreFileVersion('projetos/123/modelos/model.ifc', versions[0].versionId);
```

## Pontos de Integração
- **Viewer 3D:** Carregamento eficiente de modelos grandes, suporte a streaming e range requests
- **Exportação GLB/Snapshots:** Armazenamento e versionamento de saídas
- **Controllers:** Orquestração de operações em lote, feedback de progresso
- **UI:** Listagem paginada, filtros, barra de progresso, histórico de versões
- **AuthService:** Permissões, auditoria, geração de tokens
- **API Backend:** Sincronização de metadados, quotas, logs

## Critérios de Qualidade
- Operações resilientes, com retry e fallback
- Segurança: URLs assinadas, logs de auditoria, quotas
- Performance: multi-part upload, streaming, cache
- Testes unitários e de integração para todos os fluxos
- Documentação detalhada de métodos, eventos e exemplos
- Extensibilidade para novos backends e requisitos futuros
- Monitoramento e alertas de uso/quota

## Guia de Uso e Integração

### Inicialização

```typescript
import { storageService } from '@/services/StorageService';

// Use default singleton instance
// Configured via environment variables:
// VITE_STORAGE_ENDPOINT, VITE_STORAGE_ACCESS_KEY, VITE_STORAGE_SECRET_KEY, etc.

// Or create custom instance
import StorageService from '@/services/StorageService';
import type { StorageConfig } from '@/services/StorageService/types';

const config: StorageConfig = {
  endpoint: 'https://minio.example.com',
  accessKey: 'your-access-key',
  secretKey: 'your-secret-key',
  bucket: 'arxisvr',
  region: 'us-east-1',
  useSSL: true,
};

const customStorage = new StorageService(config);
```

### Upload com Progresso

```typescript
const file = document.querySelector('input[type="file"]').files[0];

// Upload with progress callback
const url = await storageService.uploadFile(file, 'projetos/123/modelos/model.ifc', {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`);
  },
  metadata: {
    projectId: '123',
    owner: 'user@example.com',
    tag: 'ifc',
  },
});
```

### Download com Range

```typescript
// Download partial range (first 1MB)
const blob = await storageService.downloadFile('projetos/123/modelos/model.ifc', {
  range: [0, 1048575], // 0 to 1MB
});
```

### Listagem Paginada

```typescript
const { files, nextMarker } = await storageService.listFiles({
  prefix: 'projetos/123/',
  limit: 50,
  filters: {
    tag: 'ifc',
    owner: 'user@example.com',
  },
});
```

### Operações em Lote

```typescript
const paths = ['path1', 'path2', 'path3'];
storageService.setBatchProgressCallback((progress) => {
  console.log(`Batch progress: ${progress.progress}%`);
});
await storageService.deleteFiles(paths);
```

### Versionamento

```typescript
const versions = await storageService.getFileVersions('path/to/file');
await storageService.restoreFileVersion('path/to/file', versions[1].versionId);
```

### URLs Assinadas

```typescript
// Default 1 hour expiration
const url = await storageService.getFileUrl('path/to/file');

// Custom expiration (5 minutes)
const url = await storageService.getFileUrl('path/to/file', 300);
```

### Tratamento de Erros

```typescript
storageService.setErrorCallback((error) => {
  console.error('Storage error:', error.message);
  if (error.code === 'FILE_TOO_LARGE') {
    showFileSizeError();
  } else if (error.code === 'QUOTA_EXCEEDED') {
    showQuotaWarning();
  }
});
```

### Variáveis de Ambiente

```env
VITE_STORAGE_ENDPOINT=http://localhost:9000
VITE_STORAGE_ACCESS_KEY=minioadmin
VITE_STORAGE_SECRET_KEY=minioadmin
VITE_STORAGE_BUCKET=arxisvr
VITE_STORAGE_REGION=us-east-1
VITE_STORAGE_USE_SSL=false
```

---
> Este documento serve como guia aprofundado para implementação, testes e evolução do módulo StorageService com MinIO, cobrindo detalhes de segurança, performance, versionamento, operações em lote e integração avançada.
