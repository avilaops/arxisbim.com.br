/**
 * ArxisVR - IFC API Client
 * 
 * Cliente TypeScript para conectar o frontend com a API de IFC
 * Base URL configurada via .env (VITE_API_URL)
 * 
 * Exemplo de uso:
 * 
 * ```typescript
 * import { IfcAPI } from './api/ifcAPI';
 * 
 * const api = new IfcAPI();
 * 
 * // Upload IFC
 * const ifcModel = await api.upload(file, {
 *   projectId: 'uuid',
 *   discipline: 'architecture',
 *   phase: 'new'
 * });
 * 
 * // Listar IFCs do projeto
 * const models = await api.getByProject('project-uuid');
 * 
 * // Download IFC
 * const blob = await api.download('ifc-id');
 * ```
 */

// ==========================================
// TYPES
// ==========================================

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

export interface UploadIfcMetadata {
  projectId: string;
  discipline: IfcDiscipline;
  phase?: IfcPhase;
  description?: string;
}

export interface UpdateIfcMetadata {
  originalName?: string;
  discipline?: IfcDiscipline;
  phase?: IfcPhase;
  description?: string;
  thumbnailUrl?: string;
}

export interface IfcModel {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  originalName: string;
  fileUrl: string;
  fileSizeBytes: number | null;
  ifcType: string | null;
  discipline: IfcDiscipline | null;
  phase: IfcPhase | null;
  thumbnailUrl: string | null;
  uploadedBy: string | null;
  metadata: {
    author?: string;
    application?: string;
    schema?: string;
    timestamp?: string;
    version?: string;
    elements?: number;
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    description?: string;
  } | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface ProjectStorageStats {
  modelCount: number;
  totalSize: number;
  totalSizeMB: string;
  byDiscipline: Record<string, { count: number; size: number }>;
  models: Array<{
    id: string;
    name: string;
    discipline: IfcDiscipline | null;
    size: number;
    sizeMB: string;
  }>;
}

// ==========================================
// API CLIENT
// ==========================================

export class IfcAPI {
  private baseUrl: string;

  /**
   * Initialize API client
   * Base URL from environment variable (.env: VITE_API_URL)
   */
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get authentication headers with JWT token
   */
  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Get JWT token from storage
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }
    return token;
  }

  /**
   * Handle API errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
        errorData.message ||
        `API request failed with status ${response.status}`
      );
    }
    return response.json();
  }

  // ==========================================
  // ENDPOINTS
  // ==========================================

  /**
   * Upload IFC file with metadata
   * POST /api/v1/ifc/upload
   */
  async upload(
    file: File,
    metadata: UploadIfcMetadata
  ): Promise<IfcModel> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', metadata.projectId);
    formData.append('discipline', metadata.discipline);
    
    if (metadata.phase) {
      formData.append('phase', metadata.phase);
    }
    
    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/ifc/upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    return this.handleResponse<IfcModel>(response);
  }

  /**
   * Get all IFC models for a project
   * GET /api/v1/ifc/project/:projectId
   */
  async getByProject(projectId: string): Promise<IfcModel[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/project/${projectId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<IfcModel[]>(response);
  }

  /**
   * Get single IFC model by ID
   * GET /api/v1/ifc/:id
   */
  async getById(id: string): Promise<IfcModel> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/${id}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<IfcModel>(response);
  }

  /**
   * Download IFC file
   * GET /api/v1/ifc/:id/download
   * Returns a Blob that can be saved or opened
   */
  async download(id: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/${id}/download`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to download IFC file');
    }

    return response.blob();
  }

  /**
   * Download IFC file and trigger browser download
   */
  async downloadAndSave(id: string, filename?: string): Promise<void> {
    const blob = await this.download(id);
    
    // Get filename from response or use provided one
    if (!filename) {
      const model = await this.getById(id);
      filename = model.originalName;
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Update IFC metadata
   * PATCH /api/v1/ifc/:id
   */
  async update(
    id: string,
    updates: UpdateIfcMetadata
  ): Promise<IfcModel> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/${id}`,
      {
        method: 'PATCH',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );
    return this.handleResponse<IfcModel>(response);
  }

  /**
   * Delete IFC model
   * DELETE /api/v1/ifc/:id
   */
  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse<{ success: boolean; id: string }>(response);
  }

  /**
   * Upload thumbnail URL for IFC model
   * POST /api/v1/ifc/:id/thumbnail
   */
  async uploadThumbnail(
    id: string,
    thumbnailUrl: string
  ): Promise<IfcModel> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/${id}/thumbnail`,
      {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thumbnailUrl }),
      }
    );
    return this.handleResponse<IfcModel>(response);
  }

  /**
   * Get storage statistics for a project
   * GET /api/v1/ifc/project/:projectId/stats
   */
  async getProjectStats(projectId: string): Promise<ProjectStorageStats> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/ifc/project/${projectId}/stats`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<ProjectStorageStats>(response);
  }

  /**
   * Get IFC models by discipline
   */
  async getByDiscipline(
    projectId: string,
    discipline: IfcDiscipline
  ): Promise<IfcModel[]> {
    const models = await this.getByProject(projectId);
    return models.filter((m) => m.discipline === discipline);
  }

  /**
   * Get IFC models by phase
   */
  async getByPhase(
    projectId: string,
    phase: IfcPhase
  ): Promise<IfcModel[]> {
    const models = await this.getByProject(projectId);
    return models.filter((m) => m.phase === phase);
  }

  /**
   * Format file size to human readable
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const ifcAPI = new IfcAPI();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get discipline display name
 */
export function getDisciplineLabel(discipline: IfcDiscipline | null): string {
  const labels: Record<IfcDiscipline, string> = {
    architecture: 'Arquitetura',
    structure: 'Estrutura',
    mep_electrical: 'MEP - Elétrica',
    mep_plumbing: 'MEP - Hidráulica',
    mep_hvac: 'MEP - HVAC',
    mep_fire: 'MEP - Combate a Incêndio',
    landscape: 'Paisagismo',
    civil: 'Civil',
    other: 'Outros',
  };
  return discipline ? labels[discipline] : 'Não especificado';
}

/**
 * Get phase display name
 */
export function getPhaseLabel(phase: IfcPhase | null): string {
  const labels: Record<IfcPhase, string> = {
    existing: 'Existente',
    demolition: 'Demolição',
    new: 'Novo',
    renovation: 'Reforma',
    future: 'Futuro',
  };
  return phase ? labels[phase] : 'Não especificado';
}

/**
 * Get discipline color for UI
 */
export function getDisciplineColor(discipline: IfcDiscipline | null): string {
  const colors: Record<IfcDiscipline, string> = {
    architecture: '#3B82F6', // blue
    structure: '#EF4444', // red
    mep_electrical: '#F59E0B', // amber
    mep_plumbing: '#06B6D4', // cyan
    mep_hvac: '#8B5CF6', // purple
    mep_fire: '#DC2626', // dark red
    landscape: '#10B981', // green
    civil: '#6B7280', // gray
    other: '#9CA3AF', // light gray
  };
  return discipline ? colors[discipline] : '#6B7280';
}

/**
 * Validate IFC file
 */
export function validateIfcFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.ifc')) {
    return { valid: false, error: 'Arquivo deve ter extensão .ifc' };
  }

  // Check file size (max 100MB from .env)
  const maxSize = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 100) * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${maxSize / (1024 * 1024)}MB`,
    };
  }

  return { valid: true };
}
