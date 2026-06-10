import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { storage } from '../../core/storage/index.js';

export class IfcComparisonController {
  constructor(private ifcService: IfcService) {}

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
