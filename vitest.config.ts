import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './',
    include: ['backend/tests/e2e/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@modules': path.resolve(__dirname, 'backend/src/modules'),
      '@shared': path.resolve(__dirname, 'backend/src/shared'),
    },
    extensions: ['.ts', '.js', '.mjs', '.json'],
  },
  esbuild: {
    target: 'esnext',
  },
});
