/**
 * Cloudflare R2 implementation of StorageService.
 *
 * R2 is S3-compatible, so this reuses S3StorageService entirely and only
 * derives the right client configuration from R2-specific env vars. Picking
 * R2 over the generic "s3" driver keeps the env surface explicit (account id
 * instead of a hand-built endpoint) and documents intent in config.
 *
 * Why R2: Render's free tier has NO persistent disk. The local driver falls
 * back to os.tmpdir(), which is wiped on every restart/deploy — uploaded IFC
 * models vanish, breaking the project model list and the in-meeting model
 * download (ModelSyncService). R2 gives durable storage with a generous free
 * tier and zero egress fees.
 *
 * Configuration (env):
 *   R2_ACCOUNT_ID         required — Cloudflare account id (the bit before
 *                         ".r2.cloudflarestorage.com")
 *   R2_ACCESS_KEY_ID      required — R2 API token access key id
 *   R2_SECRET_ACCESS_KEY  required — R2 API token secret
 *   R2_BUCKET             required — bucket name
 *   R2_ENDPOINT           optional — override the derived endpoint
 *                         (default: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com)
 *   R2_PRESIGN_EXPIRES    optional — presigned URL TTL in seconds (default 900)
 */

import { S3StorageService, type S3StorageConfig } from './s3-storage.service.js';

export function loadR2ConfigFromEnv(): S3StorageConfig {
  const required = (name: string): string => {
    const v = process.env[name];
    if (!v) {
      throw new Error(
        `Storage driver "r2" selected but ${name} is missing. ` +
          `Set ${name} in your .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ` +
          `R2_SECRET_ACCESS_KEY, R2_BUCKET) or switch STORAGE_DRIVER=local.`
      );
    }
    return v;
  };

  const accountId = required('R2_ACCOUNT_ID');
  const endpoint =
    process.env.R2_ENDPOINT ??
    `https://${accountId}.r2.cloudflarestorage.com`;
  const expires = Number.parseInt(process.env.R2_PRESIGN_EXPIRES ?? '900', 10);

  return {
    endpoint,
    // R2 signs against the same endpoint the browser reaches; no split host.
    publicEndpoint: undefined,
    // R2 ignores region but the SDK requires one; "auto" is R2's convention.
    region: process.env.R2_REGION ?? 'auto',
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    bucket: required('R2_BUCKET'),
    // R2 supports path-style and it avoids per-bucket DNS — keep it on.
    forcePathStyle: true,
    presignExpiresSeconds: Number.isFinite(expires) && expires > 0 ? expires : 900,
  };
}

/**
 * Thin alias so consumers/logging can distinguish R2 from generic S3 at the
 * call site. Behaviourally identical to S3StorageService.
 */
export class R2StorageService extends S3StorageService {}
