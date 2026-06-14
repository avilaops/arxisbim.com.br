/**
 * CostBillingService - Integra custos calculados ao sistema de billing
 * Sincroniza total_cost com budget/invoices para auditar e cobrar projetos
 */

import type { Sql } from 'postgres';

export interface BillingCostSnapshot {
  scenario_id: string;
  project_id: string;
  total_cost: string;
  element_count: number;
  calculated_at: Date;
  billing_status: 'pending' | 'invoiced' | 'paid';
  invoice_id?: string;
}

export class CostBillingService {
  constructor(private sql: Sql) {}

  /**
   * Registra snapshot de custo para cobrança
   */
  async recordCostSnapshot(
    scenarioId: string,
    projectId: string,
    totalCost: string,
    elementCount: number
  ): Promise<BillingCostSnapshot> {
    const result = await this.sql<BillingCostSnapshot[]>`
      INSERT INTO billing_cost_snapshots (
        scenario_id, project_id, total_cost, element_count, billing_status, created_at
      ) VALUES (
        ${scenarioId}, ${projectId}, ${totalCost}, ${elementCount}, 'pending', NOW()
      )
      RETURNING
        scenario_id, project_id, total_cost, element_count,
        calculated_at, billing_status, invoice_id
    `;

    return result[0];
  }

  /**
   * Link custo a invoice para auditoria
   */
  async linkToInvoice(scenarioId: string, invoiceId: string): Promise<void> {
    await this.sql`
      UPDATE billing_cost_snapshots
      SET invoice_id = ${invoiceId}, billing_status = 'invoiced'
      WHERE scenario_id = ${scenarioId}
    `;
  }

  /**
   * Retorna custos por projeto (agregado por período)
   */
  async getProjectCostsSummary(projectId: string, monthStart: Date, monthEnd: Date): Promise<{
    total_cost: string;
    scenario_count: number;
    avg_cost_per_scenario: string;
  }> {
    const result = await this.sql<any[]>`
      SELECT
        SUM(total_cost)::DECIMAL(14,2) as total_cost,
        COUNT(DISTINCT scenario_id) as scenario_count,
        AVG(total_cost)::DECIMAL(14,2) as avg_cost_per_scenario
      FROM billing_cost_snapshots
      WHERE project_id = ${projectId}
        AND created_at >= ${monthStart}
        AND created_at < ${monthEnd}
    `;

    return {
      total_cost: result[0]?.total_cost || '0.00',
      scenario_count: result[0]?.scenario_count || 0,
      avg_cost_per_scenario: result[0]?.avg_cost_per_scenario || '0.00'
    };
  }

  /**
   * Retorna custos não-cobrados para billing
   */
  async getUnbilledCosts(projectId: string): Promise<BillingCostSnapshot[]> {
    return this.sql<BillingCostSnapshot[]>`
      SELECT
        scenario_id, project_id, total_cost, element_count,
        calculated_at, billing_status, invoice_id
      FROM billing_cost_snapshots
      WHERE project_id = ${projectId}
        AND billing_status = 'pending'
      ORDER BY created_at DESC
    `;
  }
}
