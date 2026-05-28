/**
 * StorageService Types
 * Type definitions for file storage operations with MinIO
 */

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  metadata?: Record<string, any>;
  contentType?: string;
  chunkSize?: number;
}

export interface DownloadOptions {
  range?: [number, number];
  onProgress?: (progress: number) => void;
}

export interface ListFilesParams {
  prefix?: string;
  limit?: number;
  marker?: string;
  filters?: {
    tag?: string;
    owner?: string;
    dateFrom?: string;
    dateTo?: string;
    type?: string;
  };
}

export interface FileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType: string;
  metadata?: Record<string, any>;
  versionId?: string;
}

export interface ListFilesResult {
  files: FileInfo[];
  nextMarker?: string;
  totalCount?: number;
}

export interface FileMetadata {
  size: number;
  lastModified: Date;
  contentType: string;
  metadata?: Record<string, any>;
  versionId?: string;
  etag?: string;
}

export interface FileVersion {
  versionId: string;
  lastModified: Date;
  size: number;
  isLatest?: boolean;
}

export interface StorageConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  useSSL?: boolean;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
}

export interface BatchOperationProgress {
  progress: number;
  current: number;
  total: number;
  completed: string[];
  failed: Array<{ path: string; error: string }>;
}

export interface StorageError extends Error {
  code?: string;
  path?: string;
  statusCode?: number;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

export interface AuditLog {
  action: 'upload' | 'download' | 'delete' | 'restore';
  path: string;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
