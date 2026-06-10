import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: string;
    tenantId: string;
    role?: string;
  };
};

export class IfcJobsController {
  constructor(private ifcService: IfcService) {}

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
}
