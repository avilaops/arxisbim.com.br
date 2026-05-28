/**
 * StorageService
 * File storage operations with MinIO backend integration
 */

import { api } from '../../api/client';
import type {
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

export class StorageService {
  private config: StorageConfig;
  private bucket: string;
  private chunkSize: number = 5 * 1024 * 1024; // 5MB default chunk size
  private maxFileSize: number = 500 * 1024 * 1024; // 500MB max file size

  // Event callbacks
  private onUploadProgress?: (progress: UploadProgress) => void;
  private onBatchProgress?: (progress: BatchOperationProgress) => void;
  private onError?: (error: StorageError) => void;

  constructor(config: StorageConfig) {
    this.config = config;
    this.bucket = config.bucket;
  }

  /**
   * Set upload progress callback
   */
  setUploadProgressCallback(callback: (progress: UploadProgress) => void): void {
    this.onUploadProgress = callback;
  }

  /**
   * Set batch progress callback
   */
  setBatchProgressCallback(callback: (progress: BatchOperationProgress) => void): void {
    this.onBatchProgress = callback;
  }

  /**
   * Set error callback
   */
  setErrorCallback(callback: (error: StorageError) => void): void {
    this.onError = callback;
  }

  /**
   * Upload a file with multi-part support
   */
  async uploadFile(file: File, path: string, options: UploadOptions = {}): Promise<string> {
    // Validate file
    this.validateFile(file);

    const { onProgress, metadata, contentType, chunkSize } = options;
    const effectiveChunkSize = chunkSize || this.chunkSize;

    // Prepare upload data
    const uploadData = {
      fileName: file.name,
      filePath: path,
      fileSize: file.size,
      contentType: contentType || file.type,
      metadata: metadata || {},
      chunkSize: effectiveChunkSize,
    };

    if (file.size > effectiveChunkSize) {
      // Multi-part upload for large files
      return this.uploadMultiPart(file, path, uploadData, onProgress);
    } else {
      // Single-part upload for small files
      return this.uploadSinglePart(file, path, uploadData, onProgress);
    }
  }

  /**
   * Upload file in single part
   */
  private async uploadSinglePart(
    file: File,
    path: string,
    uploadData: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('metadata', JSON.stringify(uploadData.metadata));

    const response = await api.post<{ url: string }>('/api/v1/storage/upload', formData);

    // Simulate progress for single-part upload
    if (onProgress) {
      onProgress(100);
      this.emitUploadProgress(file.name, 100, file.size, file.size);
    }

    return response.url;
  }

  /**
   * Upload file in multiple parts
   */
  private async uploadMultiPart(
    file: File,
    path: string,
    uploadData: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Initialize multi-part upload
    const { uploadId } = await api.post<{ uploadId: string }>('/api/v1/storage/multipart/init', {
      fileName: file.name,
      filePath: path,
      fileSize: file.size,
      contentType: uploadData.contentType,
      metadata: uploadData.metadata,
    });

    const chunkSize = uploadData.chunkSize;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadedParts: Array<{ partNumber: number; etag: string }> = [];

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const { etag } = await api.post<{ etag: string }>('/api/v1/storage/multipart/upload', {
        uploadId,
        partNumber: i + 1,
        chunk,
      });

      uploadedParts.push({ partNumber: i + 1, etag });

      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(progress);
        this.emitUploadProgress(file.name, progress, end, file.size);
      }
    }

    // Complete multi-part upload
    const { url } = await api.post<{ url: string }>('/api/v1/storage/multipart/complete', {
      uploadId,
      parts: uploadedParts,
    });

    return url;
  }

  /**
   * Download a file with range support
   */
  async downloadFile(path: string, options: DownloadOptions = {}): Promise<Blob> {
    const { range, onProgress } = options;

    const headers: Record<string, string> = {};
    if (range) {
      headers['Range'] = `bytes=${range[0]}-${range[1]}`;
    }

    const response = await api.get<Blob>(`/api/v1/storage/download`, {
      params: { path },
      headers,
      responseType: 'blob',
    });

    // Simulate progress for download
    if (onProgress) {
      onProgress(100);
    }

    return response;
  }

  /**
   * List files with pagination and filters
   */
  async listFiles(params: ListFilesParams = {}): Promise<ListFilesResult> {
    const { prefix, limit, marker, filters } = params;

    const response = await api.get<ListFilesResult>('/api/v1/storage/list', {
      params: {
        prefix,
        limit: limit || 100,
        marker,
        filters,
      },
    });

    return response;
  }

  /**
   * Delete a single file
   */
  async deleteFile(path: string): Promise<void> {
    await api.delete('/api/v1/storage/file', { params: { path } });
  }

  /**
   * Delete multiple files (batch operation)
   */
  async deleteFiles(paths: string[]): Promise<void> {
    const failed: Array<{ path: string; error: string }> = [];

    for (let i = 0; i < paths.length; i++) {
      try {
        await this.deleteFile(paths[i]);
        this.emitBatchProgress(i + 1, paths.length, [], failed);
      } catch (error) {
        failed.push({ path: paths[i], error: String(error) });
        this.emitBatchProgress(i + 1, paths.length, [], failed);
      }
    }
  }

  /**
   * Get signed URL for file access
   */
  async getFileUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const response = await api.get<{ url: string }>('/api/v1/storage/url', {
      params: { path, expiresIn },
    });

    return response.url;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    const response = await api.get<FileMetadata>('/api/v1/storage/metadata', {
      params: { path },
    });

    return response;
  }

  /**
   * Get file versions
   */
  async getFileVersions(path: string): Promise<FileVersion[]> {
    const response = await api.get<FileVersion[]>('/api/v1/storage/versions', {
      params: { path },
    });

    return response;
  }

  /**
   * Restore file to a specific version
   */
  async restoreFileVersion(path: string, versionId: string): Promise<void> {
    await api.post('/api/v1/storage/restore', { path, versionId });
  }

  /**
   * Get quota information
   */
  async getQuota(): Promise<QuotaInfo> {
    const response = await api.get<QuotaInfo>('/api/v1/storage/quota');
    return response;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    path?: string;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AuditLog[]> {
    const response = await api.get<AuditLog[]>('/api/v1/storage/audit', { params });
    return response;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      const error: StorageError = new Error(
        `File too large: ${file.size} bytes. Max size: ${this.maxFileSize} bytes`
      ) as StorageError;
      error.code = 'FILE_TOO_LARGE';
      error.statusCode = 413;
      throw error;
    }

    const allowedTypes = [
      'application/x-ifc',
      'model/gltf-binary',
      'application/octet-stream',
      'image/png',
      'application/pdf',
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      const error: StorageError = new Error(
        `Invalid file type: ${file.type}`
      ) as StorageError;
      error.code = 'INVALID_FILE_TYPE';
      error.statusCode = 415;
      throw error;
    }
  }

  /**
   * Emit upload progress event
   */
  private emitUploadProgress(
    fileName: string,
    progress: number,
    uploadedBytes: number,
    totalBytes: number
  ): void {
    if (this.onUploadProgress) {
      this.onUploadProgress({
        fileName,
        progress,
        uploadedBytes,
        totalBytes,
      });
    }
  }

  /**
   * Emit batch progress event
   */
  private emitBatchProgress(
    current: number,
    total: number,
    completed: string[],
    failed: Array<{ path: string; error: string }>
  ): void {
    if (this.onBatchProgress) {
      this.onBatchProgress({
        progress: Math.round((current / total) * 100),
        current,
        total,
        completed,
        failed,
      });
    }
  }

  /**
   * Handle error
   */
  private handleError(error: any, path?: string): void {
    const storageError: StorageError = error instanceof Error ? error : new Error(String(error));
    storageError.path = path;
    
    if (this.onError) {
      this.onError(storageError);
    }
  }

  /**
   * Set chunk size for multi-part uploads
   */
  setChunkSize(size: number): void {
    this.chunkSize = size;
  }

  /**
   * Set max file size
   */
  setMaxFileSize(size: number): void {
    this.maxFileSize = size;
  }
}

// Create singleton instance with default config
const env = import.meta.env as any;
const defaultConfig: StorageConfig = {
  endpoint: env.VITE_STORAGE_ENDPOINT || 'http://localhost:9000',
  accessKey: env.VITE_STORAGE_ACCESS_KEY || '',
  secretKey: env.VITE_STORAGE_SECRET_KEY || '',
  bucket: env.VITE_STORAGE_BUCKET || 'arxisvr',
  region: env.VITE_STORAGE_REGION || 'us-east-1',
  useSSL: env.VITE_STORAGE_USE_SSL === 'true',
};

export const storageService = new StorageService(defaultConfig);

export default StorageService;
