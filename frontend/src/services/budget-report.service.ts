import { bimRequest } from './bim-api';
import { sessionFetch } from '@/core/auth/session-redirect';
import { buildApiV1Url } from '@/config/apiBaseUrl';
export interface StoreyQuantities {
  storeyId: number | null;
  storeyName: string | null;
  ifcType: string;
  elementCount: number;
  areaM2: string | null;
  volumeM3: string | null;
  lengthM: string | null;
}
export interface BudgetReportData {
  scenarioId: string;
  scenarioName: string;
  modelVersionId: string | null;
  generatedAt: string;
  offset: number;
  totalElements: number;
  totalLinks: number;
  totalCost: string;
  storeys: StoreyQuantities[];
  costs: Array<{
    globalId: string;
    ifcType: string;
    storeyId: number | null;
    code: string | null;
    sinapiItemId?: string | null;
    notes?: string | null;
    description: string;
    tableName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalCost: string;
  }>;
}
export const budgetReports = {
  get: (scenarioId: string, offset = 0) =>
    bimRequest<BudgetReportData>(`/scenarios/${scenarioId}/budget-report?offset=${offset}`),
  async xlsx(scenarioId: string): Promise<Blob> {
    const response = await sessionFetch(
      buildApiV1Url(`/scenarios/${scenarioId}/budget-report.xlsx`),
      { headers: { Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}` } }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Não foi possível exportar o orçamento.');
    }
    return response.blob();
  },
};
