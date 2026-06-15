import { getAPIClient } from '../client';
import { resolveApiBaseUrl } from '../../../config/apiBaseUrl';

export type ScenarioPresetId =
  | 'guided-tour'
  | 'bim-coordination'
  | 'construction-4d'
  | 'clash-review'
  | 'cost-review';

export interface Vector3DTO {
  x: number;
  y: number;
  z: number;
}

export interface RotationDTO {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface ScenarioConfigDTO {
  initialPosition: Vector3DTO;
  initialRotation: RotationDTO;
  movementSpeed: number;
  rotationSpeed: number;
  crouchMultiplier: number;
  sprintMultiplier: number;
  verticalSpeed: number;
  enableMinimap: boolean;
  minimapConfig: {
    width: number;
    height: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    zoom: number;
    showPlayerDirection: boolean;
    backgroundColor: string;
    borderColor: string;
  };
}

export interface ScenarioRecord {
  id: string;
  projectId: string;
  tenantId?: string;
  createdBy?: string;
  name: string;
  description?: string;
  camera: {
    position: Vector3DTO;
    rotation: RotationDTO;
    fov: number;
  };
  player: Record<string, unknown>;
  config: ScenarioConfigDTO;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioRequest {
  projectId: string;
  name: string;
  description?: string;
  config?: Partial<ScenarioConfigDTO>;
  presetId?: ScenarioPresetId;
}

export interface ListScenariosParams {
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface ScenarioListResponse {
  success: boolean;
  data: ScenarioRecord[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ScenarioResponse {
  success: boolean;
  data: ScenarioRecord;
}

export interface UpdateScenarioRequest {
  name?: string;
  description?: string;
  config?: Partial<ScenarioConfigDTO>;
}

export class ScenariosService {
  private readonly endpoint = '/api/v1/scenarios';

  async create(input: CreateScenarioRequest): Promise<ScenarioRecord> {
    const client = getAPIClient();
    const response = await client.post<ScenarioResponse>(this.endpoint, input);
    return response.data.data;
  }

  async list(params?: ListScenariosParams | string): Promise<ScenarioListResponse> {
    const client = getAPIClient();
    const normalized: ListScenariosParams =
      typeof params === 'string' ? { projectId: params } : params ?? {};
    const query: Record<string, string | number> = {};
    if (normalized.projectId) query.projectId = normalized.projectId;
    if (typeof normalized.limit === 'number') query.limit = normalized.limit;
    if (typeof normalized.offset === 'number') query.offset = normalized.offset;
    const response = await client.get<ScenarioListResponse>(this.endpoint, {
      params: Object.keys(query).length > 0 ? query : undefined,
    });
    return response.data;
  }

  async getById(id: string): Promise<ScenarioRecord> {
    const client = getAPIClient();
    const response = await client.get<ScenarioResponse>(`${this.endpoint}/${id}`);
    return response.data.data;
  }

  async update(id: string, input: UpdateScenarioRequest): Promise<ScenarioRecord> {
    const client = getAPIClient();
    const response = await client.patch<ScenarioResponse>(`${this.endpoint}/${id}`, input);
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    const client = getAPIClient();
    await client.delete(`${this.endpoint}/${id}`);
  }

  async fork(scenarioId: string, projectId: string, name: string, description?: string): Promise<{ success: boolean; scenarioId: string }> {
    const client = getAPIClient();
    const response = await client.post<{ success: boolean; scenarioId: string }>(`${this.endpoint}/${scenarioId}/fork`, { projectId, name, description });
    return response.data;
  }

  async getDiff(scenarioIdA: string, scenarioIdB: string, projectId: string): Promise<any> {
    const client = getAPIClient();
    const response = await client.get<any>(`${this.endpoint}/${scenarioIdA}/diff/${scenarioIdB}`, {
      params: { projectId }
    });
    return response.data;
  }

  async merge(scenarioId: string, projectId: string): Promise<{ success: boolean }> {
    const client = getAPIClient();
    const response = await client.post<{ success: boolean }>(`${this.endpoint}/${scenarioId}/merge`, { projectId });
    return response.data;
  }

  async getFinancialComparison(scenarioIdA: string, scenarioIdB: string, projectId: string, costWeight: number, timeWeight: number): Promise<any> {
    const client = getAPIClient();
    const response = await client.get<any>(`${this.endpoint}/${scenarioIdA}/compare/${scenarioIdB}/financial`, {
      params: { projectId, costWeight, timeWeight }
    });
    return response.data;
  }

  getComparisonPdfUrl(scenarioIdA: string, scenarioIdB: string, projectId: string, costWeight: number, timeWeight: number): string {
    const baseUrl = resolveApiBaseUrl();
    const token = localStorage.getItem('arxisvr_token') || '';
    return `${baseUrl}${this.endpoint}/${scenarioIdA}/compare/${scenarioIdB}/pdf?projectId=${projectId}&costWeight=${costWeight}&timeWeight=${timeWeight}&token=${token}`;
  }
}

let scenariosServiceInstance: ScenariosService | null = null;

export function getScenariosService(): ScenariosService {
  if (!scenariosServiceInstance) {
    scenariosServiceInstance = new ScenariosService();
  }
  return scenariosServiceInstance;
}
