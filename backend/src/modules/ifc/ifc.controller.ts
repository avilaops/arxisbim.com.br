import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { IfcElementsService } from './ifc-elements.service.js';
import { IfcMaterialsService } from './ifc-materials.service.js';
import { IfcQuantitiesService } from './ifc-quantities.service.js';
import { IfcMepService } from './ifc-mep.service.js';
import { IfcPropertiesService } from './ifc-properties.service.js';
import { IfcClassificationsService } from './ifc-classifications.service.js';
import { IfcTypesService } from './ifc-types.service.js';
import { IfcGeometryService } from './ifc-geometry.service.js';
import { IfcRelationshipsService } from './ifc-relationships.service.js';
import { IfcSpacesService } from './ifc-spaces.service.js';
import { IfcStructuralService } from './ifc-structural.service.js';
import { IfcOpeningsService } from './ifc-openings.service.js';
import { IfcSchedulesService } from './ifc-schedules.service.js';
import { IfcCostsService } from './ifc-costs.service.js';
import { IfcEnergyService } from './ifc-energy.service.js';
import { IfcCoordinationService } from './ifc-coordination.service.js';
import { IfcSiteService } from './ifc-site.service.js';
import { IfcEquipmentService } from './ifc-equipment.service.js';
import { IfcTransportService } from './ifc-transport.service.js';
import { IfcPerformanceService } from './ifc-performance.service.js';
import { NotificationService } from '../notifications/notifications.service.js';
import { storage, buildIfcThumbnailKey } from '../../core/storage/index.js';
import {
  uploadIfcMetadataSchema,
  updateIfcMetadataSchema,
} from './ifc.schemas.js';
import { ZodError } from 'zod';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: string;
    tenantId: string;
    role?: string;
  };
};

export class IfcController {
  private elementsService: IfcElementsService;
  private materialsService: IfcMaterialsService;
  private quantitiesService: IfcQuantitiesService;
  private mepService: IfcMepService;
  private propertiesService: IfcPropertiesService;
  private classificationsService: IfcClassificationsService;
  private typesService: IfcTypesService;
  private geometryService: IfcGeometryService;
  private relationshipsService: IfcRelationshipsService;
  private spacesService: IfcSpacesService;
  private structuralService: IfcStructuralService;
  private openingsService: IfcOpeningsService;
  private schedulesService: IfcSchedulesService;
  private costsService: IfcCostsService;
  private energyService: IfcEnergyService;
  private coordinationService: IfcCoordinationService;
  private siteService: IfcSiteService;
  private equipmentService: IfcEquipmentService;
  private transportService: IfcTransportService;
  private performanceService: IfcPerformanceService;

  constructor(private ifcService: IfcService) {
    this.elementsService = new IfcElementsService();
    this.materialsService = new IfcMaterialsService();
    this.quantitiesService = new IfcQuantitiesService();
    this.mepService = new IfcMepService();
    this.propertiesService = new IfcPropertiesService();
    this.classificationsService = new IfcClassificationsService();
    this.typesService = new IfcTypesService();
    this.geometryService = new IfcGeometryService();
    this.relationshipsService = new IfcRelationshipsService();
    this.spacesService = new IfcSpacesService();
    this.structuralService = new IfcStructuralService();
    this.openingsService = new IfcOpeningsService();
    this.schedulesService = new IfcSchedulesService();
    this.costsService = new IfcCostsService();
    this.energyService = new IfcEnergyService();
    this.coordinationService = new IfcCoordinationService();
    this.siteService = new IfcSiteService();
    this.equipmentService = new IfcEquipmentService();
    this.transportService = new IfcTransportService();
    this.performanceService = new IfcPerformanceService();
  }

