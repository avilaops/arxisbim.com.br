/**
 * GLB Export Types (Frontend)
 * 
 * Sync com backend types
 */

export interface GLBExportOptions {
  dracoCompression?: boolean;
  simplify?: boolean;
  simplifyRatio?: number;
  embedTextures?: boolean;
  binary?: boolean;
  useInstancing?: boolean;
  mergeGeometry?: boolean;
  geometryOnly?: boolean;
  includeMetadata?: boolean;
  centerAtOrigin?: boolean;
  scale?: number;
  coordinateSystem?: 'right-handed' | 'left-handed';
  lod?: 'high' | 'medium' | 'low' | 'auto';
  maxTextureSize?: number;
}

export interface GLBExportProgress {
  progress: number;
  stage: 'preparing' | 'extracting' | 'optimizing' | 'compressing' | 'finalizing';
  message: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

export interface GLBExportResult {
  buffer: ArrayBuffer;
  size: number;
  mimeType: string;
  stats: GLBExportStats;
  options: GLBExportOptions;
  timestamp: Date;
}

export interface GLBExportStats {
  vertices: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
}

export interface GLBExportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: GLBExportProgress;
  result?: GLBExportResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
