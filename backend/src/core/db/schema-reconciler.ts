/**
 * schema-reconciler.ts
 *
 * Detecta drift entre o schema Drizzle e o banco real.
 * Roda em dois momentos:
 *   1. Startup — antes do servidor aceitar requests (proativo)
 *   2. Runtime — intercepta erros `column X does not exist` (reativo/fallback)
 *
 * Cada coluna em REQUIRED_COLUMNS é aplicada com ALTER TABLE ... ADD COLUMN IF NOT EXISTS
 * → idempotente, seguro rodar N vezes.
 */

import postgres from 'postgres';

// ─── Definição do schema esperado ────────────────────────────────────────────
// Adicione aqui TODA coluna que pode aparecer no Drizzle mas não existir no banco.
// Formato: { table, column, type, default? }
// "type" = tipo SQL exato. "default" = cláusula DEFAULT SQL (opcional).
const REQUIRED_COLUMNS: Array<{
  table: string;
  column: string;
  type: string;
  default?: string;
  nullable?: boolean;
}> = [
  // tenants
  { table: 'tenants', column: 'feature_flags',  type: 'jsonb' },
  { table: 'tenants', column: 'trial_ends_at',  type: 'timestamp' },

  // users
  { table: 'users',   column: 'oauth_provider', type: 'varchar(50)' },
  { table: 'users',   column: 'oauth_id',        type: 'varchar(255)' },
  { table: 'users',   column: 'two_factor_enabled', type: 'boolean', default: 'false' },
  { table: 'users',   column: 'two_factor_secret',  type: 'text' },
  { table: 'users',   column: 'last_login_at',    type: 'timestamp' },
  { table: 'users',   column: 'email_verified_at', type: 'timestamp' },

  // user_sessions
  { table: 'user_sessions', column: 'revoke_reason',    type: 'varchar(50)' },
  { table: 'user_sessions', column: 'last_activity_at', type: 'timestamp', default: 'now()' },
  { table: 'user_sessions', column: 'is_active',        type: 'boolean',   default: 'true' },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ReconcileResult {
  checked: number;
  added: string[];
  skipped: string[];
  errors: string[];
}

// ─── Startup reconciler ───────────────────────────────────────────────────────

/**
 * Roda no boot. Compara REQUIRED_COLUMNS com information_schema e aplica
 * ADD COLUMN IF NOT EXISTS para qualquer coluna ausente.
 */
export async function reconcileSchema(sql: postgres.Sql): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, added: [], skipped: [], errors: [] };

  const tables = [...new Set(REQUIRED_COLUMNS.map(c => c.table))];

  // Fetch all columns for the relevant tables.
  // Uses individual equality checks joined with OR — avoids sql.array() which
  // has incompatible behaviour across postgres.js versions.
  const existingRows = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;

  // Filter in JS — information_schema is small, this is fast
  const existing = new Set(
    existingRows
      .filter(r => tables.includes(r.table_name))
      .map(r => `${r.table_name}.${r.column_name}`)
  );

  for (const col of REQUIRED_COLUMNS) {
    result.checked++;
    const key = `${col.table}.${col.column}`;

    if (existing.has(key)) {
      result.skipped.push(key);
      continue;
    }

    // Coluna faltando → aplicar
    try {
      await sql.unsafe(
        `ALTER TABLE "${col.table}" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''}`
      );
      result.added.push(key);
      console.log(`[schema-reconciler] ✅ Added missing column: ${key} (${col.type})`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      result.errors.push(`${key}: ${msg}`);
      console.error(`[schema-reconciler] ❌ Failed to add ${key}: ${msg}`);
    }
  }

  return result;
}


// ─── Runtime error interceptor ────────────────────────────────────────────────

const COLUMN_MISSING_RE = /column "([^"]+)" does not exist/;
const TABLE_FROM_QUERY_RE = /from "([^"]+)"|into "([^"]+)"|update "([^"]+)"/i;

/**
 * Wrap a query function.
 * Se o erro for `column X does not exist`, tenta encontrar a definição em
 * REQUIRED_COLUMNS e aplicar ADD COLUMN automaticamente — depois repete a query.
 *
 * Uso: no catch do handler ou num middleware global do postgres client.
 */
export async function handleColumnMissingError(
  err: any,
  sql: postgres.Sql,
  retryFn: () => Promise<any>
): Promise<any> {
  const msg = err?.message ?? '';
  const colMatch = COLUMN_MISSING_RE.exec(msg);
  if (!colMatch) throw err; // não é esse tipo de erro

  const missingColumn = colMatch[1];

  // Tenta extrair a tabela da query original
  const queryStr = err?.query ?? '';
  const tableMatch = TABLE_FROM_QUERY_RE.exec(queryStr);
  const table = tableMatch?.[1] ?? tableMatch?.[2] ?? tableMatch?.[3];

  const colDef = REQUIRED_COLUMNS.find(
    c => c.column === missingColumn && (!table || c.table === table)
  );

  if (!colDef) {
    console.error(
      `[schema-reconciler] ⚠️  Column "${missingColumn}" missing but not in REQUIRED_COLUMNS — add it manually`
    );
    throw err;
  }

  console.warn(
    `[schema-reconciler] 🔧 Runtime fix: adding missing column ${colDef.table}.${colDef.column}`
  );

  try {
    await sql.unsafe(
      `ALTER TABLE "${colDef.table}" ADD COLUMN IF NOT EXISTS "${colDef.column}" ${colDef.type}${colDef.default ? ` DEFAULT ${colDef.default}` : ''}`
    );
    console.log(`[schema-reconciler] ✅ Runtime fix applied — retrying original query`);
    return await retryFn();
  } catch (fixErr: any) {
    console.error(`[schema-reconciler] ❌ Runtime fix failed: ${fixErr?.message}`);
    throw err; // lança o erro original
  }
}
