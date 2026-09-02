import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const { reconcileSchema } = await import('./dist/core/db/schema-reconciler.js');
const r = await reconcileSchema(sql);
console.log('checked:', r.checked);
console.log('added  :', r.added.length ? r.added.join(', ') : '(nenhuma)');
console.log('errors :', r.errors.length ? r.errors.join(', ') : '(nenhum)');
await sql.end();
