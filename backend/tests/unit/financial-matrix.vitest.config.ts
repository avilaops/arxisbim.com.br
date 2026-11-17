import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/unit/financial-matrix.spec.ts'],
    pool: 'forks',
    testTimeout: 30000,
  },
});
