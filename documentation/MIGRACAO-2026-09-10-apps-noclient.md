# Migração 10/09/2026: ArxisVR, CRM, SMS e Alô Barbeiro para o servidor apps-noclient

**Servidor novo:** `apps-noclient`, Hetzner CX23 (2 vCPU, 4 GB, 40 GB), Helsinki,
`204.168.249.111` / `2a01:4f9:c015:4991::/64`, hostname `ubuntu-4gb-hel1-2`,
Ubuntu 26.04. Alias SSH local: `apps-noclient`.
**Servidor antigo:** aplicações, `178.105.82.48` (em swap; 3,6 GB usados antes da
mudança, 3,2 GB depois).
**Janela:** 19:03 a 19:20 UTC. Cada app ficou fora entre 2 e 6 minutos, o
tempo de dump, restore e certificado.

## O que foi para lá

| App | Como roda | Dado | DNS |
|---|---|---|---|
| ArxisVR | `/opt/arxisvr`, containers `arxisvr-api` (3101) e `arxisvr-web` (3102) | banco `arxisvr` no Postgres 18 do host + volume `arxisvr_uploads` | `arxisvr.avilaops.com`, `api.arxisvr.avilaops.com` → novo IP, dns-only |
| CRM | `/opt/agenda-crm/current`, containers `agenda-crm-app` (3020) e `agenda-crm-db` (Postgres 18 alpine) | banco no container + volume `agenda-crm-storage` | `crm.avilaops.com` → novo IP, proxied |
| Avila SMS | `/opt/sms`, containers `sms` (3091), `sms-smpp` (3093), `sms-smpp-lab` (profile) | banco `sms` no host + volume `sms_smpp-dados` | `sms.avilaops.com` → novo IP, dns-only |
| Alô Barbeiro | `/opt/alobarbeiro`, container `alobarbeiro` (3110), **primeiro deploy** | sem banco (fase 1, mock) | `alobarbeiro.com` e `www` criados, dns-only |

`wa.avilaops.com` continua no servidor antigo como redirect para o SMS.

## Base do servidor novo

Docker 29 + Compose 2.40 (pacotes do Ubuntu), Caddy 2.11 nativo (repositório
oficial: o 2.6 do Ubuntu não conhece `trusted_proxies`), Postgres 18.6 nativo
escutando em `localhost,172.17.0.1` com `pg_hba` para `172.16.0.0/12`, ufw
(22/80/443 abertos; 5432, 3091, 3093 e 2775 só para a faixa Docker), fail2ban,
rclone. Papéis `arxisvr` e `sms` com as mesmas senhas e `CONNECTION LIMIT 20`.
Caddyfile versionado em `deploy/Caddyfile.apps-noclient`.

## Como foi feito

1. Chave SSH temporária do servidor antigo para o novo: imagens (`docker save |
   docker load`), `.env`, composes, volumes e `rclone.conf` foram direto entre
   os dois, sem passar pela máquina do Nicolas. Chave removida no fim.
2. Por app: parar o container do app (banco de pé) → `pg_dump | psql` → re-sync
   do volume → `compose up` no novo → conferir em `127.0.0.1` → trocar o A na
   Cloudflare (Global Key) → certificado → conferir pelo DNS público.
3. ArxisVR provado com o roteiro do S18 em produção (12/12, IFC de 2,5 MB,
   salvar cenário, export). E-mail de redefinição de senha saiu pelo
   `mail.avilaops.com:587` público (era `172.17.0.1`).
4. SMS: rota SMPP `pronta` contra o laboratório; `/api/interno` responde 401
   (não 403) para o host do n8n, que entrou na corrente.
5. CRM: 4.435 contatos dos dois lados; compose no novo aponta para a imagem
   `current-app:latest` em vez de `build:`.

## O que a migração pegou

- **Restore como `postgres` deixa as tabelas com o dono errado.** `pg_dump
  --no-owner` restaurado pelo superusuário cria tudo como `postgres`; a API
  levava `permission denied for table users` no login. `ALTER ... OWNER TO`
  em tabelas, sequências, views, funções e tipos resolveu. Para o CRM não
  aconteceu porque o restore foi como `agenda_crm`.
- **Let's Encrypt limita 5 falhas de autorização por hora.** O Caddy tentou
  `alobarbeiro.com` antes de o DNS propagar e estourou o limite; com `email`
  nas opções globais ele caiu para a ZeroSSL e emitiu. Ficou no Caddyfile.
