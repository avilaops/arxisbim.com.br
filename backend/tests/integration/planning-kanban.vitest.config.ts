import { defineConfig } from 'vitest/config';
const url = process.env.TEST_DATABASE_URL;
if (!url || !/(?:^|_)test(?:_|$)/i.test(new URL(url).pathname.slice(1)))
  throw new Error('Explicit disposable TEST_DATABASE_URL required');
export default defineConfig({
  test: {
    include: ['tests/integration/planning-kanban.spec.ts'],
    pool: 'forks',
    hookTimeout: 30000,
    testTimeout: 60000,
  },
});
