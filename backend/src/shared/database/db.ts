import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { logDatabaseQuery } from '../../core/observability/service.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';

// Create postgres.js client
const client = postgres(connectionString, {
  debug: (connection, query, parameters) => {
    logDatabaseQuery(query, parameters, connection);
  }
});

// Create drizzle instance
export const db = drizzle(client, { schema });

/**
 * Run a block inside a transaction with RLS tenant context set.
 * Use this for any write operation that needs RLS enforcement.
 * SELECT queries are already scoped by application-level WHERE clauses;
 * RLS provides the DB-level safety net.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(`SET LOCAL app.tenant_id = '${tenantId.replace(/'/g, "''")}'`);
    return fn(tx as unknown as typeof db);
  });
}
