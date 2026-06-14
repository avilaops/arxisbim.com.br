/**
 * run-pending-migrations.mjs
 * Standalone script to apply pending migrations.
 * Usage: node backend/scripts/run-pending-migrations.mjs
 * Render One-Off Job command: node /opt/render/project/src/backend/scripts/run-pending-migrations.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';


const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const ssl = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('postgres:') ? false : 'require';
const sql = postgres(DATABASE_URL, { ssl, max: 1 });


try {
  // Ensure migrations table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  const migrationsDir = join(__dirname, 'migrations');

  if (!existsSync(migrationsDir)) {
    console.error('❌ Migrations dir not found:', migrationsDir);
    process.exit(1);
  }

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const applied = await sql`SELECT filename FROM _migrations`;
  const appliedSet = new Set(applied.map(r => r.filename));

  console.log(`📋 Total migrations: ${files.length}, Applied: ${appliedSet.size}, Pending: ${files.filter(f => !appliedSet.has(f)).length}`);
  console.log('Applied:', [...appliedSet].join(', ') || '(none)');

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  Skip (already applied): ${file}`);
      continue;
    }
    console.log(`▶️  Applying: ${file}`);
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf8');
    try {
      await sql.unsafe(sqlContent);
      await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
      console.log(`✅ Applied: ${file}`);
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
      throw err;
    }
  }

  console.log('🎉 All migrations complete');
} finally {
  await sql.end();
}
