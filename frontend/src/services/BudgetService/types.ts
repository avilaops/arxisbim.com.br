/**
 * BudgetService Types
 * Type definitions for budget management, 5D takeoff, and financial calculations
 */

export interface Budget {
  id: string;
  projectId: string;
  modelId?: string;
  name: string;
  description?: string;
  type: 'direct' | 'indirect' | 'comparative';
  status: 'draft' | 'active' | 'archived';
  items: BudgetItem[];
  totalCost: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  metadata?: Record<string, any>;
}

export interface BudgetInput {
  projectId: string;
  modelId?: string;
  name: string;
  description?: string;
  type: 'direct' | 'indirect' | 'comparative';
  items?: BudgetItemInput[];
  currency?: string;
  metadata?: Record<string, any>;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  source?: 'manual' | 'calculated' | 'database';
  databaseRef?: string; // Reference to price database (SINAPI, TCPO, etc.)
  properties?: Record<string, any>;
  parentId?: string;
  children?: BudgetItem[];
}

export interface BudgetItemInput {
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  source?: 'manual' | 'calculated' | 'database';
  databaseRef?: string;
  properties?: Record<string, any>;
  parentId?: string;
}

export interface TakeoffResult {
  budgetId: string;
  modelId: string;
  items: TakeoffItem[];
  summary: TakeoffSummary;
  calculatedAt: string;
}

export interface TakeoffItem {
  id: string;
  elementId: string;
  elementType: string;
  category: string;
  quantity: number;
  unit: string;
  properties: Record<string, any>;
  matchedBudgetItem?: string;
}

export interface TakeoffSummary {
  totalItems: number;
  totalQuantity: number;
  categories: Record<string, { count: number; quantity: number }>;
  unmatchedItems: number;
}

export interface BudgetHistory {
  id: string;
  budgetId: string;
  version: number;
  changes: BudgetChange[];
  changedBy: string;
  changedAt: string;
  comment?: string;
}

export interface BudgetChange {
  type: 'create' | 'update' | 'delete';
  field: string;
  oldValue?: any;
  newValue?: any;
  itemId?: string;
}

export interface BudgetSimulationResult {
  originalBudget: Budget;
  simulatedBudget: Budget;
  changes: SimulationChange[];
  totalCostDifference: number;
  percentageDifference: number;
}

export interface SimulationChange {
  type: 'item_added' | 'item_removed' | 'item_modified' | 'price_changed';
  itemId?: string;
  description: string;
  impact: number;
}

export interface BudgetAttachment {
  id: string;
  budgetId: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface BudgetExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeDetails?: boolean;
  includeHistory?: boolean;
  template?: string;
  language?: string;
}

export interface PriceDatabaseItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  price: number;
  source: 'SINAPI' | 'TCPO' | 'custom';
  region?: string;
  validFrom: string;
  validTo?: string;
}

export interface BudgetFilter {
  projectId?: string;
  type?: 'direct' | 'indirect' | 'comparative';
  status?: 'draft' | 'active' | 'archived';
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}

export interface TakeoffParams {
  modelId: string;
  filters?: {
    elementTypes?: string[];
    categories?: string[];
    properties?: Record<string, any>;
  };
  rules?: TakeoffRule[];
}

export interface TakeoffRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  targetCategory?: string;
  formula?: string;
}
