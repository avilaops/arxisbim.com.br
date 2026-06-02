/**
 * GLB Export Types
 * 
 * Types para exportação de modelos IFC para GLB/glTF
 */

export interface GLBExportOptions {
  /** Usar compressão Draco para geometria */
  dracoCompression?: boolean;
  
  /** Simplificar geometria (redução de polígonos) */
  simplify?: boolean;
  
  /** Ratio de simplificação (0-1, padrão: 0.5) */
  simplifyRatio?: number;
  
  /** Embedding de texturas (base64 inline) ou externas */
  embedTextures?: boolean;
  
  /** Formato binário (.glb) ou JSON (.gltf) */
  binary?: boolean;
  
  /** Aplicar instancing para elementos repetidos */
  useInstancing?: boolean;
  
  /** Merge geometrias similares */
  mergeGeometry?: boolean;
  
  /** Exportar apenas geometria (sem materiais/texturas) */
  geometryOnly?: boolean;
  
  /** Incluir metadados IFC como extras */
  includeMetadata?: boolean;
  
  /** Center model at origin */
  centerAtOrigin?: boolean;
  
  /** Scale factor (default: 1.0) */
  scale?: number;
  
  /** Coordinate system transformation */
  coordinateSystem?: 'right-handed' | 'left-handed';
  
  /** Export specific LOD (Level of Detail) */
  lod?: 'high' | 'medium' | 'low' | 'auto';
  
  /** Maximum texture size (default: 2048) */
  maxTextureSize?: number;
}

export interface GLBExportProgress {
  /** Current step (0-100) */
  progress: number;
  
  /** Current stage */
  stage: 'preparing' | 'extracting' | 'optimizing' | 'compressing' | 'finalizing';
  
  /** Current message */
  message: string;
  
  /** Total bytes processed (optional) */
  bytesProcessed?: number;
  
  /** Total bytes (optional) */
  totalBytes?: number;
}

export interface GLBExportResult {
  /** GLB blob (buffer) */
  buffer: Buffer;
  
  /** File size in bytes */
  size: number;
  
  /** MIME type */
  mimeType: string;
  
  /** Statistics */
  stats: GLBExportStats;
  
  /** Export options used */
  options: GLBExportOptions;
  
  /** Export timestamp */
  timestamp: Date;
}

export interface GLBExportStats {
  /** Total vertices */
  vertices: number;
  
  /** Total triangles */
  triangles: number;
  
  /** Total meshes */
  meshes: number;
  
  /** Total materials */
  materials: number;
  
  /** Total textures */
  textures: number;
  
  /** Original size (before compression) */
  originalSize: number;
  
  /** Compressed size */
  compressedSize: number;
  
  /** Compression ratio */
  compressionRatio: number;
  
  /** Processing time (ms) */
  processingTime: number;
}

export interface GLBExportRequest {
  /** Model ID to export */
  modelId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Export options */
  options?: GLBExportOptions;
  
  /** Filter (optional - export subset) */
  filter?: {
    /** Element types to include */
    types?: string[];
    
    /** Express IDs to include */
    expressIds?: number[];
    
    /** BIM Query filter */
    query?: string;
  };
}

export interface GLBExportJob {
  /** Job ID */
  jobId: string;
  
  /** Job status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  /** Current progress */
  progress: GLBExportProgress;
  
  /** Result (when completed) */
  result?: GLBExportResult;
  
  /** Error (when failed) */
  error?: string;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

export interface GLBMaterialMapping {
  /** IFC material ID */
  ifcMaterialId: string;
  
  /** GLB material index */
  glbMaterialIndex: number;
  
  /** Material properties */
  properties: {
    baseColor?: [number, number, number, number];
    metallic?: number;
    roughness?: number;
    emissive?: [number, number, number];
    normalMap?: string;
    occlusionMap?: string;
  };
}

export interface GLBMeshInfo {
  /** Mesh name */
  name: string;
  
  /** Express ID (IFC element) */
  expressId?: number;
  
  /** IFC type */
  ifcType?: string;
  
  /** Vertex count */
  vertices: number;
  
  /** Triangle count */
  triangles: number;
  
  /** Material index */
  materialIndex?: number;
  
  /** Bounding box */
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}
