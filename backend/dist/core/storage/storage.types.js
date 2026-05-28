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
export class StorageError extends Error {
    code;
    cause;
    constructor(message, code, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'StorageError';
    }
}
//# sourceMappingURL=storage.types.js.map