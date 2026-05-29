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

export interface FederatedModel {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  models: Array<{
    ifcModelId: string;
    transformation?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
    visible?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface BIMSchedule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTask {
  id: string;
  scheduleId: string;
  taskName: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string[];
  isCriticalPath: boolean;
  createdAt: string;
}

export interface TaskElementLink {
  id: string;
  taskId: string;
  elementId: string;
  action?: string;
}

export interface TimelineSimulation {
  id: string;
  scheduleId: string;
  name?: string;
  simulationDate: string;
  snapshot: {
    visibleElements: string[];
    hiddenElements: string[];
    partialElements: Record<string, number>;
  };
  createdAt: string;
}

export interface MeetingRoom {
  id: string;
  projectId: string;
  roomUrl: string;
  meetingCode: string;
  hostUserId: string;
  isActive: boolean;
  createdAt: string;
}

export interface MeetingParticipant {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
  isHost: boolean;
}

export interface MeetingMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface Scenario {
  id: string;
  tenantId: string;
  projectId: string;
  createdBy: string | null;
  name: string;
  description: string | null;
  presetId: string | null;
  camera: any;
  player: any;
  config: any;
  metadata: Record<string, unknown> | null;
  createdAt: string;
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

  async downloadIFCModel(modelId: string): Promise<Blob> {
    const token = localStorage.getItem('arxisvr_token');
    const response = await fetch(`${API_BASE_URL}/api/v1/ifc-models/${modelId}/download`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    if (!response.ok) throw new Error('Failed to download IFC model');
    return response.blob();
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

  // Federated Models
  async getFederatedModels(projectId: string): Promise<FederatedModel[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/federated-models`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch federated models');
    return response.json();
  }

  async getFederatedModel(federatedId: string): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch federated model');
    return response.json();
  }

  async createFederatedModel(projectId: string, data: {
    name: string;
    description?: string;
    modelReferences: Array<{
      ifcModelId: string;
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
      visible?: boolean;
    }>;
  }): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/federated-models`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create federated model');
    return response.json();
  }

  async updateFederatedModel(federatedId: string, data: {
    name?: string;
    description?: string;
    models?: Array<{
      ifcModelId: string;
      transformation?: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
      };
      visible?: boolean;
    }>;
  }): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update federated model');
    return response.json();
  }

  async deleteFederatedModel(federatedId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete federated model');
  }

  async addModelToFederated(federatedId: string, data: {
    ifcModelId: string;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    visible?: boolean;
  }): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}/models`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add model to federated model');
    return response.json();
  }

  async removeModelFromFederated(federatedId: string, ifcModelId: string): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}/models/${ifcModelId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove model from federated model');
    return response.json();
  }

  async updateModelTransform(federatedId: string, ifcModelId: string, data: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    visible?: boolean;
  }): Promise<FederatedModel> {
    const response = await fetch(`${API_BASE_URL}/api/v1/federated-models/${federatedId}/models/${ifcModelId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update model transform');
    return response.json();
  }

  // BIM Scheduling (4D)
  async getSchedules(projectId: string): Promise<BIMSchedule[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/schedules`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch schedules');
    return response.json();
  }

  async getSchedule(scheduleId: string): Promise<BIMSchedule> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return response.json();
  }

  async createSchedule(projectId: string, data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    createdBy: string;
  }): Promise<BIMSchedule> {
    const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/schedules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create schedule');
    return response.json();
  }

  async updateSchedule(scheduleId: string, data: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<BIMSchedule> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update schedule');
    return response.json();
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete schedule');
  }

  async getScheduleTasks(scheduleId: string): Promise<ScheduleTask[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}/tasks`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  }

  async createTask(scheduleId: string, data: {
    taskName: string;
    startDate: string;
    endDate: string;
    progress?: number;
    dependencies?: string[];
    isCriticalPath?: boolean;
  }): Promise<ScheduleTask> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  }

