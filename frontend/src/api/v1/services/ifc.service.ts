import { getAPIClient } from '../client.js';

export interface IfcModel {
  id: string;
  projectId: string;
  tenantId: string;
  originalName: string;
  storagePath: string;
  fileSize: number;
  discipline: IfcDiscipline;
  phase: IfcPhase | null;
  thumbnailUrl: string | null;
  uploadedBy: string | null;
  metadata: {
    ifcSchema?: string;
    modelName?: string;
    description?: string;
    version?: string;
    elements?: number;
    bounds?: {
      min?: [number, number, number];
      max?: [number, number, number];
    };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export type IfcDiscipline =
  | 'architecture'
  | 'structure'
  | 'mep_electrical'
  | 'mep_plumbing'
  | 'mep_hvac'
  | 'mep_fire'
  | 'landscape'
  | 'civil'
  | 'other';

export type IfcPhase =
  | 'existing'
  | 'demolition'
  | 'new'
  | 'renovation'
  | 'future';

export interface UploadIfcOptions {
  file: File;
  projectId: string;
  discipline: IfcDiscipline;
  phase?: IfcPhase;
  description?: string;
  onProgress?: (progress: number) => void;
}

export interface UpdateIfcMetadata {
  originalName?: string;
  discipline?: IfcDiscipline;
  phase?: IfcPhase;
  description?: string;
  thumbnailUrl?: string;
}

export interface ProjectStorageStats {
  totalCount: number;
  totalSize: number;
  totalSizeMB: string;
  byDiscipline: Record<string, { count: number; size: number }>;
  models: Array<{
    id: string;
    name: string;
    discipline: IfcDiscipline;
    size: number;
    sizeMB: string;
  }>;
}

/**
 * IFC Service - Client for IFC models API
 */
export class IfcService {
  private static instance: IfcService;
  private client = getAPIClient();
  private readonly endpoint = '/api/v1/ifc';

  private constructor() {}

  public static getInstance(): IfcService {
    if (!IfcService.instance) {
      IfcService.instance = new IfcService();
    }
    return IfcService.instance;
  }

  /**
   * Upload IFC file with metadata
   */
  async upload(options: UploadIfcOptions): Promise<IfcModel> {
    const response = await this.client.upload<IfcModel>(
      `${this.endpoint}/upload`,
      options.file,
      {
        projectId: options.projectId,
        discipline: options.discipline,
        ...(options.phase ? { phase: options.phase } : {}),
        ...(options.description ? { description: options.description } : {}),
      },
      options.onProgress
    );

    return response.data;
  }

  /**
   * List IFC models by project
   */
  async listByProject(projectId: string): Promise<IfcModel[]> {
    const response = await this.client.get<IfcModel[]>(`${this.endpoint}/project/${projectId}`);
    return response.data;
  }

  /**
   * Get single IFC model
   */
  async get(id: string): Promise<IfcModel> {
    const response = await this.client.get<IfcModel>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Download IFC file
   * Returns blob for client-side download
   */
  async download(id: string, filename?: string): Promise<void> {
    const token = this.client.getToken();
    const url = `${this.client.getBaseURL()}${this.endpoint}/${id}/download`;

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'model.ifc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Update IFC metadata
   */
  async updateMetadata(id: string, metadata: UpdateIfcMetadata): Promise<IfcModel> {
    const response = await this.client.patch<IfcModel>(`${this.endpoint}/${id}`, metadata);
    return response.data;
  }

  /**
   * Delete IFC model
   */
  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const response = await this.client.delete<{ success: boolean; id: string }>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Upload thumbnail for IFC model
   */
  async uploadThumbnail(id: string, thumbnailUrl: string): Promise<IfcModel> {
    const response = await this.client.post<IfcModel>(`${this.endpoint}/${id}/thumbnail`, {
      thumbnailUrl,
    });
    return response.data;
  }

  /**
   * Get storage statistics for project
   */
  async getProjectStats(projectId: string): Promise<ProjectStorageStats> {
    const response = await this.client.get<ProjectStorageStats>(`${this.endpoint}/project/${projectId}/stats`);
    return response.data;
  }

  /**
   * Generate thumbnail from Three.js scene
   * Captures current view and uploads as thumbnail
   */
  async captureThumbnail(
    id: string,
    canvas: HTMLCanvasElement,
    width: number = 400,
    height: number = 300
  ): Promise<IfcModel> {
    // Create thumbnail canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = width;
    thumbCanvas.height = height;
    const ctx = thumbCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw current scene to thumbnail canvas
    ctx.drawImage(canvas, 0, 0, width, height);

    // Convert to data URL
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

    // Upload to backend
    return this.uploadThumbnail(id, thumbnailUrl);
  }

  /**
   * Format file size to human-readable string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get discipline display name
   */
  getDisciplineLabel(discipline: IfcDiscipline): string {
    const labels: Record<IfcDiscipline, string> = {
      architecture: 'Arquitetura',
      structure: 'Estrutura',
      mep_electrical: 'MEP - Elétrica',
      mep_plumbing: 'MEP - Hidráulica',
      mep_hvac: 'MEP - HVAC',
      mep_fire: 'MEP - Incêndio',
      landscape: 'Paisagismo',
      civil: 'Civil',
      other: 'Outro',
    };
    return labels[discipline] || discipline;
  }

  /**
   * Get phase display name
   */
  getPhaseLabel(phase: IfcPhase | null): string {
    if (!phase) return 'N/A';

    const labels: Record<IfcPhase, string> = {
      existing: 'Existente',
      demolition: 'Demolição',
      new: 'Novo',
      renovation: 'Renovação',
      future: 'Futuro',
    };
    return labels[phase] || phase;
  }

  /**
   * Get discipline color for UI
   */
  getDisciplineColor(discipline: IfcDiscipline): string {
    const colors: Record<IfcDiscipline, string> = {
      architecture: '#3498db', // Blue
      structure: '#e74c3c', // Red
      mep_electrical: '#f39c12', // Orange
      mep_plumbing: '#1abc9c', // Teal
      mep_hvac: '#9b59b6', // Purple
      mep_fire: '#e67e22', // Dark Orange
      landscape: '#27ae60', // Green
      civil: '#95a5a6', // Gray
      other: '#7f8c8d', // Dark Gray
    };
    return colors[discipline] || '#000000';
  }
}

/**
 * Get IFC Service singleton instance
 */
export function getIfcService(): IfcService {
  return IfcService.getInstance();
}
