import { defineConfig } from 'vitest/config';

// SQL-boundary tests plus optional PostgreSQL cases using COSTS_5D_TEST_DATABASE_URL explicitly.
// No env-file loading: never fall back to the application's configured database.
export default defineConfig({ test: { include: ['tests/unit/costs-5d.spec.ts'], pool: 'forks' } });
