const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export interface Tenant {
  id: string;
  tenantId: string;
  name: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
  };
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    maxUsers?: number;
    maxProjects?: number;
    maxStorageGB?: number;
    vrEnabled?: boolean;
    arEnabled?: boolean;
    federationEnabled?: boolean;
  };
  settings?: {
    defaultLanguage?: string;
    timezone?: string;
    features?: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  companyId: string;
  tenantId: string;
  name: string;
  branding?: {
    logo?: string;
    colors?: { primary: string; secondary: string };
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface IFCModel {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  originalName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  ifcType?: string;
  discipline?: string;
  phase?: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  metadata?: {
    author?: string;
    application?: string;
    schema?: string;
    timestamp?: string;
    version?: string;
    description?: string;
    elements?: number;
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  uploadedAt: string;
  updatedAt: string;
}

class TenantService {
  private getAuthHeaders() {
    const token = localStorage.getItem('arxisvr_token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tenants');
    return response.json();
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tenant');
    return response.json();
  }

  async createTenant(data: {
    name: string;
    customDomain?: string;
    maxProjects?: number;
    federationEnabled?: boolean;
  }): Promise<Tenant> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create tenant');
    return response.json();
  }

  async updateTenant(tenantId: string, data: {
    name?: string;
    customDomain?: string;
    maxProjects?: number;
    federationEnabled?: boolean;
  }): Promise<Tenant> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update tenant');
    return response.json();
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete tenant');
  }

  // Companies
  async getCompanies(tenantId: string): Promise<Company[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/companies`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch companies');
    return response.json();
  }

  async getCompany(companyId: string): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch company');
    return response.json();
  }

  async createCompany(tenantId: string, data: {
    name: string;
    logo?: string;
    colors?: { primary: string; secondary: string };
  }): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/companies`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create company');
    return response.json();
  }

  async updateCompany(companyId: string, data: {
    name?: string;
    logo?: string;
    colors?: { primary: string; secondary: string };
    isActive?: boolean;
  }): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update company');
    return response.json();
  }

  async deleteCompany(companyId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete company');
  }

  // Projects
  async getProjects(tenantId: string): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/projects`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }

  async getCompanyProjects(companyId: string): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/projects`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch company projects');
    return response.json();
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  }

  async createProject(tenantId: string, companyId: string, data: {
    name: string;
    description?: string;
    location?: {
      address?: string;
      city?: string;
      country?: string;
      coordinates?: { lat: number; lng: number };
    };
  }): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/companies/${companyId}/projects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  }

  async updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    location?: {
      address?: string;
      city?: string;
      country?: string;
      coordinates?: { lat: number; lng: number };
    };
    status?: 'active' | 'archived' | 'completed';
  }): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  }

  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete project');
  }

  // IFC Models
  async getIFCModels(projectId: string): Promise<IFCModel[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/ifc-models`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch IFC models');
    return response.json();
  }

  async getIFCModel(modelId: string): Promise<IFCModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ifc-models/${modelId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch IFC model');
    return response.json();
  }

  async uploadIFCModel(projectId: string, file: File): Promise<IFCModel> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('arxisvr_token');
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/ifc-models`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload IFC model');
    return response.json();
  }

  async updateIFCModel(modelId: string, data: {
    name?: string;
    discipline?: string;
    phase?: string;
    metadata?: {
      author?: string;
      application?: string;
      schema?: string;
      timestamp?: string;
      version?: string;
      description?: string;
      elements?: number;
      bounds?: {
        min: [number, number, number];
        max: [number, number, number];
      };
    };
  }): Promise<IFCModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ifc-models/${modelId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update IFC model');
    return response.json();
  }

  async deleteIFCModel(modelId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ifc-models/${modelId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete IFC model');
  }
}

export const tenantService = new TenantService();
