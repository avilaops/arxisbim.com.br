import { buildApiV1Url } from '@/config/apiBaseUrl'

export interface BillingPlan {
  tier: string
  name: string
  description: string
  monthlyAmountCents: number
  yearlyAmountCents?: number
  currency: string
  features: string[]
  limits: Record<string, number>
}

interface BillingPlansResponse {
  plans: BillingPlan[]
  provider: string
}

export const plansService = {
  async get(): Promise<BillingPlansResponse> {
    const response = await fetch(buildApiV1Url('/billing/plans'))
    if (!response.ok) throw new Error('Falha ao carregar os planos')
    return response.json()
  },
}
