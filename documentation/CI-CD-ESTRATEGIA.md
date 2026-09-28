# CI/CD e Operações: ArxisVR

**Última atualização:** 19/09/2026

> **O Actions voltou a rodar.** O bloqueio por billing que congelou tudo em
> 02/09 não vale mais: o workflow `CI` executou e passou no PR #28 em
> 19/09/2026. O aviso anterior ("nenhum Actions executa") ficava aqui e no
> README, e induzia a não olhar para o CI — conferir o run antes de repetir a
> afirmação.
>
> **O que o CI barra hoje** (`.github/workflows/ci.yml`, três jobs):
>
> | Job | Bloqueia o merge | Só informa |
> |---|---|---|
> | Frontend | type-check, build | lint (100 erros), testes (17 de 76 arquivos vermelhos) |
> | Backend | type-check, migrations, **testes (358)**, build, smoke em `/health/live` | — |
> | Signaling | `node --check server.js` | — |
>
> Lint e testes do frontend nascem informativos de propósito: a `main` não está
> verde neles, e portão que nasce vermelho ensina o time a ignorar CI. As duas
> dívidas são da árvore órfã (dependências que nunca entraram no
> `package.json`, casos ainda escritos para Jest), não do código que vai a
> produção. Quando caírem, tira-se o `continue-on-error`.
>
> **Deploy continua manual:** `./deploy/deploy.sh [api|web]`, em Docker no
> orquestrador `23.88.60.193`, com **Postgres 18.6**. CI verde não publica
> nada. Ver `documentation/DECISAO-saida-do-docker.md` e
> `AUDIT-2026-09-01-retomada.md`.
>
> **Testes do backend exigem banco.** O CI sobe um serviço Postgres 18.6 e
> aplica as 60 migrations antes do `npm test` — sem isso 35 arquivos quebram em
> `relation "tenants" does not exist`, e com credencial trocada os 75 morrem em
> `password authentication failed`. Local: mesmo caminho, ou
> `TEST_DATABASE_URL` apontando para outro banco de teste.

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
        image: postgres:18.6
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
        # SEM continue-on-error, type errors devem quebrar CI
```

---

## Render: variáveis de ambiente

**CRÍTICO:** `PUT /v1/services/{id}/env-vars` **substitui todas as variáveis**.
Sempre enviar a lista completa ao atualizar qualquer variável.
Enviar apenas as variáveis novas apaga todas as demais.

Deploy automático em push na `main`. Verificar health check após cada push.

---

## O que não fazer

- Não pular Fase 1.5 → drift de Node aparece semanas depois
- Não criar `Dockerfile` na raiz do monorepo (um por package)
- Não migrar para pnpm junto com mudança de CI
- Não escrever "ambiente idêntico" em doc, dev nunca é igual ao CI
- Não rodar smoke contra container sem antes validar em dev
