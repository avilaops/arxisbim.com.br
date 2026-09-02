// Espelha runMigrations() de src/index.ts, mas FALHA no primeiro erro.
// O runner de producao segue em frente de proposito; aqui o objetivo e
// justamente descobrir o que quebra no Postgres 18.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const dir = process.argv[2];
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

await sql`CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW() NOT NULL
)`;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const applied = new Set((await sql`SELECT filename FROM _migrations`).map(r => r.filename));

const failures = [];
for (const file of files) {
  if (applied.has(file)) continue;
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });
    console.log(`OK   ${file}`);
  } catch (err) {
    console.log(`FAIL ${file} :: ${err.message}`);
    failures.push({ file, message: err.message });
  }
}
console.log(`\n=== aplicadas: ${files.length - failures.length}/${files.length}, falhas: ${failures.length} ===`);
for (const f of failures) console.log(`  - ${f.file}: ${f.message}`);
await sql.end();
process.exit(failures.length ? 1 : 0);
