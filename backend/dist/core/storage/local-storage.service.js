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
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { StorageError, } from './storage.types.js';
function isAbsolutePathish(key) {
    // Detect legacy absolute paths (e.g., D:\AvilaOps\...\uploads\file.ifc).
    return path.isAbsolute(key);
}
export class LocalStorageService {
    driver = 'local';
    root;
    constructor(root) {
        const configured = root ?? process.env.UPLOAD_DIR ?? 'uploads';
        this.root = path.isAbsolute(configured)
            ? configured
            : path.resolve(process.cwd(), configured);
    }
    resolve(key) {
        if (isAbsolutePathish(key)) {
            // Legacy absolute path; honour it as-is.
            return key;
        }
        return path.join(this.root, key);
    }
    async ensureDir(filePath) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
    }
    async upload(key, body, _opts = {}) {
        const target = this.resolve(key);
        await this.ensureDir(target);
        if (Buffer.isBuffer(body) || typeof body === 'string') {
            const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');
            await fs.writeFile(target, buf);
            return { key, size: buf.length };
        }
        // Stream input.
        const stream = body;
        let size = 0;
        stream.on('data', (chunk) => {
            size += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
        });
        await pipeline(stream, createWriteStream(target));
        return { key, size };
    }
    async download(key) {
        const target = this.resolve(key);
        try {
            return await fs.readFile(target);
        }
        catch (err) {
            if (err?.code === 'ENOENT') {
                throw new StorageError(`Object not found: ${key}`, 'NOT_FOUND', err);
            }
            throw new StorageError(`Failed to read object ${key}`, 'UNKNOWN', err);
        }
    }
    async downloadText(key, encoding = 'utf-8') {
        const buf = await this.download(key);
        return buf.toString(encoding);
    }
    async delete(key) {
        const target = this.resolve(key);
        try {
            await fs.unlink(target);
        }
        catch (err) {
            if (err?.code === 'ENOENT')
                return; // idempotent
            throw new StorageError(`Failed to delete object ${key}`, 'UNKNOWN', err);
        }
    }
    async exists(key) {
        const target = this.resolve(key);
        try {
            await fs.access(target);
            return true;
        }
        catch {
            return false;
        }
    }
    async stat(key) {
        const target = this.resolve(key);
        try {
            const s = await fs.stat(target);
            return { key, size: s.size };
        }
        catch (err) {
            if (err?.code === 'ENOENT') {
                throw new StorageError(`Object not found: ${key}`, 'NOT_FOUND', err);
            }
            throw new StorageError(`Failed to stat object ${key}`, 'UNKNOWN', err);
        }
    }
    async presignGet(key, _opts = {}) {
        // Local backend has no public endpoint; return the resolved path
        // expressed as a file:// URL so consumers can distinguish from a real URL.
        const target = this.resolve(key);
        return `file://${target.replace(/\\/g, '/')}`;
    }
    async presignPut(key, _opts = {}) {
        // Direct browser-to-disk uploads are not supported in local mode.
        // Consumers should POST through the API instead.
        throw new StorageError('presignPut is not supported by the local storage driver', 'UNKNOWN');
    }
    /** Optional: pre-create the root directory at boot. */
    async ensureRoot() {
        try {
            await fs.mkdir(this.root, { recursive: true });
        }
        catch (error) {
            // If permission denied, use temp directory as fallback
            if (error.code === 'EACCES') {
                const tempDir = path.join(process.cwd(), 'uploads');
                await fs.mkdir(tempDir, { recursive: true });
                console.warn(`⚠️  Using temp directory ${tempDir} instead of ${this.root}`);
            }
            else {
                throw error;
            }
        }
    }
    /** Exposed for diagnostics / tests. */
    get rootDir() {
        return this.root;
    }
}
export { createReadStream };
//# sourceMappingURL=local-storage.service.js.map