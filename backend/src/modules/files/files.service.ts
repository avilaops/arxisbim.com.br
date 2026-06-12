import { eq, and } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db, withTenant } from '../../shared/database/db.js';
import { files } from '../../shared/database/schema/files.js';
import { projects } from '../../shared/database/schema/projects.js';
import { storage } from '../../core/storage/index.js';
import { incrementStorageBytes } from '../../core/billing/usage-tracker.js';

// ── MIME / extension allowlist ────────────────────────────────────────────────

const ALLOWED: Record<string, string> = {
  // IFC
  '.ifc':    'application/ifc',
  '.ifcxml': 'application/xml',
  '.ifczip': 'application/zip',
  // MS Project
  '.mpp':    'application/vnd.ms-project',
  // Spreadsheet (SINAPI, orçamentos)
  '.xlsx':   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls':    'application/vnd.ms-excel',
  '.csv':    'text/csv',
  // Documents
  '.pdf':    'application/pdf',
  // Images / exports
  '.png':    'image/png',
  '.jpg':    'image/jpeg',
  '.jpeg':   'image/jpeg',
  '.webp':   'image/webp',
  // Generic binary (DWG, RVT, etc.)
  '.dwg':    'application/acad',
  '.rvt':    'application/octet-stream',
  '.nwd':    'application/octet-stream',
};

export function validateFileType(filename: string, mimeType?: string): string {
  const ext = ('.' + filename.split('.').pop()).toLowerCase();
  const canonicalMime = ALLOWED[ext];
  if (!canonicalMime) {
    throw Object.assign(
      new Error(`Tipo de arquivo não suportado: ${ext}. Tipos permitidos: ${Object.keys(ALLOWED).join(', ')}`),
      { code: 'INVALID_FILE_TYPE', statusCode: 400 },
    );
  }
  // If browser sent a MIME, accept the canonical one (browser MIME for .ifc may vary)
  return mimeType ?? canonicalMime;
}

// ── Key builder ───────────────────────────────────────────────────────────────

export function buildFileKey(tenantId: string, projectId: string | undefined | null, fileId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  const mid = projectId ? `${projectId}/` : '';
  return `${tenantId}/${mid}${fileId}/${safe}`;
}

// ── Multipart threshold ───────────────────────────────────────────────────────

const MULTIPART_THRESHOLD_BYTES =
  (parseInt(process.env.MULTIPART_THRESHOLD_MB ?? '100', 10) || 100) * 1024 * 1024;

// ── Service ───────────────────────────────────────────────────────────────────

interface RequestUploadUrlParams {
  tenantId: string;
  projectId?: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
}

interface UploadUrlResult {
  fileId: string;
  url: string;
  storageKey: string;
  expiresIn: number;
  multipart: boolean;
  driver: string;
}

export async function requestUploadUrl(params: RequestUploadUrlParams): Promise<UploadUrlResult> {
  const { tenantId, projectId, filename, sizeBytes } = params;

  // 1. Validate project ownership (only if projectId provided)
  if (projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!project) throw Object.assign(new Error('Projeto não encontrado'), { statusCode: 404 });
  }

  // 2. Validate MIME / extension
  const resolvedMime = validateFileType(filename, params.mimeType);

  // 3+4. Create pending record and set the real key — inside a tenant-scoped
  // transaction so RLS (app.tenant_id) is the primary defense, not just the
  // WHERE clauses above.
  const { fileId, storageKey } = await withTenant(tenantId, async (tx) => {
    const [record] = await tx
      .insert(files)
      .values({
        tenantId,
        projectId,
        storageKey: 'pending', // placeholder; updated below
        originalName: filename,
        mimeType: resolvedMime,
        sizeBytes: sizeBytes ?? null,
        status: 'pending',
      })
      .returning({ id: files.id });

    const key = buildFileKey(tenantId, projectId, record.id, filename);
    await tx.update(files).set({ storageKey: key }).where(eq(files.id, record.id));
    return { fileId: record.id, storageKey: key };
  });

  // 5. Determine upload strategy
  const useMultipart = !!sizeBytes && sizeBytes > MULTIPART_THRESHOLD_BYTES;
  const UPLOAD_EXPIRY = 15 * 60; // 15 minutes

  let url: string;
  try {
    url = await storage.presignPut(storageKey, {
      contentType: resolvedMime,
      expiresIn: UPLOAD_EXPIRY,
    });
  } catch {
    // Local driver: return a direct-upload endpoint URL instead
    url = `/api/v1/files/${fileId}/direct-upload`;
  }

  return {
    fileId,
    url,
    storageKey,
    expiresIn: UPLOAD_EXPIRY,
    multipart: useMultipart,
    driver: storage.driver,
  };
}

// ── Confirm upload ────────────────────────────────────────────────────────────

interface ConfirmUploadParams {
  tenantId: string;
  fileId: string;
  sha256?: string;       // client-computed; stored as-is
  sizeBytes?: number;    // actual size reported by client after upload
}

export async function confirmUpload(params: ConfirmUploadParams) {
  const { tenantId, fileId, sha256, sizeBytes } = params;

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
    .limit(1);

  if (!file) throw Object.assign(new Error('Arquivo não encontrado'), { statusCode: 404 });
  if (file.status === 'uploaded') return file; // idempotent

  // For local driver: download and compute SHA-256 server-side
  let resolvedSha256 = sha256 ?? null;
  let resolvedSize = sizeBytes ?? file.sizeBytes ?? null;

  if (!resolvedSha256 && storage.driver === 'local') {
    try {
      const buf = await storage.download(file.storageKey);
      resolvedSha256 = createHash('sha256').update(buf).digest('hex');
      resolvedSize = resolvedSize ?? buf.length;
    } catch {
      // File may not exist on local driver if uploaded via presign path
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(files)
    .set({
      status: 'uploaded',
      uploadedAt: now,
      sha256: resolvedSha256,
      sizeBytes: resolvedSize,
    })
    .where(eq(files.id, fileId))
    .returning();

  // Track storage usage
  if (updated.sizeBytes) {
    await incrementStorageBytes(tenantId, updated.sizeBytes);
  }

  return updated;
}

// ── Get file (tenant-scoped) ──────────────────────────────────────────────────

export async function getFile(tenantId: string, fileId: string) {
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
    .limit(1);
  if (!file) throw Object.assign(new Error('Arquivo não encontrado'), { statusCode: 404 });
  return file;
}

// ── Download URL (1h expiry) ──────────────────────────────────────────────────

const DOWNLOAD_EXPIRY = 60 * 60; // 1 hour

export async function getDownloadUrl(tenantId: string, fileId: string): Promise<string> {
  const file = await getFile(tenantId, fileId);
  if (file.status !== 'uploaded') {
    throw Object.assign(new Error('Upload ainda não confirmado'), { statusCode: 409 });
  }
  return storage.presignGet(file.storageKey, { expiresIn: DOWNLOAD_EXPIRY });
}