  async updateTask(taskId: string, data: {
    taskName?: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    dependencies?: string[];
    isCriticalPath?: boolean;
  }): Promise<ScheduleTask> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  }

  async deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete task');
  }

  async getTaskElements(taskId: string): Promise<TaskElementLink[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/elements`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch task elements');
    return response.json();
  }

  async linkElementToTask(taskId: string, data: {
    elementId: string;
    action?: string;
  }): Promise<TaskElementLink> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/elements`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to link element to task');
    return response.json();
  }

  async unlinkElementFromTask(taskId: string, elementId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/elements/${elementId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to unlink element');
  }

  async getSimulations(scheduleId: string): Promise<TimelineSimulation[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}/simulations`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch simulations');
    return response.json();
  }

  async createSimulation(scheduleId: string, data: {
    name?: string;
    simulationDate: string;
    snapshot: {
      visibleElements: string[];
      hiddenElements: string[];
      partialElements: Record<string, number>;
    };
  }): Promise<TimelineSimulation> {
    const response = await fetch(`${API_BASE_URL}/api/v1/schedules/${scheduleId}/simulations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create simulation');
    return response.json();
  }

  async deleteSimulation(simulationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/simulations/${simulationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete simulation');
  }

  // Virtual Meetings (XR Avatars)
  async createMeetingRoom(projectId: string, data: {
    settings?: {
      maxParticipants?: number;
      allowRecording?: boolean;
      allowChat?: boolean;
    };
    avatarSettings?: {
      defaultAvatar?: string;
      allowCustomAvatars?: boolean;
    };
  }): Promise<MeetingRoom> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ projectId, ...data }),
    });
    if (!response.ok) throw new Error('Failed to create meeting room');
    return response.json();
  }

  async getMeetingRoom(roomId: string): Promise<MeetingRoom> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/${roomId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting room');
    return response.json();
  }

  async getMeetingRoomByCode(code: string): Promise<MeetingRoom> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/code/${code}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting room by code');
    return response.json();
  }

  async getProjectMeetingRooms(projectId: string): Promise<MeetingRoom[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/project/${projectId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project meeting rooms');
    return response.json();
  }

  async getMeetingParticipants(roomId: string): Promise<MeetingParticipant[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/${roomId}/participants`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting participants');
    return response.json();
  }

  async getMeetingMessages(roomId: string, limit = 50): Promise<MeetingMessage[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/${roomId}/messages?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting messages');
    return response.json();
  }

  async getMeetingMediaConfig(roomId: string, userName?: string): Promise<any> {
    const url = userName
      ? `${API_BASE_URL}/api/v1/meetings/${roomId}/media-config?userName=${encodeURIComponent(userName)}`
      : `${API_BASE_URL}/api/v1/meetings/${roomId}/media-config`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting media config');
    return response.json();
  }

  async endMeetingRoom(roomId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/meetings/${roomId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to end meeting room');
  }

  // Scenarios
  async getScenarios(projectId: string): Promise<Scenario[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenarios?projectId=${projectId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch scenarios');
    const result = await response.json();
    return result.data || [];
  }

  async getScenario(scenarioId: string): Promise<Scenario> {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenarios/${scenarioId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch scenario');
    const result = await response.json();
    return result.data;
  }

  async createScenario(data: {
    projectId: string;
    name: string;
    description?: string;
    camera: any;
    player: any;
    config?: any;
  }): Promise<Scenario> {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenarios`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create scenario');
    const result = await response.json();
    return result.data;
  }

  async updateScenario(scenarioId: string, data: {
    name?: string;
    description?: string;
    camera?: any;
    player?: any;
    config?: any;
  }): Promise<Scenario> {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenarios/${scenarioId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update scenario');
    const result = await response.json();
    return result.data;
  }

  async deleteScenario(scenarioId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenarios/${scenarioId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete scenario');
  }
}

export const tenantService = new TenantService();
