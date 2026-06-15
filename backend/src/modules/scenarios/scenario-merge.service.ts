import type { Sql } from 'postgres';

export class ScenarioMergeService {
  constructor(private sql: Sql) {}

  async mergeScenario(
    tenantId: string,
    projectId: string,
    scenarioId: string
  ): Promise<void> {
    await this.sql.begin(async (tx) => {
      // 1. Fetch scenario to merge
      const [scenario] = await tx`
        SELECT id FROM scenarios
        WHERE id = ${scenarioId} AND project_id = ${projectId} AND tenant_id = ${tenantId}
      `;

      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // 2. Promote this scenario as the new baseline
      await tx`
        UPDATE scenarios
        SET is_base_scenario = true,
            archived_at = null,
            updated_at = NOW()
        WHERE id = ${scenarioId}
      `;

      // 3. Demote/Archive all other active scenarios in the same project
      await tx`
        UPDATE scenarios
        SET is_base_scenario = false,
            archived_at = NOW(),
            updated_at = NOW()
        WHERE project_id = ${projectId}
          AND tenant_id = ${tenantId}
          AND id <> ${scenarioId}
          AND deleted_at IS NULL
      `;
    });
  }
}
