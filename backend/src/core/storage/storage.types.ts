/**
 * Storage abstraction for ArxisVR file storage backends.
 *
 * Supports:
 *   - Local filesystem (dev/legacy)
 *   - S3-compatible object stores (MinIO, AWS S3, Backblaze B2, etc.)
 *
 * The active driver is selected via the STORAGE_DRIVER env var.
 * All consumers (IfcService, ProjectsService, etc.) must use the
 * `storage` singleton exported from `./index.js` and never touch `fs`
 * directly.
 */

import type { Readable } from 'node:stream';

/**
 * Logical key identifying an object in the configured storage backend.
 *
 * Format (recommended):
 *   tenants/{tenantId}/{resource}/{id}.{ext}
 *
 * Examples:
 *   tenants/abc123/ifc/9f2c.ifc
 *   tenants/abc123/ifc/9f2c.thumb.png
 *   tenants/abc123/projects/proj-1/floorplan.dwg
 *
 * For local storage, the key is resolved relative to UPLOAD_DIR.
 * For S3, the key is the object key inside S3_BUCKET.
 *
 * Backwards-compat: legacy absolute filesystem paths
 * (e.g. "D:\\AvilaOps\\...\\uploads\\ifc\\xyz.ifc") are still accepted
 * by the local driver and resolved via path.basename().
 */
export type StorageKey = string;

export type StorageBody = Buffer | string | Readable;

export interface StorageObject {
  /** Logical key (always normalised to forward slashes). */
  key: StorageKey;
  /** Size in bytes. */
  size: number;
  /** Object ETag if reported by the backend. */
  etag?: string;
  /** ContentType as stored. */
  contentType?: string;
}

export interface UploadOptions {
  contentType?: string;
  /** Custom metadata (S3: stored as x-amz-meta-*). */
  metadata?: Record<string, string>;
  /**
   * Pre-computed content length. Required when body is a stream and
   * the backend cannot compute it on the fly.
   */
  contentLength?: number;
}

export interface PresignOptions {
  /** Expiry in seconds (default 900 = 15 min). */
  expiresIn?: number;
  /** Force a specific Content-Type when presigning PUT. */
  contentType?: string;
}

export interface StorageService {
  /** Human-readable driver name (e.g. "local", "s3"). */
  readonly driver: 'local' | 's3';

  /** Upload an object. Returns metadata of the stored object. */
  upload(key: StorageKey, body: StorageBody, opts?: UploadOptions): Promise<StorageObject>;

  /** Download an object as a Buffer. Throws if the object is not found. */
  download(key: StorageKey): Promise<Buffer>;

  /** Convenience: download an object and decode as UTF-8 text. */
  downloadText(key: StorageKey, encoding?: BufferEncoding): Promise<string>;

  /** Delete an object. No-op if it does not exist. */
  delete(key: StorageKey): Promise<void>;

  /** Check whether the object exists. */
  exists(key: StorageKey): Promise<boolean>;

  /** Return object metadata without downloading the body. */
  stat(key: StorageKey): Promise<StorageObject>;

  /**
   * Issue a presigned URL allowing the caller to GET the object directly
   * from the backend (browser download, IFC viewer, etc.).
   *
   * Returns the key itself (or a `file://` URL) for the local driver,
   * since presigning has no meaning without a public endpoint.
   */
  presignGet(key: StorageKey, opts?: PresignOptions): Promise<string>;

  /**
   * Issue a presigned URL allowing the caller to PUT directly to the
   * backend (browser upload bypassing the API).
   */
  presignPut(key: StorageKey, opts?: PresignOptions): Promise<string>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'ACCESS_DENIED' | 'UNKNOWN',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