- **O banco `arxisvr` nunca esteve na lista de backup do servidor antigo.** No
  novo está: `backup-todos-bancos.sh` (03:30) dumpa `arxisvr`, `sms`,
  `agenda_crm` e os três volumes; `sync-r2.sh` (04:00) manda para
  `r2:avilaops-backups/apps-noclient/db`. Primeira rodada feita e conferida no R2.

## Servidor antigo

Containers dos quatro **parados e mantidos** (`restart=no`) para rollback até
17/09/2026; bancos `arxisvr` e `sms` e volumes intactos. Blocos do Caddy
removidos (cópia em `/etc/caddy/Caddyfile.antes-migracao-20260910`), crons
`arxisvr-health` e `agenda-crm-backup` apagados, `sms` e `agenda-crm-db` fora
da lista de backup, portas 3091/3093/2775 fechadas no ufw.

## Vigia

`/opt/arxisvr/health-watch.sh` a cada 2 min no novo servidor (mesmo script de
09/09). Alerta por e-mail via SMTP público.

## Fechamento operacional (11/09/2026)

| Portão | Estado | Prova |
|---|---|---|
| Deploy ArxisVR | ✅ provado | `deploy/deploy-aplicacoes.sh tudo` do HEAD, 09:12 a 09:18 UTC, exit 0. Type-check e build da API **no servidor** (tar de ~1 MB; a máquina local dividia CPU com outras sessões e o `tsc` passou 20 min sem terminar). Marca 26722 na imagem e no container; `.env` e volume `arxisvr_uploads` conferidos; `/health` com `database: up`; `/`, `/validador`, `/app/compare` em 200; S18 12/12 em seguida. Commit `9e86903`. |
| Deploy CRM | ✅ provado | `scripts/subir-sem-ci.sh` (commit `cfbbdb7`): typecheck, lint, testes, build, camada nova sobre a imagem, migrate, "no ar, revisão cfbbdb7". 4.435 contatos antes e depois; `crm.avilaops.com` 200 pela Cloudflare. |
| Deploy SMS | ✅ provado | `deploy/subir.sh`, 10:10 a 10:20 UTC, exit 0: `npm run conferir`, build das duas imagens, envio, compose, migrate, `/api/health` e `/saude` do SMPP `{ok:true}`. A primeira rodada parou no `prisma migrate deploy`: a migration `20260904000000_canal_de_teste` **nunca foi registrada** no servidor antigo (a coluna foi criada à mão em 04/09 e o arquivo commitado depois), e o dump trouxe a coluna sem a linha em `_prisma_migrations`. Resolvido com `prisma migrate resolve --applied` (só a contabilidade; a coluna já existia e é a certa). |
| Backup | ✅ | 03:30 de 11/09: `ok=6 erros=0`; R2 em `apps-noclient/db`, 12 arquivos, SHA-256 do `host-arxisvr-20260911.sql.gz` igual local e no bucket. |
| Restore | ✅ provado | Dump baixado **do R2**, restaurado como `postgres` em `arxisvr_restore_test_20260911`: 77 tabelas, 60 migrations, 5 tenants, 2 users, 2 projects, 2 ifc_models, 2 scenarios, 326 índices, 719 constraints, iguais à produção. Banco temporário apagado; o dump ficou. |
| Ownership pós-restore | ✅ automatizado | O dump noturno **já traz** `ALTER ... OWNER TO arxisvr` (87 sentenças); o defeito da migração veio do meu `--no-owner` manual. Mesmo assim `deploy/restaurar-banco.sh` transfere dono de tabelas, sequências, views, funções e enums, dá os grants, e **prova** no fim: o papel `arxisvr` (superuser=false) conecta, lê `users` e escreve. Rodado no servidor: "tabelas: 77 · com dono errado: 0". |
| SMS `/api/interno` | ✅ conferido | De fora: 403 (nem chega na autenticação). Do host do n8n (178.105.82.48): 401 sem token, 401 com token errado, 400 de validação com o token certo. `/metricas/smpp` de fora: 403. Fluxos "Messageria — Enviar" e "Avila SMS — Onboarding e Operação" ativos no n8n. |
| Caddy / certificados | ✅ | `deploy/preflight-dns.sh` (instalado como `/usr/local/bin/preflight-dns`): resolve em 1.1.1.1 e 8.8.8.8, aceita o IP do servidor ou a Cloudflare (proxied), reprova "aponta para outro lugar" e "não resolve". Testado nos 8 hostnames (o `wa.avilaops.com` reprova de propósito: fica no servidor antigo). `email` da CA mantido no Caddyfile. |
| Servidor antigo | ✅ preservado até 17/09 | 7 containers `Exited` com `restart=no`; bancos `arxisvr` (21 MB) e `sms` (9 MB) e 7 volumes intactos; 0 conexões desses papéis; nada escuta em 3020/3091/3093/3101/3102; sem regra no ufw; sem cron; 0 blocos no Caddy; DNS público dos 4 apps aponta para o novo. As "4 falhas" do backup noturno de lá eram `avilaops`, `brilhax`, `partsagricola` e `agricola_medusa`, bancos que não existem mais naquele Postgres desde antes da migração: tirados da lista em 11/09. |

