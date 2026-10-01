import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function setup() {
  config({ path: resolve(__dirname, '../.env.test'), override: false });

  // Os parsers IFC rodam em worker_threads e, mesmo sob o vitest, o worker é
  // carregado de `dist/` (ver `workerUrl()` em
  // src/modules/ifc/ifc-parser-structure.service.ts). Sem build prévio, o
  // tests/integration/ifc-flow.spec.ts falha com "Cannot find module
  // .../dist/modules/ifc/ifc-parser.worker.js": era o que deixava o CI da
  // main vermelho, porque lá os testes rodam antes do passo de build. O
  // esbuild leva menos de 1s, então o build roda sempre, o que também
  // garante que o worker testado é o do código atual, não um dist velho.
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
  });
}
