/**
 * WorkflowTemplateService
 * Gerenciamento de templates de workflows para automação
 * Fornece templates pré-configurados para automações comuns
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'notification' | 'approval' | 'sync' | 'backup' | 'custom';
  nodes: any[];
  triggers: any[];
  variables: Record<string, any>;
  isSystem: boolean;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  templateId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

class WorkflowTemplateService {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor() {
    this.initializeSystemTemplates();
  }

  /**
   * Inicializa templates do sistema
   */
  private initializeSystemTemplates(): void {
    // Template de notificação de projeto
    this.templates.set('project_notification', {
      id: 'project_notification',
      name: 'Notificação de Projeto',
      description: 'Envia notificações quando há alterações no projeto',
      category: 'notification',
      nodes: [
        { id: 'trigger', type: 'trigger', config: { event: 'project_updated' } },
        { id: 'notify', type: 'action', config: { action: 'send_notification' } },
      ],
      triggers: [{ type: 'event', event: 'project_updated' }],
      variables: { recipients: [], message: '' },
      isSystem: true,
      createdAt: new Date().toISOString(),
    });

    // Template de aprovação
    this.templates.set('approval_workflow', {
      id: 'approval_workflow',
      name: 'Fluxo de Aprovação',
      description: 'Processo de aprovação para alterações críticas',
      category: 'approval',
      nodes: [
        { id: 'trigger', type: 'trigger', config: { event: 'change_requested' } },
        { id: 'notify', type: 'action', config: { action: 'notify_approvers' } },
        { id: 'wait', type: 'delay', config: { duration: 86400 } },
        { id: 'check', type: 'condition', config: { condition: 'approved' } },
        { id: 'approve', type: 'action', config: { action: 'approve_change' } },
      ],
      triggers: [{ type: 'event', event: 'change_requested' }],
      variables: { approvers: [], timeout: 7 },
      isSystem: true,
      createdAt: new Date().toISOString(),
    });

    // Template de sincronização
    this.templates.set('sync_workflow', {
      id: 'sync_workflow',
      name: 'Sincronização com ERP',
      description: 'Sincroniza dados do projeto com sistema ERP',
      category: 'sync',
      nodes: [
        { id: 'trigger', type: 'trigger', config: { event: 'project_saved' } },
        { id: 'extract', type: 'action', config: { action: 'extract_data' } },
        { id: 'transform', type: 'action', config: { action: 'transform_data' } },
        { id: 'sync', type: 'action', config: { action: 'sync_to_erp' } },
      ],
      triggers: [{ type: 'event', event: 'project_saved' }],
      variables: { erpSystem: 'sap', syncFields: [] },
      isSystem: true,
      createdAt: new Date().toISOString(),
    });

    // Template de backup
    this.templates.set('backup_workflow', {
      id: 'backup_workflow',
      name: 'Backup Automático',
      description: 'Cria backup do projeto periodicamente',
      category: 'backup',
      nodes: [
        { id: 'trigger', type: 'schedule', config: { cron: '0 2 * * *' } },
        { id: 'backup', type: 'action', config: { action: 'create_backup' } },
        { id: 'notify', type: 'action', config: { action: 'notify_completion' } },
      ],
      triggers: [{ type: 'schedule', schedule: '0 2 * * *' }],
      variables: { retentionDays: 30, destination: 'cloud' },
      isSystem: true,
      createdAt: new Date().toISOString(),
    });

    console.log('[WorkflowTemplateService] System templates initialized');
  }

  /**
   * Cria novo template
   */
  createTemplate(template: Omit<WorkflowTemplate, 'id' | 'isSystem' | 'createdAt'>): WorkflowTemplate {
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: this.generateTemplateId(),
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    this.templates.set(newTemplate.id, newTemplate);
    console.log('[WorkflowTemplateService] Template created:', newTemplate.id);
    return newTemplate;
  }

  /**
   * Atualiza template existente
   */
  updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    if (template.isSystem) {
      console.warn('[WorkflowTemplateService] Cannot update system template');
      return null;
    }

    const updatedTemplate = { ...template, ...updates };
    this.templates.set(templateId, updatedTemplate);

    console.log('[WorkflowTemplateService] Template updated:', templateId);
    return updatedTemplate;
  }

  /**
   * Remove template
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    if (template.isSystem) {
      console.warn('[WorkflowTemplateService] Cannot delete system template');
      return false;
    }

    this.templates.delete(templateId);
    console.log('[WorkflowTemplateService] Template deleted:', templateId);
    return true;
  }

  /**
   * Duplica template
   */
  duplicateTemplate(templateId: string): WorkflowTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const duplicated: WorkflowTemplate = {
      ...template,
      id: this.generateTemplateId(),
      name: `${template.name} (Cópia)`,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    this.templates.set(duplicated.id, duplicated);
    console.log('[WorkflowTemplateService] Template duplicated:', duplicated.id);
    return duplicated;
  }

  /**
   * Executa workflow a partir de template
   */
  async executeTemplate(templateId: string, variables?: Record<string, any>): Promise<WorkflowExecution> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      templateId,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };

    this.executions.set(execution.id, execution);

    try {
      execution.status = 'running';
      
      // Simular execução dos nós
      for (const node of template.nodes) {
        await this.executeNode(node, { ...template.variables, ...variables });
      }

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      execution.result = { success: true };

      console.log('[WorkflowTemplateService] Workflow executed:', execution.id);
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      console.error('[WorkflowTemplateService] Workflow execution failed:', execution.id, error);
    }

    return execution;
  }

  /**
   * Executa nó individual
   */
  private async executeNode(node: any, variables: Record<string, any>): Promise<void> {
    console.log('[WorkflowTemplateService] Executing node:', node.id, 'type:', node.type);

    // Simular execução baseada no tipo
    switch (node.type) {
      case 'trigger':
        // Gatilho já foi disparado
        break;
      case 'action':
        await this.executeAction(node.config, variables);
        break;
      case 'delay':
        await this.executeDelay(node.config);
        break;
      case 'condition':
        await this.executeCondition(node.config, variables);
        break;
    }
  }

  /**
   * Executa ação
   */
  private async executeAction(config: any, variables: Record<string, any>): Promise<void> {
    // Simular execução de ação
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Executa delay
   */
  private async executeDelay(config: any): Promise<void> {
    const duration = config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Executa condição
   */
  private async executeCondition(config: any, variables: Record<string, any>): Promise<void> {
    // Simular avaliação de condição
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Retorna template por ID
   */
  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Lista todos os templates
   */
  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Lista templates por categoria
   */
  listTemplatesByCategory(category: string): WorkflowTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Lista templates do sistema
   */
  listSystemTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.isSystem);
  }

  /**
   * Lista templates customizados
   */
  listCustomTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values()).filter(t => !t.isSystem);
  }

  /**
   * Retorna execução por ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Lista execuções de um template
   */
  listTemplateExecutions(templateId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.templateId === templateId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  /**
   * Gera ID de template
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID de execução
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.templates.clear();
    this.executions.clear();
    console.log('[WorkflowTemplateService] Disposed');
  }
}

// Singleton instance
let workflowTemplateServiceInstance: WorkflowTemplateService | null = null;

export function getWorkflowTemplateService(): WorkflowTemplateService {
  if (!workflowTemplateServiceInstance) {
    workflowTemplateServiceInstance = new WorkflowTemplateService();
  }
  return workflowTemplateServiceInstance;
}

export default WorkflowTemplateService;
