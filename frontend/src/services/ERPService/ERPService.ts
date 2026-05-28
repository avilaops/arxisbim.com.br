/**
 * ERPService
 * Integração com sistemas ERP (SAP, Oracle) para sincronização de dados
 * Suporta orçamentos, materiais, cronogramas e recursos
 */

export type ERPType = 'sap' | 'oracle';

export interface ERPConfig {
  type: ERPType;
  baseUrl: string;
  apiKey: string;
  username?: string;
  password?: string;
}

export interface ERPBudget {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  currency: string;
  approved: boolean;
  lastUpdated: string;
}

export interface ERPMaterial {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  available: boolean;
}

export interface ERPSchedule {
  id: string;
  taskId: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies: string[];
  assignedTo: string[];
}

class ERPService {
  private config: ERPConfig | null = null;
  private budgets: Map<string, ERPBudget> = new Map();
  private materials: Map<string, ERPMaterial> = new Map();
  private schedules: Map<string, ERPSchedule> = new Map();

  /**
   * Configura conexão com ERP
   */
  configure(config: ERPConfig): void {
    this.config = config;
    console.log('[ERPService] Configured for:', config.type);
  }

  /**
   * Testa conexão com ERP
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[ERPService] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Lista orçamentos de um projeto
   */
  async listBudgets(projectId: string): Promise<ERPBudget[]> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    const endpoint = this.config.type === 'sap' 
      ? '/api/budgets' 
      : '/api/projects/budgets';

    const response = await fetch(`${this.config.baseUrl}${endpoint}?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list budgets');
    }

    const data = await response.json();
    const budgets: ERPBudget[] = [];

    data.forEach((budget: any) => {
      const budgetData: ERPBudget = {
        id: budget.id,
        projectId: budget.projectId || projectId,
        category: budget.category,
        amount: budget.amount,
        currency: budget.currency || 'USD',
        approved: budget.approved || false,
        lastUpdated: budget.lastUpdated || new Date().toISOString(),
      };
      this.budgets.set(budgetData.id, budgetData);
      budgets.push(budgetData);
    });

    return budgets;
  }

  /**
   * Cria novo orçamento
   */
  async createBudget(budget: Partial<ERPBudget>): Promise<ERPBudget> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    const endpoint = this.config.type === 'sap' 
      ? '/api/budgets' 
      : '/api/projects/budgets';

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budget),
    });

    if (!response.ok) {
      throw new Error('Failed to create budget');
    }

    const data = await response.json();

    const budgetData: ERPBudget = {
      id: data.id,
      projectId: data.projectId,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      approved: data.approved,
      lastUpdated: data.lastUpdated,
    };

    this.budgets.set(budgetData.id, budgetData);
    return budgetData;
  }

  /**
   * Atualiza orçamento
   */
  async updateBudget(budgetId: string, updates: Partial<ERPBudget>): Promise<ERPBudget> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    const endpoint = this.config.type === 'sap' 
      ? `/api/budgets/${budgetId}` 
      : `/api/projects/budgets/${budgetId}`;

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update budget');
    }

    const data = await response.json();

    const budgetData: ERPBudget = {
      id: data.id,
      projectId: data.projectId,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      approved: data.approved,
      lastUpdated: data.lastUpdated,
    };

    this.budgets.set(budgetData.id, budgetData);
    return budgetData;
  }

  /**
   * Lista materiais
   */
  async listMaterials(projectId?: string): Promise<ERPMaterial[]> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    const endpoint = this.config.type === 'sap' 
      ? '/api/materials' 
      : '/api/inventory/materials';

    const url = projectId 
      ? `${this.config.baseUrl}${endpoint}?projectId=${projectId}`
      : `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list materials');
    }

    const data = await response.json();
    const materials: ERPMaterial[] = [];

    data.forEach((material: any) => {
      const materialData: ERPMaterial = {
        id: material.id,
        code: material.code,
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        unitPrice: material.unitPrice,
        supplier: material.supplier,
        available: material.available !== false,
      };
      this.materials.set(materialData.id, materialData);
      materials.push(materialData);
    });

    return materials;
  }

  /**
   * Lista cronograma do projeto
   */
  async listSchedule(projectId: string): Promise<ERPSchedule[]> {
    if (!this.config) {
      throw new Error('ERPService not configured');
    }

    const endpoint = this.config.type === 'sap' 
      ? '/api/schedule' 
      : '/api/projects/schedule';

    const response = await fetch(`${this.config.baseUrl}${endpoint}?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list schedule');
    }

    const data = await response.json();
    const schedules: ERPSchedule[] = [];

    data.forEach((task: any) => {
      const scheduleData: ERPSchedule = {
        id: task.id,
        taskId: task.taskId,
        name: task.name,
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress || 0,
        dependencies: task.dependencies || [],
        assignedTo: task.assignedTo || [],
      };
      this.schedules.set(scheduleData.id, scheduleData);
      schedules.push(scheduleData);
    });

    return schedules;
  }

  /**
   * Sincroniza dados do projeto com ERP
   */
  async syncProject(projectId: string): Promise<void> {
    console.log('[ERPService] Syncing project:', projectId);

    // Sincronizar orçamentos
    await this.listBudgets(projectId);

    // Sincronizar materiais
    await this.listMaterials(projectId);

    // Sincronizar cronograma
    await this.listSchedule(projectId);

    console.log('[ERPService] Project synced:', projectId);
  }

  /**
   * Retorna orçamento por ID
   */
  getBudget(budgetId: string): ERPBudget | undefined {
    return this.budgets.get(budgetId);
  }

  /**
   * Retorna material por ID
   */
  getMaterial(materialId: string): ERPMaterial | undefined {
    return this.materials.get(materialId);
  }

  /**
   * Retorna tarefa do cronograma por ID
   */
  getSchedule(scheduleId: string): ERPSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Retorna configuração
   */
  getConfig(): ERPConfig | null {
    return this.config;
  }

  /**
   * Limpa cache local
   */
  clearCache(): void {
    this.budgets.clear();
    this.materials.clear();
    this.schedules.clear();
    console.log('[ERPService] Cache cleared');
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.clearCache();
    this.config = null;
    console.log('[ERPService] Disposed');
  }
}

// Singleton instance
let erpServiceInstance: ERPService | null = null;

export function getERPService(): ERPService {
  if (!erpServiceInstance) {
    erpServiceInstance = new ERPService();
  }
  return erpServiceInstance;
}

export default ERPService;
