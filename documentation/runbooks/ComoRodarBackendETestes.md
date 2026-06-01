# Como rodar o backend e os testes

## 1. Infra local (Postgres + MinIO)

Subir serviços em container, próximo do CI:

    docker compose -f docker-compose.dev.yml up -d

Parar:

    docker compose -f docker-compose.dev.yml down

Resetar volumes (apaga dados):

    docker compose -f docker-compose.dev.yml down -v

Endpoints:

- Postgres: `postgres://arxisvr:arxisvr@localhost:5432/arxisvr`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001` (`minioadmin` / `minioadmin`)
- Bucket `arxisvr-files` criado pelo serviço `minio-bootstrap`.

## 2. Variáveis de ambiente

    cp backend/.env.example backend/.env

Ajuste `DATABASE_URL` conforme passo 1.

## 3. Migrações

    cd backend
    npm run migrate

## 4. Backend dev

    cd backend
    npm run dev

## 5. Testes

    cd backend
    npm test

## Notas

- O projeto usa **npm** (não pnpm) — ver [`documentation/operations/CI-CD-ESTRATEGIA.md`](../operations/CI-CD-ESTRATEGIA.md).
- Node version: ver `.nvmrc` (20.x).
- Compose só sobe **infra** — o app roda nativo via `npm run dev` para preservar hot reload.
