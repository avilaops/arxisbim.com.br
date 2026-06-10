import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { IfcMepService } from './ifc-mep.service.js';
import { storage } from '../../core/storage/index.js';

export class IfcMepController {
  private mepService: IfcMepService;

  constructor(private ifcService: IfcService) {
    this.mepService = new IfcMepService();
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

      const content = await storage.downloadText(ifcModel.fileUrl);

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

      const content = await storage.downloadText(ifcModel.fileUrl);

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

      const content = await storage.downloadText(ifcModel.fileUrl);

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

      const content = await storage.downloadText(ifcModel.fileUrl);

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
}
