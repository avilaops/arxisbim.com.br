# Auditoria de retomada: o que existe, o que está no ar, o que custa religar

Data: 01/09/2026. Escopo: repositório inteiro (`backend`, `frontend`, `revit-plugin`,
`signaling-server`, `infra`) mais a infraestrutura viva (Cloudflare, Render, Hetzner).
Motivo: decidir por onde retomar o ArxisVR depois de uma parada.

> **Atualizado no mesmo dia.** A auditoria abaixo é o retrato de antes. Ainda em
> 01/09/2026, por decisão do Nicolas, o Render foi abandonado e a API subiu no
> servidor orquestrador. O que mudou está marcado ao longo do texto e resumido
> em "O que já foi feito hoje", no fim.

## Veredito em uma linha

O produto **não estava no ar**. Existe muito software pronto e testado no
repositório, mas o que o mundo enxerga hoje é uma landing page congelada em
**07/06/2026**, 199 commits atrás. A API já voltou; o frontend ainda não.

## Estado real da infraestrutura

| Camada | Onde está | Estado |
|---|---|---|
| Frontend | Cloudflare Pages `arxisvr-frontend.pages.dev`, DNS proxied | **No ar, mas congelado.** Último deploy 07/06/2026, commit `156c4b02` |
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

Consequência prática, verificada com `curl` no ar agora:

- `/validador` responde **404**. O lead magnet do validador IFC existe no código e nunca foi publicado.
- `/sitemap.xml` e `/robots.txt` respondem **404**. O trabalho de SEO está no git e invisível para o Google.
- `/login` e `/app` respondem 200 e são inúteis: apontam para `api.arxisvr.avilaops.com`, que está morta.

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

Falta uma coisa só: o webhook do Mercado Pago aponta para host morto. O destino correto
é `POST /api/v1/billing/webhook`, e ele só pode ser cadastrado depois que a API tiver
um endereço vivo. O provedor precisa de `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`.

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
| 6 | Cadastrar o webhook do Mercado Pago e testar ponta a ponta | 1 h | **Pendente.** Depende do painel do MP, que é onde o segredo é gerado |
| 7 | Tirar o frontend do Cloudflare Pages e servir do orquestrador | 2 h a 3 h | **Pendente.** É o que ainda deixa 199 commits invisíveis |
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
- **Novidades no repositório**: `backend/Dockerfile`, `backend/.dockerignore`,
  `deploy/docker-compose.yml`, `deploy/deploy.sh`, `deploy/README.md`.

### O que ficou pendente disso

- `MP_WEBHOOK_SECRET` está vazio no `.env` do servidor. O segredo é gerado no painel do
  Mercado Pago quando a URL do webhook é cadastrada, então só dá para fechar por lá.
- O volume `arxisvr_uploads` e o banco `arxisvr` **não entram na rotina de backup**, que
  cobre uma lista explícita de bancos no servidor de produção.
- Um erro no boot: `Failed to record metric ... metrics_tenant_id_fkey`. A métrica de
  inicialização tenta gravar com um `tenant_id` que não existe em banco novo. Não derruba
  nada, mas suja o log.

## Recomendação

O que sobrou é o frontend, e é o que mais dói. 199 commits continuam invisíveis,
inclusive as duas peças que existem justamente para gerar demanda: o validador IFC
gratuito e o SEO. Com a API viva, publicar o frontend atualizado deixou de ser
"mais uma tarefa" e virou o único passo entre o produto e o mundo.

Ordem daqui:

1. **Publicar o frontend atualizado**, servido do orquestrador em vez do Cloudflare
   Pages. O validador vai ao ar, o sitemap vai ao ar, a landing para de ser de junho.
2. **Fechar o billing** cadastrando o webhook no painel do Mercado Pago.
3. **Colocar o banco e o volume do ArxisVR na rotina de backup.**
4. **Só então voltar ao roadmap.** A sprint seguinte na sequência é a S14, classificação
   de tipos, dentro da fase de Metadados BIM.

## Como isso foi apurado

- `git log`, `git rev-list --count 156c4b02..HEAD`
- `npm run build` e `npx vitest run` no backend, `npm run build` no frontend
- `curl` contra `arxisvr.avilaops.com` e `api.arxisvr.avilaops.com`
- API do Cloudflare: registros DNS da zona `avilaops.com` e histórico de deploys do projeto Pages
- SSH no Hetzner: `docker ps`, `docker system df`, `df -h`, `free -m`, `du -sh /opt/*`, lista de bancos do Postgres
