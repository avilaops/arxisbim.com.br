import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(rootDir, 'migrations');
const databaseUrl = process.env.DATABASE_URL;
const verifyDbName = process.env.MIGRATION_VERIFY_DB || 'arxisvr_migration_verify';

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Example: $env:DATABASE_URL = "<postgres-url>"; node scripts/verify-migrations.mjs');
  process.exit(1);
}

if (!existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

function shouldUseSsl(url) {
  return !(url.includes('localhost') || url.includes('127.0.0.1') || url.includes('postgres:'));
}

function withDatabase(url, databaseName) {
  const parsed = new URL(url);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

async function dropDatabase(adminSql, dbName) {
  await adminSql`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = ${dbName} AND pid <> pg_backend_pid()
  `;
  await adminSql.unsafe(`DROP DATABASE IF EXISTS "${dbName.replaceAll('"', '""')}"`);
}

async function applyMigrations(sql, passName) {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  const appliedRows = await sql`SELECT filename FROM _migrations`;
  const applied = new Set(appliedRows.map((row) => row.filename));
  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      skippedCount += 1;
      continue;
    }

    const migrationSql = readFileSync(join(migrationsDir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(migrationSql);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });
    applied.add(file);
    appliedCount += 1;
  }

  console.log(`${passName}: ${appliedCount} applied, ${skippedCount} skipped, ${files.length} total`);
}

async function verifySchema(sql) {
  const expectedColumns = [
    'status',
    'processing_error',
    'processing_attempts',
    'processing_started_at',
    'processing_completed_at',
  ];

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ifc_models'
      AND column_name = ANY(${expectedColumns})
    ORDER BY column_name
  `;
  const foundColumns = new Set(columns.map((row) => row.column_name));
  const missingColumns = expectedColumns.filter((column) => !foundColumns.has(column));
  if (missingColumns.length > 0) {
    throw new Error(`Missing ifc_models columns: ${missingColumns.join(', ')}`);
  }

  const indexes = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'model_elements'
      AND indexname = 'model_elements_ifc_model_express_idx'
  `;

  if (indexes.length !== 1 || !indexes[0].indexdef.includes('(ifc_model_id, express_id)')) {
    throw new Error('Missing composite index model_elements(ifc_model_id, express_id)');
  }

  console.log(`Verified ifc_models columns: ${expectedColumns.join(', ')}`);
  console.log('Verified composite index: model_elements(ifc_model_id, express_id)');
}

const adminDb = new URL(databaseUrl).pathname.replace(/^\//, '') || 'postgres';
const adminUrl = withDatabase(databaseUrl, adminDb);
const verifyUrl = withDatabase(databaseUrl, verifyDbName);
const ssl = shouldUseSsl(databaseUrl) ? 'require' : false;
const adminSql = postgres(adminUrl, { ssl, max: 1 });
let verifySql;

try {
  await dropDatabase(adminSql, verifyDbName);
  await adminSql.unsafe(`CREATE DATABASE "${verifyDbName.replaceAll('"', '""')}"`);
  console.log(`Created temporary database: ${verifyDbName}`);

  verifySql = postgres(verifyUrl, { ssl, max: 1 });
  await applyMigrations(verifySql, 'first run');
  await applyMigrations(verifySql, 'second run');
  await verifySchema(verifySql);

  console.log('Migration verification completed successfully.');
} finally {
  if (verifySql) {
    await verifySql.end({ timeout: 5 });
  }
  await dropDatabase(adminSql, verifyDbName).catch((error) => {
    console.error(`Failed to drop temporary database ${verifyDbName}: ${error.message}`);
  });
  await adminSql.end({ timeout: 5 });
}
