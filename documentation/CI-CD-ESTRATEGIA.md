# CI/CD e Operações — ArxisVR

**Última atualização:** 11/06/2026

---

## Princípio

> CI nativo para velocidade. Container para fidelidade.

Duas responsabilidades separadas, dois mecanismos. Não tentar fazer um só resolver os dois.

---

## Decisões vigentes

| Decisão | Status |
|---|---|
| `npm` como package manager | Ativo |
| CI nativo (não em container) | Ativo |
| Postgres via `services:` no GitHub Actions | Ativo |
| Docker para ambiente local (dev) | Ativo |
| Deploy no Render via push na main | Ativo |
| Migração para pnpm | Adiado |
| Containerização completa do CI | Adiado |

---

## Fases CI/CD

| Fase | Ação | Status |
|---|---|---|
| 1 | Postgres service + remover `continue-on-error` do type-check | ✅ Concluído |
| 1.5 | `.nvmrc` + `engines` + `packageManager` | ✅ Concluído |
| 2 | `docker-compose.dev.yml` (postgres + minio) | ✅ Concluído |
| 3 | `Dockerfile` multi-stage por package | ✅ Concluído |
| 4 | CI executa smoke contra container gerado | ✅ Concluído |

---

## Como rodar o backend localmente

### 1. Infra local (Postgres + MinIO)

```bash
docker compose -f docker-compose.dev.yml up -d
```

Parar:
```bash
docker compose -f docker-compose.dev.yml down
```

Resetar volumes (apaga dados):
```bash
docker compose -f docker-compose.dev.yml down -v
```

Endpoints:
- Postgres: `postgres://arxisvr:arxisvr@localhost:5432/arxisvr`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001` (minioadmin / minioadmin)

### 2. Variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Ajuste `DATABASE_URL` conforme o passo 1.

### 3. Migrations

```bash
cd backend && npm run migrate
```

### 4. Backend dev

```bash
cd backend && npm run dev
```

### 5. Testes

```bash
cd backend && npm test
```

---

## Configuração do workflow GitHub Actions

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

---

## Render — variáveis de ambiente

**CRÍTICO:** `PUT /v1/services/{id}/env-vars` **substitui todas as variáveis**.
Sempre enviar a lista completa ao atualizar qualquer variável.
Enviar apenas as variáveis novas apaga todas as demais.

Deploy automático em push na `main`. Verificar health check após cada push.

---

## O que não fazer

- Não pular Fase 1.5 → drift de Node aparece semanas depois
- Não criar `Dockerfile` na raiz do monorepo (um por package)
- Não migrar para pnpm junto com mudança de CI
- Não escrever "ambiente idêntico" em doc — dev nunca é igual ao CI
- Não rodar smoke contra container sem antes validar em dev
