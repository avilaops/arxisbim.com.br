/**
 * Frontend Integration - Advanced Features
 * 
 * TypeScript client for IFC Queue and Federation Conflict Detection
 * Configure VITE_API_URL in frontend .env
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Common headers for authenticated requests
 */
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// ============================================
// IFC PROCESSING QUEUE API
// ============================================

export interface QueueJob {
  id: string;
  type: 'validate' | 'thumbnail' | 'metadata' | 'quality-report';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  activeJobs: number;
  maxConcurrent: number;
}

export class IfcQueueAPI {
  /**
   * Queue a processing job
   */
  static async queueJob(
    ifcModelId: string,
    jobType: 'validate' | 'thumbnail' | 'metadata' | 'quality-report',
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ message: string; job: Partial<QueueJob> }> {
    const response = await fetch(
      `${API_URL}/api/v1/ifc/${ifcModelId}/queue/${jobType}`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ priority }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to queue job: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string): Promise<QueueJob> {
    const response = await fetch(`${API_URL}/api/v1/ifc/jobs/${jobId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<QueueStats> {
    const response = await fetch(`${API_URL}/api/v1/ifc/queue/stats`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch queue stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll job until completion (with timeout)
   */
  static async waitForJob(
    jobId: string,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 2000
  ): Promise<QueueJob> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJobStatus(jobId);

      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Job timeout - still processing after maximum wait time');
  }
}

// ============================================
// FEDERATION CONFLICT DETECTION API
// ============================================

export interface SpatialConflict {
  type: 'overlap' | 'clash' | 'proximity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  model1Id: string;
  model1Name: string;
  model2Id: string;
  model2Name: string;
  description: string;
  location?: { x: number; y: number; z: number };
}

export interface LogicalConflict {
  type: 'discipline' | 'phase' | 'version';
  severity: 'warning' | 'error';
  affectedModels: string[];
  description: string;
  recommendation: string;
}

export interface ConflictReport {
  federationId: string;
  scanDate: string;
  spatialConflicts: SpatialConflict[];
  logicalConflicts: LogicalConflict[];
  summary: {
    totalConflicts: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  healthScore: number;
}

export interface ConflictRecommendations {
  healthScore: number;
  summary: ConflictReport['summary'];
  recommendations: string[];
}

export interface DisciplineCoverage {
  totalDisciplines: number;
  coveredDisciplines: string[];
  missingDisciplines: string[];
  coveragePercentage: string;
}

export class FederationConflictAPI {
  /**
   * Scan federation for conflicts
   */
  static async scanConflicts(federationId: string): Promise<ConflictReport> {
    const response = await fetch(
      `${API_URL}/api/v1/federation/${federationId}/scan-conflicts`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to scan conflicts: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get conflict recommendations
   */
  static async getRecommendations(
    federationId: string
  ): Promise<ConflictRecommendations> {
    const response = await fetch(
      `${API_URL}/api/v1/federation/${federationId}/conflict-recommendations`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get discipline coverage for project
   */
  static async getDisciplineCoverage(
    projectId: string
  ): Promise<DisciplineCoverage> {
    const response = await fetch(
      `${API_URL}/api/v1/federation/project/${projectId}/discipline-coverage`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get discipline coverage: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get health score color (for UI)
   */
  static getHealthScoreColor(score: number): string {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  }

  /**
   * Get health score badge (for UI)
   */
  static getHealthScoreBadge(score: number): string {
    if (score >= 90) return '✅ Excellent';
    if (score >= 70) return '🟡 Good';
    if (score >= 50) return '🟠 Needs Attention';
    return '🔴 Critical';
  }

  /**
   * Get severity icon
   */
  static getSeverityIcon(
    severity: 'low' | 'medium' | 'high' | 'critical' | 'warning' | 'error'
  ): string {
    const icons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨',
      warning: '⚠️',
      error: '❌',
    };
    return icons[severity] || 'ℹ️';
  }
}

// ============================================
// EXAMPLE USAGE
// ============================================

/**
 * Example: Upload IFC and queue validation
 */
export async function uploadAndValidateIFC(
  projectId: string,
  file: File,
  discipline: string,
  phase: string
) {
  // 1. Upload IFC
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);
  formData.append('discipline', discipline);
  formData.append('phase', phase);

  const uploadResponse = await fetch(`${API_URL}/api/v1/ifc/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });

  const ifc = await uploadResponse.json();

  // 2. Queue validation with high priority
  const { job } = await IfcQueueAPI.queueJob(ifc.id, 'validate', 'high');

  console.log(`Validation queued: ${job.id}`);

  // 3. Wait for completion (optional)
  const completedJob = await IfcQueueAPI.waitForJob(job.id!);

  if (completedJob.status === 'failed') {
    throw new Error(`Validation failed: ${completedJob.error}`);
  }

  console.log('Validation result:', completedJob.result);

  return { ifc, validation: completedJob.result };
}

/**
 * Example: Create federation and check health
 */
export async function createFederationAndCheckHealth(
  projectId: string,
  name: string,
  ifcModelIds: string[]
) {
  // 1. Create federation
  const createResponse = await fetch(`${API_URL}/api/v1/federation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      projectId,
      name,
      description: 'Auto-created federation',
      models: ifcModelIds.map(id => ({
        ifcModelId: id,
        visible: true,
      })),
    }),
  });

  const federation = await createResponse.json();

  // 2. Scan for conflicts
  const conflictReport = await FederationConflictAPI.scanConflicts(federation.id);

  // 3. Get recommendations
  const recommendations = await FederationConflictAPI.getRecommendations(
    federation.id
  );

  console.log(`Health Score: ${conflictReport.healthScore}/100`);
  console.log(
    `Badge: ${FederationConflictAPI.getHealthScoreBadge(conflictReport.healthScore)}`
  );
  console.log('Recommendations:', recommendations.recommendations);

  // 4. Display conflicts
  conflictReport.spatialConflicts.forEach(conflict => {
    console.log(
      `${FederationConflictAPI.getSeverityIcon(conflict.severity)} ${conflict.description}`
    );
  });

  return { federation, conflictReport, recommendations };
}

/**
 * Example: Monitor queue in real-time
 */
export async function monitorQueue(onUpdate: (stats: QueueStats) => void) {
  const intervalId = setInterval(async () => {
    try {
      const stats = await IfcQueueAPI.getQueueStats();
      onUpdate(stats);
    } catch (error) {
      console.error('Failed to fetch queue stats:', error);
    }
  }, 3000); // Update every 3 seconds

  // Return cleanup function
  return () => clearInterval(intervalId);
}
