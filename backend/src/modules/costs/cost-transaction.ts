import type { Sql } from 'postgres';

/** Shared with IFC preparation. Always lock the project before locking its scenarios. */
export async function lockCostProject(sql: Sql, projectId: string): Promise<void> {
  await sql`SELECT pg_advisory_xact_lock(hashtextextended(${projectId}, 514005005))`;
}

export async function assertUnambiguousCostIdentity(sql: Sql, scenarioId: string): Promise<void> {
  const invalid = await sql`
    SELECT ep.global_id
    FROM element_properties ep
    JOIN scenarios s ON s.model_version_id = ep.model_version_id
    WHERE s.id = ${scenarioId}
    GROUP BY ep.global_id
    HAVING BTRIM(ep.global_id) = '' OR COUNT(*) > 1
    LIMIT 1
  `;
  if (invalid.length) {
    throw Object.assign(new Error('Ambiguous IFC element identity: empty or duplicate GlobalId'), { statusCode: 409 });
  }
}
