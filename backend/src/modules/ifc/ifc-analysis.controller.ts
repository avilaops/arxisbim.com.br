import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { IfcElementsService } from './ifc-elements.service.js';
import { IfcMaterialsService } from './ifc-materials.service.js';
import { IfcQuantitiesService } from './ifc-quantities.service.js';
import { storage } from '../../core/storage/index.js';

export class IfcAnalysisController {
  private elementsService: IfcElementsService;
  private materialsService: IfcMaterialsService;
  private quantitiesService: IfcQuantitiesService;

  constructor(private ifcService: IfcService) {
    this.elementsService = new IfcElementsService();
    this.materialsService = new IfcMaterialsService();
    this.quantitiesService = new IfcQuantitiesService();
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

      const content = await storage.downloadText(ifcModel.fileUrl);

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

      const content = await storage.downloadText(ifcModel.fileUrl);

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
}
