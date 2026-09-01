# arxisvr-keepalive (Cloudflare Worker)

Mantém o backend (e o signaling) do Render acordados, pingando `/health` a cada
10 min via Cron Trigger. Resolve os "Failed to fetch" causados pela hibernação
do free tier do Render. **Custo: zero.**

## Status: DEPLOYADO (2026-06-16)
- Worker: `arxisvr-keepalive` · cron `*/10 * * * *`
- Teste manual: `https://arxisvr-keepalive.nicolas-85b.workers.dev/`
- Deployado via REST API usando `CLOUDFLARE_API_GLOBAL_KEY` (o `CLOUDFLARE_API_TOKEN`
  do projeto é R2-only → 403 em Workers; a Global Key tem acesso total).

## Por que externo?
O keep-alive interno do backend (`ping /health a cada 14 min`) não segura a
hibernação: quando o Render suspende o processo, ele não consegue se
auto-pingar. Este Worker roda na rede do Cloudflare, fora do Render.

## Deploy

Precisa de um token Cloudflare com permissão **Workers Scripts: Edit**
(o token de R2 do projeto NÃO serve, é só R2).

```bash
cd infra/keepalive-worker
npm i -g wrangler            # ou: npx wrangler
wrangler login              # ou: export CLOUDFLARE_API_TOKEN=<token Workers>
wrangler deploy
```

`wrangler deploy` já registra o Cron Trigger (`*/10 * * * *`) declarado no
`wrangler.toml`.

## Testar
- Manual: abra a URL do Worker (`https://arxisvr-keepalive.<subdomínio>.workers.dev`)
  → dispara o ping na hora e responde `arxisvr keepalive: ping enviado`.
- Logs: `wrangler tail` mostra cada disparo do cron com o status de cada alvo.

## Alvos pingados
- `https://api.arxisvr.avilaops.com/health` (backend, também serve o WebSocket)
