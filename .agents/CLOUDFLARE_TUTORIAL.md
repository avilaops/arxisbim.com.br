# Cloudflare API — Tutorial Completo

## Índice
1. [Visão Geral das Chaves](#1-visão-geral-das-chaves)
2. [Autenticação](#2-autenticação)
3. [Permissões por Token](#3-permissões-por-token)
4. [Comandos Úteis por Categoria](#4-comandos-úteis-por-categoria)
5. [R2 Storage (Object Storage)](#5-r2-storage)
6. [Workers](#6-workers)
7. [DNS](#7-dns)
8. [Zonas](#8-zonas)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Visão Geral das Chaves

| Arquivo | Variável | Tipo | Status | Escopo |
|---|---|---|---|---|
| `.env.local` / `.env.production` | `CLOUDFLARE_TOKEN` | API Token (scoped) | ✅ Ativo | worker:read/edit, zone:read |
| `.env.production` | `CLOUDFLARE_API_GLOBAL_KEY` | Global API Key | ✅ Ativo | ACESSO TOTAL (admin) |

### Diferença entre Global API Key e API Token

- **Global API Key**: Acesso TOTAL à conta. Equivalente a root. Usar com cuidado.
  - Autenticação via headers: `X-Auth-Key` + `X-Auth-Email`
  
- **API Token (scoped)**: Permissões granulares. Mais seguro. Recomendado.
  - Autenticação via header: `Authorization: Bearer <token>`

### Conta Cloudflare
- **Account ID**: `85b914dcdebf6fa2fce7b819bc542294`
- **Account Name**: Avila Ops
- **Email**: nicolas@avilaops.com

---

## 2. Autenticação

### Com API Token (recomendado)
```powershell
$token = "<TOKEN>"
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/..." -Headers $headers
```

### Com Global API Key (acesso total)
```powershell
$globalKey = "<GLOBAL_KEY>"
$headers = @{
    "X-Auth-Key"   = $globalKey
    "X-Auth-Email"  = "nicolas@avilaops.com"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/..." -Headers $headers
```

### Verificar se token está válido
```powershell
$token = "<TOKEN>"
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $headers | ConvertTo-Json
```

---

## 3. Permissões por Token

### Token `.env.local` (`CLOUDFLARE_TOKEN`)

| Permissão | Tipo | O que faz |
|---|---|---|
| `#zone:read` | 🔍 Leitura | Listar zonas, ver configurações de zona, ver planos |
| `#worker:read` | 🔍 Leitura | Listar Workers, ver código, ver rotas, ver logs |
| `#worker:edit` | ✏️ Escrita | Criar/editar/deletar Workers, publicar, gerenciar rotas |

**Resumo**: Esse token serve para gerenciar **Workers** e **ler zonas**. NÃO tem permissão para DNS, cache purge, SSL, WAF, etc.

### Global API Key (`.env.production` — `CLOUDFLARE_API_GLOBAL_KEY`)

| Permissão | Tipo | O que faz |
|---|---|---|
| `#zone:read` / `#zone:edit` | 👑 Admin | Criar/editar/deletar zonas completas |
| `#dns_records:read` / `#dns_records:edit` | 👑 Admin | CRUD completo de registros DNS |
| `#ssl:edit` | 👑 Admin | Gerenciar certificados SSL/TLS |
| `#waf:read` / `#waf:edit` | 👑 Admin | Web Application Firewall — regras de segurança |
| `#cache_purge:edit` | 👑 Admin | Limpar cache de CDN |
| `#worker:read` / `#worker:edit` | 👑 Admin | CRUD de Workers |
| `#r2_bucket:read` / `#r2_bucket:edit` | 👑 Admin | Gerenciar buckets R2 (Object Storage) |
| `#r2_bucket_item:read` / `#r2_bucket_item:edit` | 👑 Admin | Ler/escrever objetos dentro dos buckets R2 |
| `#analytics:read` | 🔍 Leitura | Ver analytics de tráfego |
| `#logs:read` / `#logs:edit` | 👑 Admin | Logpush — enviar logs para destinos externos |
| `#lb:read` / `#lb:edit` | 👑 Admin | Load Balancers |
| `#stream:read` / `#stream:edit` | 👑 Admin | Cloudflare Stream (vídeos) |
| `#image:read` / `#image:edit` | 👑 Admin | Cloudflare Images |
| `#page_shield:read` / `#page_shield:edit` | 👑 Admin | Monitoramento de scripts de terceiros |
| `#healthchecks:read` / `#healthchecks:edit` | 👑 Admin | Health checks de origem |
| `#teams:edit` / `#teams:pii` / `#teams:report` | 👑 Admin | Cloudflare Zero Trust (ZTNA) |
| `#billing:read` / `#billing:edit` | 👑 Admin | Informações de cobrança |
| `#member:read` / `#member:edit` | 👑 Admin | Gerenciar membros da conta |
| `#auditlogs:read` | 🔍 Leitura | Logs de auditoria da conta |
| `#d1:edit` | ✏️ Escrita | Cloudflare D1 (SQLite edge) |
| `#vectorize:read` / `#vectorize:edit` | 👑 Admin | Vectorize (vector DB) |
| `#zaraz:read` / `#zaraz:edit` / `#zaraz:publish` | 👑 Admin | Zaraz (tag manager) |
| `#waitingroom:read` / `#waitingroom:edit` | 👑 Admin | Waiting Room (fila de espera) |
| `#api_gateway:read` / `#api_gateway:edit` | 👑 Admin | API Gateway/Shield |
| `#zone_settings:read` / `#zone_settings:edit` | 👑 Admin | Configurações de zona (minify, TLS, etc) |
| `#zone_versioning:read` / `#zone_versioning:edit` | 👑 Admin | Versionamento de configurações |

---

## 4. Comandos Úteis por Categoria

### Verificar token
```powershell
# Variável padrão (copie no início da sessão)
$token = (Get-Content .env.local | Select-String "CLOUDFLARE_TOKEN").ToString().Split("=",2)[1].Trim()
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Ou com Global Key (acesso total)
$globalKey = (Get-Content .env.production | Select-String "CLOUDFLARE_API_GLOBAL_KEY").ToString().Split("=",2)[1].Trim()
$gHeaders = @{ "X-Auth-Key" = $globalKey; "X-Auth-Email" = "nicolas@avilaops.com"; "Content-Type" = "application/json" }
```

### Listar todas as zonas
```powershell
# Com token scoped (precisa #zone:read)
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones" -Headers $headers |
  % { $_.result } | Select name, id, status | Format-Table

# Resultado esperado:
# arcsat.com.br          5cf467adae88d2d797dedfda46c024a6  active
# avila.inc              cd327658ec2b2196e1f5c085fd182c88  active
# gabrielarincao.com.br  1ecfd7c4f3bec367fdb1cdbda07c5241  active
# griffedaprata.com.br   2927af06c8cd14c0d88602de76dad819  active
# tuitecnologia.com.br   e66dba4702e34be1cbf94c3193a2c051  active
```

---

## 5. R2 Storage

R2 = Object Storage compatível com S3 (sem egress fees).

**Endpoint R2**: `https://85b914dcdebf6fa2fce7b819bc542294.r2.cloudflarestorage.com`

### Listar buckets R2
```powershell
# Requer Global Key ou token com #r2_bucket:read
$accountId = "85b914dcdebf6fa2fce7b819bc542294"
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/r2/buckets" -Headers $gHeaders | ConvertTo-Json -Depth 3
```

### Criar bucket R2
```powershell
# Requer #r2_bucket:edit
$body = @{ name = "meu-bucket" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/r2/buckets" -Method POST -Headers $gHeaders -Body $body
```

### Deletar bucket R2
```powershell
# Requer #r2_bucket:edit
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/r2/buckets/meu-bucket" -Method DELETE -Headers $gHeaders
```

### Upload de arquivo via S3 API (usado pela app)
A app usa o endpoint S3-compatible do R2 com credenciais Access Key/Secret Key (configurados separadamente no dashboard Cloudflare R2 > Manage R2 API Tokens).

---

## 6. Workers

### Listar Workers
```powershell
# Requer #worker:read (token .env.local TEM essa permissão)
$accountId = "85b914dcdebf6fa2fce7b819bc542294"
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts" -Headers $headers | % { $_.result } | Select id, modified_on | Format-Table
```

### Ver código de um Worker
```powershell
# Requer #worker:read
$workerName = "nome-do-worker"
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$workerName" -Headers $headers
```

### Listar rotas de Worker (por zona)
```powershell
# Requer #worker:read
$zoneId = "cd327658ec2b2196e1f5c085fd182c88"  # avila.inc
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/workers/routes" -Headers $headers | % { $_.result } | Format-Table
```

### Deletar Worker
```powershell
# Requer #worker:edit
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$workerName" -Method DELETE -Headers $headers
```

---

## 7. DNS

⚠️ **Requer Global API Key** — token do `.env.local` NÃO tem permissão DNS.

### Listar registros DNS de uma zona
```powershell
$zoneId = "cd327658ec2b2196e1f5c085fd182c88"  # avila.inc
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $gHeaders |
  % { $_.result } | Select type, name, content, proxied, ttl | Format-Table -AutoSize
```

### Criar registro DNS
```powershell
# Exemplo: CNAME apontando subdomain.avila.inc → target.com
$body = @{
    type    = "CNAME"
    name    = "subdomain"
    content = "target.com"
    ttl     = 1          # 1 = automático
    proxied = $true      # $true = passa pelo CDN Cloudflare (proxy laranja)
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Method POST -Headers $gHeaders -Body $body
```

### Criar registro A
```powershell
$body = @{
    type    = "A"
    name    = "api"
    content = "1.2.3.4"
    ttl     = 1
    proxied = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Method POST -Headers $gHeaders -Body $body
```

### Editar registro DNS
```powershell
$recordId = "<RECORD_ID>"  # pegar do GET acima
$body = @{
    type    = "CNAME"
    name    = "subdomain"
    content = "novo-target.com"
    ttl     = 1
    proxied = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" -Method PUT -Headers $gHeaders -Body $body
```

### Deletar registro DNS
```powershell
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" -Method DELETE -Headers $gHeaders
```

---

## 8. Zonas

### Purge de cache (limpar CDN)
```powershell
# Requer #cache_purge:edit (Global Key)
$zoneId = "cd327658ec2b2196e1f5c085fd182c88"

# Purge total
$body = @{ purge_everything = $true } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/purge_cache" -Method POST -Headers $gHeaders -Body $body

# Purge de URLs específicas
$body = @{ files = @("https://avila.inc/style.css", "https://avila.inc/app.js") } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/purge_cache" -Method POST -Headers $gHeaders -Body $body
```

### Ver configurações de zona (TLS, minify, etc)
```powershell
# Requer #zone_settings:read
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/settings" -Headers $gHeaders |
  % { $_.result } | Select id, value | Format-Table -AutoSize
```

### Alterar nível de SSL/TLS
```powershell
# Valores: off, flexible, full, strict
$body = @{ value = "full" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/settings/ssl" -Method PATCH -Headers $gHeaders -Body $body
```

### Ver analytics de tráfego
```powershell
# Requer #analytics:read
$since = (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
$until = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/analytics/dashboard?since=$since&until=$until" -Headers $gHeaders | ConvertTo-Json -Depth 5
```

### Health Checks
```powershell
# Listar health checks
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/healthchecks" -Headers $gHeaders | % { $_.result } | Format-Table

# Criar health check
$body = @{
    name            = "api-health"
    address         = "api.arxisvr.avilaops.com"
    type            = "HTTPS"
    check_regions   = @("WEU", "ENAM")
    interval        = 60
    timeout         = 5
    retries         = 2
    http_config     = @{
        method          = "GET"
        path            = "/health"
        expected_codes  = @("200")
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/healthchecks" -Method POST -Headers $gHeaders -Body $body
```

### Audit Logs (quem fez o quê na conta)
```powershell
$accountId = "85b914dcdebf6fa2fce7b819bc542294"
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/audit_logs?per_page=10" -Headers $gHeaders | % { $_.result } | Select action, actor, when | Format-Table
```

---

## 9. Troubleshooting

### Token retorna 403
- Token expirado → regenerar no Dashboard Cloudflare > My Profile > API Tokens
- Token sem permissão pro recurso → editar permissões do token
- Global Key sempre funciona como fallback

### Como regenerar API Token
1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique "Create Token"
3. Selecione permissões necessárias (ex: Zone:Read, DNS:Edit, R2:Edit)
4. Copie e atualize no `.env.local` ou `.env.production`

### Referência rápida de Zone IDs
```
arcsat.com.br          → 5cf467adae88d2d797dedfda46c024a6
avila.inc              → cd327658ec2b2196e1f5c085fd182c88
gabrielarincao.com.br  → 1ecfd7c4f3bec367fdb1cdbda07c5241
griffedaprata.com.br   → 2927af06c8cd14c0d88602de76dad819
tuitecnologia.com.br   → e66dba4702e34be1cbf94c3193a2c051
```

### Tokens ativos
- `CLOUDFLARE_TOKEN` — token scoped (worker + zone:read)
- `CLOUDFLARE_API_GLOBAL_KEY` — acesso total (usar só quando necessário)

---

## Referência da API
- Documentação oficial: https://developers.cloudflare.com/api/
- R2 API: https://developers.cloudflare.com/r2/api/
- Workers API: https://developers.cloudflare.com/workers/
