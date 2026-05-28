/**
 * BIM360Service
 * Integração com Autodesk BIM 360 para sincronização de modelos
 * Suporta upload, download e sincronização de projetos BIM 360
 */

export interface BIM360Project {
  id: string;
  name: string;
  hubId: string;
  accountId: string;
  lastModified: string;
}

export interface BIM360Model {
  id: string;
  name: string;
  projectId: string;
  version: number;
  size: number;
  format: 'ifc' | 'rvt' | 'nwd';
  urn: string;
}

export interface BIM360Config {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
}

class BIM360Service {
  private config: BIM360Config | null = null;
  private accessToken: string | null = null;
  private projects: Map<string, BIM360Project> = new Map();
  private models: Map<string, BIM360Model> = new Map();

  /**
   * Configura autenticação OAuth2
   */
  configure(config: BIM360Config): void {
    this.config = config;
    console.log('[BIM360Service] Configured');
  }

  /**
   * Inicia fluxo de autenticação
   */
  authenticate(): void {
    if (!this.config) {
      throw new Error('BIM360Service not configured');
    }

    const authUrl = new URL('https://developer.api.autodesk.com/authentication/v1/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.config.clientId);
    authUrl.searchParams.append('redirect_uri', this.config.callbackUrl);
    authUrl.searchParams.append('scope', this.config.scope.join(' '));

    window.location.href = authUrl.toString();
  }

  /**
   * Troca código por token de acesso
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    if (!this.config) {
      throw new Error('BIM360Service not configured');
    }

    const response = await fetch('https://developer.api.autodesk.com/authentication/v1/gettoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    console.log('[BIM360Service] Authenticated');
  }

  /**
   * Lista projetos do usuário
   */
  async listProjects(): Promise<BIM360Project[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      'https://developer.api.autodesk.com/project/v1/hubs',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list projects');
    }

    const data = await response.json();
    const projects: BIM360Project[] = [];

    for (const hub of data.data) {
      const projectsResponse = await fetch(
        `https://developer.api.autodesk.com/project/v1/hubs/${hub.id}/projects`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        projectsData.data.forEach((project: any) => {
          const projectData: BIM360Project = {
            id: project.id,
            name: project.attributes.name,
            hubId: hub.id,
            accountId: hub.relationships.account.data.id,
            lastModified: project.attributes.lastModified,
          };
          this.projects.set(projectData.id, projectData);
          projects.push(projectData);
        });
      }
    }

    return projects;
  }

  /**
   * Lista modelos de um projeto
   */
  async listModels(projectId: string): Promise<BIM360Model[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list models');
    }

    const data = await response.json();
    const models: BIM360Model[] = [];

    // Em produção, navegar pela estrutura de pastas para encontrar arquivos IFC/RVT
    // Aqui simulamos a lista de modelos
    data.data.forEach((item: any) => {
      if (item.attributes.type === 'folders') {
        // Recursivamente buscar arquivos
      }
    });

    return models;
  }

  /**
   * Faz upload de modelo para BIM 360
   */
  async uploadModel(projectId: string, file: File, folderId: string): Promise<BIM360Model> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // 1. Criar storage location
    const storageResponse = await fetch(
      `https://developer.api.autodesk.com/oss/v2/buckets/${projectId}/objects/${file.name}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: file,
      }
    );

    if (!storageResponse.ok) {
      throw new Error('Failed to upload to storage');
    }

    const storageData = await storageResponse.json();

    // 2. Criar versão no Data Management
    const versionResponse = await fetch(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonapi: { version: '1.0' },
          data: {
            type: 'items',
            attributes: {
              displayName: file.name,
              extension: file.name.split('.').pop(),
            },
            relationships: {
              parent: {
                data: {
                  type: 'folders',
                  id: folderId,
                },
              },
              tip: {
                data: {
                  type: 'versions',
                  id: storageData.objectId,
                },
              },
            },
          },
        }),
      }
    );

    if (!versionResponse.ok) {
      throw new Error('Failed to create version');
    }

    const versionData = await versionResponse.json();

    const model: BIM360Model = {
      id: versionData.data.id,
      name: file.name,
      projectId,
      version: 1,
      size: file.size,
      format: file.name.endsWith('.ifc') ? 'ifc' : 'rvt',
      urn: storageData.objectId,
    };

    this.models.set(model.id, model);
    return model;
  }

  /**
   * Faz download de modelo do BIM 360
   */
  async downloadModel(modelId: string): Promise<ArrayBuffer> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    const response = await fetch(
      `https://developer.api.autodesk.com/oss/v2/buckets/${model.projectId}/objects/${model.urn}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download model');
    }

    return await response.arrayBuffer();
  }

  /**
   * Sincroniza modelo local com BIM 360
   */
  async syncModel(modelId: string, localData: ArrayBuffer): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const model = this.models.get(modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    // Upload nova versão
    await this.uploadModel(model.projectId, new File([localData], model.name), model.id);
    console.log('[BIM360Service] Model synced:', modelId);
  }

  /**
   * Retorna projeto por ID
   */
  getProject(projectId: string): BIM360Project | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Retorna modelo por ID
   */
  getModel(modelId: string): BIM360Model | undefined {
    return this.models.get(modelId);
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Faz logout
   */
  logout(): void {
    this.accessToken = null;
    this.projects.clear();
    this.models.clear();
    console.log('[BIM360Service] Logged out');
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.logout();
    this.config = null;
  }
}

// Singleton instance
let bim360ServiceInstance: BIM360Service | null = null;

export function getBIM360Service(): BIM360Service {
  if (!bim360ServiceInstance) {
    bim360ServiceInstance = new BIM360Service();
  }
  return bim360ServiceInstance;
}

export default BIM360Service;
