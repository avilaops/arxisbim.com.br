/**
 * env.ts — carregado via --import ANTES de qualquer módulo
 * Resolve o problema ESM: imports resolvem antes do código do módulo,
 * então dotenvConfig no index.ts chega tarde demais.
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Ordem: backend/.env sobrescreve .env.production (override: true)
dotenvConfig({ path: resolve(__dirname, '../../../.env.production'), override: false });
dotenvConfig({ path: resolve(__dirname, '../../../.env.local'), override: false });
dotenvConfig({ path: resolve(__dirname, '../.env'), override: true });
