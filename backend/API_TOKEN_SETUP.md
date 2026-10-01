# 🚀 API Token System - Setup & Deployment Guide

## Visão Geral

O sistema de API tokens do ArxisVR foi implementado seguindo as melhores práticas de segurança para SaaS multiempresa:

- ✅ HMAC-SHA-256 com pepper do servidor
- ✅ Tokens mostrados UMA VEZ
- ✅ Prefixo mascarado na tabela
- ✅ Revogação imediata (soft delete)
- ✅ Auditoria completa (sem expor tokens)
- ✅ Isolamento por tenant
- ✅ Escopos de acesso granulares

---

## 1. Configuração Inicial

### 1.1 Gerar Pepper Seguro

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Output exemplo:
```
HX8kL9mP2qR5sT7uV0wX1yZ3aB4cD6eF8gH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8aB9cD0eF
```

### 1.2 Configurar .env

```env
# Backend
API_TOKEN_PEPPER=HX8kL9mP2qR5sT7uV0wX1yZ3aB4cD6eF8gH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8aB9cD0eF

# Frontend
VITE_API_URL=http://localhost:3001/api/v1
```

### 1.3 Validação no Startup

O backend DEVE validar o pepper na inicialização:

```ts
// backend/src/index.ts (no topo do try/catch)
import { validateApiTokenPepper, initializeApiTokensService } from './core/validation/api-token-validation.js';

try {
  // Validar pepper ANTES de qualquer coisa
  validateApiTokenPepper();
  
  // Inicializar serviço com validação
  const apiTokensService = initializeApiTokensService();
  setApiTokensService(apiTokensService);
  
  // ... resto do setup
}
```

Se o pepper não estiver configurado:

```
❌ API_TOKEN_PEPPER não está configurado. Adicione ao .env:
API_TOKEN_PEPPER=<use: node -e "...">
```

---

## 2. Banco de Dados

### 2.1 Executar Migrations

```bash
npm run migrate
```

Cria:
- `api_tokens` table (hash seguro, prefix, revoked_at)
- `api_token_audit_logs` table (auditoria sem expor tokens)

### 2.2 Estrutura das Tabelas

**api_tokens:**
```sql
id (UUID) -- Token ID
tenant_id (UUID) -- Organização
name (VARCHAR) -- Nome do token
prefix (VARCHAR) -- Prefixo público (arx_live_abc••••Z9K)
token_hash (TEXT UNIQUE) -- Hash HMAC-SHA-256 (NUNCA plaintext)
scopes (JSONB) -- Escopos ['projects:read', ...]
environment (VARCHAR) -- 'live' | 'test'
expires_at (TIMESTAMPTZ, nullable)
last_used_at (TIMESTAMPTZ, nullable)
last_used_ip (VARCHAR, nullable)
revoked_at (TIMESTAMPTZ, nullable) -- Soft delete
created_at (TIMESTAMPTZ)
```

**api_token_audit_logs:**
```sql
id (UUID) -- Log ID
token_id (UUID) -- Referência (NULL para failed_auth)
tenant_id (UUID) -- Organização
user_id (UUID, nullable) -- User responsável
action (VARCHAR) -- 'created' | 'revoked' | 'used' | 'failed_auth' | 'scope_denied'
token_prefix (VARCHAR) -- Prefixo mascarado (NUNCA token completo)
ip_address (VARCHAR) -- IP de origem
user_agent (TEXT, nullable)
error_message (TEXT, nullable)
created_at (TIMESTAMPTZ)
```

---

## 3. Build & Deploy

### 3.1 Desenvolvimento Local

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

### 3.2 Build para Produção

```bash
# Backend
npm run build
npm run migrate  # Executar migrations
npm run start

# Frontend
npm run build  # Gera dist/
```

### 3.3 Variáveis de Ambiente (Produção)

```env
# .env.production

# API Token Security
API_TOKEN_PEPPER=<gerar com: node -e "..."> # OBRIGATÓRIO, min 32 chars

# Database
DATABASE_URL=postgresql://user:pass@host/arxisvr

# Frontend
VITE_API_URL=https://api.arxisvr.com/api/v1
```

⚠️ **Nunca commite o pepper no git!** Use secrets do seu deployment (Render, Vercel, GitHub Actions, etc).

---

## 4. Testando a API

### 4.1 Criar um Token (Interface)

1. Acesse http://localhost:5173/account (aba "Tokens de API")
2. Clique em "+ Novo Token"
3. Configure:
   - Nome: `Test Token`
   - Ambiente: `test`
   - Escopos: `projects:read`
   - Expira: deixar em branco
4. Copie o token exibido (aparece UMA VEZ)

Exemplo de token gerado:
```
arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB
```

### 4.2 Testar Autenticação com curl

Token válido com escopo `projects:read`:

```bash
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB"

# Resposta esperada: 200 OK
# [lista de projetos]
```

Token válido SEM escopo `projects:write`:

```bash
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'

# Resposta esperada: 403 Forbidden
# {"error": "Forbidden", "message": "Required scopes: projects:write"}
```

Token inválido:

```bash
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer invalid_token"

# Resposta esperada: 401 Unauthorized
# {"error": "Unauthorized", "message": "Invalid API token format"}
```

Token revogado:

