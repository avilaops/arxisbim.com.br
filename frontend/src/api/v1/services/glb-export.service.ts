/**
 * GLB Export API Service (Frontend)
 * 
 * Comunica com backend para exportação GLB/glTF
 */

import { getAPIClient } from '../client';
import type {
  GLBExportOptions,
  GLBExportResult,
  GLBExportJob,
} from './glb-export.types';

export class GLBExportAPIService {
  private static get client() {
    return getAPIClient();
  }

  /**
   * Exporta modelo completo para GLB
   */
  static async exportModel(
    projectId: string,
    modelId: string,
    options?: GLBExportOptions
  ): Promise<Blob> {
    const response = await this.client.post(
      `/api/v1/projects/${projectId}/models/${modelId}/export/glb`,
      { options },
      {
        headers: {
          'Accept': 'model/gltf-binary',
        },
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  }

  /**
   * Exporta seleção de elementos
   */
  static async exportSelection(
    projectId: string,
    modelId: string,
    expressIds: number[],
    options?: GLBExportOptions
  ): Promise<Blob> {
    const response = await this.client.post(
      `/api/v1/projects/${projectId}/models/${modelId}/export/glb/selection`,
      { expressIds, options },
      {
        headers: {
          'Accept': 'model/gltf-binary',
        },
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  }

  /**
   * Exporta por filtro (tipos IFC)
   */
  static async exportByFilter(
    projectId: string,
    modelId: string,
    filter: {
      types?: string[];
      query?: string;
    },
    options?: GLBExportOptions
  ): Promise<Blob> {
    const response = await this.client.post(
      `/api/v1/projects/${projectId}/models/${modelId}/export/glb`,
      { options, filter },
      {
        headers: {
          'Accept': 'model/gltf-binary',
        },
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  }

  /**
   * Cria job de exportação assíncrona (para modelos grandes)
   */
  static async createExportJob(
    projectId: string,
    modelId: string,
    options?: GLBExportOptions
  ): Promise<GLBExportJob> {
    const response = await this.client.post<GLBExportJob>(
      `/api/v1/projects/${projectId}/models/${modelId}/export/glb/async`,
      { options }
    );

    return response.data;
  }

  /**
   * Obtém status do job
   */
  static async getJobStatus(jobId: string): Promise<GLBExportJob> {
    const response = await this.client.get<GLBExportJob>(
      `/api/v1/glb-export/jobs/${jobId}`
    );

    return response.data;
  }

  /**
   * Download resultado do job
   */
  static async downloadJobResult(jobId: string): Promise<Blob> {
    const response = await this.client.get(
      `/api/v1/glb-export/jobs/${jobId}/download`,
      {
        headers: {
          'Accept': 'model/gltf-binary',
        },
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  }

  /**
   * Cancela job em andamento
   */
  static async cancelJob(jobId: string): Promise<void> {
    await this.client.delete(`/api/v1/glb-export/jobs/${jobId}`);
  }

  /**
   * Helper: Download blob como arquivo
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Preview blob em nova janela
   */
  static previewBlob(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Opções padrão recomendadas
   */
  static readonly DEFAULT_OPTIONS: GLBExportOptions = {
    dracoCompression: true,
    simplify: false,
    embedTextures: true,
    binary: true,
    useInstancing: true,
    mergeGeometry: false,
    includeMetadata: true,
    centerAtOrigin: false,
    scale: 1.0,
  };

  /**
   * Opções otimizadas para AR/VR
   */
  static readonly AR_VR_OPTIONS: GLBExportOptions = {
    dracoCompression: true,
    simplify: true,
    simplifyRatio: 0.7,
    embedTextures: true,
    binary: true,
    useInstancing: true,
    mergeGeometry: true,
    geometryOnly: false,
    includeMetadata: false,
    centerAtOrigin: true,
    scale: 1.0,
    lod: 'medium',
    maxTextureSize: 1024,
  };

  /**
   * Opções para web (performance)
   */
  static readonly WEB_OPTIONS: GLBExportOptions = {
    dracoCompression: true,
    simplify: true,
    simplifyRatio: 0.5,
    embedTextures: true,
    binary: true,
    useInstancing: true,
    mergeGeometry: true,
    geometryOnly: false,
    includeMetadata: true,
    centerAtOrigin: false,
    scale: 1.0,
    lod: 'low',
    maxTextureSize: 512,
  };
}
