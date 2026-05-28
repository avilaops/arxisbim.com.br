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
}

// Singleton
let projectsServiceInstance: ProjectsService | null = null;

export function getProjectsService(): ProjectsService {
  if (!projectsServiceInstance) {
    projectsServiceInstance = new ProjectsService();
  }
  return projectsServiceInstance;
}
