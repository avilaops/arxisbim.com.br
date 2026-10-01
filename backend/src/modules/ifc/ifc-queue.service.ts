/**
 * IFC Processing Queue Service
 *
 * Async processing for heavy IFC operations (validation, thumbnail generation, geometry extraction)
 * Integrates with database for persistent status tracking (queued, processing, ready, failed)
 */

import { db, withTenant } from '../../shared/database/db.js';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { eq, or, and, sql } from 'drizzle-orm';

export interface QueueJob {
  id: string;
  type: 'validate' | 'thumbnail' | 'metadata' | 'quality-report' | 'geometry';
  ifcModelId: string;
  projectId: string;
  tenantId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export class IfcProcessingQueue {
  private queue: QueueJob[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private activeJobs = 0;

  /**
   * Initialize and recover stuck queue jobs on startup.
   * If a job has crashed the backend repeatedly (attempts >= 3), mark it failed.
   * Otherwise, recover the job, maintaining the current attempt count.
   */
  async initialize() {
    console.log('[Queue] Initializing IFC processing queue & checking for stuck jobs...');
    try {
      const stuckModels = await db
        .select()
        .from(ifcModels)
        .where(
          or(
            eq(ifcModels.status, 'queued'),
            eq(ifcModels.status, 'processing')
          )
        );

      console.log(`[Queue] Found ${stuckModels.length} stuck jobs to recover.`);
      const maxRecoveryAttempts = 3;

      for (const model of stuckModels) {
        if (model.processingAttempts >= maxRecoveryAttempts) {
          console.warn(`[Queue] Model ${model.id} exceeded max recovery attempts (${model.processingAttempts}). Marking as failed.`);
          await withTenant(model.tenantId, async (tx) => {
            await tx
              .update(ifcModels)
              .set({
                status: 'failed',
                processingError: 'Max processing attempts exceeded (crashed or interrupted in previous runs)',
                processingCompletedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(ifcModels.id, model.id));
          });
          continue;
        }

        console.log(`[Queue] Recovering job for model ${model.id} (attempts so far: ${model.processingAttempts})`);
        // Add job to queue, keeping the existing attempts counter
        await this.addJob('geometry', model.id, model.projectId, model.tenantId, 'medium', false);
      }
    } catch (error) {
      console.error('[Queue] Error during initialization recovery:', error);
    }
  }

  /**
   * Add job to queue and persist state to DB.
   * If resetAttempts is true (e.g. user manually triggers a new run), attempts counter is reset to 0.
   */
  async addJob(
    type: QueueJob['type'],
    ifcModelId: string,
    projectId: string,
    tenantId: string,
    priority: QueueJob['priority'] = 'medium',
    resetAttempts: boolean = true
  ): Promise<QueueJob> {
    // Avoid duplicate processing if already pending or processing in memory
    const duplicate = this.queue.find(
      j => j.ifcModelId === ifcModelId && j.type === type && (j.status === 'pending' || j.status === 'processing')
    );
    if (duplicate) {
      console.log(`[Queue] Job of type '${type}' for model '${ifcModelId}' is already in progress, reusing job ${duplicate.id}.`);
      return duplicate;
    }

    // Set initial status to 'queued' in DB
    await withTenant(tenantId, async (tx) => {
      const updates: any = {
        status: 'queued',
        processingError: null,
        updatedAt: new Date(),
      };
      if (resetAttempts) {
        updates.processingAttempts = 0;
      }
      await tx
        .update(ifcModels)
        .set(updates)
        .where(eq(ifcModels.id, ifcModelId));
    });

    const job: QueueJob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      ifcModelId,
      projectId,
      tenantId,
      priority,
      status: 'pending',
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.sortQueue();

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return job;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.queue.find(j => j.id === jobId);
  }

  /**
   * Get all jobs for IFC model
   */
  getJobsByIfc(ifcModelId: string): QueueJob[] {
    return this.queue.filter(j => j.ifcModelId === ifcModelId);
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    this.queue.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /**
   * Process queue
   */
  private async processQueue() {
    this.processing = true;

    while (this.queue.some(j => j.status === 'pending')) {
      if (this.activeJobs >= this.maxConcurrent) {
        await this.sleep(100);
        continue;
      }

      const job = this.queue.find(j => j.status === 'pending');
      if (!job) break;

      this.processJob(job);
    }

    this.processing = false;
  }

  private async processJob(job: QueueJob) {
    this.activeJobs++;
    job.status = 'processing';
    job.startedAt = new Date();

    // Set 'processing' status in DB and increment attempts
    await withTenant(job.tenantId, async (tx) => {
      await tx
        .update(ifcModels)
        .set({
          status: 'processing',
          processingStartedAt: job.startedAt,
          processingAttempts: sql`processing_attempts + 1`,
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, job.ifcModelId));
    });

    const maxAttempts = 3;
    let attempt = 0;
    let success = false;
    let lastError: any;
    let result: any;

    while (attempt < maxAttempts && !success) {
      attempt++;
      try {
        switch (job.type) {
          case 'validate': {
            const { IfcValidationService } = await import('./ifc-validation.service.js');
            const validationService = new IfcValidationService();
            result = await validationService.validateIfcForProject(
              job.ifcModelId,
              job.projectId,
              job.tenantId
            );
            break;
          }

          case 'quality-report': {
            const { IfcValidationService } = await import('./ifc-validation.service.js');
            const validationService = new IfcValidationService();
            result = await validationService.generateQualityReport(
              job.ifcModelId,
              job.tenantId
            );
            break;
          }

          case 'thumbnail':
            result = { message: 'Thumbnail generation not implemented' };
            break;

          case 'metadata':
            result = { message: 'Metadata extraction not implemented' };
            break;

          case 'geometry': {
            const { processModelGeometry } = await import('./ifc-geometry-pipeline.helper.js');
            result = await processModelGeometry(job.ifcModelId, job.tenantId, job.projectId);
            break;
          }

          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }
        success = true;
      } catch (error: any) {
        lastError = error;
        console.warn(`[Queue] Job ${job.id} of type ${job.type} failed on attempt ${attempt}:`, error.message);

        // Update error message in DB temporarily during attempts
        await withTenant(job.tenantId, async (tx) => {
          await tx
            .update(ifcModels)
            .set({
              processingError: `Attempt ${attempt} failed: ${error.message}`,
              updatedAt: new Date(),
            })
            .where(eq(ifcModels.id, job.ifcModelId));
        });

        if (attempt < maxAttempts) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    const completedAt = new Date();
    if (success) {
      job.status = 'completed';
      job.result = result;
      job.completedAt = completedAt;

      // Update to 'ready' in DB
      await withTenant(job.tenantId, async (tx) => {
        await tx
          .update(ifcModels)
          .set({
            status: 'ready',
            processingCompletedAt: completedAt,
            processingError: null,
            updatedAt: new Date(),
          })
          .where(eq(ifcModels.id, job.ifcModelId));
      });
    } else {
      job.status = 'failed';
      job.error = lastError?.message || 'Unknown error';
      job.completedAt = completedAt;

      // Update to 'failed' in DB
      await withTenant(job.tenantId, async (tx) => {
        await tx
          .update(ifcModels)
          .set({
            status: 'failed',
            processingCompletedAt: completedAt,
            processingError: job.error,
            updatedAt: new Date(),
          })
          .where(eq(ifcModels.id, job.ifcModelId));
      });
    }
    this.activeJobs--;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(j => j.status === 'pending').length,
      processing: this.queue.filter(j => j.status === 'processing').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
      activeJobs: this.activeJobs,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Clear completed/failed jobs older than X hours
   */
  pruneOldJobs(maxAgeHours: number = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - maxAgeHours);

    const before = this.queue.length;
    this.queue = this.queue.filter(job => {
      if (job.status === 'pending' || job.status === 'processing') {
        return true; // Keep active jobs
      }
      return (job.completedAt || new Date()) > cutoff;
    });

    return before - this.queue.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const ifcProcessingQueue = new IfcProcessingQueue();
