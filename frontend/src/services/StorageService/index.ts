/**
 * StorageService Module
 * Centralized exports for storage operations
 */

export { default as StorageService } from './StorageService';
export { storageService } from './StorageService';

export type {
  UploadOptions,
  DownloadOptions,
  ListFilesParams,
  ListFilesResult,
  FileInfo,
  FileMetadata,
  FileVersion,
  StorageConfig,
  UploadProgress,
  BatchOperationProgress,
  StorageError,
  QuotaInfo,
  AuditLog,
} from './types';
