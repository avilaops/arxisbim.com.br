/**
 * Element Comments API Service
 *
 * Comunica com o backend para gerenciar comentários e threads anotados em elementos IFC.
 */

import { getAPIClient } from '../client';

export interface ElementComment {
  id: string;
  projectId: string;
  modelVersionId: string | null;
  globalId: string | null;
  worldPosition: { x: number; y: number; z: number } | null;
  body: string;
  parentId: string | null;
  authorId: string;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  authorName: string;
  authorEmail?: string;
  resolvedByName: string | null;
  replies: ElementComment[];
}

export interface CreateCommentParams {
  modelVersionId?: string;
  globalId?: string;
  worldPosition?: { x: number; y: number; z: number };
  body: string;
  parentId?: string;
}

export class CommentsAPIService {
  private static get client() {
    return getAPIClient();
  }

  /**
   * Obtém todos os comentários de um projeto (opcionalmente filtrado por globalId)
   */
  static async list(projectId: string, globalId?: string): Promise<ElementComment[]> {
    const query = globalId ? `?globalId=${globalId}` : '';
    const response = await this.client.get<ElementComment[]>(
      `/api/v1/projects/${projectId}/comments${query}`
    );
    return response.data;
  }

  /**
   * Cria um novo comentário ou reply
   */
  static async create(projectId: string, params: CreateCommentParams): Promise<ElementComment> {
    const response = await this.client.post<ElementComment>(
      `/api/v1/projects/${projectId}/comments`,
      params
    );
    return response.data;
  }

  /**
   * Alterna o estado de resolução de um comentário
   */
  static async toggleResolve(projectId: string, commentId: string): Promise<ElementComment> {
    const response = await this.client.patch<ElementComment>(
      `/api/v1/projects/${projectId}/comments/${commentId}/resolve`
    );
    return response.data;
  }

  /**
   * Exclui um comentário e suas respostas
   */
  static async delete(projectId: string, commentId: string): Promise<{ id: string }> {
    const response = await this.client.delete<{ id: string }>(
      `/api/v1/projects/${projectId}/comments/${commentId}`
    );
    return response.data;
  }
}
