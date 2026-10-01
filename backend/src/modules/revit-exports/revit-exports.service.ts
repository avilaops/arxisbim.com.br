/**
 * Revit Plugin Exports — S-Plugin
 *
 * Endpoint orquestrador para o plugin Revit: recebe o IFC em uma única
 * chamada multipart e reutiliza os pipelines existentes (files S02,
 * models S03). Não há tabela nova: o "export" É uma model_version —
 * exportId = modelVersions.id, e o status vem do ciclo de vida padrão
 * (uploading → processing → ready/failed).
 */
import { eq, and, isNull } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db, withTenant } from '../../shared/database/db.js';
import { projects, models, modelVersions } from '../../shared/database/schema/projects.js';
import { files } from '../../shared/database/schema/files.js';
import { storage } from '../../core/storage/index.js';
import { incrementStorageBytes } from '../../core/billing/usage-tracker.js';
import { validateFileType, buildFileKey } from '../files/files.service.js';
import { assertIfcSchemaSupported } from '../ifc/ifc-schema-support.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ModelsService } from '../models/models.service.js';
import { FRONTEND_URL } from '../../core/config/domains.js';

export interface CreateExportInput {
  tenantId: string;
  projectName: string;
  description?: string;
  filename: string;
  buffer: Buffer;
  metadata?: {
    lod?: string;
    includeStructure?: boolean;
    includeArchitecture?: boolean;
    includeMEP?: boolean;
    source?: string; // ex: "revit-plugin/1.0"
  };
}

export interface ExportStatusResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  projectId: string;
  modelId: string;
  version: number;
  projectUrl: string;
  shareLink: string | null;
  errorMessage: string | null;
}

function mapStatus(versionStatus: string): ExportStatusResult['status'] {
  switch (versionStatus) {
    case 'ready': return 'completed';
    case 'failed': return 'failed';
    case 'uploading': return 'pending';
    default: return 'processing';
  }
}

export class RevitExportsService {
  private projectsService = new ProjectsService();
  private modelsService = new ModelsService();

  /** Projeto por nome (case-insensitive) no tenant; cria se não existir. */
  private async findOrCreateProject(tenantId: string, name: string, description?: string) {
    const trimmed = name.trim();
    const existing = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), isNull(projects.deletedAt)));

    const match = existing.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (match) return { id: match.id, created: false };

    const project = await this.projectsService.create(tenantId, {
      name: trimmed,
      description: description || 'Criado pelo plugin Revit',
    } as any);
    return { id: project.id, created: true };
  }

  /** Grava o buffer no storage com registro na tabela files (status uploaded). */
  private async storeIfc(tenantId: string, projectId: string, filename: string, buffer: Buffer) {
    const mimeType = validateFileType(filename); // rejeita não-.ifc/.ifczip com 400

    const { fileId, storageKey } = await withTenant(tenantId, async (tx) => {
      const [record] = await tx
        .insert(files)
        .values({
          tenantId,
          projectId,
          storageKey: 'pending',
          originalName: filename,
          mimeType,
          sizeBytes: buffer.length,
          status: 'pending',
        })
        .returning({ id: files.id });

      const key = buildFileKey(tenantId, projectId, record.id, filename);
      await tx.update(files).set({ storageKey: key }).where(eq(files.id, record.id));
      return { fileId: record.id, storageKey: key };
    });

    await storage.upload(storageKey, buffer, { contentType: mimeType });

    const sha256 = createHash('sha256').update(buffer).digest('hex');
    await db
      .update(files)
      .set({ status: 'uploaded', uploadedAt: new Date(), sha256, sizeBytes: buffer.length })
      .where(eq(files.id, fileId));

    await incrementStorageBytes(tenantId, buffer.length);
    return { fileId, storageKey, sha256 };
  }

  /**
   * Fluxo completo do plugin: projeto (find-or-create) → arquivo →
   * model (novo ou nova versão do existente) → status processing.
   */
  async createExport(input: CreateExportInput): Promise<ExportStatusResult> {
    const { tenantId, projectName, description, filename, buffer } = input;

    // Guard de esquema antes de criar projeto/arquivo: o plugin exporta IFC4,
    // mas um arquivo adulterado/errado falharia só no pipeline (status failed
    // sem causa clara). Lança 422 com mensagem acionável. Só para .ifc (STEP):
    // .ifczip é container ZIP e extensão inválida continua no 400 do file type.
    if (filename.toLowerCase().endsWith('.ifc')) {
      assertIfcSchemaSupported(buffer);
    }

    const project = await this.findOrCreateProject(tenantId, projectName, description);
    const { fileId, storageKey, sha256 } = await this.storeIfc(tenantId, project.id, filename, buffer);

    // Model com o mesmo nome no projeto? Re-export do plugin → nova versão.
    const [existingModel] = await db
      .select({ id: models.id })
      .from(models)
      .where(and(
        eq(models.projectId, project.id),
        eq(models.name, projectName.trim()),
        isNull(models.deletedAt),
      ))
      .limit(1);

    let modelId: string;
    let versionId: string;
    let versionNumber: number;

    if (existingModel) {
      const version = await this.modelsService.createVersion(existingModel.id, tenantId, { fileId });
      modelId = existingModel.id;
      versionId = version.id;
      versionNumber = version.version;
    } else {
      const created = await this.modelsService.create(project.id, tenantId, {
        name: projectName.trim(),
        storageKey,
      });
      modelId = created.id;
      versionId = created.version.id;
      versionNumber = created.version.version;
    }

    // Upload já concluído → entra na fila de processamento IFC
    await this.modelsService.updateVersionStatus(versionId, tenantId, {
      status: 'processing',
      sha256,
      fileSize: buffer.length,
      metadata: input.metadata as any,
    });

    return {
      exportId: versionId,
      status: 'processing',
      projectId: project.id,
      modelId,
      version: versionNumber,
      projectUrl: `${FRONTEND_URL}/app`,
      shareLink: null,
      errorMessage: null,
    };
  }

  /** Status do export (= status da model_version), tenant-scoped. */
  async getExportStatus(exportId: string, tenantId: string): Promise<ExportStatusResult> {
    const [row] = await db
      .select({
        versionId: modelVersions.id,
        version: modelVersions.version,
        status: modelVersions.status,
        modelId: models.id,
        projectId: projects.id,
      })
      .from(modelVersions)
      .innerJoin(models, eq(modelVersions.modelId, models.id))
      .innerJoin(projects, eq(models.projectId, projects.id))
      .where(and(eq(modelVersions.id, exportId), eq(projects.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      throw Object.assign(new Error('Export not found'), { statusCode: 404 });
    }

    return {
      exportId: row.versionId,
      status: mapStatus(row.status),
      projectId: row.projectId,
      modelId: row.modelId,
      version: row.version,
      projectUrl: `${FRONTEND_URL}/app`,
      shareLink: null,
      errorMessage: row.status === 'failed' ? 'Falha no processamento do IFC' : null,
    };
  }
}
