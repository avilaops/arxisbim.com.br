/**
 * StorageService Tests
 * Unit tests for storage operations
 */

import StorageService from './StorageService';
import type { StorageConfig } from './types';

// Mock the API client
jest.mock('../../api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('StorageService', () => {
  let service: StorageService;
  const mockConfig: StorageConfig = {
    endpoint: 'http://localhost:9000',
    accessKey: 'test-key',
    secretKey: 'test-secret',
    bucket: 'test-bucket',
  };

  beforeEach(() => {
    service = new StorageService(mockConfig);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with config', () => {
      expect(service).toBeDefined();
    });

    test('should set chunk size', () => {
      service.setChunkSize(10 * 1024 * 1024);
      expect(service['chunkSize']).toBe(10 * 1024 * 1024);
    });

    test('should set max file size', () => {
      service.setMaxFileSize(1024 * 1024 * 1024);
      expect(service['maxFileSize']).toBe(1024 * 1024 * 1024);
    });
  });

  describe('Upload', () => {
    test('should upload small file with single-part', async () => {
      const { api } = require('../../api/client');
      api.post.mockResolvedValue({ url: 'http://example.com/file' });

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const url = await service.uploadFile(file, 'path/to/file');

      expect(api.post).toHaveBeenCalledWith('/api/v1/storage/upload', expect.any(FormData));
      expect(url).toBe('http://example.com/file');
    });

    test('should upload large file with multi-part', async () => {
      const { api } = require('../../api/client');
      api.post
        .mockResolvedValueOnce({ uploadId: 'upload-123' })
        .mockResolvedValue({ etag: 'etag-1' })
        .mockResolvedValueOnce({ url: 'http://example.com/file' });

      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      service.setChunkSize(5 * 1024 * 1024); // 5MB

      const url = await service.uploadFile(largeFile, 'path/to/file');

      expect(api.post).toHaveBeenCalledWith('/api/v1/storage/multipart/init', expect.any(Object));
      expect(url).toBe('http://example.com/file');
    });

    test('should call progress callback during upload', async () => {
      const { api } = require('../../api/client');
      api.post.mockResolvedValue({ url: 'http://example.com/file' });

      const progressCallback = jest.fn();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await service.uploadFile(file, 'path/to/file', {
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    test('should reject file too large', async () => {
      const file = new File(['x'.repeat(600 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      service.setMaxFileSize(500 * 1024 * 1024);

      await expect(service.uploadFile(file, 'path/to/file')).rejects.toThrow('File too large');
    });

    test('should reject invalid file type', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

      await expect(service.uploadFile(file, 'path/to/file')).rejects.toThrow('Invalid file type');
    });
  });

  describe('Download', () => {
    test('should download file', async () => {
      const { api } = require('../../api/client');
      const mockBlob = new Blob(['test data']);
      api.get.mockResolvedValue(mockBlob);

      const blob = await service.downloadFile('path/to/file');

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/download', expect.any(Object));
      expect(blob).toBe(mockBlob);
    });

    test('should download file with range', async () => {
      const { api } = require('../../api/client');
      const mockBlob = new Blob(['test data']);
      api.get.mockResolvedValue(mockBlob);

      const blob = await service.downloadFile('path/to/file', {
        range: [0, 1024],
      });

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/download', expect.objectContaining({
        headers: { 'Range': 'bytes=0-1024' },
      }));
    });

    test('should call progress callback during download', async () => {
      const { api } = require('../../api/client');
      const mockBlob = new Blob(['test data']);
      api.get.mockResolvedValue(mockBlob);

      const progressCallback = jest.fn();

      await service.downloadFile('path/to/file', {
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledWith(100);
    });
  });

  describe('List Files', () => {
    test('should list files', async () => {
      const { api } = require('../../api/client');
      const mockResult = {
        files: [
          { name: 'file1.txt', path: 'path/file1.txt', url: 'url1', size: 100, lastModified: new Date(), contentType: 'text/plain' },
        ],
        nextMarker: 'marker-123',
      };
      api.get.mockResolvedValue(mockResult);

      const result = await service.listFiles({ prefix: 'path/' });

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/list', expect.any(Object));
      expect(result.files).toHaveLength(1);
    });

    test('should list files with filters', async () => {
      const { api } = require('../../api/client');
      api.get.mockResolvedValue({ files: [] });

      await service.listFiles({
        prefix: 'path/',
        filters: { tag: 'ifc', owner: 'user' },
      });

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/list', expect.objectContaining({
        params: expect.objectContaining({
          filters: { tag: 'ifc', owner: 'user' },
        }),
      }));
    });
  });

  describe('Delete', () => {
    test('should delete single file', async () => {
      const { api } = require('../../api/client');
      api.delete.mockResolvedValue(undefined);

      await service.deleteFile('path/to/file');

      expect(api.delete).toHaveBeenCalledWith('/api/v1/storage/file', expect.objectContaining({
        params: { path: 'path/to/file' },
      }));
    });

    test('should delete multiple files', async () => {
      const { api } = require('../../api/client');
      api.delete.mockResolvedValue(undefined);

      const paths = ['path/file1', 'path/file2'];
      await service.deleteFiles(paths);

      expect(api.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Signed URLs', () => {
    test('should get signed URL', async () => {
      const { api } = require('../../api/client');
      api.get.mockResolvedValue({ url: 'http://example.com/signed-url' });

      const url = await service.getFileUrl('path/to/file');

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/url', expect.objectContaining({
        params: { path: 'path/to/file', expiresIn: 3600 },
      }));
      expect(url).toBe('http://example.com/signed-url');
    });

    test('should get signed URL with custom expiration', async () => {
      const { api } = require('../../api/client');
      api.get.mockResolvedValue({ url: 'http://example.com/signed-url' });

      const url = await service.getFileUrl('path/to/file', 300);

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/url', expect.objectContaining({
        params: { path: 'path/to/file', expiresIn: 300 },
      }));
    });
  });

  describe('Metadata', () => {
    test('should get file metadata', async () => {
      const { api } = require('../../api/client');
      const mockMetadata = {
        size: 1000,
        lastModified: new Date(),
        contentType: 'text/plain',
      };
      api.get.mockResolvedValue(mockMetadata);

      const metadata = await service.getFileMetadata('path/to/file');

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/metadata', expect.objectContaining({
        params: { path: 'path/to/file' },
      }));
      expect(metadata.size).toBe(1000);
    });
  });

  describe('Versioning', () => {
    test('should get file versions', async () => {
      const { api } = require('../../api/client');
      const mockVersions = [
        { versionId: 'v1', lastModified: new Date(), size: 1000 },
        { versionId: 'v2', lastModified: new Date(), size: 1100 },
      ];
      api.get.mockResolvedValue(mockVersions);

      const versions = await service.getFileVersions('path/to/file');

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/versions', expect.objectContaining({
        params: { path: 'path/to/file' },
      }));
      expect(versions).toHaveLength(2);
    });

    test('should restore file version', async () => {
      const { api } = require('../../api/client');
      api.post.mockResolvedValue(undefined);

      await service.restoreFileVersion('path/to/file', 'v1');

      expect(api.post).toHaveBeenCalledWith('/api/v1/storage/restore', {
        path: 'path/to/file',
        versionId: 'v1',
      });
    });
  });

  describe('Quota', () => {
    test('should get quota information', async () => {
      const { api } = require('../../api/client');
      const mockQuota = {
        used: 1000,
        limit: 10000,
        remaining: 9000,
        percentage: 10,
      };
      api.get.mockResolvedValue(mockQuota);

      const quota = await service.getQuota();

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/quota');
      expect(quota.percentage).toBe(10);
    });
  });

  describe('Audit Logs', () => {
    test('should get audit logs', async () => {
      const { api } = require('../../api/client');
      const mockLogs = [
        { action: 'upload', path: 'path/file', userId: 'user', timestamp: new Date() },
      ];
      api.get.mockResolvedValue(mockLogs);

      const logs = await service.getAuditLogs({ path: 'path/' });

      expect(api.get).toHaveBeenCalledWith('/api/v1/storage/audit', expect.objectContaining({
        params: { path: 'path/' },
      }));
      expect(logs).toHaveLength(1);
    });
  });

  describe('Event Callbacks', () => {
    test('should set upload progress callback', () => {
      const callback = jest.fn();
      service.setUploadProgressCallback(callback);
      expect(service['onUploadProgress']).toBe(callback);
    });

    test('should set batch progress callback', () => {
      const callback = jest.fn();
      service.setBatchProgressCallback(callback);
      expect(service['onBatchProgress']).toBe(callback);
    });

    test('should set error callback', () => {
      const callback = jest.fn();
      service.setErrorCallback(callback);
      expect(service['onError']).toBe(callback);
    });
  });
});
