# Deploy do ArxisVR

A API roda no **servidor orquestrador** da Avila Ops (`infra`, `23.88.60.193`,
`10.10.0.1` no túnel), o mesmo do n8n e da observabilidade. O Render saiu de
cena em 01/09/2026 e não volta.

Por que o orquestrador e não o de produção: o de produção carrega 36 containers
e já opera com 2,4 GB de swap em uso. O parser de IFC roda web-ifc (WASM) em
`worker_threads` sobre arquivos de até 150 MB, que é justamente a carga que
derruba vizinho. O orquestrador tem 10 containers, nenhum swap em uso e 22 GB
de disco livres.

## Anatomia

```
/opt/arxisvr
├── .env                 (chmod 600, secrets; NÃO está no git)
├── docker-compose.yml   (cópia de deploy/docker-compose.yml)
└── backend/             (fonte enviado pelo deploy.sh)

arxisvr-api   Fastify, porta 3001, sem porta publicada no host
arxisvr-db    Postgres 16, volume arxisvr_db-data
volume        arxisvr_uploads montado em /app/uploads (STORAGE_DRIVER=local)
rede          arxisvr_default
```

O TLS é do Caddy do stack `/opt/observabilidade`, que declara
`arxisvr_default` como rede externa e faz `reverse_proxy arxisvr-api:3001`
para `{$ARXISVR_API_DOMAIN}`. Ou seja: mexer no Caddyfile daquele stack afeta
obs, n8n e ArxisVR juntos. Há backups `Caddyfile.bak-arxisvr-*` lá.

DNS: `api.arxisvr.avilaops.com` é um A para `23.88.60.193`, **dns-only**. Tem de
continuar dns-only, senão o desafio HTTP-01 do Let's Encrypt não fecha.

## Subir uma versão nova

```bash
./deploy/deploy.sh
```

Manda o fonte por `tar` sobre SSH (a máquina não tem rsync), constrói a imagem
lá e sobe. A build é feita no servidor de propósito: `bcrypt` é nativo e imagem
montada no Windows não serve para Linux.

As 59 migrations rodam sozinhas no boot (`runMigrations()` em `index.ts`), são
idempotentes e ficam registradas na tabela `_migrations`.

## Conferir

```bash
ssh -i ~/.ssh/hetzner_avilaops root@23.88.60.193 \
  'docker ps --filter name=arxisvr; docker logs --tail 40 arxisvr-api'

curl -s https://api.arxisvr.avilaops.com/health
```

## Pendências conhecidas

- `MP_WEBHOOK_SECRET` está vazio no `.env` do servidor. Só dá para preencher
  depois de cadastrar `https://api.arxisvr.avilaops.com/api/v1/billing/webhook`
  no painel do Mercado Pago (tópicos `subscription_preapproval` e
  `subscription_authorized_payment`), que é onde o segredo é gerado.
- Storage está no driver `local` porque as chaves do R2 se perderam. Os IFCs
  vivem no volume `arxisvr_uploads`, que **não entra no backup automático**.
- O banco é novo e vazio: o Postgres gerenciado do Render foi apagado junto com
  o serviço e não há dump em lugar nenhum.
