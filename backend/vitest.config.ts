import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
  },
  resolve: {
    alias: {
      '@modules': resolve(__dirname, 'src/modules'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@routes': resolve(__dirname, 'src/routes'),
    },
  },
});
