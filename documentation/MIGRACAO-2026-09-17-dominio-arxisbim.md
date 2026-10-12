# Migração 17/09/2026: domínio próprio `arxisbim.com.br`

**Domínio comprado:** `arxisbim.com.br` (registro.br).
**Passa a ser canônico:** site e app em `arxisbim.com.br`, API e WebSocket em
`api.arxisbim.com.br`.
**Domínio anterior:** `arxisvr.avilaops.com` / `api.arxisvr.avilaops.com`.
Continua respondendo durante a janela de transição, por três motivos concretos:
links indexados e em e-mails já enviados, abas abertas com o bundle antigo
carregado, e instalações do plugin do Revit apontando para a API antiga.

**Estado em 10/10/2026:** as etapas 1 a 5 foram executadas. `arxisbim.com.br`,
`www` e `api` apontam para `204.168.249.111`, o Caddy emitiu os três
certificados, site e API respondem no domínio novo e o antigo redireciona.
As etapas 6 em diante (OAuth, webhook, e-mail) continuam abertas.

O corte coincidiu com uma reconstrução: `/opt/arxisvr` tinha sido apagado do
servidor em 05/10/2026, com imagens, volumes e o `.env`, e não havia cópia do
`.env`. O que isso muda para quem ler este runbook:

- O `.env` da etapa 3 foi **escrito do zero**. `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `API_TOKEN_PEPPER`, `INTERNAL_API_KEY` e a senha do
  papel `arxisvr` no Postgres são novos: sessões antigas e tokens de API
  emitidos antes (plugin do Revit) deixaram de valer.
- Ficaram vazios, por não haver de onde recuperar: Mercado Pago, OAuth do
  Google e do GitHub, Turnstile, Sentry, LiveKit, Facebook, fiscal e chaves de
  IA.
- O e-mail sai por `noreply@avilaops.com` (SMTP `mail.avilaops.com:587`, os
  mesmos dados do backend do Saúde Pet), configurado no mesmo dia. A API
  autentica no SMTP ao subir; envio de ponta a ponta não foi testado.
- O banco `arxisvr` (Postgres do host) não foi tocado além da senha. Os uploads
  voltaram de `/opt/backups/retidos-20261005/vol-arxisvr_uploads-20261005.tar.gz`.
- A imagem da API foi construída fora do servidor
  (`ARXISVR_BUILD_LOCAL=1`), porque o disco de lá estava em 97%. No servidor
  ela ocupa 1,3 GB e levou o disco a 100% por alguns minutos.

O texto abaixo é o plano original, mantido como referência.

---

## O que mudou no código

Nenhum arquivo escreve mais um domínio literal. Existe um ponto de verdade por
camada:

| Camada | Arquivo | O que resolve |
|---|---|---|
| Frontend | `frontend/src/config/site.config.ts` | site canônico, API, WebSocket, hosts legados |
| Backend | `backend/src/core/config/domains.ts` | `FRONTEND_URL`, `API_URL`, allowlist de CORS, e-mail de privacidade |
| Deploy | `deploy/deploy.sh`, `deploy/deploy-aplicacoes.sh`, `deploy/health-watch.sh` | `ARXISVR_SITE_URL` / `ARXISVR_API_URL`, com o canônico como default |
| Borda | `deploy/Caddyfile.apps-noclient` | hosts atendidos e o redirecionamento do domínio antigo |

Três decisões que valem explicação:

1. **O bundle servido pelo host antigo continua falando com a API antiga.**
   `resolveApiUrl()` olha o `window.location.hostname`: em
   `arxisvr.avilaops.com` devolve `api.arxisvr.avilaops.com`. Assim um build só
   atende os dois domínios — o corte não depende de republicar na hora certa, e
   cada site fica no mesmo domínio de falha da sua API. Por isso o
   `VITE_API_URL` deixou de ser fixado no `.env.production` e no script de
   deploy: fixar amarra o bundle a um domínio só. Vale enquanto os dois
   responderem.

2. **`canonical` e `og:url` apontam sempre para `arxisbim.com.br`**, mesmo na
   página servida pelo host antigo (`resolveCanonicalSiteUrl()`). É o que
   consolida os dois endereços num resultado de busca só, junto com o 308.

3. **A API antiga não redireciona.** Um 3xx quebra o preflight do CORS e os
   `POST` do plugin do Revit já instalado, que não seguem redirecionamento com
   corpo. Ela serve o mesmo backend até o desligamento (critério no fim).

Além disso, o default do CORS deixou de ser `*`. Sem `CORS_ORIGIN` no ambiente,
vale a allowlist dos domínios do produto: `*` combinado com `credentials: true`
é recusado pelo browser em qualquer requisição credenciada, e uma allowlist
ainda impede que qualquer site chame a API pelo browser de um usuário logado.
Em produção o `.env` já define `CORS_ORIGIN`; a mudança só fecha o caso em que a
variável falta. Para depurar, `CORS_ORIGIN=*` continua sendo o escape explícito.

---

## Ordem de execução

### 1. DNS na Cloudflare (zona `arxisbim.com.br`)

| Nome | Tipo | Valor | Proxy |
|---|---|---|---|
| `arxisbim.com.br` | A | `204.168.249.111` | DNS only |
| `www` | A | `204.168.249.111` | DNS only |
| `api` | A | `204.168.249.111` | DNS only |

DNS only (nuvem cinza) **por escolha, não por impossibilidade**. O proxy laranja
não impede o Caddy de emitir: a Cloudflare repassa o desafio HTTP-01 na porta 80,
e `crm.avilaops.com` — que passa pelo proxy — é servido por este mesmo Caddy. O
que não funciona atrás do laranja é o TLS-ALPN-01, porque a Cloudflare termina o
TLS na borda; como o Caddy tenta os dois, o efeito prático é uma emissão mais
lenta e com uma falha a mais no log.

A razão de começar cinza é diagnóstico, e vale para a janela do corte: `dig` e
`curl` falam com a máquina, o IP no log do Caddy é o do visitante, e um erro de
certificado só pode ser do Caddy — sem uma camada a mais para descartar antes. É
como estão os outros apps do `apps-noclient`. Ligar o laranja depois, se houver
motivo, é a etapa 7.

Nameservers no registro.br: **já apontados para a Cloudflare** — conferido em
17/09/2026, a zona responde por `donald.ns.cloudflare.com` e
`dora.ns.cloudflare.com`. Falta só criar os três registros acima: hoje o apex não
tem registro A, e `www` e `api` respondem NXDOMAIN.

Conferir os dois níveis antes de seguir — resolução e alcance:

```bash
# 1. os nomes resolvendo para a maquina
dig +short arxisbim.com.br www.arxisbim.com.br api.arxisbim.com.br
# os tres → 204.168.249.111

