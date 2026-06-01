# Estratégia CI/CD e Ambientes — ArxisVR

## Princípio

> **CI nativo para velocidade. Container para fidelidade.**

Duas responsabilidades separadas, dois mecanismos. Não tentar fazer um só resolver os dois.

## Por que essa separação

Erro 1 — "tudo em container":
```
Tudo em container → CI lento → feedback demora → dev ignora CI
```

Erro 2 — "só CI nativo":
```
Só CI nativo → passa no CI → deploy roda outro ambiente → prod quebra
```

A esteira em 4 fases resolve os dois.

## Decisão atual

**Aprovado:**
- `npm` permanece como package manager
- CI permanece nativo (não roda em container)
- Serviços de infraestrutura no CI via `services:` do GitHub Actions
- Docker entra primeiro para ambiente local (dev)
- Docker para validação de artefato entra apenas após estabilização

**Adiado:**
- Migração para pnpm
- Containerização completa do CI
- Orquestração distribuída (k8s, swarm)

## Fases

| Fase | Ação | Objetivo real |
|------|------|---------------|
| 1 | Postgres service no workflow + remover `continue-on-error` do type-check | Eliminar causa imediata da falha + tornar falhas visíveis |
| 1.5 | `.nvmrc` + `engines` + `packageManager` | Eliminar drift de toolchain (Node/npm) |
| 2 | `docker-compose.dev.yml` (postgres + redis + minio) | Dev local reproduzível e **próximo** do CI |
| 3 | `Dockerfile` multi-stage por package | Artefato de deploy reproduzível |
| 4 | CI executa smoke contra container gerado | Validar o mesmo artefato que vai pra produção |

## Notas importantes

### "Próximo", não "idêntico"
Mesmo com Docker, dev (macOS/Win + Docker Desktop + volumes + hot reload) nunca é igual a CI (Ubuntu runner + FS efêmero + sem watch). Promessa de "idêntico" vira armadilha. Falar "próximo + reproduzível" é honesto e mensurável.

### Drift de toolchain ≠ drift de ambiente
- **Toolchain** (Node/npm/pnpm): resolve na Fase 1.5 com pins
- **Ambiente** (DB/Redis/MinIO/FS): resolve na Fase 2 com compose, validado de verdade na Fase 4

Sem Fase 1.5 acontece o clássico:
> "Funciona no Node 22 local, quebra no Node 20 do runner"

### Por que monorepo precisa Dockerfile por package
Backend e frontend têm:
- `node_modules` diferentes
- Build commands diferentes (esbuild vs vite)
- Runtimes diferentes (Node API vs static files)
- Volumes/portas diferentes

Um Dockerfile na raiz vira spaghetti. Um por package vira composable.

### Por que npm (não pnpm) durante estabilização
- `pnpm-workspace.yaml` existe mas vazio
- `.npmrc` com `ignore-workspace=true`
- Cada package tem `package-lock.json` próprio
- CI já usa `npm ci` per package

Migrar pra pnpm agora é mudar duas coisas ao mesmo tempo (CI + package manager) → debugar fica impossível. Migrar depois que a esteira estabilizar.

## Configurações concretas

### `.nvmrc` (raiz)
```
20
```

### `package.json` raiz — campos a adicionar
```json
{
  "engines": {
    "node": "20.x",
    "npm": ">=10"
  },
  "packageManager": "npm@10.9.0"
}
```

`backend/package.json` e `frontend/package.json` recebem o mesmo bloco `engines`.

### Workflow — pontos críticos
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'

      - run: npm ci
        working-directory: backend

      - run: npm run type-check
        working-directory: backend
        # SEM continue-on-error — type errors devem quebrar CI
```

### `docker-compose.dev.yml` (Fase 2)
Serviços: `postgres:16`, `redis:7`, `minio` (quando entrar). Sem build de app — dev roda app nativo, infra em container. Match com `services:` do CI.

### `Dockerfile` per package (Fase 3)
Multi-stage padrão:
1. `deps` — `npm ci`
2. `build` — `npm run build`
3. `runtime` — só `dist/` + `node_modules` prod, `USER node`, healthcheck

### Smoke em container (Fase 4)
Quando workers/MinIO entrarem, CI vai:
1. `docker build` os artefatos
2. `docker compose up` com os serviços
3. Smoke test (curl /health/live) contra o container — não contra `node dist/index.js`

Aí sim "validei o que vai pra prod".

## Detalhes operacionais

### Smoke test do step de CI (Fase 1)
- `timeout 60s node dist/index.js > backend.log 2>&1 &`
- Loop de até 40 tentativas × 2s contra `/health/live`
- Crash detection via `kill -0 $PID` para falhar rápido se o processo morrer
- Dump completo do log em caso de falha

Isso é implementação do step, não decisão arquitetural — fica aqui apenas para referência de quem for editar o workflow.

## Checklist de execução

- [x] **Fase 1**
  - [x] Adicionar `services: postgres` ao workflow
  - [x] Remover `continue-on-error: true` do step type-check
  - [x] Smoke test com crash detection + log dump
- [x] **Fase 1.5**
  - [x] Criar `.nvmrc` na raiz
  - [x] Adicionar `engines` nos 3 `package.json`
  - [x] Adicionar `packageManager` no `package.json` raiz
  - [x] Trocar workflow para `node-version-file: '.nvmrc'`
  - [x] Alinhar `deploy-prod.yml` (remove pnpm/action-setup, hardcoded node, adiciona postgres service)
  - [x] Remover `pnpm-lock.yaml` órfão da raiz
- [x] **Fase 2**
  - [x] Criar `docker-compose.dev.yml` (postgres + minio + bootstrap de bucket)
  - [x] Documentar comandos em `documentation/runbooks/ComoRodarBackendETestes.md`
- [ ] **Fase 3**
  - [x] `backend/Dockerfile` multi-stage (deps → build → prod-deps → runtime, tini + healthcheck)
  - [x] `frontend/Dockerfile` multi-stage (vite → nginx-unprivileged static)
  - [x] `.dockerignore` per package
  - [ ] Validar build local (`docker build` ambos)
  - [ ] Validar `docker run` + smoke manual
- [ ] **Fase 4** (quando workers/MinIO chegarem)
  - [ ] Job CI que builda containers
  - [ ] Smoke contra `docker compose up`

## Riscos por horizonte

**Curto prazo (Fases 1 + 1.5):**
- Ajustes no workflow podem revelar erros TypeScript hoje mascarados por `continue-on-error`
- Pin de Node pode quebrar máquina de dev que está em versão diferente

**Médio prazo (Fases 2 + 3):**
- Divergências entre ambiente local e CI ainda podem surgir mesmo com compose
- Manter Dockerfiles atualizados conforme deps mudam exige disciplina
- Hot reload em volume Docker no Windows tem latência conhecida

**Longo prazo (Fase 4 e além):**
- Novos serviços (workers, storage externo, auth federado) aumentam superfície operacional
- CI em container fica mais lento que CI nativo — orçar tempo aceitável
- Entropia natural: deps novas, infra nova, drift cumulativo entre dev/CI/prod

## O que NÃO fazer

- Não pular Fase 1.5 → drift de Node aparece semanas depois e é difícil rastrear
- Não criar `Dockerfile` na raiz do monorepo
- Não migrar para pnpm junto com mudança de CI
- Não escrever "ambiente idêntico" em doc nenhuma — é mentira que vira tech debt
- Não rodar Fase 4 sem antes ter Fase 3 estável (smoke contra container não validado em dev = ruído)
