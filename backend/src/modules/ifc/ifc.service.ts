import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { leads } from '../../shared/database/schema/leads.js';
import { emailService } from '../../core/email/email.service.js';
import type { UploadIfcMetadataInput, UpdateIfcMetadataInput } from './ifc.schemas.js';
import { IfcProcessingService } from './ifc-processing.service.js';
import { assertIfcSchemaSupported } from './ifc-schema-support.js';
import { IfcValidationService } from './ifc-validation.service.js';
import { webhookService } from './webhook.service.js';
import { cacheService, CacheService } from './cache.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { frontendUrl } from '../../core/config/domains.js';
import { storage, buildIfcKey, StorageError } from '../../core/storage/index.js';
import { randomUUID } from 'crypto';

export class IfcService {
  private processingService: IfcProcessingService;
  private validationService: IfcValidationService;

  constructor() {
    this.processingService = new IfcProcessingService();
    this.validationService = new IfcValidationService();
  }

  /**
   * Initialize storage backend (creates UPLOAD_DIR on local driver, no-op on S3).
   */
  async initialize() {
    try {
      // S3/MinIO does not need pre-creation; the local driver exposes ensureRoot().
      const anyStorage = storage as any;
      if (typeof anyStorage.ensureRoot === 'function') {
        await anyStorage.ensureRoot();
      }
      console.log(`✅ IFC storage ready (driver: ${storage.driver})`);
    } catch (error) {
      console.error('❌ Failed to initialize IFC storage:', error);
      throw error;
    }
  }

  /**
   * Save IFC file to disk and create database record
   * Automatically extracts metadata from IFC file
   */
  async uploadIfc(
    fileBuffer: Buffer,
    metadata: UploadIfcMetadataInput,
    tenantId: string,
    userId: string
  ) {
    // Validate file size (from .env: MAX_FILE_SIZE)
    if (this.processingService.isFileTooLarge(fileBuffer.length)) {
      const maxSizeMB = process.env.MAX_FILE_SIZE_MB || '100';
      throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
    }

    // Validate IFC structure
    const validation = this.processingService.validateIfcStructure(fileBuffer);
    if (!validation.valid) {
      throw new Error(`Invalid IFC file: ${validation.errors.join(', ')}`);
    }

    // Rejeita esquemas fora do suporte do pipeline (IFC2X2 e anteriores) — 422
    assertIfcSchemaSupported(fileBuffer);

    // Extract metadata from IFC file
    const extractedMetadata = await this.processingService.extractMetadata(fileBuffer);
    
    // Get IFC version
    const ifcVersion = this.processingService.getIfcVersion(fileBuffer);

    // Generate unique key in canonical layout: tenants/{tenantId}/ifc/{ifcId}.ifc
    const fileId = randomUUID();
    const storageKey = buildIfcKey(tenantId, fileId);

    let ifcModel: any;

    try {
      // Upload via storage backend (local fs or S3/MinIO depending on STORAGE_DRIVER)
      await storage.upload(storageKey, fileBuffer, {
        contentType: 'application/x-step',
        metadata: {
          tenantId,
          projectId: metadata.projectId,
          uploadedBy: userId,
        },
      });

      // Merge extracted metadata with user-provided metadata
      const fullMetadata = this.processingService.mergeMetadata(
        extractedMetadata,
        metadata
      );

      // Create database record with enriched metadata
      [ifcModel] = await db
        .insert(ifcModels)
        .values({
          id: fileId,
          projectId: metadata.projectId,
          tenantId: tenantId,
          name: metadata.originalName, // Nome do modelo (usa o original)
          originalName: metadata.originalName, // Nome do arquivo original
          fileUrl: storageKey, // Storage key (driver-agnostic)
          fileSizeBytes: fileBuffer.length,
          ifcType: ifcVersion, // IFC2X3, IFC4, etc.
          discipline: metadata.discipline,
          phase: metadata.phase || null,
          thumbnailUrl: null, // Will be generated/uploaded later
          uploadedBy: userId,
          metadata: fullMetadata,
        } as any)
        .returning();

      cacheService.delete(CacheService.projectIfcListKey(metadata.projectId, tenantId));
      cacheService.delete(CacheService.projectStatsKey(metadata.projectId, tenantId));

      return ifcModel;
    } catch (error) {
      // Cleanup uploaded object if database insert fails
      try {
        await storage.delete(storageKey);
      } catch {}
      throw error;
    } finally {
      // Send webhook notification (async, don't block)
      if (ifcModel) {
        webhookService.notifyIfcUploaded(ifcModel, tenantId, userId).catch((err: Error) => 
          console.error('Webhook notification failed:', err)
        );

        // Send in-app notification
        NotificationService.notifyIfcUploadComplete(
          userId,
          tenantId,
          ifcModel.id,
          ifcModel.name
        ).catch((err: Error) =>
          console.error('Notification failed:', err)
        );
      }
    }
  }