# 2. 80 e 443 chegando na maquina pelo nome novo. Antes da etapa 2 o Caddy ainda
# nao conhece esses hosts, entao um 404 dele ja prova que a requisicao chegou:
# o que reprova e timeout ou conexao recusada.
curl -sS -o /dev/null -w 'http %{http_code} via %{remote_ip}\n' http://arxisbim.com.br/
nc -vz arxisbim.com.br 443
```

### 2. Caddy no servidor `apps-noclient`

Copiar `deploy/Caddyfile.apps-noclient` para `/etc/caddy/Caddyfile` e recarregar:

```bash
caddy validate --config /etc/caddy/Caddyfile   # erro aqui: nao recarregue
systemctl reload caddy                          # graceful, os outros apps seguem servindo
journalctl -u caddy -n 50 --no-pager            # emissao dos 3 nomes novos
```

O `validate` antes do `reload` é o que protege os outros projetos da máquina
(CRM, SMS, Alô Barbeiro). O `reload` do Caddy já recusa config inválida e mantém
a anterior no ar — mas uma config **válida e errada** entra e derruba quem estava
certo, e é isso que o `validate` mais um par de olhos no diff pegam antes.

Conferir a emissão antes de seguir:

```bash
curl -sSI https://arxisbim.com.br/ | head -1     # 200, sem erro de TLS
curl -sS -o /dev/null -w '%{ssl_verify_result}\n' https://api.arxisbim.com.br/health   # 0
```

Só aplicar **depois** da etapa 1: o Caddy só emite certificado quando o ACME
chega na máquina pelo nome.

### 3. Variáveis no `/opt/arxisvr/.env`

```
FRONTEND_URL=https://arxisbim.com.br
API_URL=https://api.arxisbim.com.br
BACKEND_URL=https://api.arxisbim.com.br
CORS_ORIGIN=https://arxisbim.com.br,https://www.arxisbim.com.br,https://arxisvr.avilaops.com,https://www.arxisvr.avilaops.com
PRIVACY_EMAIL=privacidade@arxisbim.com.br
```

`CORS_ORIGIN` com os quatro hosts é o que mantém o app antigo funcionando
durante a janela. `BACKEND_URL` é o que monta o `redirect_uri` do OAuth
(`auth.routes.ts`) — ver etapa 6.

### 4. Deploy

```bash
./deploy/deploy-aplicacoes.sh tudo
```

O script constrói o frontend com `VITE_SITE_URL` do domínio canônico (sitemap,
robots, feed e canonical) e confere as URLs novas no fim; a origem da API é
resolvida em execução. Se precisar subir **antes** do DNS estar de pé:

```bash
ARXISVR_SITE_URL=https://arxisvr.avilaops.com \
ARXISVR_API_URL=https://api.arxisvr.avilaops.com \
./deploy/deploy-aplicacoes.sh tudo
```

### 5. Conferência

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://arxisbim.com.br/
curl -s -o /dev/null -w '%{http_code}\n' https://arxisbim.com.br/validador
curl -s https://api.arxisbim.com.br/health | grep '"database":"up"'

# o domínio antigo redireciona preservando caminho e query
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  'https://arxisvr.avilaops.com/blog/o-que-e-ifc?x=1'
# esperado: 308 https://arxisbim.com.br/blog/o-que-e-ifc?x=1

# a API antiga NÃO redireciona
curl -s -o /dev/null -w '%{http_code}\n' https://api.arxisvr.avilaops.com/health   # 200
```

