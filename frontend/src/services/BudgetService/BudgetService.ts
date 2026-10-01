/**
 * BudgetService
 * Manages budgets, 5D takeoff calculations, and financial operations
 */

import { api } from '../../api/client';
import type {
  Budget,
  BudgetInput,
  BudgetItem,
  BudgetItemInput,
  TakeoffResult,
  TakeoffParams,
  BudgetHistory,
  BudgetSimulationResult,
  BudgetAttachment,
  BudgetExportOptions,
  BudgetFilter,
} from './types';

export class BudgetService {
  private baseURL: string = '/api/v1/budgets';

  /**
   * Create a new budget
   */
  async createBudget(data: BudgetInput): Promise<Budget> {
    return api.post<Budget>(this.baseURL, data);
  }

  /**
   * Get a budget by ID
   */
  async getBudget(id: string): Promise<Budget> {
    return api.get<Budget>(`${this.baseURL}/${id}`);
  }

  /**
   * Update a budget
   */
  async updateBudget(id: string, data: Partial<BudgetInput>): Promise<Budget> {
    return api.put<Budget>(`${this.baseURL}/${id}`, data);
  }

  /**
   * Delete a budget
   */
  async deleteBudget(id: string): Promise<void> {
    return api.delete(`${this.baseURL}/${id}`);
  }

  /**
   * List budgets with optional filters
   */
  async listBudgets(filter?: BudgetFilter): Promise<Budget[]> {
    return api.get<Budget[]>(this.baseURL, filter);
  }

  /**
   * Add an item to a budget
   */
  async addBudgetItem(budgetId: string, item: BudgetItemInput): Promise<BudgetItem> {
    return api.post<BudgetItem>(`${this.baseURL}/${budgetId}/items`, item);
  }

  /**
   * Update a budget item
   */
  async updateBudgetItem(budgetId: string, itemId: string, data: Partial<BudgetItemInput>): Promise<BudgetItem> {
    return api.put<BudgetItem>(`${this.baseURL}/${budgetId}/items/${itemId}`, data);
  }

  /**
   * Delete a budget item
   */
  async deleteBudgetItem(budgetId: string, itemId: string): Promise<void> {
    return api.delete(`${this.baseURL}/${budgetId}/items/${itemId}`);
  }

  /**
   * Calculate 5D takeoff from IFC model
   */
  async calculateTakeoff(params: TakeoffParams): Promise<TakeoffResult> {
    return api.post<TakeoffResult>(`${this.baseURL}/takeoff`, params);
  }

  /**
   * Apply takeoff results to budget
   */
  async applyTakeoff(budgetId: string, takeoffId: string): Promise<Budget> {
    return api.post<Budget>(`${this.baseURL}/${budgetId}/takeoff/${takeoffId}/apply`);
  }

  /**
   * Export budget in specified format
   */
  async exportBudget(id: string, options: BudgetExportOptions): Promise<Blob> {
    const url = `${this.baseURL}/${id}/export`;
    return api.downloadFile(url, `budget-${id}.${this.getFileExtension(options.format)}`, {
      headers: { 'Accept': this.getAcceptHeader(options.format) },
    });
  }

  /**
   * Get budget history
   */
  async getBudgetHistory(id: string): Promise<BudgetHistory[]> {
    return api.get<BudgetHistory[]>(`${this.baseURL}/${id}/history`);
  }

  /**
   * Restore budget to a specific version
   */
  async restoreBudgetVersion(id: string, version: number): Promise<Budget> {
    return api.post<Budget>(`${this.baseURL}/${id}/history/${version}/restore`);
  }

  /**
   * Simulate budget scenario
   */
  async simulateScenario(id: string, changes: Partial<BudgetInput>): Promise<BudgetSimulationResult> {
    return api.post<BudgetSimulationResult>(`${this.baseURL}/${id}/simulate`, changes);
  }

  /**
   * Attach document to budget
   */
  async attachDocument(budgetId: string, file: File): Promise<string> {
    return api.uploadFile(`${this.baseURL}/${budgetId}/attachments`, file);
  }

  /**
   * List budget attachments
   */
  async listAttachments(budgetId: string): Promise<BudgetAttachment[]> {
    return api.get<BudgetAttachment[]>(`${this.baseURL}/${budgetId}/attachments`);
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(budgetId: string, attachmentId: string): Promise<void> {
    return api.delete(`${this.baseURL}/${budgetId}/attachments/${attachmentId}`);
  }

  /**
   * Clone a budget
   */
  async cloneBudget(id: string, newName: string): Promise<Budget> {
    return api.post<Budget>(`${this.baseURL}/${id}/clone`, { name: newName });
  }

  /**
   * Archive a budget
   */
  async archiveBudget(id: string): Promise<Budget> {
    return api.post<Budget>(`${this.baseURL}/${id}/archive`);
  }

  /**
   * Activate a budget
   */
  async activateBudget(id: string): Promise<Budget> {
    return api.post<Budget>(`${this.baseURL}/${id}/activate`);
  }

  /**
   * Get budget summary statistics
   */
  async getBudgetSummary(id: string): Promise<{
    totalCost: number;
    totalItems: number;
    categoryBreakdown: Record<string, number>;
    currency: string;
  }> {
    return api.get(`${this.baseURL}/${id}/summary`);
  }

  /**
   * Search price database
   */
  async searchPriceDatabase(query: string, category?: string): Promise<any[]> {
    return api.get(`${this.baseURL}/price-database/search`, { query, category });
  }

  /**
   * Get price database item
   */
  async getPriceDatabaseItem(id: string): Promise<any> {
    return api.get(`${this.baseURL}/price-database/${id}`);
  }

  /**
   * Helper to get Accept header for export format
   */
  /**
   * Extensão do arquivo baixado. O formato não serve como extensão: 'excel'
   * gerava `budget-<id>.excel`, que nenhum sistema operacional abre.
   */
  private getFileExtension(format: string): string {
    const extensoes: Record<string, string> = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      json: 'json',
    };
    return extensoes[format] || format;
  }

  private getAcceptHeader(format: string): string {
    const headers: Record<string, string> = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
    };
    return headers[format] || 'application/json';
  }
}

// Create singleton instance
export const budgetService = new BudgetService();

export default BudgetService;
