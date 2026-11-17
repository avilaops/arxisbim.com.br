import { defineConfig } from 'vitest/config';
const connection = process.env.TEST_DATABASE_URL;
if (
  !connection ||
  !/(?:^|_)test(?:_|$)/i.test(new URL(connection).pathname.slice(1))
)
  throw new Error('Explicit disposable TEST_DATABASE_URL required');
export default defineConfig({
  test: {
    include: ['tests/integration/financial-matrix.spec.ts'],
    pool: 'forks',
    hookTimeout: 30000,
    testTimeout: 60000,
  },
});