No browser, com o app aberto: login, upload de IFC, salvar cenário e comparar
A/B. É onde um CORS mal configurado aparece — e aparece como "erro de rede",
sem nada no log do servidor.

### 6. Serviços externos (fora do repositório)

Cada um destes tem de ser atualizado no painel do respectivo serviço. Nenhum sai
do código:

- **Google Cloud / GitHub OAuth** — somar
  `https://api.arxisbim.com.br/api/v1/auth/google/callback` e
  `.../auth/github/callback` às URIs autorizadas. Manter as antigas enquanto o
  host antigo responder.
- **Mercado Pago** — URL de webhook para `https://api.arxisbim.com.br/api/v1/billing/webhook`.
  O `MP_WEBHOOK_SECRET` não muda.
- **Resend / SMTP** — verificar `arxisbim.com.br` como domínio de envio (SPF,
  DKIM, DMARC) e trocar `EMAIL_FROM`. Enquanto o domínio não estiver verificado,
  **não** trocar: e-mail com remetente de domínio não verificado vai para spam.
- **Caixa `privacidade@arxisbim.com.br`** — precisa existir (ou redirecionar)
  antes do primeiro envio de marketing: é o `List-Unsubscribe` dos e-mails.
- **Google Search Console** — registrar a propriedade nova, enviar
  `https://arxisbim.com.br/sitemap.xml` e usar "Mudança de endereço" a partir da
  propriedade antiga.
- **Meta (Pixel + Conversions API)** — verificar o domínio novo no Business
  Manager, senão o Pixel para de casar evento com anúncio.
- **Google Tag Manager / GA4** — somar o domínio novo à lista de domínios do
  container `GTM-NFG6X7XF`.
- **Sentry** — `VITE_SENTRY_*` não muda; conferir o filtro de origem se houver.
- **Instagram / materiais de marketing** — `@arxis.bim` já fecha com o domínio
  novo; trocar o link da bio e as artes que mostram a URL.
- **Monitor de saúde do `app.avilaops.com`** — em `src/lib/health/config.ts`, a
  entrada `arxisvr` aponta para `https://arxisvr.avilaops.com/`. Trocar para
  `https://arxisbim.com.br/` **depois** que o DNS estiver de pé (antes disso o
  probe falha no DNS e a tela Saúde marca DOWN falso). A `key` continua
  `arxisvr`: é ela que liga as leituras já gravadas ao serviço. Enquanto não for
  trocada, o probe segue o 308 e continua verde, só medindo um salto a mais.

### 7. Proxy laranja (opcional, só depois de tudo verde)

Só faz sentido depois do certificado emitido e da conferência da etapa 5 passar.
Se ligar:

- O Caddy continua emitindo e renovando pelo HTTP-01, que atravessa o proxy — o
  visitante é que passa a ver o certificado da Cloudflare.
