/**
 * env.ts — carregado via --import ANTES de qualquer módulo (dev only).
 *
 * Resolve o problema ESM: imports resolvem antes do código do módulo,
 * então dotenvConfig no index.ts chega tarde demais.
 *
 * Estratégia: um único arquivo por ambiente, na raiz do monorepo.
 *   - .env.local       → desenvolvimento (default)
 *   - .env.production  → produção (fallback; em prod real, Render injeta via dashboard)
 *
 * Em produção (Render), env.ts NÃO é usado — `node dist/index.js` roda
 * direto com as envs injetadas pelo Render. Este loader é apenas para dev.
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// backend/src/ → raiz do monorepo (../../)
const root = resolve(__dirname, '../..');

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.local';

dotenvConfig({ path: resolve(root, envFile) });
