# Auditoria de retomada: o que existe, o que está no ar, o que custa religar

Data: 01/09/2026. Escopo: repositório inteiro (`backend`, `frontend`, `revit-plugin`,
`signaling-server`, `infra`) mais a infraestrutura viva (Cloudflare, Render, Hetzner).
Motivo: decidir por onde retomar o ArxisVR depois de uma parada.

## Veredito em uma linha

O produto **não está no ar**. Existe muito software pronto e testado no repositório,
mas o que o mundo enxerga hoje é uma landing page congelada em **07/06/2026**, 199
commits atrás, sem API atrás dela. Nada do que foi construído de junho para cá
(IFC Core, viewer, validador, plugin Revit, billing no Mercado Pago) chegou ao ar.

## Estado real da infraestrutura

| Camada | Onde está | Estado |
|---|---|---|
| Frontend | Cloudflare Pages `arxisvr-frontend.pages.dev`, DNS proxied | **No ar, mas congelado.** Último deploy 07/06/2026, commit `156c4b02` |
| API | CNAME `api.arxisvr` para `arxisvr.onrender.com`, dns-only | **Morta.** Handshake TLS falha: o serviço do Render foi apagado |
| Banco | Render managed Postgres | **Perdido.** Não existe no Hetzner, não existe dump em `/opt/backups`, o Neon do `.env` está comentado desde antes |
| Storage | Cloudflare R2 (`STORAGE_DRIVER=r2` no `render.yaml`) | Bucket não verificado; as chaves R2 não estão em nenhum `.env` local |
| Keepalive | Cloudflare Worker `arxisvr-keepalive`, cron a cada 10 min | **Zumbi.** Continua pingando o host morto do Render desde que ele caiu |
| Hetzner | `178.105.82.48` | **Sem ArxisVR.** Nenhum container, nenhum banco, nenhum diretório em `/opt` |

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

## A restrição que mais pesa: o servidor não cabe

O Hetzner atual não tem folga para receber o ArxisVR do jeito que ele é:

```
Disco:  38 G total, 30 G usados, 7,3 G livres  (81 %)
        imagens Docker 21,8 G · volumes 14,5 G · build cache 7,8 G · /opt/backups 4,4 G
RAM:    3,8 G total, 1,1 G disponível
Swap:   4,0 G total, 2,6 G JÁ EM USO
```

A máquina já está engolindo swap com 37 containers. O pipeline de IFC do ArxisVR roda
web-ifc (WASM) em `worker_threads` sobre arquivos de até 150 MB, e é justamente o tipo
de carga que estoura RAM em picos. Subir ele aqui sem antes liberar espaço e memória
é pedir para derrubar Brilhax, Odoo, Saúde Pet e o resto junto.

Isso não bloqueia a retomada, mas muda o custo dela: ou limpa o servidor primeiro
(build cache e imagens órfãs devolvem alguns GB), ou o ArxisVR ganha um servidor próprio.

## Custo de religar, parte por parte

Ordenado por dependência. Cada linha só faz sentido depois da anterior.

| # | O que | Esforço | Depende de |
|---|---|---|---|
| 1 | Limpar o Hetzner (`docker builder prune`, imagens órfãs, backups velhos) ou contratar servidor próprio | 1 h, ou uma decisão de custo | Nada |
| 2 | Banco `arxisvr` no Postgres do Hetzner e rodar as 59 migrations | 1 h | 1 |
| 3 | Imagem Docker do backend (não existe Dockerfile), build local, `docker load`, container em porta livre | 3 h a 4 h | 1, 2 |
| 4 | Rota no Caddy para `api.arxisvr.avilaops.com` e DNS saindo do Render | 30 min | 3 |
| 5 | Storage: recuperar as chaves do R2 ou trocar para volume local | 1 h | 3 |
| 6 | Cadastrar o webhook do Mercado Pago no host vivo e conferir uma assinatura ponta a ponta | 1 h | 4 |
| 7 | Tirar o frontend do Cloudflare Pages e servir do Hetzner (política da casa: nada de Pages) | 2 h a 3 h | 1 |
| 8 | Matar o Worker de keepalive e o `render.yaml` | 15 min | 4 |

Somando: cerca de **dois dias de trabalho** para o produto voltar a existir de verdade,
com o item 1 podendo virar uma conta mensal a mais em vez de uma hora de faxina.

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

## Recomendação

Religar antes de construir. O item mais caro do roadmap não é a próxima sprint: é o fato
de que 199 commits de trabalho estão invisíveis, inclusive as duas peças que existem
justamente para gerar demanda (o validador IFC gratuito e o SEO). Hoje o ArxisVR gasta
domínio, Worker e atenção sem entregar nada a ninguém.

A ordem que eu proponho:

1. **Publicar o frontend atualizado** (itens 1 e 7). É a coisa mais barata que muda algo
   visível: o validador vai ao ar, o sitemap vai ao ar, a landing para de ser de junho.
2. **Ressuscitar a API** (itens 2 a 5). Sem isso login, upload e viewer continuam decorativos.
3. **Fechar o billing** (item 6) e **limpar o zumbi** (item 8).
4. **Só então voltar ao roadmap.** A sprint seguinte na sequência é a S14, classificação
   de tipos, dentro da fase de Metadados BIM.

Se a decisão for não religar agora, então a decisão honesta é desligar o resto também:
apagar o Worker de keepalive, tirar o CNAME morto da API e assumir que o ArxisVR está
em pausa. O estado atual, meio no ar e meio morto, é o pior dos dois.

## Como isso foi apurado

- `git log`, `git rev-list --count 156c4b02..HEAD`
- `npm run build` e `npx vitest run` no backend, `npm run build` no frontend
- `curl` contra `arxisvr.avilaops.com` e `api.arxisvr.avilaops.com`
- API do Cloudflare: registros DNS da zona `avilaops.com` e histórico de deploys do projeto Pages
- SSH no Hetzner: `docker ps`, `docker system df`, `df -h`, `free -m`, `du -sh /opt/*`, lista de bancos do Postgres