- SSL/TLS no painel tem de ficar em **Full (strict)**. Em *Flexible* a Cloudflare
  fala HTTP com a origem e o app entra em laço de redirecionamento.
- `api.arxisbim.com.br` é o host que pede atenção: o upload de IFC esbarra no
  limite de corpo da Cloudflare (100 MB no plano gratuito) e o WebSocket precisa
  continuar passando.
- As faixas da Cloudflare já estão em `trusted_proxies` no Caddyfile, então
  `{client_ip}` segue sendo o visitante — mesmo desenho do `crm.avilaops.com`.

Sem motivo concreto (cache, WAF, esconder o IP de origem), não ligar: cinza é uma
peça a menos entre o usuário e o app, e uma a menos para descartar quando algo
quebrar.

---

## Desligar o domínio antigo

Não tem data fixa. O critério é medida, não calendário:

1. O acesso direto a `arxisvr.avilaops.com` (o que chega no 308) cair para perto
   de zero por duas semanas seguidas.
2. Nenhum plugin do Revit chamando `api.arxisvr.avilaops.com` no mesmo período.
3. O Search Console mostrar o domínio novo indexado no lugar do antigo.

Quando os três baterem: remover o bloco `api.arxisvr.avilaops.com` do Caddyfile
(o 308 do site pode ficar mais tempo, custa nada), tirar os hosts antigos do
`CORS_ORIGIN` e apagar `LEGACY_API_BY_HOST` do `site.config.ts` junto com
`LEGACY_*` do `domains.ts` — os testes de `site.config.test.ts` que cobrem host
legado caem junto, de propósito.

## Rollback

A reversão é a etapa 2 ao contrário: restaurar o Caddyfile anterior (o bloco
antigo servindo em vez de redirecionar) e reconstruir o frontend com
`ARXISVR_SITE_URL`/`ARXISVR_API_URL` do domínio antigo. O DNS novo pode ficar de
pé sem prejuízo. Nada no banco muda nesta migração, então não há dump a
restaurar.

---

## Entrada pelo login central (12/10/2026)

Desde 12/10/2026 o Arxis só abre sessão pelo `auth.avilaops.com`, por OIDC. O
Arxis continua dono dos próprios usuários, espaços de trabalho e sessão (JWT e
refresh); o Auth responde quem é a pessoa.

| Peça | Onde |
|---|---|
| Rotas | `GET /api/v1/auth/avilaops` (ida) e `/api/v1/auth/avilaops/callback` (volta), em `backend/src/core/auth/auth.routes.ts` |
| Regras do fluxo | `backend/src/core/auth/avilaops-oidc.ts`: PKCE S256, `state` assinado e cookie `arx_oidc` que amarra a volta ao navegador da ida |
| Telas | `frontend/src/pages/LoginPage.tsx` e `RegisterPage.tsx` levam à rota de ida; `/forgot-password` e `/reset-password` caem em `/login` |
| No Auth | aplicação `arxis` (host `app.arxisbim.com.br`, aberta, sem papel exigido) e integração `arxis` em `clientes_oidc`, com o retorno `https://api.arxisbim.com.br/api/v1/auth/avilaops/callback` |

Variáveis no `/opt/arxisvr/.env`:

```
AVILAOPS_OIDC_CLIENT_ID=arxis
AVILAOPS_OIDC_CLIENT_SECRET=...   # o Auth guarda só o hash
AUTH_SSO_ONLY=true                # fecha /login, /register, /forgot-password e /reset-password (410)
```

- Conta que já existia é reaproveitada pelo e-mail no primeiro acesso; conta
  nova nasce com espaço de trabalho próprio, como no login social.
- Cadastro de conta nova e recuperação de senha são do Auth. Google, Microsoft
  e Facebook também: os botões de lá substituem as credenciais de OAuth que o
  Arxis tinha.
- Sair do Arxis não encerra a sessão do Auth. É de propósito: sair daqui não
  pode derrubar os outros produtos da casa.
- Domínio novo para a API muda o endereço de retorno, que precisa ser
  atualizado na integração do Auth (igualdade exata).
- Sem `AUTH_SSO_ONLY` (dev e testes) as rotas de senha seguem funcionando.
- `POST /auth/change-password` e o 2FA próprio continuam no código e não têm
  mais uso com a entrada única; ficaram para limpeza.
