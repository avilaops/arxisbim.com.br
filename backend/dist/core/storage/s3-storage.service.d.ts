/**
 * S3-compatible implementation of StorageService.
 *
 * Tested against:
 *   - MinIO (minio.avilaops.com)
 *   - AWS S3
 *
 * Configuration (env):
 *   S3_ENDPOINT          required for non-AWS backends (e.g. https://minio.avilaops.com)
 *   S3_PUBLIC_ENDPOINT   optional override used only for presigned URLs
 *                        (useful when the backend talks to MinIO on an internal
 *                        network but the browser needs the public URL)
 *   S3_REGION            default: us-east-1 (MinIO ignores it but the SDK requires one)
 *   S3_ACCESS_KEY        required
 *   S3_SECRET_KEY        required
 *   S3_BUCKET            required
 *   S3_FORCE_PATH_STYLE  default: true (MUST be true for MinIO)
 *   S3_PRESIGN_EXPIRES   default: 900 (15 minutes)
 */
import { type PresignOptions, type StorageBody, type StorageKey, type StorageObject, type StorageService, type UploadOptions } from './storage.types.js';
export interface S3StorageConfig {
    endpoint?: string;
    publicEndpoint?: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    forcePathStyle: boolean;
    presignExpiresSeconds: number;
}
export declare function loadS3ConfigFromEnv(): S3StorageConfig;
export declare class S3StorageService implements StorageService {
    readonly driver: "s3";
    private readonly client;
    private readonly presignClient;
    private readonly cfg;
    constructor(cfg: S3StorageConfig);
    get bucket(): string;
    upload(key: StorageKey, body: StorageBody, opts?: UploadOptions): Promise<StorageObject>;
    download(key: StorageKey): Promise<Buffer>;
    downloadText(key: StorageKey, encoding?: BufferEncoding): Promise<string>;
    delete(key: StorageKey): Promise<void>;
    exists(key: StorageKey): Promise<boolean>;
    stat(key: StorageKey): Promise<StorageObject>;
    presignGet(key: StorageKey, opts?: PresignOptions): Promise<string>;
    presignPut(key: StorageKey, opts?: PresignOptions): Promise<string>;
}
//# sourceMappingURL=s3-storage.service.d.ts.map