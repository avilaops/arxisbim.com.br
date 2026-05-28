/**
 * IFC Processing Queue Service
 *
 * Async processing for heavy IFC operations (validation, thumbnail generation, metadata extraction)
 * Uses in-memory queue with optional Redis backend (REDIS_URL from .env)
 */
export class IfcProcessingQueue {
    queue = [];
    processing = false;
    maxConcurrent = 3;
    activeJobs = 0;
    /**
     * Add job to queue
     */
    async addJob(type, ifcModelId, projectId, tenantId, priority = 'medium') {
        const job = {
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
    getJob(jobId) {
        return this.queue.find(j => j.id === jobId);
    }
    /**
     * Get all jobs for IFC model
     */
    getJobsByIfc(ifcModelId) {
        return this.queue.filter(j => j.ifcModelId === ifcModelId);
    }
    /**
     * Sort queue by priority
     */
    sortQueue() {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        this.queue.sort((a, b) => {
            // Status first (pending > processing > completed/failed)
            if (a.status === 'pending' && b.status !== 'pending')
                return -1;
            if (a.status !== 'pending' && b.status === 'pending')
                return 1;
            // Then by priority
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        });
    }
    /**
     * Process queue
     */
    async processQueue() {
        this.processing = true;
        while (this.queue.some(j => j.status === 'pending')) {
            // Check if we can start new jobs
            if (this.activeJobs >= this.maxConcurrent) {
                await this.sleep(100);
                continue;
            }
            // Get next pending job
            const job = this.queue.find(j => j.status === 'pending');
            if (!job)
                break;
            // Start processing
            this.processJob(job);
        }
        this.processing = false;
    }
    /**
     * Process single job
     */
    async processJob(job) {
        this.activeJobs++;
        job.status = 'processing';
        job.startedAt = new Date();
        try {
            // Import services dynamically
            const { IfcValidationService } = await import('./ifc-validation.service.js');
            const validationService = new IfcValidationService();
            let result;
            switch (job.type) {
                case 'validate':
                    result = await validationService.validateIfcForProject(job.ifcModelId, job.projectId, job.tenantId);
                    break;
                case 'quality-report':
                    result = await validationService.generateQualityReport(job.ifcModelId, job.tenantId);
                    break;
                case 'thumbnail':
                    // Placeholder - implement thumbnail generation
                    result = { message: 'Thumbnail generation not implemented' };
                    break;
                case 'metadata':
                    // Placeholder - implement metadata extraction
                    result = { message: 'Metadata extraction not implemented' };
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }
            job.status = 'completed';
            job.result = result;
            job.completedAt = new Date();
        }
        catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
        }
        finally {
            this.activeJobs--;
        }
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
    pruneOldJobs(maxAgeHours = 24) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
export const ifcProcessingQueue = new IfcProcessingQueue();
//# sourceMappingURL=ifc-queue.service.js.map