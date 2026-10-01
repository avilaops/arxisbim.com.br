# Auditoria de retomada: o que existe, o que está no ar, o que custa religar

Data: 01/09/2026. Escopo: repositório inteiro (`backend`, `frontend`, `revit-plugin`,
`signaling-server`, `infra`) mais a infraestrutura viva (Cloudflare, Render, Hetzner).
Motivo: decidir por onde retomar o ArxisVR depois de uma parada.

> **Atualizado no mesmo dia.** A auditoria abaixo é o retrato de antes. Ainda em
> 01/09/2026, por decisão do Nicolas, o Render foi abandonado e a API subiu no
> servidor orquestrador. O que mudou está marcado ao longo do texto e resumido
> em "O que já foi feito hoje", no fim.

## Veredito em uma linha

O produto **não estava no ar**, e agora está. Havia muito software pronto e
testado no repositório enquanto o mundo via uma landing page congelada em
**07/06/2026**, 199 commits atrás, sem API atrás dela. API, site e a tela de
cobrança subiram no mesmo dia.

## Estado real da infraestrutura

| Camada | Onde está | Estado |
|---|---|---|
| Frontend | ~~Cloudflare Pages~~ → container `arxisvr-web` no orquestrador | **Resolvido em 01/09.** Estava congelado no commit `156c4b02` de 07/06/2026, 199 commits atrás |
| API | ~~CNAME para `arxisvr.onrender.com`~~ → A para `23.88.60.193`, dns-only | **Resolvido em 01/09.** O serviço do Render tinha sido apagado; a API agora roda no servidor orquestrador |
| Banco | ~~Render managed Postgres~~ → container `arxisvr-db` | **Perdido e recriado vazio.** Não havia dump em `/opt/backups` nem em lugar nenhum, e o Neon do `.env` está comentado desde antes |
| Storage | Cloudflare R2 (`STORAGE_DRIVER=r2` no antigo `render.yaml`) | **Trocado por driver local.** As chaves do R2 não estão em nenhum `.env` e o bucket não foi localizado |
| Keepalive | Cloudflare Worker `arxisvr-keepalive`, cron a cada 10 min | **Apagado em 01/09.** Pingava o host morto do Render desde que ele caiu |
| Hetzner produção | `178.105.82.48` | Sem ArxisVR, e continua assim de propósito (ver abaixo) |
| Hetzner orquestrador | `23.88.60.193` | **É aqui que o ArxisVR mora agora**, em `/opt/arxisvr` |

### Por que o frontend congelou

O deploy do Pages era disparado por GitHub Actions (`ci: add GitHub Actions workflow
for Cloudflare Pages auto-deploy`, o próprio commit `156c4b02`). A conta da avilaops no
GitHub está bloqueada por billing e nenhum Actions roda. O deploy parou no mesmo commit
que o criou e ninguém percebeu, porque o site continuou respondendo 200.

Consequência prática, medida com `curl` antes de arrumar:

- `/validador` respondia **404**. O lead magnet do validador IFC existia no código e nunca foi publicado.
- `/sitemap.xml` e `/robots.txt` respondiam **404**. O SEO estava no git e invisível para o Google.
- `/login` e `/app` respondiam 200 e eram inúteis: apontavam para a API morta.

Os três respondem **200** desde 01/09/2026.

## Inventário do que existe

Medido no repositório, não estimado.

| Parte | Tamanho | Estado |
|---|---|---|
| Backend Fastify | 309 arquivos TS, 58.313 linhas | Compila (`npm run build`, 305 arquivos em ~4 s). **356 testes passam, 75 arquivos, suíte inteira verde** |
| Superfície de API | 390 handlers, 47 grupos de rota registrados em `/api/v1` | Auth, tenants, projetos, IFC, cenários, 4D, 5D, SINAPI, clash, federação, colaboração, billing, observabilidade |
| Banco | 59 migrations, 70 tabelas declaradas no schema drizzle | Migrations idempotentes, validadas em base limpa (ver `task.md`) |
| Frontend | 943 arquivos TS/TSX, 213.164 linhas | Build limpo em 28 s, bundle 9,1 MB com PWA e precache de 34 entradas |
| Plugin Revit | 33 arquivos C#, projeto `.slnx`, assinatura local | Ribbon, export, validação, cliente HTTP. Endpoints `/api/v1/plugin/exports` no backend com cobertura e2e |
| Signaling | 539 linhas | Só dev local (porta 3002). Em produção o WebSocket é do próprio backend |

### Billing: pronto, faltando um endereço

A migração para o Mercado Pago (commit `67705f9`, 27/08) está completa e testada:
`MercadoPagoBillingProvider` sem SDK, preapproval, validação de assinatura HMAC,
jornal de eventos em `billing_provider_events`, worker de sincronização a cada 6 h,
pausar/retomar/cancelar sem portal do provedor, 43 testes.

Faltavam duas coisas, e a segunda não estava no radar:

