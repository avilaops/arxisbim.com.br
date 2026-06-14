/**
 * Sharing and Permissions API Service (S17)
 */

import { getAPIClient } from '../client.js';

export interface SharedLink {
  id: string;
  token: string;
  projectId: string;
  scenarioId: string | null;
  accessLevel: 'viewer' | 'commenter';
  expiresAt: string | null;
  createdBy: string;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  name?: string;
  email?: string;
}

export interface SharedDetailsResponse {
  accessLevel: 'viewer' | 'commenter';
  expiresAt: string | null;
  project: {
    id: string;
    name: string;
    description: string | null;
    location: any;
    status: string;
  };
  scenario: {
    id: string;
    name: string;
    description: string | null;
    scenarioState: any;
    stateVersion: number;
  } | null;
}

export class SharingAPIService {
  private static get client() {
    return getAPIClient();
  }

  // ── AUTHENTICATED APIs ──────────────────────────────────────────────

  /**
   * Cria um link de compartilhamento público para o projeto ou cenário
   */
  static async createLink(
    projectId: string,
    params: { scenarioId?: string; accessLevel: 'viewer' | 'commenter'; expiresInDays?: number }
  ): Promise<SharedLink> {
    const response = await this.client.post<SharedLink>(
      `/api/v1/projects/${projectId}/share`,
      params
    );
    return response.data;
  }

  /**
   * Lista links ativos de compartilhamento do projeto
   */
  static async listLinks(projectId: string): Promise<SharedLink[]> {
    const response = await this.client.get<SharedLink[]>(
      `/api/v1/projects/${projectId}/share`
    );
    return response.data;
  }

  /**
   * Revoga um link de compartilhamento
   */
  static async revokeLink(projectId: string, token: string): Promise<SharedLink> {
    const response = await this.client.delete<SharedLink>(
      `/api/v1/projects/${projectId}/share/${token}`
    );
    return response.data;
  }

  /**
   * Adiciona um novo membro ao projeto
   */
  static async addMember(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const response = await this.client.post<ProjectMember>(
      `/api/v1/projects/${projectId}/members`,
      { userId, role }
    );
    return response.data;
  }

  /**
   * Remove um membro do projeto
   */
  static async removeMember(projectId: string, userId: string): Promise<{ projectId: string; userId: string }> {
    const response = await this.client.delete<{ projectId: string; userId: string }>(
      `/api/v1/projects/${projectId}/members/${userId}`
    );
    return response.data;
  }

  /**
   * Lista todos os membros do projeto
   */
  static async listMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await this.client.get<ProjectMember[]>(
      `/api/v1/projects/${projectId}/members`
    );
    return response.data;
  }

  // ── PUBLIC APIs (Sem token de autorização) ─────────────────────────

  /**
   * Resolve detalhes do link compartilhado
   */
  static async resolvePublicLink(token: string): Promise<SharedDetailsResponse> {
    const response = await this.client.get<SharedDetailsResponse>(`/api/v1/shared/${token}`);
    return response.data;
  }

  /**
   * Busca as propriedades higienizadas de um elemento do modelo usando o token público
   */
  static async getPublicElementProperties(token: string, expressId: number): Promise<any> {
    const response = await this.client.get<any>(`/api/v1/shared/${token}/elements/${expressId}`);
    return response.data;
  }

  /**
   * Lista modelos do projeto compartilhado usando o token público
   */
  static async listPublicModels(token: string): Promise<any[]> {
    const response = await this.client.get<any[]>(`/api/v1/shared/${token}/models`);
    return response.data;
  }

  /**
   * Retorna a URL pública de download de um modelo compartilhado
   */
  static getPublicModelDownloadUrl(token: string, modelId: string): string {
    const baseUrl = this.client.getBaseURL();
    return `${baseUrl}/api/v1/shared/${token}/models/${modelId}/download`;
  }
}