  /**
   * Get IFC model by ID (with cache)
   */
  async getIfcById(id: string, tenantId: string): Promise<any> {
    // Check cache first
    const cacheKey = CacheService.ifcModelKey(id, tenantId);
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      return cached as any;
    }

    // Query database
    const [ifcModel] = await db
      .select()
      .from(ifcModels)
      .where(and(eq(ifcModels.id, id), eq(ifcModels.tenantId, tenantId)));

    if (!ifcModel) {
      throw new Error('IFC model not found');
    }

    // Store in cache (5 minutes TTL)
    cacheService.set(cacheKey, ifcModel, 300);

    return ifcModel;
  }

  /**
   * Get all IFC models for a project (with cache)
   */
  async getIfcsByProject(projectId: string, tenantId: string): Promise<any[]> {
    // Check cache first
    const cacheKey = CacheService.projectIfcListKey(projectId, tenantId);
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      return cached as any[];
    }

    // Query database
    const models = await db
      .select()
      .from(ifcModels)
      .where(
        and(
          eq(ifcModels.projectId, projectId),
          eq(ifcModels.tenantId, tenantId)
        )
      );

    // Store in cache (2 minutes TTL - shorter since list changes frequently)
    cacheService.set(cacheKey, models, 120);

    return models;
  }

  /**
   * Get IFC file buffer for download
   */
  async getIfcFile(id: string, tenantId: string): Promise<Buffer> {
    const ifcModel = await this.getIfcById(id, tenantId);

    try {
      return await storage.download(ifcModel.fileUrl);
    } catch (error) {
      if (error instanceof StorageError && error.code === 'NOT_FOUND') {
        throw new Error('IFC file not found in storage');
      }
      throw error;
    }
  }

  /**
   * Update IFC metadata (invalidates cache)
   */
  async updateIfcMetadata(
    id: string,
    updates: UpdateIfcMetadataInput,
    tenantId: string
  ) {
    // Verify model exists and belongs to tenant
    const existing = await this.getIfcById(id, tenantId);

    // Separate description from other fields
    const { description, ...directFields } = updates;

    // Build update object
    const updateData: any = {
      ...directFields,
      updatedAt: new Date(),
    };

    // If description is provided, update metadata
    if (description !== undefined) {
      updateData.metadata = {
        ...existing.metadata,
        description,
      };
    }

    const [updatedModel] = await db
      .update(ifcModels)
      .set(updateData)
      .where(and(eq(ifcModels.id, id), eq(ifcModels.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    cacheService.delete(CacheService.ifcModelKey(id, tenantId));
    cacheService.deletePattern(`ifc:project:${tenantId}:${existing.projectId}`);

    // Return model with description extracted from metadata
    return {
      ...updatedModel,
      description: (updatedModel.metadata as any)?.description,
    };
  }

  /**
   * Delete IFC model (file + database record + cache invalidation)
   */
  async deleteIfc(id: string, tenantId: string) {
    const ifcModel = await this.getIfcById(id, tenantId);

    // Delete file from storage backend
    try {
      await storage.delete(ifcModel.fileUrl);
    } catch (error) {
      console.warn(`Failed to delete IFC file: ${ifcModel.fileUrl}`, error);
    }

    // Delete database record
    await db
      .delete(ifcModels)
      .where(and(eq(ifcModels.id, id), eq(ifcModels.tenantId, tenantId)));

    // Invalidate cache
    cacheService.delete(CacheService.ifcModelKey(id, tenantId));
    cacheService.deletePattern(`ifc:project:${tenantId}:${ifcModel.projectId}`);
    cacheService.deletePattern(`ifc:stats:${tenantId}:${ifcModel.projectId}`);

    return { success: true, id };
  }

  /**
   * Update thumbnail URL
   */
  async updateThumbnail(id: string, thumbnailUrl: string, tenantId: string) {
    return this.updateIfcMetadata(id, { thumbnailUrl }, tenantId);
  }

  /**
   * Get storage statistics for a project
   */
  async getProjectStorageStats(projectId: string, tenantId: string) {
    const models = await this.getIfcsByProject(projectId, tenantId);

    const totalSize = models.reduce((sum: number, model: any) => sum + (model.fileSizeBytes || 0), 0);
    const totalCount = models.length;

    const byDiscipline = models.reduce((acc: any, model: any) => {
      const disc = model.discipline || 'other';
      if (!acc[disc]) {
        acc[disc] = { count: 0, size: 0 };
      }
      acc[disc].count++;
      acc[disc].size += (model.fileSizeBytes || 0);
      return acc;
    }, {} as { [key: string]: { count: number; size: number } });

    return {
      modelCount: totalCount,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      byDiscipline,
      models: models.map((m: any) => ({
        id: m.id,
        name: m.originalName,
        discipline: m.discipline,
        size: m.fileSizeBytes || 0,
        sizeMB: ((m.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2),
      })),
    };
  }

  /**
   * Batch delete IFC models
   */
  async batchDeleteIfcs(ids: string[], tenantId: string) {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const id of ids) {
      try {
        await this.deleteIfc(id, tenantId);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ 
          id, 
          success: false, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;

    const batchResult = {
      total: ids.length,
      success: successCount,
      failed: failCount,
      results,
    };

    // Send webhook notification
    webhookService.notifyBatchDeleteComplete(batchResult, tenantId).catch(err =>
      console.error('Webhook notification failed:', err)
    );

    return batchResult;
  }

  /**
   * Validate IFC model
   */
  async validateIfc(ifcModelId: string, tenantId: string) {
    const ifcModel = await this.getIfcById(ifcModelId, tenantId);
    
    const validation = await this.validationService.validateIfcForProject(
      ifcModelId,
      ifcModel.projectId,
      tenantId
    );

    // Send webhook notification
    webhookService.notifyValidationComplete(ifcModelId, validation, tenantId).catch(err =>
      console.error('Webhook notification failed:', err)
    );

    return validation;
  }

  /**
   * Get quality report
   */
  async getQualityReport(ifcModelId: string, tenantId: string) {
    return this.validationService.generateQualityReport(ifcModelId, tenantId);
  }

  /**
   * Export project metadata
   */
  async exportProjectMetadata(
    projectId: string,
    tenantId: string,
    format: 'json' | 'csv' = 'json'
  ) {
    const models = await this.getIfcsByProject(projectId, tenantId);

    if (format === 'json') {
      return JSON.stringify(models, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Name',
      'Original Name',
      'Discipline',
      'Phase',
      'File Size (MB)',
      'IFC Type',
      'Uploaded At',
    ];

    const rows = models.map((m: any) => [
      m.id,
      m.name || '',
      m.originalName || '',
      m.discipline || '',
      m.phase || '',
      m.fileSizeBytes ? (m.fileSizeBytes / (1024 * 1024)).toFixed(2) : '0',
      m.ifcType || '',
      m.uploadedAt || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Check public IFC file for lead capture
   */
  async checkPublicIfc(
    fileBuffer: Buffer,
    filename: string,
    email: string,
    name: string,
    company: string
  ) {
    // 1. Basic validation
    const structureResult = this.processingService.validateIfcStructure(fileBuffer);
    const extractedMetadata = await this.processingService.extractMetadata(fileBuffer);
    const ifcType = extractedMetadata.schema || 'IFC2X3';
    
    // 2. Score calculation (similar to validateService logic)
    const scores = {
      metadata: 0,
      documentation: 0,
      fileQuality: 0,
      overall: 0,
    };

    // Metadata checks
    let metadataChecks = 0;
    let metadataPassed = 0;
    metadataChecks++; if (extractedMetadata.schema) metadataPassed++;
    metadataChecks++; if (extractedMetadata.projectName) metadataPassed++;
    metadataChecks++; if (extractedMetadata.author) metadataPassed++;
    metadataChecks++; if (extractedMetadata.elementCount && extractedMetadata.elementCount > 0) metadataPassed++;
    scores.metadata = metadataChecks > 0 ? (metadataPassed / metadataChecks) * 100 : 0;

    // Documentation checks
    let docChecks = 0;
    let docPassed = 0;
    docChecks++; if (extractedMetadata.projectName && extractedMetadata.projectName.length > 5) docPassed++;
    docChecks++; if (extractedMetadata.author && extractedMetadata.author.length > 3) docPassed++;
    scores.documentation = docChecks > 0 ? (docPassed / docChecks) * 100 : 0;

    // File quality checks
    let qualityChecks = 0;
    let qualityPassed = 0;
    qualityChecks++; if (ifcType) qualityPassed++;
    qualityChecks++; if (fileBuffer.length < 50 * 1024 * 1024) qualityPassed++; // under 50MB
    scores.fileQuality = qualityChecks > 0 ? (qualityPassed / qualityChecks) * 100 : 0;

    // Overall score
    scores.overall = (scores.metadata + scores.documentation + scores.fileQuality) / 3;
    const grade = scores.overall >= 80 ? 'A' : scores.overall >= 60 ? 'B' : scores.overall >= 40 ? 'C' : 'D';

    // Generate recommendations
    const recommendations: string[] = [];
    if (scores.metadata < 60) recommendations.push('Adicione mais metadados ao projeto no seu software de modelagem (autor, descrição, nome do projeto).');
    if (!extractedMetadata.author) recommendations.push('Defina a propriedade de autor do arquivo para melhor rastreabilidade.');
    if (fileBuffer.length > 50 * 1024 * 1024) recommendations.push('Considere otimizar o tamanho do arquivo IFC exportando apenas entidades visíveis ou usando compressão.');
    if (structureResult.errors.length > 0) {
      recommendations.push(...structureResult.errors.map(e => `Erro estrutural: ${e}`));
    }

    const fileSizeStr = `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`;

    // 3. Save to database table `leads`
    const [leadRecord] = await db
      .insert(leads)
      .values({
        id: randomUUID(),
        name,
        email,
        company,
        ifcFileName: filename,
        ifcFileSize: fileSizeStr,
        grade,
        scoreOverall: scores.overall.toFixed(0),
      })
      .returning();

    // 4. Send HTML report email to lead
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Qualidade IFC — Arxis</title>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0a;color:#ffffff;margin:0;padding:32px 0">
  <div style="max-width:600px;margin:0 auto;background:#111111;border:1px solid #222222;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5)">
    <div style="background:linear-gradient(135deg,#007AFF,#C4B5F4);padding:40px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px">Arxis</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px">Relatório de Diagnóstico de Qualidade BIM</p>
    </div>
    
    <div style="padding:40px">
      <h2 style="margin:0 0 16px;color:#ffffff;font-size:20px;font-weight:600">Olá, ${name}!</h2>
      <p style="color:#aaaaaa;margin:0 0 32px;line-height:1.6;font-size:15px">
        Analisamos com sucesso o arquivo <strong>${filename}</strong>. Abaixo está a pontuação de integridade do seu modelo IFC para uso em simulação 4D/5D e Realidade Imersiva no navegador.
      </p>

      <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:32px;text-align:center;border:1px solid #333333">
        <div style="font-size:13px;color:#888888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Nota de Qualidade</div>
        <div style="font-size:72px;font-weight:800;color:#007AFF;margin:0;line-height:1">${grade}</div>
        <div style="font-size:15px;color:#aaaaaa;margin-top:8px">Pontuação Geral: <strong>${scores.overall.toFixed(0)}/100</strong></div>
      </div>

      <h3 style="color:#ffffff;font-size:16px;margin:0 0 12px;border-bottom:1px solid #222222;padding-bottom:8px">Métricas Detalhadas</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px;color:#aaaaaa;font-size:14px">
        <tr>
          <td style="padding:8px 0;font-weight:500;color:#ffffff">Tamanho do Arquivo</td>
          <td style="padding:8px 0;text-align:right">${fileSizeStr}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:500;color:#ffffff">Versão do Esquema IFC</td>
          <td style="padding:8px 0;text-align:right">${ifcType}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:500;color:#ffffff">Qualidade de Metadados</td>
          <td style="padding:8px 0;text-align:right">${scores.metadata.toFixed(0)}%</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:500;color:#ffffff">Qualidade de Arquivo</td>
          <td style="padding:8px 0;text-align:right">${scores.fileQuality.toFixed(0)}%</td>
        </tr>
      </table>

      ${recommendations.length > 0 ? `
        <h3 style="color:#ffffff;font-size:16px;margin:0 0 12px;border-bottom:1px solid #222222;padding-bottom:8px">Recomendações de Melhoria</h3>
        <ul style="color:#aaaaaa;padding-left:20px;margin:0 0 32px;line-height:1.6;font-size:14px">
          ${recommendations.map(r => `<li style="margin-bottom:8px">${r}</li>`).join('')}
        </ul>
      ` : ''}

      <div style="text-align:center;margin-top:40px">
        <p style="color:#aaaaaa;font-size:14px;margin-bottom:20px">Quer visualizar este modelo em 3D, simular o cronograma de obras 4D ou coordenar com sua equipe?</p>
        <a href="${frontendUrl('/register')}" style="display:inline-block;padding:14px 28px;background:#007AFF;color:#ffffff;text-decoration:none;border-radius:24px;font-weight:600;font-size:14px">
          Criar Conta Grátis na Plataforma
        </a>
      </div>
    </div>
    
    <div style="background:#0a0a0a;padding:24px;text-align:center;border-top:1px solid #222222;font-size:12px;color:#555555">
      © 2026 Arxis by AvilaOps. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
    `;

    // Dispara o email de forma assíncrona
    emailService.sendCustomEmail(
      email,
      `Relatório de Qualidade IFC do seu projeto — ${filename}`,
      emailHtml,
      ''
    ).catch(err => console.error('[public-ifc] email trigger failed:', err));

    return {
      name,
      filename,
      grade,
      score: scores.overall.toFixed(0),
    };
  }
}

