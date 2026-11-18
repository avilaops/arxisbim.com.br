import { sql } from 'drizzle-orm';
import { scenarios } from '../../shared/database/schema/scenarios.js';
/** Generic viewer saves may replace presentation metadata, never the dedicated planning resource. */
export function presentationMetadata(value: unknown) {
  const incoming =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return sql`(${JSON.stringify(incoming)}::text::jsonb - 'planningKanban') ||
   CASE WHEN COALESCE(${scenarios.metadata}, '{}'::jsonb) ? 'planningKanban'
   THEN jsonb_build_object('planningKanban', ${scenarios.metadata}->'planningKanban') ELSE '{}'::jsonb END`;
}
