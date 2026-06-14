/**
 * Projects Service - API v1
 * Gerencia projetos BIM
 */

import { getAPIClient } from '../client';

export interface Project {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  location?: {
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  companyId: string;
  name: string;
  description?: string;
  location?: {
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  location?: {
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status?: 'active' | 'archived';
}

export class ProjectsService {
  private readonly endpoint = '/api/v1/projects';

  /**
   * Lista todos os projetos do tenant
   */
  async list(): Promise<Project[]> {
    const client = getAPIClient();
    const response = await client.get<Project[]>(this.endpoint);
    return response.data;
  }

  /**
   * Obtém um projeto por ID
   */
  async get(projectId: string): Promise<Project> {
    const client = getAPIClient();
    const response = await client.get<Project>(`${this.endpoint}/${projectId}`);
    return response.data;
  }

  /**
   * Cria novo projeto
   */
  async create(data: CreateProjectData): Promise<Project> {
    const client = getAPIClient();
    const response = await client.post<Project>(this.endpoint, data);
    return response.data;
  }

  /**
   * Atualiza projeto existente
   */
  async update(projectId: string, data: UpdateProjectData): Promise<Project> {
    const client = getAPIClient();
    const response = await client.put<Project>(`${this.endpoint}/${projectId}`, data);
    return response.data;
  }

  /**
   * Deleta projeto
   */
  async delete(projectId: string): Promise<void> {
    const client = getAPIClient();
    await client.delete(`${this.endpoint}/${projectId}`);
  }

  /**
   * Obtem o type map efetivo do projeto (default + overrides)
   */
  async getTypeMap(projectId: string): Promise<ProjectTypeMapResponse> {
    const client = getAPIClient();
    const response = await client.get<ProjectTypeMapResponse>(`${this.endpoint}/${projectId}/type-map`);
    return response.data;
  }

  /**
   * Atualiza as customizacoes de type map do projeto
   */
  async updateTypeMap(projectId: string, map: Record<string, Partial<TypeInfo>>): Promise<{ typeMapVersion: number; map: Record<string, any> }> {
    const client = getAPIClient();
    const response = await client.put<{ typeMapVersion: number; map: Record<string, any> }>(`${this.endpoint}/${projectId}/type-map`, { map });
    return response.data;
  }
}

export interface TypeInfo {
  category: 'structural' | 'architectural' | 'mep' | 'furniture' | 'site' | 'other';
  label: string;
  color: string;
}

export interface ProjectTypeMapResponse {
  typeMapVersion: number;
  map: Record<string, TypeInfo>;
}

// Singleton
let projectsServiceInstance: ProjectsService | null = null;

export function getProjectsService(): ProjectsService {
  if (!projectsServiceInstance) {
    projectsServiceInstance = new ProjectsService();
  }
  return projectsServiceInstance;
}
