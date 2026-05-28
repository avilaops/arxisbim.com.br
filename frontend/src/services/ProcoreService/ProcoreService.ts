/**
 * ProcoreService
 * Integração com Procore para sincronização de projetos e documentos
 * Suporta gerenciamento de projetos, documentos e RFIs
 */

export interface ProcoreProject {
  id: number;
  name: string;
  company_id: number;
  active: boolean;
  created_at: string;
}

export interface ProcoreDocument {
  id: number;
  name: string;
  project_id: number;
  folder_id: number;
  file_type: string;
  size: number;
  created_at: string;
}

export interface ProcoreRFI {
  id: number;
  title: string;
  project_id: number;
  status: string;
  created_at: string;
  due_date: string;
}

export interface ProcoreConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
}

class ProcoreService {
  private config: ProcoreConfig | null = null;
  private accessToken: string | null = null;
  private projects: Map<number, ProcoreProject> = new Map();
  private documents: Map<number, ProcoreDocument> = new Map();

  /**
   * Configura autenticação OAuth2
   */
  configure(config: ProcoreConfig): void {
    this.config = config;
    console.log('[ProcoreService] Configured');
  }

  /**
   * Inicia fluxo de autenticação
   */
  authenticate(): void {
    if (!this.config) {
      throw new Error('ProcoreService not configured');
    }

    const authUrl = new URL(`${this.config.apiBaseUrl}/oauth/authorize`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.config.clientId);
    authUrl.searchParams.append('redirect_uri', this.config.redirectUri);

    window.location.href = authUrl.toString();
  }

  /**
   * Troca código por token de acesso
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    if (!this.config) {
      throw new Error('ProcoreService not configured');
    }

    const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    console.log('[ProcoreService] Authenticated');
  }

  /**
   * Lista projetos do usuário
   */
  async listProjects(): Promise<ProcoreProject[]> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.config.apiBaseUrl}/v1.0/projects`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list projects');
    }

    const data = await response.json();
    const projects: ProcoreProject[] = [];

    data.forEach((project: any) => {
      const projectData: ProcoreProject = {
        id: project.id,
        name: project.name,
        company_id: project.company_id,
        active: project.active,
        created_at: project.created_at,
      };
      this.projects.set(projectData.id, projectData);
      projects.push(projectData);
    });

    return projects;
  }

  /**
   * Lista documentos de um projeto
   */
  async listDocuments(projectId: number, folderId?: number): Promise<ProcoreDocument[]> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const url = folderId 
      ? `${this.config.apiBaseUrl}/v1.0/projects/${projectId}/documents/folders/${folderId}/documents`
      : `${this.config.apiBaseUrl}/v1.0/projects/${projectId}/documents`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list documents');
    }

    const data = await response.json();
    const documents: ProcoreDocument[] = [];

    data.forEach((doc: any) => {
      const docData: ProcoreDocument = {
        id: doc.id,
        name: doc.name,
        project_id: projectId,
        folder_id: doc.folder_id,
        file_type: doc.file_type,
        size: doc.size,
        created_at: doc.created_at,
      };
      this.documents.set(docData.id, docData);
      documents.push(docData);
    });

    return documents;
  }

  /**
   * Faz upload de documento para Procore
   */
  async uploadDocument(projectId: number, folderId: number, file: File): Promise<ProcoreDocument> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('document[file]', file);
    formData.append('document[name]', file.name);

    const response = await fetch(
      `${this.config.apiBaseUrl}/v1.0/projects/${projectId}/documents/folders/${folderId}/documents`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    const data = await response.json();

    const document: ProcoreDocument = {
      id: data.id,
      name: data.name,
      project_id: projectId,
      folder_id: folderId,
      file_type: file.name.split('.').pop() || '',
      size: file.size,
      created_at: data.created_at,
    };

    this.documents.set(document.id, document);
    return document;
  }

  /**
   * Faz download de documento do Procore
   */
  async downloadDocument(documentId: number): Promise<ArrayBuffer> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/v1.0/projects/${document.project_id}/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return await response.arrayBuffer();
  }

  /**
   * Lista RFIs de um projeto
   */
  async listRFIs(projectId: number): Promise<ProcoreRFI[]> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/v1.0/projects/${projectId}/rfis`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list RFIs');
    }

    const data = await response.json();
    const rfis: ProcoreRFI[] = [];

    data.forEach((rfi: any) => {
      const rfiData: ProcoreRFI = {
        id: rfi.id,
        title: rfi.title,
        project_id: projectId,
        status: rfi.status,
        created_at: rfi.created_at,
        due_date: rfi.due_date,
      };
      rfis.push(rfiData);
    });

    return rfis;
  }

  /**
   * Cria novo RFI
   */
  async createRFI(projectId: number, rfi: Partial<ProcoreRFI>): Promise<ProcoreRFI> {
    if (!this.accessToken || !this.config) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/v1.0/projects/${projectId}/rfis`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfi: {
            title: rfi.title,
            status: rfi.status || 'Open',
            due_date: rfi.due_date,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create RFI');
    }

    const data = await response.json();

    return {
      id: data.id,
      title: data.title,
      project_id: projectId,
      status: data.status,
      created_at: data.created_at,
      due_date: data.due_date,
    };
  }

  /**
   * Retorna projeto por ID
   */
  getProject(projectId: number): ProcoreProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Retorna documento por ID
   */
  getDocument(documentId: number): ProcoreDocument | undefined {
    return this.documents.get(documentId);
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
    this.documents.clear();
    console.log('[ProcoreService] Logged out');
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
let procoreServiceInstance: ProcoreService | null = null;

export function getProcoreService(): ProcoreService {
  if (!procoreServiceInstance) {
    procoreServiceInstance = new ProcoreService();
  }
  return procoreServiceInstance;
}

export default ProcoreService;