1. O webhook apontava para host morto. O destino certo é
   `POST /api/v1/billing/webhook`. Em 01/09 o ArxisVR ganhou **aplicação própria**
   no Mercado Pago (`8686023099189017`), o que resolve a limitação de uma URL de
   notificação por aplicação: antes ele dividia a `avilaops-cliente` com lojas,
   mail e app, e por isso não podia ter webhook seu.
2. **Não existia tela para assinar.** A aba "Plano & Cobrança" desenhava
   "Free / Ativo / 3 de 3 projetos / 2.1 de 5 GB" escrito à mão, e a de Membros
   inventava "Maria Santos" e "Carlos Oliveira". O backend estava pronto e
   ninguém conseguia pagar. Refeitas em 01/09 lendo a API.

Planos hoje: Free, Starter R$ 87, Professional R$ 237, Enterprise R$ 597 (mensal, BRL).

## Qual dos dois servidores, e por quê

Correção de um erro da primeira versão desta auditoria: eu tinha olhado só o disco
raiz do servidor de produção e concluído que faltava espaço. Não falta. O Docker mora
num volume separado.

| | Produção (`178.105.82.48`) | Orquestrador (`23.88.60.193`) |
|---|---|---|
| Disco raiz | 38 G, 7,3 G livres | 38 G, **22 G livres** |
| Volume de dados | 79 G, 37 G livres (`/var/lib/docker`) | não tem, e não precisa |
| RAM disponível | 1,0 G de 3,8 G | **1,9 G de 3,8 G** |
| Swap em uso | **2,4 G de 4 G** | **nenhum swap, nenhum uso** |
| Containers | 36 | 10 |

Espaço nunca foi o problema: **memória** é. O de produção já opera em swap constante
com Odoo, Brilhax, Saúde Pet, Medusa e mais trinta. O pipeline de IFC roda web-ifc
(WASM) em `worker_threads` sobre arquivos de até 150 MB, exatamente a carga que
estoura RAM em pico e derruba vizinho.

Por isso o ArxisVR foi para o **orquestrador**, que já hospeda o n8n e a
observabilidade: metade dos containers, o dobro de RAM livre e zero swap.

## Custo de religar, parte por parte

Ordenado por dependência. Os itens marcados foram executados em 01/09/2026.

| # | O que | Esforço | Situação |
|---|---|---|---|
| 1 | Escolher o servidor (produção x orquestrador) | decisão | **Feito.** Orquestrador |
| 2 | Banco `arxisvr` e rodar as 59 migrations | 1 h | **Feito.** Container `arxisvr-db`, 59 migrations, 84 tabelas |
| 3 | Imagem Docker do backend (não existia Dockerfile) | 3 h a 4 h | **Feito.** `backend/Dockerfile` em duas etapas, build no servidor |
| 4 | Rota no Caddy e DNS saindo do Render | 30 min | **Feito.** A para `23.88.60.193`, certificado emitido |
| 5 | Storage: R2 ou volume local | 1 h | **Feito por ora.** Driver local em volume; R2 fica para quando as chaves aparecerem |
| 6 | Cadastrar o webhook do Mercado Pago e testar ponta a ponta | 1 h | **Quase.** Aplicação própria criada e credenciais instaladas; falta colar a URL no painel e trazer o segredo. Já não bloqueia a venda |
| 7 | Tirar o frontend do Cloudflare Pages e servir do orquestrador | 2 h a 3 h | **Feito.** Container `arxisvr-web`, DNS no orquestrador, `/validador` e o sitemap no ar |
| 8 | Matar o Worker de keepalive e o `render.yaml` | 15 min | **Feito.** Worker apagado na Cloudflare, `render.yaml` e `infra/keepalive-worker/` fora do repo, keep-alive interno removido do `index.ts` |

## Dívida técnica catalogada

Nada aqui é bloqueante, tudo aqui cobra juros.

| Item | Onde | Severidade |
|---|---|---|
| `tsc --noEmit` acusa 10 erros de tipo | `core/storage/local-storage.service.ts`, `modules/ifc/ifc-geometry-pipeline.helper.ts` | Média. O build usa esbuild e ignora tipos, então isso passa direto para produção |
| Rotas duplicadas mortas | `modules/companies/companies.routes.ts` e `modules/ifc-models/ifc-models.routes.ts` não são registradas; valem as de `routes/v1/` | Baixa. Mesmo padrão que a AUDIT-v1 já apontou |
| 10 arquivos `.js` no `frontend/src` | `AuthModal.js`, `WorkspacePanel.js` e outros | Baixa. Contra a regra de TypeScript em todo projeto da casa |
| Suíte de testes instável sob carga | Hooks de 10 s estouram quando a máquina está ocupada; em execução limpa passa 356/356 | Baixa. Vai morder em CI compartilhada |
| Limite de upload incoerente | Plano Professional promete arquivo de 1000 MB, `MAX_UPLOAD_MB` do deploy é 150 | Média. É promessa comercial que a infra não cumpre |
| Copiloto de IA em modelo legado | `routes/v1/ai-copilot.ts` usa `open-mixtral-8x7b` da Mistral | Baixa. Modelo antigo, e destoa do resto da casa |
| `www.arxisvr.avilaops.com` não existe no DNS | `render.yaml` define `FRONTEND_URL` para esse host | Baixa |

