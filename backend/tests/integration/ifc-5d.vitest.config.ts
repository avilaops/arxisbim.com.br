import { defineConfig } from 'vitest/config';

// An explicitly selected disposable database is required; no env-file loading or schema mutation.
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for IFC 5D integration tests');
export default defineConfig({ test: {
  include: ['tests/integration/ifc-5d.spec.ts'], pool: 'forks',
  testTimeout: 30_000, hookTimeout: 30_000,
  env: { DATABASE_URL: process.env.TEST_DATABASE_URL, NODE_ENV: 'test' },
} });