  /**
   * Upload IFC file with metadata
   * POST /api/v1/ifc/upload
   */
  async upload(request: FastifyRequest, reply: FastifyReply) {
    let fileName = 'unknown';

    try {
      const user = (request as any).user;
      
      // Parse multipart data
      const data = await (request as any).file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      fileName = data.filename || fileName;

      // Get file buffer
      const fileBuffer = await data.toBuffer();

      // Parse metadata from fields
      const metadata = uploadIfcMetadataSchema.parse({
        projectId: (data.fields as any).projectId?.value,
        originalName: data.filename,
        discipline: (data.fields as any).discipline?.value,
        phase: (data.fields as any).phase?.value,
        description: (data.fields as any).description?.value,
      });

      // Upload IFC
      const ifcModel = await this.ifcService.uploadIfc(
        fileBuffer,
        metadata,
        user.tenantId,
        user.userId
      );

      return reply.code(201).send(ifcModel);
    } catch (error: any) {
      const user = (request as any).user;
      
      // Send error notification
      if (user?.userId && user?.tenantId) {
        NotificationService.notifyIfcProcessingFailed(
          user.userId,
          user.tenantId,
          fileName,
          error.message || 'Unknown error'
        ).catch((err: Error) =>
          console.error('Failed to send error notification:', err)
        );
      }

      if (error instanceof ZodError) {
        return reply.code(400).send({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      throw error;
    }
  }

  /**
   * Get IFC models by project
   * GET /api/v1/ifc/project/:projectId
   */
  async getByProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(
      projectId,
      user.tenantId
    );

    return reply.send(models);
  }

  /**
   * Get single IFC model
   * GET /api/v1/ifc/:id
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const model = await this.ifcService.getIfcById(id, user.tenantId);

      return reply.send(model);
    } catch (error: any) {
      if (error.message === 'IFC model not found') {
        return reply.code(404).send({ error: 'Not found', message: error.message });
      }
      throw error;
    }
  }

  /**
   * Download IFC file
   * GET /api/v1/ifc/:id/download
   */
  async download(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const model = await this.ifcService.getIfcById(id, user.tenantId);
    const fileBuffer = await this.ifcService.getIfcFile(id, user.tenantId);

    return reply
      .header('Content-Type', 'application/octet-stream')
      .header(
        'Content-Disposition',
        `attachment; filename="${model.originalName}"`
      )
      .send(fileBuffer);
  }

  /**
   * Update IFC metadata
   * PATCH /api/v1/ifc/:id
   */
  async updateMetadata(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const updates = updateIfcMetadataSchema.parse(request.body);

    const updatedModel = await this.ifcService.updateIfcMetadata(
      id,
      updates,
      user.tenantId
    );

    return reply.send(updatedModel);
  }

  /**
   * Delete IFC model
   * DELETE /api/v1/ifc/:id
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const result = await this.ifcService.deleteIfc(id, user.tenantId);

    return reply.send(result);
  }

  /**
   * Upload thumbnail for IFC model.
   *
   * Accepts either:
   *   - multipart/form-data with a file field (real image upload to
   *     local / MinIO / S3 via the storage abstraction). The stored
   *     value is the canonical storage key; consumers resolve it to a
   *     URL via the presigned-URL endpoint or a public bucket policy.
   *   - application/json with { thumbnailUrl: string } for backwards
   *     compatibility (e.g. clients that already have a CDN URL).
   *
   * POST /api/v1/ifc/:id/thumbnail
   */
  async uploadThumbnail(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const contentType = String(request.headers['content-type'] ?? '');

    let thumbnailUrl: string;

    if (contentType.startsWith('multipart/')) {
      // Validate IFC model exists & belongs to tenant first.
      await this.ifcService.getIfcById(id, user.tenantId);

      const data = await (request as any).file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const ext = ((data.filename?.split('.').pop() ?? 'png') as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') as 'png' | 'jpg' | 'jpeg' | 'webp';
      const safeExt = (['png', 'jpg', 'jpeg', 'webp'] as const).includes(ext as any)
        ? (ext as 'png' | 'jpg' | 'jpeg' | 'webp')
        : 'png';

      const key = buildIfcThumbnailKey(user.tenantId, id, safeExt);
      const buf = await data.toBuffer();
      await storage.upload(key, buf, {
        contentType: data.mimetype ?? `image/${safeExt}`,
        metadata: {
          tenantId: user.tenantId,
          ifcId: id,
          uploadedBy: user.userId,
        },
      });

      // Store the canonical storage key; clients resolve to a fetchable
      // URL via the storage presign endpoint (or a public bucket policy).
      thumbnailUrl = key;
    } else {
      // Backwards-compat path: JSON body with an externally hosted URL.
      thumbnailUrl = (request.body as { thumbnailUrl: string })?.thumbnailUrl;
      if (!thumbnailUrl) {
        return reply.code(400).send({ error: 'thumbnailUrl is required' });
      }
    }

    const updatedModel = await this.ifcService.updateThumbnail(
      id,
      thumbnailUrl,
      user.tenantId
    );

    return reply.send(updatedModel);
  }

  /**
   * Get storage statistics for project
   * GET /api/v1/ifc/project/:projectId/stats
   */
  async getProjectStats(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).user;

    const stats = await this.ifcService.getProjectStorageStats(
      projectId,
      user.tenantId
    );

    return reply.send(stats);
  }

  /**
   * Get IFC models by discipline
   * GET /api/v1/ifc/project/:projectId/discipline/:discipline
   */
  async getByDiscipline(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, discipline } = request.params as { 
      projectId: string; 
      discipline: string;
    };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const filtered = models.filter((m) => m.discipline === discipline);

    return reply.send(filtered);
  }

  /**
   * Get IFC models by phase
   * GET /api/v1/ifc/project/:projectId/phase/:phase
   */
  async getByPhase(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, phase } = request.params as { 
      projectId: string; 
      phase: string;
    };
    const user = (request as any).user;

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const filtered = models.filter((m) => m.phase === phase);

    return reply.send(filtered);
  }

