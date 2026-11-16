import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/unit/planning-kanban.spec.ts'], pool: 'forks' },
});
