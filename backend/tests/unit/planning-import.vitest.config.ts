import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/unit/schedule-import-workflow.spec.ts',
      'tests/unit/planning-import-routes.spec.ts',
    ],
    pool: 'forks',
  },
});
