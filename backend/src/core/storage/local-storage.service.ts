/**
 * Local filesystem implementation of StorageService.
 *
 * Files live under UPLOAD_DIR (default: ./uploads). Keys are resolved
 * relative to that root, with forward slashes mapped to OS path separators.
 *
 * Backwards-compat: if a key is an absolute filesystem path
 * (e.g. legacy values written before the storage refactor), it is read
 * from disk directly. New uploads always write to UPLOAD_DIR/<key>.
 */

import fs from 'node:fs/promises';
import { createReadStream, createWriteStream, constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import {
  StorageError,
  type PresignOptions,
  type StorageBody,
  type StorageKey,
  type StorageObject,
  type StorageService,
  type UploadOptions,
} from './storage.types.js';

function isAbsolutePathish(key: string): boolean {
  return path.isAbsolute(key) || key.startsWith('/') || key.startsWith('\\') || /^[a-zA-Z]:/.test(key);
}

export class LocalStorageService implements StorageService {
  readonly driver = 'local' as const;
  private root: string;
  private rootChecked = false;

  constructor(root?: string) {
    const configured = root ?? process.env.UPLOAD_DIR ?? 'uploads';
    this.root = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  /**
   * Garante que o root é gravável. Em hosts sem disco persistente (ex.: Render
   * free com UPLOAD_DIR=/mnt/persistent-storage não montado), cai para um
   * diretório temporário gravável em vez de estourar EACCES em todo upload.
   */
  private async ensureWritableRoot(): Promise<void> {
    if (this.rootChecked) return;
    try {
      await fs.mkdir(this.root, { recursive: true });
      await fs.access(this.root, fsConstants.W_OK);
    } catch {
      const fallback = path.join(os.tmpdir(), 'arxisvr-uploads');
      await fs.mkdir(fallback, { recursive: true }).catch(() => {});
      console.warn(`⚠️  Storage root "${this.root}" não gravável — usando ${fallback}`);
      this.root = fallback;
    }
    this.rootChecked = true;
  }

  private resolve(key: StorageKey): string {
    let decodedKey = key;
    let prev = '';
    try {
      while (decodedKey !== prev) {
        prev = decodedKey;
        decodedKey = decodeURIComponent(decodedKey);
      }
    } catch {
      // Ignore decode errors and use original/last successfully decoded key
    }

    let cleanKey = decodedKey;
    if (cleanKey.startsWith('/api/v1/storage/')) {
      cleanKey = cleanKey.slice('/api/v1/storage/'.length);
    } else if (cleanKey.startsWith('api/v1/storage/')) {
      cleanKey = cleanKey.slice('api/v1/storage/'.length);
    }

    // Uniformize separator representation and normalize path segments
    const normalizedKey = cleanKey.replace(/\\/g, '/');

    // Reject absolute paths or key traversing outside root
    if (
      isAbsolutePathish(normalizedKey) ||
      normalizedKey.includes('..')
    ) {
      throw new StorageError(
        `Directory traversal or absolute path rejected: ${key}`,
        'INVALID_ARGUMENT'
      );
    }

    const target = path.resolve(this.root, normalizedKey);
    const relative = path.relative(this.root, target);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new StorageError(
        `Directory traversal or absolute path rejected: ${key}`,
        'INVALID_ARGUMENT'
      );
    }

    return target;
  }

  private async verifySafePath(target: string): Promise<void> {
    try {
      const real = await fs.realpath(target);
      const relative = path.relative(this.root, real);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new StorageError(
          `Symlink resolution points outside storage root: ${target}`,
          'INVALID_ARGUMENT'
        );
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  private async ensureDir(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  async upload(key: StorageKey, body: StorageBody, _opts: UploadOptions = {}): Promise<StorageObject> {
    await this.ensureWritableRoot();
    const target = this.resolve(key);
    await this.verifySafePath(target);
    await this.ensureDir(target);

    if (Buffer.isBuffer(body) || typeof body === 'string') {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');
      await fs.writeFile(target, buf);
      return { key, size: buf.length };
    }

    // Stream input.
    const stream = body as Readable;
    let size = 0;
    stream.on('data', (chunk: Buffer | string) => {
      size += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    });
    await pipeline(stream, createWriteStream(target));
    return { key, size };
  }

  async download(key: StorageKey): Promise<Buffer> {
    const target = this.resolve(key);
    await this.verifySafePath(target);
    try {
      return await fs.readFile(target);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new StorageError(`Object not found: ${key}`, 'NOT_FOUND', err);
      }
      throw new StorageError(`Failed to read object ${key}`, 'UNKNOWN', err);
    }
  }

  async downloadText(key: StorageKey, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const buf = await this.download(key);
    return buf.toString(encoding);
  }

  async delete(key: StorageKey): Promise<void> {
    const target = this.resolve(key);
    await this.verifySafePath(target);
    try {
      await fs.unlink(target);
    } catch (err: any) {
      if (err?.code === 'ENOENT') return; // idempotent
      throw new StorageError(`Failed to delete object ${key}`, 'UNKNOWN', err);
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    const target = this.resolve(key);
    try {
      await this.verifySafePath(target);
      await fs.access(target);
      return true;
    } catch (err: any) {
      if (err instanceof StorageError) {
        throw err;
      }
      return false;
    }
  }

  async stat(key: StorageKey): Promise<StorageObject> {
    const target = this.resolve(key);
    await this.verifySafePath(target);
    try {
      const s = await fs.stat(target);
      return { key, size: s.size };
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new StorageError(`Object not found: ${key}`, 'NOT_FOUND', err);
      }
      throw new StorageError(`Failed to stat object ${key}`, 'UNKNOWN', err);
    }
  }

  async presignGet(key: StorageKey, _opts: PresignOptions = {}): Promise<string> {
    // Local backend has no public endpoint; return the resolved path
    // expressed as a file:// URL so consumers can distinguish from a real URL.
    const target = this.resolve(key);
    await this.verifySafePath(target);
    return `file://${target.replace(/\\/g, '/')}`;
  }

  async presignPut(key: StorageKey, _opts: PresignOptions = {}): Promise<string> {
    // Direct browser-to-disk uploads are not supported in local mode.
    // Consumers should POST through the API instead.
    throw new StorageError(
      'presignPut is not supported by the local storage driver',
      'UNKNOWN'
    );
  }

  /** Optional: pre-create the root directory at boot. */
  async ensureRoot(): Promise<void> {
    try {
      await fs.mkdir(this.root, { recursive: true });
    } catch (error: any) {
      // If permission denied, use temp directory as fallback
      if (error.code === 'EACCES') {
        const tempDir = path.join(process.cwd(), 'uploads');
        await fs.mkdir(tempDir, { recursive: true });
        console.warn(`⚠️  Using temp directory ${tempDir} instead of ${this.root}`);
      } else {
        throw error;
      }
    }
  }

  /** Exposed for diagnostics / tests. */
  get rootDir(): string {
    return this.root;
  }
}

// Re-export the stream type for consumers that need it.
export type { Readable };
export { createReadStream };
