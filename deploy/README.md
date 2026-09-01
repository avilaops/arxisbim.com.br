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
arxisvr-web   Caddy servindo o build estatico do frontend (web/dist)
volume        arxisvr_uploads montado em /app/uploads (STORAGE_DRIVER=local)
rede          arxisvr_default
```

O `web/dist` e enviado pronto da maquina do dev: 213 mil linhas de frontend nao
cabem confortavelmente em 3,7 GB de RAM. O backend, ao contrario, e construido
no servidor, porque `bcrypt` e nativo.

O TLS é do Caddy do stack `/opt/observabilidade`, que declara `arxisvr_default`
como rede externa e faz `reverse_proxy` para `arxisvr-api:3001`
(`{$ARXISVR_API_DOMAIN}`) e `arxisvr-web:80` (`{$ARXISVR_WEB_DOMAIN}`). Ou seja:
mexer no Caddyfile daquele stack afeta obs, n8n e ArxisVR juntos. Há backups
`Caddyfile.bak-arxisvr*` lá.

DNS: `api.arxisvr.avilaops.com` e `arxisvr.avilaops.com` são A para
`23.88.60.193`, **dns-only**. Têm de continuar dns-only, senão o desafio HTTP-01
do Let's Encrypt não fecha.

## Subir uma versão nova

Backend:

```bash
./deploy/deploy.sh
```

Frontend (build local, envia só o `dist`):

```bash
npm --prefix frontend run build
tar -C frontend -czf - dist | ssh -i ~/.ssh/hetzner_avilaops root@23.88.60.193   'cd /opt/arxisvr/web && rm -rf dist && tar -xzf -'
```

Não precisa reiniciar o `arxisvr-web`: o `dist` é montado como volume e o Caddy
lê do disco a cada pedido. O `index.html` e o service worker vão com
`Cache-Control: no-cache` justamente para o navegador enxergar a versão nova.

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
  no painel do Mercado Pago (evento "Planos e assinaturas", que cobre
  `subscription_preapproval` e `subscription_authorized_payment`), que é onde o
  segredo é gerado. **Não bloqueia a venda**: sem o segredo o endpoint recusa
  toda notificação, e o estado chega pela sincronização (`POST /billing/sync` no
  retorno do cartão, mais o worker de 6 h).
- Storage está no driver `local` porque as chaves do R2 se perderam. Os IFCs
  vivem no volume `arxisvr_uploads`.
- **Não há backup** do banco nem do volume, por decisão: produto sem venda não
  justifica a rotina. Revisar quando houver o primeiro cliente pagante.
- O banco é novo e vazio: o Postgres gerenciado do Render foi apagado junto com
  o serviço e não há dump em lugar nenhum.
