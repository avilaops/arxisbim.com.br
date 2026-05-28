/**
 * ArxisVR - Federation API Client
 * 
 * Cliente TypeScript para conectar o frontend com a API de federação
 * Base URL configurada via .env (VITE_API_URL)
 * 
 * Exemplo de uso:
 * 
 * ```typescript
 * import { FederationAPI } from './api/federationAPI';
 * 
 * const api = new FederationAPI();
 * 
 * // Criar federação
 * const federation = await api.create({
 *   projectId: 'uuid',
 *   name: 'Modelo Principal',
 *   models: [{ ifcModelId: 'uuid', visible: true }]
 * });
 * 
 * // Listar federações
 * const federations = await api.getByProject('project-uuid');
 * 
 * // Atualizar transformação
 * await api.updateTransformation('federation-id', 'ifc-id', {
 *   position: { x: 10, y: 0, z: 5 }
 * });
 * ```
 */

// ==========================================
// TYPES - Exportados para uso no frontend
// ==========================================

export interface Transformation {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface FederatedModelItem {
  ifcModelId: string;
  transformation?: Transformation;
  visible: boolean;
}

export interface CreateFederationRequest {
  projectId: string;
  name: string;
  description?: string;
  models: FederatedModelItem[];
}

export interface UpdateFederationRequest {
  name?: string;
  description?: string;
  models?: FederatedModelItem[];
}

export interface FederatedModel {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  models: FederatedModelItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelDetails {
  ifcModelId: string;
  name: string;
  discipline: string | null;
  phase: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  transformation?: Transformation;
  visible: boolean;
}

export interface FederatedModelWithDetails extends FederatedModel {
  modelsDetails: ModelDetails[];
}

export interface FederationStats {
  totalFederations: number;
  totalModelsInFederations: number;
  averageModelsPerFederation: string;
  federations: Array<{
    id: string;
    name: string;
    modelCount: number;
    createdAt: string;
  }>;
}

// ==========================================
// API CLIENT
// ==========================================

export class FederationAPI {
  private baseUrl: string;

  /**
   * Initialize API client
   * Base URL comes from environment variable (configured in .env)
   * 
   * Frontend .env example:
   * VITE_API_URL=http://localhost:3001
   */
  constructor() {
    // Read from environment variable - NEVER hardcode!
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get authentication headers with JWT token
   */
  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Get JWT token from storage
   * Override this method if you use a different storage mechanism
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
   * Create a new federated model
   * POST /api/v1/federation
   */
  async create(data: CreateFederationRequest): Promise<FederatedModel> {
    const response = await fetch(`${this.baseUrl}/api/v1/federation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<FederatedModel>(response);
  }

  /**
   * Get all federated models for a project
   * GET /api/v1/federation/project/:projectId
   */
  async getByProject(projectId: string): Promise<FederatedModelWithDetails[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/project/${projectId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<FederatedModelWithDetails[]>(response);
  }

  /**
   * Get single federated model with details
   * GET /api/v1/federation/:id
   */
  async getById(id: string): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${id}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Update federated model
   * PATCH /api/v1/federation/:id
   */
  async update(
    id: string,
    updates: UpdateFederationRequest
  ): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${id}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Add IFC model to federation
   * POST /api/v1/federation/:id/models
   */
  async addModel(
    federationId: string,
    data: {
      ifcModelId: string;
      transformation?: Transformation;
      visible?: boolean;
    }
  ): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${federationId}/models`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Remove IFC model from federation
   * DELETE /api/v1/federation/:id/models/:ifcModelId
   */
  async removeModel(
    federationId: string,
    ifcModelId: string
  ): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${federationId}/models/${ifcModelId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Update model transformation
   * PATCH /api/v1/federation/:id/models/:ifcModelId/transformation
   */
  async updateTransformation(
    federationId: string,
    ifcModelId: string,
    transformation: Transformation
  ): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${federationId}/models/${ifcModelId}/transformation`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ transformation }),
      }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Update model visibility
   * PATCH /api/v1/federation/:id/models/:ifcModelId/visibility
   */
  async updateVisibility(
    federationId: string,
    ifcModelId: string,
    visible: boolean
  ): Promise<FederatedModelWithDetails> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${federationId}/models/${ifcModelId}/visibility`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ visible }),
      }
    );
    return this.handleResponse<FederatedModelWithDetails>(response);
  }

  /**
   * Delete federated model
   * DELETE /api/v1/federation/:id
   */
  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    return this.handleResponse<{ success: boolean; id: string }>(response);
  }

  /**
   * Get federation statistics for a project
   * GET /api/v1/federation/project/:projectId/stats
   */
  async getStats(projectId: string): Promise<FederationStats> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/federation/project/${projectId}/stats`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<FederationStats>(response);
  }
}

// ==========================================
// SINGLETON INSTANCE (Optional)
// ==========================================

/**
 * Default singleton instance
 * Use this if you don't need multiple API instances
 * 
 * Example:
 * import { federationAPI } from './api/federationAPI';
 * const federations = await federationAPI.getByProject('uuid');
 */
export const federationAPI = new FederationAPI();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create default transformation
 */
export function createDefaultTransformation(): Transformation {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

/**
 * Validate transformation values
 */
export function isValidTransformation(transformation: Partial<Transformation>): boolean {
  const hasValidPosition = 
    transformation.position && 
    typeof transformation.position.x === 'number' &&
    typeof transformation.position.y === 'number' &&
    typeof transformation.position.z === 'number';

  const hasValidRotation = 
    !transformation.rotation ||
    (typeof transformation.rotation.x === 'number' &&
     typeof transformation.rotation.y === 'number' &&
     typeof transformation.rotation.z === 'number');

  const hasValidScale = 
    !transformation.scale ||
    (typeof transformation.scale.x === 'number' &&
     typeof transformation.scale.y === 'number' &&
     typeof transformation.scale.z === 'number');

  return hasValidPosition && hasValidRotation && hasValidScale;
}
