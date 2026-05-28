/**
 * BudgetApiClient — REST wrapper around `/api/v1/budgets`.
 *
 * Network failures bubble as rejected promises. Callers are expected to
 * keep the in-memory BudgetManager as a write-through cache and reconcile
 * with the server response (server is authoritative for `id`/`totalCost`).
 */

import type { CostItem, NewBudget, NewCostItem } from '../BudgetManager';

export interface ApiBudgetItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  linkedElements: Array<string | number>;
  position: number;
}

export interface ApiBudget {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string | null;
  totalCost: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  items?: ApiBudgetItem[];
}

export interface BudgetApiClientOptions {
  /** Base URL for the API. Defaults to relative `/api/v1/budgets`. */
  baseUrl?: string;
  /** Returns the bearer token (defaults to `localStorage.arxisvr_token`). */
  getToken?: () => string | null;
  /** Optional fetch (DI for tests). */
  fetchImpl?: typeof fetch;
}

export class BudgetApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: BudgetApiClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? '/api/v1/budgets';
    this.getToken = opts.getToken ?? (() => (typeof localStorage !== 'undefined' ? localStorage.getItem('arxisvr_token') : null));
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  async list(projectId?: string): Promise<ApiBudget[]> {
    const url = projectId ? `${this.baseUrl}?projectId=${encodeURIComponent(projectId)}` : this.baseUrl;
    const json = await this.request<{ success: boolean; data: ApiBudget[] }>('GET', url);
    return json.data ?? [];
  }

  async get(id: string): Promise<ApiBudget> {
    const json = await this.request<{ success: boolean; data: ApiBudget }>('GET', `${this.baseUrl}/${id}`);
    return json.data;
  }

  async create(projectId: string, input: NewBudget): Promise<ApiBudget> {
    const body = {
      projectId,
      name: input.name,
      items: (input.items ?? []).map((i) => toApiItem(i)),
    };
    const json = await this.request<{ success: boolean; data: ApiBudget }>('POST', this.baseUrl, body);
    return json.data;
  }

  async remove(id: string): Promise<void> {
    await this.request<void>('DELETE', `${this.baseUrl}/${id}`);
  }

  async addItem(budgetId: string, item: NewCostItem): Promise<ApiBudgetItem> {
    const json = await this.request<{ success: boolean; data: ApiBudgetItem }>(
      'POST',
      `${this.baseUrl}/${budgetId}/items`,
      toApiItem(item),
    );
    return json.data;
  }

  async updateItem(budgetId: string, itemId: string, patch: Partial<CostItem>): Promise<ApiBudgetItem> {
    const json = await this.request<{ success: boolean; data: ApiBudgetItem }>(
      'PUT',
      `${this.baseUrl}/${budgetId}/items/${itemId}`,
      patch,
    );
    return json.data;
  }

  async removeItem(budgetId: string, itemId: string): Promise<void> {
    await this.request<void>('DELETE', `${this.baseUrl}/${budgetId}/items/${itemId}`);
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && typeof errJson === 'object' && 'error' in errJson) {
          message = `${message}: ${(errJson as { error: unknown }).error}`;
        }
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

function toApiItem(i: NewCostItem): {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  linkedElements: Array<string | number>;
} {
  return {
    description: i.description,
    unit: String(i.unit),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    linkedElements: i.linkedElements ?? [],
  };
}