Base do servidor novo ganhou `docker-buildx` (o `docker.io` do Ubuntu não traz
o plugin e o BuildKit não constrói sem ele).

## Segunda leva (11/09/2026, 11:00 a 11:10 UTC): n8n, Notas e Avila IA

Nicolas: "o outro servidor tá sufocado". Medido antes: 863 MB disponíveis e
3,5 GB de swap no de aplicações; 2,4 GB livres e swap zero no apps-noclient.
Critério, o mesmo de 10/09: sai o que **não é de cliente**. Pelos números,
os maiores eram n8n (330 MB), Outline (155 MB + redis) e ia (108 MB + worker);
o app da Ávila (128 MB) fica porque é o portal e o hub de auth/mail; Migdolus e
Fênix são pilotos de cliente.

| App | Como roda agora | Dado | Prova |
|---|---|---|---|
| n8n | `/opt/n8n`, `n8n-n8n-1` (5678), banco `n8n` no Postgres do host | dump (136 tabelas) + `dados/` (config e **chave de criptografia**) + `arquivos/` | 54 workflows / 52 ativos nos dois lados, 18 credenciais nos dois lados; `/healthz` ok; `n8n.avilaops.com` 200 |
| Notas (Outline) | `/opt/notas-avilaops-com`, `notas-outline` (3090) + `notas-redis`, banco `notas` (papel `outline`) | dump (42 tabelas) + volume `outline-data` | `/_health` 200; login continua no `auth.avilaops.com` (OIDC), que ficou no de aplicações |
| Avila IA | `/opt/ia`, `ia-app` (3092) + `ia-worker`, banco `ia` | dump (8 tabelas) + volumes `ia_dados` e `ia_modelos` (943 MB) | `/api/health` com `banco: true` e worker ok; `ia.avilaops.com` 200 |

Cada um: parar no antigo → `pg_dump | restaurar-banco.sh` no novo (dono e grants
provados: `outline`, `ia` e `n8n` leem e escrevem, superuser=false) → re-sync
dos dados fora do banco → `compose up` → conferência local → A na Cloudflare →
certificado → conferência pública. Blocos no `Caddyfile.apps-noclient`.

**O que a leva pegou.** (1) Instalei os três blocos no Caddy um minuto ANTES de
trocar o DNS: o Caddy pediu certificado para o IP errado 8 vezes (a ZeroSSL
entrou uma). Não estourou o limite, mas foi exatamente o erro que o
`preflight-dns` existe para evitar, e eu tinha o script instalado. Regra que
fica: bloco no Caddy só depois do `preflight-dns` dizer "pronto". (2) A prova
final do `restaurar-banco.sh` usava a senha do `arxisvr` para qualquer papel e
reprovou três restores certos; corrigido: `SENHA_DONO`, e sem senha a prova é
pulada com aviso. (3) O n8n no mesmo servidor chega ao `/api/interno` do SMS
pelo IP público da máquina, não pela bridge: a lista de permitidos passou de
`178.105.82.48` para `204.168.249.111` (401 do novo host, 403 de fora e do
antigo). (4) O backup do novo servidor ganhou os três bancos, os volumes e um
tar de `/opt/n8n/dados` (sem a chave de criptografia o dump do n8n é inútil):
`ok=12 erros=0` na hora.

**Servidor de aplicações depois:** 1,96 GB disponíveis (era 863 MB). Os cinco
containers ficaram parados com `restart=no`, bancos `n8n`/`notas`/`ia` e
volumes intactos, para rollback até **18/09/2026**. Blocos do Caddy removidos
(cópia em `Caddyfile.antes-migracao2-20260911`), bancos tirados da lista de
backup de lá.

## Pendente

- Apagar os containers, bancos e volumes antigos no servidor de aplicações: os de 10/09 depois de 17/09, os de 11/09 (n8n, notas, ia) depois de 18/09.
- `alobarbeiro.com.br` (nome do repositório) não está na Cloudflare; o site
  está em `alobarbeiro.com`.
