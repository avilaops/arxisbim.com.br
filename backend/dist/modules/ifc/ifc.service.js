import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { IfcProcessingService } from './ifc-processing.service.js';
import { IfcValidationService } from './ifc-validation.service.js';
import { webhookService } from './webhook.service.js';
import { cacheService, CacheService } from './cache.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { storage, buildIfcKey, StorageError } from '../../core/storage/index.js';
import { randomUUID } from 'crypto';
export class IfcService {
    processingService;
    validationService;
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
            const anyStorage = storage;
            if (typeof anyStorage.ensureRoot === 'function') {
                await anyStorage.ensureRoot();
            }
            console.log(`✅ IFC storage ready (driver: ${storage.driver})`);
        }
        catch (error) {
            console.error('❌ Failed to initialize IFC storage:', error);
            throw error;
        }
    }
    /**
     * Save IFC file to disk and create database record
     * Automatically extracts metadata from IFC file
     */
    async uploadIfc(fileBuffer, metadata, tenantId, userId) {
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
        // Extract metadata from IFC file
        const extractedMetadata = await this.processingService.extractMetadata(fileBuffer);
        // Get IFC version
        const ifcVersion = this.processingService.getIfcVersion(fileBuffer);
        // Generate unique key in canonical layout: tenants/{tenantId}/ifc/{ifcId}.ifc
        const fileId = randomUUID();
        const storageKey = buildIfcKey(tenantId, fileId);
        let ifcModel;
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
            const fullMetadata = this.processingService.mergeMetadata(extractedMetadata, metadata);
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
            })
                .returning();
            cacheService.delete(CacheService.projectIfcListKey(metadata.projectId, tenantId));
            cacheService.delete(CacheService.projectStatsKey(metadata.projectId, tenantId));
            return ifcModel;
        }
        catch (error) {
            // Cleanup uploaded object if database insert fails
            try {
                await storage.delete(storageKey);
            }
            catch { }
            throw error;
        }
        finally {
            // Send webhook notification (async, don't block)
            if (ifcModel) {
                webhookService.notifyIfcUploaded(ifcModel, tenantId, userId).catch((err) => console.error('Webhook notification failed:', err));
                // Send in-app notification
                NotificationService.notifyIfcUploadComplete(userId, tenantId, ifcModel.id, ifcModel.name).catch((err) => console.error('Notification failed:', err));
            }
        }
    }
    /**
     * Get IFC model by ID (with cache)
     */
    async getIfcById(id, tenantId) {
        // Check cache first
        const cacheKey = CacheService.ifcModelKey(id, tenantId);
        const cached = cacheService.get(cacheKey);
        if (cached) {
            return cached;
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
    async getIfcsByProject(projectId, tenantId) {
        // Check cache first
        const cacheKey = CacheService.projectIfcListKey(projectId, tenantId);
        const cached = cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Query database
        const models = await db
            .select()
            .from(ifcModels)
            .where(and(eq(ifcModels.projectId, projectId), eq(ifcModels.tenantId, tenantId)));
        // Store in cache (2 minutes TTL - shorter since list changes frequently)
        cacheService.set(cacheKey, models, 120);
        return models;
    }
    /**
     * Get IFC file buffer for download
     */
    async getIfcFile(id, tenantId) {
        const ifcModel = await this.getIfcById(id, tenantId);
        try {
            return await storage.download(ifcModel.fileUrl);
        }
        catch (error) {
            if (error instanceof StorageError && error.code === 'NOT_FOUND') {
                throw new Error('IFC file not found in storage');
            }
            throw error;
        }
    }
    /**
     * Update IFC metadata (invalidates cache)
     */
    async updateIfcMetadata(id, updates, tenantId) {
        // Verify model exists and belongs to tenant
        const existing = await this.getIfcById(id, tenantId);
        // Separate description from other fields
        const { description, ...directFields } = updates;
        // Build update object
        const updateData = {
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
            description: updatedModel.metadata?.description,
        };
    }
    /**
     * Delete IFC model (file + database record + cache invalidation)
     */
    async deleteIfc(id, tenantId) {
        const ifcModel = await this.getIfcById(id, tenantId);
        // Delete file from storage backend
        try {
            await storage.delete(ifcModel.fileUrl);
        }
        catch (error) {
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
    async updateThumbnail(id, thumbnailUrl, tenantId) {
        return this.updateIfcMetadata(id, { thumbnailUrl }, tenantId);
    }
    /**
     * Get storage statistics for a project
     */
    async getProjectStorageStats(projectId, tenantId) {
        const models = await this.getIfcsByProject(projectId, tenantId);
        const totalSize = models.reduce((sum, model) => sum + (model.fileSizeBytes || 0), 0);
        const totalCount = models.length;
        const byDiscipline = models.reduce((acc, model) => {
            const disc = model.discipline || 'other';
            if (!acc[disc]) {
                acc[disc] = { count: 0, size: 0 };
            }
            acc[disc].count++;
            acc[disc].size += (model.fileSizeBytes || 0);
            return acc;
        }, {});
        return {
            modelCount: totalCount,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            byDiscipline,
            models: models.map((m) => ({
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
    async batchDeleteIfcs(ids, tenantId) {
        const results = [];
        for (const id of ids) {
            try {
                await this.deleteIfc(id, tenantId);
                results.push({ id, success: true });
            }
            catch (error) {
                results.push({
                    id,
                    success: false,
                    error: error.message || 'Unknown error'
                });
            }
        }
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;
        const batchResult = {
            total: ids.length,
            success: successCount,
            failed: failCount,
            results,
        };
        // Send webhook notification
        webhookService.notifyBatchDeleteComplete(batchResult, tenantId).catch(err => console.error('Webhook notification failed:', err));
        return batchResult;
    }
    /**
     * Validate IFC model
     */
    async validateIfc(ifcModelId, tenantId) {
        const ifcModel = await this.getIfcById(ifcModelId, tenantId);
        const validation = await this.validationService.validateIfcForProject(ifcModelId, ifcModel.projectId, tenantId);
        // Send webhook notification
        webhookService.notifyValidationComplete(ifcModelId, validation, tenantId).catch(err => console.error('Webhook notification failed:', err));
        return validation;
    }
    /**
     * Get quality report
     */
    async getQualityReport(ifcModelId, tenantId) {
        return this.validationService.generateQualityReport(ifcModelId, tenantId);
    }
    /**
     * Export project metadata
     */
    async exportProjectMetadata(projectId, tenantId, format = 'json') {
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
        const rows = models.map((m) => [
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
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');
        return csv;
    }
}
//# sourceMappingURL=ifc.service.js.map