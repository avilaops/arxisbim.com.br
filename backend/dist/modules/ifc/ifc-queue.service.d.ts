/**
 * IFC Processing Queue Service
 *
 * Async processing for heavy IFC operations (validation, thumbnail generation, metadata extraction)
 * Uses in-memory queue with optional Redis backend (REDIS_URL from .env)
 */
export interface QueueJob {
    id: string;
    type: 'validate' | 'thumbnail' | 'metadata' | 'quality-report';
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
export declare class IfcProcessingQueue {
    private queue;
    private processing;
    private maxConcurrent;
    private activeJobs;
    /**
     * Add job to queue
     */
    addJob(type: QueueJob['type'], ifcModelId: string, projectId: string, tenantId: string, priority?: QueueJob['priority']): Promise<QueueJob>;
    /**
     * Get job status
     */
    getJob(jobId: string): QueueJob | undefined;
    /**
     * Get all jobs for IFC model
     */
    getJobsByIfc(ifcModelId: string): QueueJob[];
    /**
     * Sort queue by priority
     */
    private sortQueue;
    /**
     * Process queue
     */
    private processQueue;
    /**
     * Process single job
     */
    private processJob;
    /**
     * Get queue statistics
     */
    getStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        activeJobs: number;
        maxConcurrent: number;
    };
    /**
     * Clear completed/failed jobs older than X hours
     */
    pruneOldJobs(maxAgeHours?: number): number;
    private sleep;
}
export declare const ifcProcessingQueue: IfcProcessingQueue;
//# sourceMappingURL=ifc-queue.service.d.ts.map