```bash
# 1. Revogou o token na interface (Database: revoked_at = NOW())
# 2. Tente usar:

curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB"

# Resposta esperada: 401 Unauthorized
# {"error": "Unauthorized", "message": "Invalid or revoked API token"}
```

### 4.3 Testar Isolamento por Tenant

O token de um tenant NÃO acessa dados de outro:

```bash
# Token do Tenant A
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_TOKEN_TENANT_A"

# Retorna: projetos do Tenant A apenas (verificação automática no middleware)

# Token do Tenant B
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_TOKEN_TENANT_B"

# Retorna: projetos do Tenant B apenas (NUNCA vê dados do Tenant A)
```

### 4.4 Testar Expiração

Crie um token que expira amanhã:

```bash
# Interface: configure "Expira em" = [data de hoje]
```

Ao usar:

```bash
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_EXPIRED_TOKEN"

# Resposta esperada: 401 Unauthorized
# {"error": "Unauthorized", "message": "Invalid or revoked API token"}
```

---

## 5. Checklist de Deployment

Antes de subir para produção:

- [ ] `.env` tem `API_TOKEN_PEPPER` (min 32 chars)
- [ ] `API_TOKEN_PEPPER` NÃO está no git (.gitignore ✓)
- [ ] Database migrations rodaram (`npm run migrate`)
- [ ] Backend inicia SEM erros (`npm run build && npm run start`)
- [ ] Testou autenticação com curl (200, 401, 403)
- [ ] Frontend acessa `/account` → aba "Tokens de API"
- [ ] Criou um token, copiar funcionou, prefixo é mascarado
- [ ] Revogar token torna-o inválido imediatamente
- [ ] Audit logs não expõem token plaintext
- [ ] Tenant A não vê dados de Tenant B
- [ ] Rate limit 300 req/min funciona
- [ ] Logs não contêm `plainToken` (grep -r)

---

## 6. Integração com CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

env:
  API_TOKEN_PEPPER: ${{ secrets.API_TOKEN_PEPPER }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Backend
        run: |
          cd backend
          npm ci
          npm run build
      
      - name: Validate API_TOKEN_PEPPER
        run: |
          if [ -z "$API_TOKEN_PEPPER" ]; then
            echo "ERROR: API_TOKEN_PEPPER not set in GitHub Secrets"
            exit 1
          fi
          if [ ${#API_TOKEN_PEPPER} -lt 32 ]; then
            echo "ERROR: API_TOKEN_PEPPER must be at least 32 characters"
            exit 1
          fi
      
      - name: Deploy to Production
        run: npm run start
```

Configurar no GitHub:
1. Settings → Secrets and Variables → Actions
2. Novo secret: `API_TOKEN_PEPPER` = [valor gerado]

---

## 7. Monitoramento & Logs

### Quem criou/revogou um token?

```sql
SELECT
  atl.token_id,
  atl.action,
  atl.user_id,
  atl.created_at,
  at.name,
  at.prefix
FROM api_token_audit_logs atl
JOIN api_tokens at ON atl.token_id = at.id
WHERE at.tenant_id = 'seu-tenant-id'
ORDER BY atl.created_at DESC;
```

### Tokens nunca usados (possíveis problemas)

```sql
SELECT name, prefix, created_at, last_used_at
FROM api_tokens
WHERE tenant_id = 'seu-tenant-id'
  AND last_used_at IS NULL
  AND revoked_at IS NULL
  AND created_at < NOW() - INTERVAL '7 days';
```

### Tentativas falhadas de autenticação

```sql
SELECT ip_address, error_message, created_at
FROM api_token_audit_logs
WHERE action = 'failed_auth'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 8. Troubleshooting

### Erro: "API_TOKEN_PEPPER não configurado"

```
❌ API_TOKEN_PEPPER não está configurado. Adicione ao .env
```

**Solução:**

```bash
# Gerar pepper
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Adicionar ao .env
echo "API_TOKEN_PEPPER=<valor gerado>" >> .env
```

### Erro: "401 Unauthorized - Invalid API token format"

O token não começa com `arx_live_` ou `arx_test_`, ou tem caracteres inválidos.

**Solução:** Copiar token da interface é exato. Não editar manualmente.

### Erro: "403 Forbidden - Required scopes"

O token não tem o escopo para a operação.

**Solução:** Criar novo token com os escopos necessários.

### Tokens antigos ainda funcionam após mudar PEPPER

**Isso é esperado:** O pepper novo HMAC calcula hash diferente.

- Tokens antigos com pepper antigo: funcionam até revogação
- Tokens novos com pepper novo: precisam recalcular

Para renovar tokens em massa:

```sql
-- Revogar todos os tokens antigos
UPDATE api_tokens
SET revoked_at = NOW()
WHERE revoked_at IS NULL
  AND created_at < '2024-06-25'::date;
```

---

## 9. Roadmap Futuro

- [ ] Rotação automática de pepper (com grace period)
- [ ] Rate limiting por token (não apenas por IP)
- [ ] Métricas de uso por token (requests/dia)
- [ ] Webhooks em ações de token (criação, revogação)
- [ ] OAuth2 flow para apps de terceiros
- [ ] Portal público de documentação (swagger/openapi)

---

## 📞 Suporte

- Docs: https://docs.arxisvr.com/api
- Issues: GitHub Issues
- Email: api@arxisvr.com

---

**Última atualização:** 2024-06-25  
**Versão:** 1.0.0