  /**
   * Search IFC models by name
   * GET /api/v1/ifc/project/:projectId/search?q=query
   */
  async search(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const { q } = request.query as { q?: string };
    const user = (request as any).user;

    if (!q || q.trim().length === 0) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const models = await this.ifcService.getIfcsByProject(projectId, user.tenantId);
    const query = q.toLowerCase();
    const filtered = models.filter((m) => 
      m.name?.toLowerCase().includes(query) || 
      m.originalName?.toLowerCase().includes(query) ||
      m.metadata?.description?.toLowerCase().includes(query)
    );

    return reply.send(filtered);
  }

  /**
   * Batch delete IFC models
   * POST /api/v1/ifc/batch-delete
   */
  async batchDelete(request: FastifyRequest, reply: FastifyReply) {
    const { ids } = request.body as { ids: string[] };
    const user = (request as any).user;

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'ids array is required and must not be empty' });
    }

    const results = await this.ifcService.batchDeleteIfcs(ids, user.tenantId);

    return reply.send(results);
  }

  /**
   * Validate IFC model
   * POST /api/v1/ifc/:id/validate
   */
  async validate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const validation = await this.ifcService.validateIfc(id, user.tenantId);

      return reply.send(validation);
    } catch (error: any) {
      console.error('Error validating IFC:', error);
      return reply.code(500).send({
        error: 'Failed to validate IFC',
        message: error.message,
      });
    }
  }

  /**
   * Get quality report for IFC
   * GET /api/v1/ifc/:id/quality-report
   */
  async getQualityReport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const report = await this.ifcService.getQualityReport(id, user.tenantId);

      return reply.send(report);
    } catch (error: any) {
      if (error.message === 'IFC model not found') {
        return reply.code(404).send({ error: 'Not found' });
      }

      console.error('Error generating quality report:', error);
      return reply.code(500).send({
        error: 'Failed to generate quality report',
        message: error.message,
      });
    }
  }

  /**
   * Export IFC metadata
   * GET /api/v1/ifc/project/:projectId/export
   */
  async exportMetadata(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { projectId } = request.params as { projectId: string };
      const { format } = request.query as { format?: 'json' | 'csv' };
      const user = (request as any).user;

      const data = await this.ifcService.exportProjectMetadata(
        projectId,
        user.tenantId,
        format || 'json'
      );

      if (format === 'csv') {
        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="ifc-export-${projectId}.csv"`)
          .send(data);
      }

      return reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="ifc-export-${projectId}.json"`)
        .send(data);
    } catch (error: any) {
      console.error('Error exporting metadata:', error);
      return reply.code(500).send({
        error: 'Failed to export metadata',
        message: error.message,
      });
    }
  }

  /**
   * Queue processing job
   * POST /api/v1/ifc/:id/queue/:jobType
   */
  async queueJob(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { id, jobType } = request.params as { id: string; jobType: string };
      const { priority } = request.body as { priority?: 'low' | 'medium' | 'high' };

      const { ifcProcessingQueue } = await import('./ifc-queue.service.js');

      // Get IFC model to verify it exists
      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);

      // Add job to queue
      const job = await ifcProcessingQueue.addJob(
        jobType as any,
        id,
        ifcModel.projectId,
        user.tenantId,
        priority || 'medium'
      );

      return reply.code(202).send({
        message: 'Job queued successfully',
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          priority: job.priority,
        },
      });
    } catch (error: any) {
      console.error('Error queueing job:', error);
      return reply.code(500).send({
        error: 'Failed to queue job',
        message: error.message,
      });
    }
  }

  /**
   * Get job status
   * GET /api/v1/ifc/jobs/:jobId
   */
  async getJobStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { jobId } = request.params as { jobId: string };

      const { ifcProcessingQueue } = await import('./ifc-queue.service.js');
      const job = ifcProcessingQueue.getJob(jobId);

      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }

      return reply.send(job);
    } catch (error: any) {
      console.error('Error fetching job status:', error);
      return reply.code(500).send({
        error: 'Failed to fetch job status',
        message: error.message,
      });
    }
  }

  /**
   * Get queue statistics
   * GET /api/v1/ifc/queue/stats
   */
  async getQueueStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ifcProcessingQueue } = await import('./ifc-queue.service.js');
      const stats = ifcProcessingQueue.getStats();

      return reply.send(stats);
    } catch (error: any) {
      console.error('Error fetching queue stats:', error);
      return reply.code(500).send({
        error: 'Failed to fetch queue stats',
        message: error.message,
      });
    }
  }

  /**
   * Get IFC elements analysis
   * GET /api/v1/ifc/:id/elements
   */
  async getElements(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const result = await this.elementsService.getElements(id, user.tenantId);

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Get elements error:', error);
      return reply.code(500).send({ error: 'Failed to get elements' });
    }
  }

  /**
   * Get elements by type
   * GET /api/v1/ifc/:id/elements/:type
   */
  async getElementsByType(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id, type } = request.params as { id: string; type: string };

      const result = await this.elementsService.getElementsByType(id, user.tenantId, type);

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Get elements by type error:', error);
      return reply.code(500).send({ error: 'Failed to get elements by type' });
    }
  }

  /**
   * Get building hierarchy
   * GET /api/v1/ifc/:id/hierarchy
   */
  async getHierarchy(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const result = await this.elementsService.getHierarchy(id, user.tenantId);

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Get hierarchy error:', error);
      return reply.code(500).send({ error: 'Failed to get hierarchy' });
    }
  }

  /**
   * Analyze IFC complexity
   * GET /api/v1/ifc/:id/complexity
   */
  async analyzeComplexity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const result = await this.elementsService.analyzeComplexity(id, user.tenantId);

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Analyze complexity error:', error);
      return reply.code(500).send({ error: 'Failed to analyze complexity' });
    }
  }

  /**
   * Get statistics by category
   * GET /api/v1/ifc/:id/categories
   */
  async getStatsByCategory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const result = await this.elementsService.getStatsByCategory(id, user.tenantId);

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Get stats by category error:', error);
      return reply.code(500).send({ error: 'Failed to get category stats' });
    }
  }

  /**
   * Get materials from IFC
   * GET /api/v1/ifc/:id/materials
   */
  async getMaterials(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Extract materials
      const materials = this.materialsService.extractMaterials(content);
      const stats = this.materialsService.getMaterialStats(materials);

      return reply.send({
        ifcModelId: id,
        materials,
        stats,
      });
    } catch (error: any) {
      console.error('Get materials error:', error);
      return reply.code(500).send({ error: 'Failed to get materials' });
    }
  }

  /**
   * Get quantities from IFC
   * GET /api/v1/ifc/:id/quantities
   */
  async getQuantities(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Extract quantities
      const quantities = this.quantitiesService.extractCommonQuantities(content);
      const report = this.quantitiesService.generateTakeoffReport([], quantities);

      return reply.send({
        ifcModelId: id,
        quantities,
        report,
      });
    } catch (error: any) {
      console.error('Get quantities error:', error);
      return reply.code(500).send({ error: 'Failed to get quantities' });
    }
  }

  /**
   * Get MEP systems analysis
   * GET /api/v1/ifc/:id/mep
   */
  async getMepAnalysis(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Analyze MEP
      const summary = this.mepService.getMepSummary(content);
      const systems = this.mepService.extractMepSystems(content);

      return reply.send({
        ifcModelId: id,
        summary,
        systems,
      });
    } catch (error: any) {
      console.error('Get MEP analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze MEP' });
    }
  }

  /**
   * Get MEP ductwork details
   * GET /api/v1/ifc/:id/mep/ductwork
   */
  async getMepDuctwork(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Analyze ductwork
      const ductwork = this.mepService.analyzeDuctwork(content);

      return reply.send({
        ifcModelId: id,
        ductwork,
      });
    } catch (error: any) {
      console.error('Get ductwork error:', error);
      return reply.code(500).send({ error: 'Failed to analyze ductwork' });
    }
  }

  /**
   * Get MEP piping details
   * GET /api/v1/ifc/:id/mep/piping
   */
  async getMepPiping(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Analyze piping
      const piping = this.mepService.analyzePiping(content);

      return reply.send({
        ifcModelId: id,
        piping,
      });
    } catch (error: any) {
      console.error('Get piping error:', error);
      return reply.code(500).send({ error: 'Failed to analyze piping' });
    }
  }

  /**
   * Get MEP electrical details
   * GET /api/v1/ifc/:id/mep/electrical
   */
  async getMepElectrical(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      // Analyze electrical
      const electrical = this.mepService.analyzeElectrical(content);

      return reply.send({
        ifcModelId: id,
        electrical,
      });
    } catch (error: any) {
      console.error('Get electrical error:', error);
      return reply.code(500).send({ error: 'Failed to analyze electrical' });
    }
  }

  /**
   * Get property sets
   * GET /api/v1/ifc/:id/properties
   */
  async getProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const propertySets = this.propertiesService.extractPropertySets(content);
      const stats = this.propertiesService.getPropertyStats(propertySets);

      return reply.send({
        ifcModelId: id,
        propertySets,
        stats,
      });
    } catch (error: any) {
      console.error('Get properties error:', error);
      return reply.code(500).send({ error: 'Failed to get properties' });
    }
  }

  /**
   * Get classifications
   * GET /api/v1/ifc/:id/classifications
   */
  async getClassifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const classifications = this.classificationsService.extractClassifications(content);
      const systems = this.classificationsService.extractClassificationSystems(content);
      const stats = this.classificationsService.getClassificationStats(classifications);

      return reply.send({
        ifcModelId: id,
        classifications,
        systems,
        stats,
      });
    } catch (error: any) {
      console.error('Get classifications error:', error);
      return reply.code(500).send({ error: 'Failed to get classifications' });
    }
  }

  /**
   * Get type objects
   * GET /api/v1/ifc/:id/types
   */
  async getTypes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const types = this.typesService.extractTypeObjects(content);
      const usage = this.typesService.analyzeTypeUsage(types);
      const distribution = this.typesService.getTypeDistribution(types);

      return reply.send({
        ifcModelId: id,
        types,
        usage,
        distribution,
      });
    } catch (error: any) {
      console.error('Get types error:', error);
      return reply.code(500).send({ error: 'Failed to get types' });
    }
  }

  /**
   * Get geometry analysis
   * GET /api/v1/ifc/:id/geometry
   */
  async getGeometry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const geometryTypes = this.geometryService.extractGeometryTypes(content);
      const complexity = this.geometryService.analyzeGeometryComplexity(content);
      const representations = this.geometryService.detectRepresentationTypes(content);

      return reply.send({
        ifcModelId: id,
        geometryTypes,
        complexity,
        representations,
      });
    } catch (error: any) {
      console.error('Get geometry error:', error);
      return reply.code(500).send({ error: 'Failed to analyze geometry' });
    }
  }

  /**
   * Get relationships analysis
   * GET /api/v1/ifc/:id/relationships
   */
  async getRelationships(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const relationships = this.relationshipsService.extractRelationships(content);
      const analysis = this.relationshipsService.analyzeRelationships(relationships);
      const spatialStructure = this.relationshipsService.extractSpatialStructure(content);

      return reply.send({
        ifcModelId: id,
        relationships: relationships.slice(0, 100), // Limit to first 100
        analysis,
        spatialStructure,
      });
    } catch (error: any) {
      console.error('Get relationships error:', error);
      return reply.code(500).send({ error: 'Failed to analyze relationships' });
    }
  }

  /**
   * Get spaces analysis
   * GET /api/v1/ifc/:id/spaces
   */
  async getSpaces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const spaces = this.spacesService.extractSpaces(content);
      const zones = this.spacesService.extractZones(content);
      const analysis = this.spacesService.analyzeSpaces(spaces);
      const program = this.spacesService.calculateAreaProgram(spaces);

      return reply.send({
        ifcModelId: id,
        spaces,
        zones,
        analysis,
        program,
      });
    } catch (error: any) {
      console.error('Get spaces error:', error);
      return reply.code(500).send({ error: 'Failed to analyze spaces' });
    }
  }

  /**
   * Get structural analysis
   * GET /api/v1/ifc/:id/structural
   */
  async getStructural(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.structuralService.extractStructuralElements(content);
      const analysis = this.structuralService.analyzeStructural(elements);
      const grid = this.structuralService.analyzeStructuralGrid(elements);
      const foundations = this.structuralService.analyzeFoundations(content);

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        grid,
        foundations,
      });
    } catch (error: any) {
      console.error('Get structural error:', error);
      return reply.code(500).send({ error: 'Failed to analyze structural elements' });
    }
  }

  /**
   * Get openings analysis (doors, windows)
   * GET /api/v1/ifc/:id/openings
   */
  async getOpenings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const openings = this.openingsService.extractOpenings(content);
      const analysis = this.openingsService.analyzeOpenings(openings);
      const doors = this.openingsService.extractDoors(content);
      const windows = this.openingsService.extractWindows(content);

      return reply.send({
        ifcModelId: id,
        openings,
        analysis,
        doors,
        windows,
      });
    } catch (error: any) {
      console.error('Get openings error:', error);
      return reply.code(500).send({ error: 'Failed to analyze openings' });
    }
  }

  /**
   * Get project schedule (4D)
   * GET /api/v1/ifc/:id/schedule
   */
  async getSchedule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const tasks = this.schedulesService.extractTasks(content);
      const schedules = this.schedulesService.extractSchedules(content);
      const analysis = this.schedulesService.analyzeSchedule(tasks);
      const progress = this.schedulesService.calculateProgress(tasks);
      const mapping4D = this.schedulesService.extract4DMapping(content);

      return reply.send({
        ifcModelId: id,
        tasks,
        schedules,
        analysis,
        progress,
        mapping4D: mapping4D.slice(0, 100), // Limit response size
      });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      return reply.code(500).send({ error: 'Failed to analyze schedule' });
    }
  }

  /**
   * Get cost analysis (5D)
   * GET /api/v1/ifc/:id/costs
   */
  async getCosts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const items = this.costsService.extractCostItems(content);
      const schedules = this.costsService.extractCostSchedules(content);
      const analysis = this.costsService.analyzeCosts(items);
      const breakdown = this.costsService.generateCostBreakdown(items);
      const byDiscipline = this.costsService.estimateCostByDiscipline(items);

      return reply.send({
        ifcModelId: id,
        items,
        schedules,
        analysis,
        breakdown,
        byDiscipline,
      });
    } catch (error: any) {
      console.error('Get costs error:', error);
      return reply.code(500).send({ error: 'Failed to analyze costs' });
    }
  }

  /**
   * Get energy analysis
   * GET /api/v1/ifc/:id/energy
   */
  async getEnergy(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.energyService.extractEnergyElements(content);
      const analysis = this.energyService.analyzeEnergy(elements);
      const sustainability = this.energyService.analyzeSustainability(analysis);
      const solarGain = this.energyService.calculateSolarGain(
        elements.filter(e => e.elementType === 'IFCWINDOW')
      );

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        sustainability,
        solarGain,
      });
    } catch (error: any) {
      console.error('Get energy error:', error);
      return reply.code(500).send({ error: 'Failed to analyze energy performance' });
    }
  }

  /**
   * Get coordination analysis (clash detection)
   * GET /api/v1/ifc/:id/coordination
   */
  async getCoordination(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const clashes = this.coordinationService.detectClashes(content);
      const analysis = this.coordinationService.analyzeClashes(clashes);
      const report = this.coordinationService.generateCoordinationReport(id, clashes);
      const conflictZones = this.coordinationService.identifyConflictZones(clashes);
      const validation = this.coordinationService.validateCoordination(clashes);

      return reply.send({
        ifcModelId: id,
        clashes: clashes.slice(0, 100), // Limit response size
        analysis,
        report,
        conflictZones,
        validation,
      });
    } catch (error: any) {
      console.error('Get coordination error:', error);
      return reply.code(500).send({ error: 'Failed to analyze coordination' });
    }
  }

  /**
   * Get site & civil works analysis
   * GET /api/v1/ifc/:id/site
   */
  async getSite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const siteElements = this.siteService.extractSiteElements(content);
      const civilElements = this.siteService.extractCivilElements(content);
      const siteAnalysis = this.siteService.analyzeSite(siteElements);
      const infrastructure = this.siteService.analyzeCivilInfrastructure(civilElements);
      const earthworks = this.siteService.calculateEarthworks(siteElements);
      const validation = this.siteService.validateSiteLayout(siteElements, civilElements);
      const report = this.siteService.generateSiteReport(siteElements, siteAnalysis);

      return reply.send({
        ifcModelId: id,
        siteElements,
        civilElements,
        siteAnalysis,
        infrastructure,
        earthworks,
        validation,
        report,
      });
    } catch (error: any) {
      console.error('Get site analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze site' });
    }
  }

  /**
   * Get equipment & furniture analysis
   * GET /api/v1/ifc/:id/equipment
   */
  async getEquipment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const furniture = this.equipmentService.extractFurniture(content);
      const equipment = this.equipmentService.extractEquipment(content);
      const allEquipment = [...furniture, ...equipment];
      const analysis = this.equipmentService.analyzeEquipment(allEquipment);
      const schedule = this.equipmentService.generateFurnitureSchedule(allEquipment);
      const utilization = this.equipmentService.analyzeSpaceUtilization(allEquipment);
      const costs = this.equipmentService.estimateEquipmentCosts(allEquipment);
      const validation = this.equipmentService.validateEquipment(allEquipment);
      const report = this.equipmentService.generateProcurementReport(allEquipment);

      return reply.send({
        ifcModelId: id,
        furniture,
        equipment,
        analysis,
        schedule,
        utilization,
        costs,
        validation,
        report,
      });
    } catch (error: any) {
      console.error('Get equipment analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze equipment' });
    }
  }

  /**
   * Get transport elements analysis
   * GET /api/v1/ifc/:id/transport
   */
  async getTransport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.transportService.extractTransportElements(content);
      const analysis = this.transportService.analyzeTransport(elements);
      const groups = this.transportService.groupElevators(elements);
      const performance = this.transportService.calculatePerformance(elements);
      const validation = this.transportService.validateTransportSystem(elements);
      const costs = this.transportService.estimateTransportCosts(elements);
      const report = this.transportService.generateTransportReport(elements, performance);

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        groups,
        performance,
        validation,
        costs,
        report,
      });
    } catch (error: any) {
      console.error('Get transport analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze transport' });
    }
  }

  /**
   * Get performance analysis (acoustic, lighting, etc.)
   * GET /api/v1/ifc/:id/performance
   */
  async getPerformance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      // Read IFC file via storage abstraction (local fs or S3/MinIO)
      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.performanceService.extractPerformanceElements(content);
      const performance = this.performanceService.analyzePerformance(elements);
      const validation = this.performanceService.validatePerformance(performance);
      const report = this.performanceService.generatePerformanceReport(performance);
      const benchmark = this.performanceService.benchmarkPerformance(performance, 'office');

      return reply.send({
        ifcModelId: id,
        elements,
        performance,
        validation,
        report,
        benchmark,
      });
    } catch (error: any) {
      console.error('Get performance analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze performance' });
    }
  }

  /**
   * Compare IFC models
   * POST /api/v1/ifc/compare
   */
  async compareModels(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { model1Id, model2Id, options } = request.body as {
        model1Id: string;
        model2Id: string;
        options?: any;
      };

      const { IfcComparisonService } = await import('./ifc-comparison.service.js');
      const comparisonService = new IfcComparisonService();

      // Get both models
      const model1 = await this.ifcService.getIfcById(model1Id, user.tenantId);
      const model2 = await this.ifcService.getIfcById(model2Id, user.tenantId);

      if (!model1 || !model2) {
        return reply.code(404).send({ error: 'One or both models not found' });
      }

      // Read both IFC files via storage abstraction (local fs or S3/MinIO)
      const [content1, content2] = await Promise.all([
        storage.downloadText(model1.fileUrl),
        storage.downloadText(model2.fileUrl),
      ]);

      const comparison = await comparisonService.compare(
        content1,
        content2,
        model1Id,
        model2Id,
        options
      );

      const report = await comparisonService.generateChangeReport(comparison);

      return reply.send({
        comparison,
        report,
      });
    } catch (error: any) {
      console.error('Compare models error:', error);
      return reply.code(500).send({ error: 'Failed to compare models' });
    }
  }

  /**
   * Track changes across multiple versions
   * POST /api/v1/ifc/:id/track-changes
   */
  async trackChanges(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { versionIds } = request.body as { versionIds: string[] };

      const { IfcComparisonService } = await import('./ifc-comparison.service.js');
      const comparisonService = new IfcComparisonService();

      // Fetch all versions via storage abstraction (local fs or S3/MinIO)
      const modelVersions: any[] = [];

      for (const versionId of versionIds) {
        const model = await this.ifcService.getIfcById(versionId, user.tenantId);
        if (model) {
          const content = await storage.downloadText(model.fileUrl);

          modelVersions.push({
            id: versionId,
            content,
            date: model.createdAt || new Date().toISOString(),
          });
        }
      }

      const tracking = await comparisonService.trackChanges(modelVersions);

      return reply.send(tracking);
    } catch (error: any) {
      console.error('Track changes error:', error);
      return reply.code(500).send({ error: 'Failed to track changes' });
    }
  }

  /**
   * Detect change conflicts
   * POST /api/v1/ifc/compare/:model1Id/:model2Id/conflicts
   */
  async detectChangeConflicts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { model1Id, model2Id } = request.params as {
        model1Id: string;
        model2Id: string;
      };

      const { IfcComparisonService } = await import('./ifc-comparison.service.js');
      const comparisonService = new IfcComparisonService();

      // Get both models
      const model1 = await this.ifcService.getIfcById(model1Id, user.tenantId);
      const model2 = await this.ifcService.getIfcById(model2Id, user.tenantId);

      if (!model1 || !model2) {
        return reply.code(404).send({ error: 'One or both models not found' });
      }

      // Read both IFC files via storage abstraction (local fs or S3/MinIO)
      const [content1, content2] = await Promise.all([
        storage.downloadText(model1.fileUrl),
        storage.downloadText(model2.fileUrl),
      ]);

      const comparison = await comparisonService.compare(content1, content2, model1Id, model2Id);
      const conflicts = await comparisonService.detectChangeConflicts(comparison);

      return reply.send({
        conflicts,
        conflictCount: conflicts.length,
      });
    } catch (error: any) {
      console.error('Detect change conflicts error:', error);
      return reply.code(500).send({ error: 'Failed to detect change conflicts' });
    }
  }
}
