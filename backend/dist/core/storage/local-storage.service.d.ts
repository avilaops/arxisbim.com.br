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
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { type PresignOptions, type StorageBody, type StorageKey, type StorageObject, type StorageService, type UploadOptions } from './storage.types.js';
export declare class LocalStorageService implements StorageService {
    readonly driver: "local";
    private readonly root;
    constructor(root?: string);
    private resolve;
    private ensureDir;
    upload(key: StorageKey, body: StorageBody, _opts?: UploadOptions): Promise<StorageObject>;
    download(key: StorageKey): Promise<Buffer>;
    downloadText(key: StorageKey, encoding?: BufferEncoding): Promise<string>;
    delete(key: StorageKey): Promise<void>;
    exists(key: StorageKey): Promise<boolean>;
    stat(key: StorageKey): Promise<StorageObject>;
    presignGet(key: StorageKey, _opts?: PresignOptions): Promise<string>;
    presignPut(key: StorageKey, _opts?: PresignOptions): Promise<string>;
    /** Optional: pre-create the root directory at boot. */
    ensureRoot(): Promise<void>;
    /** Exposed for diagnostics / tests. */
    get rootDir(): string;
}
export type { Readable };
export { createReadStream };
//# sourceMappingURL=local-storage.service.d.ts.map