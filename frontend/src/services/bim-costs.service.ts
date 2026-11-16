import {sessionFetch} from '@/core/auth/session-redirect'
import { bimRequest } from './bim-api'
import { buildApiV1Url } from '@/config/apiBaseUrl'

export interface Quantity {
  globalId: string
  ifcType: string
  name: string | null
  storeyId: number | null
  areaM2: string | null
  volumeM3: string | null
  lengthM: string | null
}
export interface QuantityCategory {
  ifcType: string
  elementCount: number
  areaM2: string | null
  volumeM3: string | null
  lengthM: string | null
}
export interface Quantities {
  modelVersionId?: string | null
  ifcModelId?: string | null
  items: Quantity[]
  total: number
  categories: QuantityCategory[]
}
export interface CostTable {
  id: string
  name: string
  scenario_id: string | null
  project_id: string
}
export interface CostItem {
  id: string
  cost_table_id: string
  code?: string
  description: string
  unit: string
  unit_price: string
}
export interface CostCalculation {
  scenario_id: string
  total_cost: string
  element_count: number
  elements: Array<{
    global_id: string
    ifc_type: string
    quantity: string
    unit: string
    unit_price: string
    total_cost: string
  }>
  breakdown: {
    by_type: Record<
      string,
      { quantity: string; unit: string; total_cost: string; count: number }
    >
  }
}
export interface FinancialDetail {
  id: string
  name: string
  totalCost: string
  durationDays: number
  completionDate: string | null
}
export interface FinancialComparison {
  scenarioA: FinancialDetail
  scenarioB: FinancialDetail
  deltaCost: string
  deltaDays: number
  recommendation: { winningScenarioId: string; explanation: string }
}

export function normalizarPreco(input: string): string {
  let value = input.trim()
  if (value.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,4}$/.test(value))
      throw new Error('Informe um preço válido, com até quatro casas decimais.')
    value = value.replaceAll('.', '').replace(',', '.')
  }
  if (!/^\d+(?:\.\d{1,4})?$/.test(value))
    throw new Error('Informe um preço válido, como 125,50.')
  value = value.replace(/^0+(?=\d)/, '')
  if (value.split('.')[0].length > 8)
    throw new Error('O preço unitário excede o limite de 99.999.999,9999.')
  return value
}

export const money = (value: string | number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(value))
export const quantity = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(
        Number(value),
      )
export const bimCosts = {
  prepare: (modelId: string, scenarioId: string) =>
    bimRequest<{
      modelVersionId: string
      status: string
      elementCount: number
      quantitiesCount: number
    }>(`/ifc/${modelId}/prepare-5d`, {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    }),
  quantities: (scenarioId: string, offset = 0) =>
    bimRequest<Quantities>(
      `/scenarios/${scenarioId}/quantities?limit=1000&offset=${offset}`,
    ),
  tables: (projectId: string) =>
    bimRequest<CostTable[]>(`/projects/${projectId}/cost-tables`),
  createTable: (projectId: string, scenarioId: string, name: string) =>
    bimRequest<CostTable>('/cost-tables', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        scenario_id: scenarioId,
        name,
        source: 'custom',
        reference_month: null,
      }),
    }),
  items: (tableId: string) =>
    bimRequest<CostItem[]>(`/cost-tables/${tableId}/items`),
  createItem: (
    tableId: string,
    data: {
      code: string
      description: string
      unit: string
      unit_price: string
    },
  ) =>
    bimRequest<CostItem>(`/cost-tables/${tableId}/items`, {
      method: 'POST',
      body: JSON.stringify({ ...data, cost_table_id: tableId }),
    }),
  updatePrice: (itemId: string, price: string) =>
    bimRequest<CostItem>(`/cost-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ unit_price: price }),
    }),
  deleteItem: (itemId: string) =>
    bimRequest(`/cost-items/${itemId}`, { method: 'DELETE' }),
  priceCategory: (
    scenarioId: string,
    data: { costItemId: string; ifcType: string; quantityUnit: string },
  ) =>
    bimRequest<{
      linkedElements: number
      skippedElements: number
      quantityUnit: string
    }>(`/scenarios/${scenarioId}/price-category`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  calculation: (scenarioId: string) =>
    bimRequest<CostCalculation>(`/scenarios/${scenarioId}/cost-calculation`),
  recalculate: (scenarioId: string) =>
    bimRequest<CostCalculation>(
      `/scenarios/${scenarioId}/cost-calculation/recalculate`,
      { method: 'POST' },
    ),
  compare: (projectId: string, a: string, b: string) =>
    bimRequest<FinancialComparison>(
      `/scenarios/${a}/compare/${b}/financial?projectId=${encodeURIComponent(projectId)}`,
    ),
  async pdf(projectId: string, a: string, b: string): Promise<Blob> {
    const response = await sessionFetch(
      buildApiV1Url(
        `/scenarios/${a}/compare/${b}/pdf?projectId=${encodeURIComponent(projectId)}`,
      ),
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
        },
      },
    )
    if (!response.ok)
      throw new Error(
        `Não foi possível exportar o PDF (HTTP ${response.status}).`,
      )
    return response.blob()
  },
}
