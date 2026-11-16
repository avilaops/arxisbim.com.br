import { bimRequest } from './bim-api'
import { buildApiV1Url } from '@/config/apiBaseUrl'
export interface MatrixRow {
  id: string
  name: string
  totalCost: string | null
  durationDays: number | null
  completionDate: string | null
  modelElements: number
  pricedElements: number
  costLinks: number
  issues: string[]
  deltaCost: string | null
  deltaDays: number | null
  score: number | null
  rank: number | null
}
export interface FinancialMatrixResult {
  projectName: string
  baselineId: string
  generatedAt: string
  revision: string
  weights: { cost: number; time: number }
  scenarios: MatrixRow[]
  warnings: string[]
  recommendation: { winningScenarioIds: string[]; explanation: string }
}
export const financialMatrixApi = {
  compare: (projectId: string, scenarioIds: string[], baselineId: string) =>
    bimRequest<FinancialMatrixResult>(
      `/projects/${projectId}/financial-matrix`,
      { method: 'POST', body: JSON.stringify({ scenarioIds, baselineId }) },
    ),
  async pdf(
    projectId: string,
    scenarioIds: string[],
    baselineId: string,
    revision: string,
  ): Promise<Blob> {
    const response = await fetch(
      buildApiV1Url(`/projects/${projectId}/financial-matrix/pdf`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenarioIds, baselineId, revision }),
      },
    )
    if (!response.ok) {
      const detail = await response.json().catch(() => null)
      throw new Error(detail?.error || 'Não foi possível exportar a matriz.')
    }
    return response.blob()
  },
}
