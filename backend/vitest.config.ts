import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    pool: 'forks',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      JWT_SECRET: 'test-jwt-secret-key-for-vitest-tests-only',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-for-vitest-tests-only',
      // Padrão é o Postgres local, mas dá para apontar para outro banco de
      // teste sem editar este arquivo: útil em máquina sem Postgres instalado,
      // onde o banco vem por túnel SSH. Nunca aponte para produção.
      DATABASE_URL:
        process.env.TEST_DATABASE_URL
        || 'postgresql://postgres:postgres@localhost:5432/arxisvr_test',
      NODE_ENV: 'test',
      STORAGE_DRIVER: 'local',
      EMAIL_PROVIDER: 'log',
      EMAIL_FROM: 'test@test.com',
      REQUIRE_EMAIL_VERIFICATION: 'false',
      FRONTEND_URL: 'http://localhost:5173',
      BILLING_PROVIDER: 'mercadopago',
      MP_ACCESS_TOKEN: 'TEST-000000-placeholder',
      MP_WEBHOOK_SECRET: 'mp-webhook-secret-placeholder',
      CORS_ORIGIN: 'http://localhost:5173',
    },
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