## O que já foi feito hoje

Executado em 01/09/2026, depois da decisão de abandonar o Render.

- **API no ar** em `https://api.arxisvr.avilaops.com`, no servidor orquestrador.
  `/health` responde `healthy` com `database: up`, `/api/v1/billing/plans` responde 200.
- **Stack em `/opt/arxisvr`**: `arxisvr-api` (Fastify, 3001, sem porta no host) e
  `arxisvr-db` (Postgres 16 dedicado), rede `arxisvr_default`, volume para os uploads.
- **59 migrations aplicadas** num banco limpo, 84 tabelas.
- **TLS pelo Caddy** do stack de observabilidade, que ganhou a rede externa e o bloco
  do novo domínio. `obs.avilaops.com` e `n8n.avilaops.com` continuam respondendo.
- **DNS**: `api.arxisvr.avilaops.com` deixou de ser CNAME para o Render e virou A para
  `23.88.60.193`, dns-only para o desafio HTTP-01 fechar.
- **Render apagado do repositório**: `render.yaml`, `infra/keepalive-worker/` e o
  keep-alive interno do `index.ts` (que existia só porque o free tier hibernava).
- **Worker `arxisvr-keepalive` apagado** da conta Cloudflare.
- **Site no ar com o build atual**: container `arxisvr-web` (Caddy servindo o
  `dist`, com fallback de SPA), `arxisvr.avilaops.com` saiu do Cloudflare Pages e
  virou A para o orquestrador. `/validador`, `/sitemap.xml` e `/robots.txt`
  passaram de **404 para 200** depois de quase três meses.
- **Tela de cobrança de verdade**: a aba Billing e a de Membros deixaram de
  desenhar dados escritos à mão e passaram a ler a API. Dá para assinar, pausar,
  retomar, cancelar e convidar. Provado em produção com conta real: checkout
  devolveu um preapproval do Mercado Pago de R$ 87,00 e o `/billing/sync` leu a
  assinatura de volta (dados de teste apagados depois).
- **Aplicação própria no Mercado Pago** (`8686023099189017`), credenciais no
  `.env.production` local e no servidor.
- **Três defeitos corrigidos no caminho**: vazamento de `password_hash` e
  `two_factor_secret` em `GET /tenants/:id/users`; o provedor de cobrança exigindo
  `MP_WEBHOOK_SECRET` para abrir checkout (sem webhook não se vendia nada); e todo
  link de e-mail apontando para `.html` do app antigo, o que quebrava recuperação
  de senha e convite.
- **Novidades no repositório**: `backend/Dockerfile`, `backend/.dockerignore`,
  `deploy/docker-compose.yml`, `deploy/deploy.sh`, `deploy/web.Caddyfile`,
  `deploy/README.md`, `frontend/.env.production`, e as telas
  `pages/account/BillingPage.tsx` e `pages/account/MembersPage.tsx`.

### O que ficou pendente disso

- `MP_WEBHOOK_SECRET` está vazio no `.env` do servidor. O segredo é gerado no painel do
  Mercado Pago quando a URL do webhook é cadastrada, então só dá para fechar por lá.
- Backup do banco e do volume: **decidido não fazer**. Produto sem venda não
  justifica rotina de backup; quando houver cliente pagante, entra na lista.
- Um erro no boot: `Failed to record metric ... metrics_tenant_id_fkey`. A métrica de
  inicialização tenta gravar com um `tenant_id` que não existe em banco novo. Não derruba
  nada, mas suja o log.

## Recomendação

O ArxisVR voltou a existir: site atual no ar, API viva e um caminho de pagamento
que funciona ponta a ponta. O que falta não é mais infraestrutura.

Ordem daqui:

1. **Colar a URL do webhook no painel do Mercado Pago** e trazer o segredo. É o
   último passo manual, e já não bloqueia a venda: a sincronização cobre.
2. **Varrer o resto das telas atrás de dado falso.** Billing e Membros eram os
   piores, mas a mesma mão desenhou outras: as abas de auditoria e configurações
   do `/account` ainda não foram conferidas. Vale a mesma régua da casa: tela que
   finge vir do banco reprova.
3. **Voltar ao roadmap** na S14, classificação de tipos, dentro de Metadados BIM.

O que continua fora de escopo por decisão: **backup**. Produto sem venda não
justifica rotina; quando houver o primeiro cliente pagante, entra na lista junto
com o volume dos IFCs.

## Como isso foi apurado

- `git log`, `git rev-list --count 156c4b02..HEAD`
- `npm run build` e `npx vitest run` no backend, `npm run build` no frontend
- `curl` contra `arxisvr.avilaops.com` e `api.arxisvr.avilaops.com`
- API do Cloudflare: registros DNS da zona `avilaops.com` e histórico de deploys do projeto Pages
- SSH no Hetzner: `docker ps`, `docker system df`, `df -h`, `free -m`, `du -sh /opt/*`, lista de bancos do Postgres
