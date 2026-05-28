/**
 * File Subsystem - Contratos e Types
 * Enterprise-grade file management para BIM
 */

/**
 * Provider types (fontes de arquivo)
 */
export enum FileProviderType {
  LOCAL = 'local',           // Drag&drop, file input
  EXAMPLES = 'examples',     // Public assets (/public/Examples-files)
  CLOUD_S3 = 's3',          // AWS S3
  CLOUD_AZURE = 'azure',    // Azure Blob Storage
  CLOUD_GCS = 'gcs',        // Google Cloud Storage
  BIM360 = 'bim360',        // Autodesk BIM 360
  ACC = 'acc',              // Autodesk Construction Cloud
  TRIMBLE = 'trimble',      // Trimble Connect
  PROCORE = 'procore',      // Procore
  SHAREPOINT = 'sharepoint' // Microsoft SharePoint
}

/**
 * File capabilities (o que pode ser feito com este arquivo)
 */
export interface FileCapabilities {
  read: boolean;
  write: boolean;
  delete: boolean;
  versioning: boolean;
  locking: boolean;
  sharing: boolean;
  commenting: boolean;
  streaming: boolean;
}

/**
 * File Handle - Identificador único e estável de arquivo
 * NUNCA use path direto na UI - sempre use FileHandle
 */
export interface FileHandle {
  // Identificação estável
  id: string;                    // UUID/ULID único
  provider: FileProviderType;    // Onde está o arquivo
  uri: string;                   // URI interno: examples://..., s3://..., local://...
  
  // Display
  displayName: string;           // Nome amigável
  path: string[];                // Hierarquia de pastas
  
  // Tipo e metadados
  mime: string;                  // MIME type real (detectado, não pela extensão)
  extension: string;             // .ifc, .dwg, .rvt, etc.
  size: number;                  // Bytes
  hash: string;                  // SHA-256 / ETag para cache e dedup
  
  // Timestamps
  createdAt: Date;
  modifiedAt: Date;
  accessedAt?: Date;
  
  // Capabilities
  capabilities: FileCapabilities;
  
  // Permissões (RBAC)
  permissions?: {
    owner: string;
    readers: string[];
    writers: string[];
    admins: string[];
  };
  
  // Versioning
  version?: string;
  versionHistory?: FileVersion[];
  
  // Lock status
  lock?: {
    lockedBy: string;
    lockedAt: Date;
    expiresAt?: Date;
  };
  
  // Metadados adicionais
  metadata: Record<string, any>;
  
  // Thumbnail/preview
  thumbnailUrl?: string;
  previewUrl?: string;
}

/**
 * Version history entry
 */
export interface FileVersion {
  id: string;
  version: string;
  createdAt: Date;
  createdBy: string;
  comment?: string;
  size: number;
  hash: string;
}

/**
 * File list options
 */
export interface FileListOptions {
  path?: string[];
  query?: string;               // Search query
  filters?: FileFilter[];
  sort?: FileSortOption;
  cursor?: string;              // Pagination cursor
  limit?: number;
  includeHidden?: boolean;
  includeDeleted?: boolean;
}

/**
 * File filter
 */
export interface FileFilter {
  field: 'type' | 'size' | 'modified' | 'tag' | 'metadata';
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith';
  value: any;
}

/**
 * File sort option
 */
export interface FileSortOption {
  field: 'name' | 'size' | 'modified' | 'created';
  order: 'asc' | 'desc';
}

/**
 * File list result (com cursor para paginação)
 */
export interface FileListResult {
  items: FileHandle[];
  cursor?: string;              // Next cursor
  hasMore: boolean;
  total?: number;
}

/**
 * File read options
 */
export interface FileReadOptions {
  range?: {
    start: number;
    end: number;
  };
  cache?: boolean;
  signal?: AbortSignal;
}

/**
 * File write options
 */
export interface FileWriteOptions {
  overwrite?: boolean;
  createVersionSnapshot?: boolean;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Load result (telemetria completa)
 */
export interface FileLoadResult {
  handle: FileHandle;
  success: boolean;
  error?: string;
  
  // Performance metrics
  metrics: {
    downloadTimeMs: number;
    parseTimeMs: number;
    totalTimeMs: number;
    
    // Model stats
    triangles?: number;
    vertices?: number;
    objects?: number;
    
    // Memory
    estimatedMemoryMB?: number;
    gpuMemoryMB?: number;
    
    // IFC specific
    ifcVersion?: string;
    ifcSchema?: string;
    
    // Network
    bytesDownloaded: number;
    cacheHit: boolean;
    compressionRatio?: number;
  };
  
  // Warnings/issues
  warnings?: string[];
  
  // Model reference (para associar com ModelSession)
  modelId?: string;
}

/**
 * Catalog entry (FileHandle + extras para UI)
 */
export interface FileCatalogEntry extends FileHandle {
  // Tags/favoritos
  tags: string[];
  favorite: boolean;
  
  // Recents
  lastOpenedAt?: Date;
  openCount: number;
  
  // Collaboration
  comments?: FileComment[];
  shares?: FileShare[];
}

/**
 * Comment on file
 */
export interface FileComment {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
  replies?: FileComment[];
}

/**
 * File share
 */
export interface FileShare {
  id: string;
  sharedWith: string;
  permissions: 'read' | 'write' | 'admin';
  sharedBy: string;
  sharedAt: Date;
  expiresAt?: Date;
}

/**
 * Loader pipeline stage
 */
export enum LoaderStage {
  FETCH = 'fetch',
  VALIDATE = 'validate',
  PARSE = 'parse',
  NORMALIZE = 'normalize',
  OPTIMIZE = 'optimize',
  INJECT = 'inject'
}

/**
 * Loader progress event
 */
export interface LoaderProgress {
  stage: LoaderStage;
  progress: number;          // 0-100
  message?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
}

/**
 * Model Session (o que está aberto no viewer)
 */
export interface ModelSession {
  id: string;
  projectId?: string;
  
  // Models carregados
  models: LoadedModel[];
  
  // Selection state
  selection: {
    objectIds: string[];
    handles: string[];
  };
  
  // Camera state
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  
  // Visibility/isolation
  hiddenObjects: Set<string>;
  isolatedObjects: Set<string>;
  
  // Undo/redo
  history: SessionHistoryEntry[];
  historyIndex: number;
  
  // Metadata
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * Loaded model (referência a arquivo carregado)
 */
export interface LoadedModel {
  id: string;
  handle: FileHandle;
  loadResult: FileLoadResult;
  
  // Engine references
  sceneObjectId?: string;
  rootNodeId?: string;
  
  // Transform
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  
  // Visibility
  visible: boolean;
  opacity: number;
  
  // Metadata
  metadata: Record<string, any>;
}

/**
 * Session history entry (undo/redo)
 */
export interface SessionHistoryEntry {
  id: string;
  timestamp: Date;
  action: string;
  data: any;
  undo?: () => void;
  redo?: () => void;
}
