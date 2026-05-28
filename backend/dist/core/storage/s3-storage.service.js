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
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageError, } from './storage.types.js';
export function loadS3ConfigFromEnv() {
    const required = (name) => {
        const v = process.env[name];
        if (!v) {
            throw new Error(`Storage driver "s3" selected but ${name} is missing. ` +
                `Set ${name} in your .env or switch STORAGE_DRIVER=local.`);
        }
        return v;
    };
    const forcePathRaw = (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase();
    const expires = Number.parseInt(process.env.S3_PRESIGN_EXPIRES ?? '900', 10);
    return {
        endpoint: process.env.S3_ENDPOINT,
        publicEndpoint: process.env.S3_PUBLIC_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        accessKeyId: required('S3_ACCESS_KEY'),
        secretAccessKey: required('S3_SECRET_KEY'),
        bucket: required('S3_BUCKET'),
        forcePathStyle: forcePathRaw !== 'false',
        presignExpiresSeconds: Number.isFinite(expires) && expires > 0 ? expires : 900,
    };
}
function mapS3Error(key, err) {
    const code = err?.$metadata?.httpStatusCode;
    const name = err?.name ?? err?.Code;
    if (code === 404 || name === 'NoSuchKey' || name === 'NotFound') {
        return new StorageError(`Object not found: ${key}`, 'NOT_FOUND', err);
    }
    if (code === 403 || name === 'AccessDenied') {
        return new StorageError(`Access denied for object: ${key}`, 'ACCESS_DENIED', err);
    }
    return new StorageError(`S3 operation failed for object ${key}: ${err?.message ?? 'unknown'}`, 'UNKNOWN', err);
}
async function streamToBuffer(body) {
    if (body instanceof Buffer)
        return body;
    if (body instanceof Uint8Array)
        return Buffer.from(body);
    if (typeof body === 'string')
        return Buffer.from(body, 'utf-8');
    if (body && typeof body[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const chunk of body) {
            chunks.push(typeof chunk === 'string'
                ? Buffer.from(chunk, 'utf-8')
                : Buffer.isBuffer(chunk)
                    ? chunk
                    : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    // Browser/ReadableStream fallback (Node 18+ has Web Streams).
    if (body && typeof body.getReader === 'function') {
        const reader = body.getReader();
        const chunks = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks);
    }
    throw new Error('Unsupported S3 response body type');
}
export class S3StorageService {
    driver = 's3';
    client;
    presignClient;
    cfg;
    constructor(cfg) {
        this.cfg = cfg;
        const baseCfg = {
            region: cfg.region,
            credentials: {
                accessKeyId: cfg.accessKeyId,
                secretAccessKey: cfg.secretAccessKey,
            },
            forcePathStyle: cfg.forcePathStyle,
        };
        this.client = new S3Client({
            ...baseCfg,
            endpoint: cfg.endpoint,
        });
        // If a public endpoint differs from the internal one, presigning must
        // be signed against the public host so the URL is reachable by the browser.
        this.presignClient =
            cfg.publicEndpoint && cfg.publicEndpoint !== cfg.endpoint
                ? new S3Client({ ...baseCfg, endpoint: cfg.publicEndpoint })
                : this.client;
    }
    get bucket() {
        return this.cfg.bucket;
    }
    async upload(key, body, opts = {}) {
        const Body = body instanceof Readable
            ? body
            : Buffer.isBuffer(body)
                ? body
                : Buffer.from(body, 'utf-8');
        try {
            const res = await this.client.send(new PutObjectCommand({
                Bucket: this.cfg.bucket,
                Key: key,
                Body: Body,
                ContentType: opts.contentType,
                ContentLength: opts.contentLength,
                Metadata: opts.metadata,
            }));
            let size = 0;
            if (Buffer.isBuffer(Body))
                size = Body.length;
            else if (opts.contentLength)
                size = opts.contentLength;
            return {
                key,
                size,
                etag: res.ETag?.replace(/"/g, ''),
                contentType: opts.contentType,
            };
        }
        catch (err) {
            throw mapS3Error(key, err);
        }
    }
    async download(key) {
        try {
            const res = await this.client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
            return await streamToBuffer(res.Body);
        }
        catch (err) {
            throw mapS3Error(key, err);
        }
    }
    async downloadText(key, encoding = 'utf-8') {
        const buf = await this.download(key);
        return buf.toString(encoding);
    }
    async delete(key) {
        try {
            await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
        }
        catch (err) {
            // S3 DELETE is idempotent; only re-throw on real errors.
            const code = err?.$metadata?.httpStatusCode;
            if (code && code !== 404)
                throw mapS3Error(key, err);
        }
    }
    async exists(key) {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
            return true;
        }
        catch (err) {
            const code = err?.$metadata?.httpStatusCode;
            if (code === 404 || err?.name === 'NotFound')
                return false;
            throw mapS3Error(key, err);
        }
    }
    async stat(key) {
        try {
            const res = await this.client.send(new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
            return {
                key,
                size: res.ContentLength ?? 0,
                etag: res.ETag?.replace(/"/g, ''),
                contentType: res.ContentType,
            };
        }
        catch (err) {
            throw mapS3Error(key, err);
        }
    }
    async presignGet(key, opts = {}) {
        const cmd = new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key });
        return getSignedUrl(this.presignClient, cmd, {
            expiresIn: opts.expiresIn ?? this.cfg.presignExpiresSeconds,
        });
    }
    async presignPut(key, opts = {}) {
        const cmd = new PutObjectCommand({
            Bucket: this.cfg.bucket,
            Key: key,
            ContentType: opts.contentType,
        });
        return getSignedUrl(this.presignClient, cmd, {
            expiresIn: opts.expiresIn ?? this.cfg.presignExpiresSeconds,
        });
    }
}
//# sourceMappingURL=s3-storage.service.js.map