# 🔐 ArxisVR API Token System

Sistema de autenticação e autorização via API tokens para integração programática com ArxisVR.

## ⚡ Quick Start

```bash
# Linux/macOS
bash backend/setup.sh

# Windows (PowerShell)
# Seguir manualmente: backend/API_TOKEN_SETUP.md
```

Isso:
1. ✅ Gera pepper seguro (48 bytes)
2. ✅ Cria `.env` com `API_TOKEN_PEPPER`
3. ✅ Instala dependências
4. ✅ Compila backend
5. ✅ Executa migrations

## 🚀 Desenvolvimento

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Acesse: http://localhost:5173

## 📝 Criar um Token

1. Acesse **Configurações** → **Tokens de API**
2. Clique em **+ Novo Token**
3. Configure:
   - Nome: `My Integration`
   - Ambiente: `test` (para dev)
   - Escopos: `projects:read`, `models:read`
   - Expira em: deixar vazio (nunca)
4. **Copie o token** (aparece UMA VEZ)

Token gerado: `arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB`

## 🧪 Testar a API

```bash
# Token com escopo projects:read → 200 OK
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB"

# Token sem escopo projects:write → 403 Forbidden
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Token inválido → 401 Unauthorized
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer invalid"
```

## 🔒 Segurança

- ✅ **HMAC-SHA-256**: Hash seguro com pepper do servidor
- ✅ **Token mostrado UMA VEZ**: nunca é retornado depois de criado
- ✅ **Prefixo mascarado**: tabela mostra `arx_live_abc••••••••••Z9K`
- ✅ **Revogação imediata**: não apaga, apenas marca como revogado
- ✅ **Auditoria completa**: logs nunca expõem token plaintext
- ✅ **Isolamento por tenant**: token só acessa dados da sua organização
- ✅ **Escopos granulares**: `projects:read`, `models:write`, etc

## 📚 Documentação Completa

Veja [API_TOKEN_SETUP.md](./API_TOKEN_SETUP.md) para:
- Configuração de produção
- CI/CD integration
- Deployment checklist
- Troubleshooting
- Monitoramento

## 🛠️ Arquitetura

### Frontend (`frontend/src/`)
- `pages/account/ApiTokensPage.tsx` - Interface de gerenciamento
- `pages/account/ApiDocumentationPage.tsx` - Docs e exemplos
- `components/account/ApiToken*` - Componentes UI
- `hooks/useApiTokens.ts` - React hook para CRUD
- `services/apiTokens.service.ts` - Cliente API

### Backend (`backend/src/`)
- `modules/api-tokens/` - Lógica de tokens
  - `api-tokens.service.ts` - Service (create, list, revoke)
  - `api-tokens.routes.ts` - Rotas de gerenciamento (JWT)
  - `utils/generateApiToken.ts` - Geração e hash
- `core/auth/api-token.middleware.ts` - Autenticação (protege rotas públicas)
- `routes/v1/public-api.routes.ts` - Rotas públicas (protegidas por token)
- `migrations/20260625_create_api_tokens_table.sql` - Schema

## 📊 Banco de Dados

### `api_tokens` table
```sql
id, tenant_id, name, prefix, token_hash, scopes, environment,
expires_at, last_used_at, last_used_ip, revoked_at, created_at
```

### `api_token_audit_logs` table
```sql
id, token_id, tenant_id, user_id, action, token_prefix, ip_address,
user_agent, error_message, created_at
```

## 🔑 Escopos Disponíveis

| Escopo | Descrição |
|--------|-----------|
| `projects:read` | Ler projetos |
| `projects:write` | Criar/editar projetos |
| `models:read` | Ler modelos 3D |
| `models:write` | Upload de modelos |
| `planning:read` | Ler cronogramas |
| `planning:write` | Editar cronogramas |
| `budgets:read` | Ler orçamentos |
| `budgets:write` | Editar orçamentos |
| `scenarios:read` | Ler cenários |
| `scenarios:write` | Criar cenários |

## 📞 Suporte

- **Docs**: https://docs.arxisvr.com/api
- **Discord**: discord.gg/arxisvr
- **Email**: api@arxisvr.com

---

**Status**: ✅ Pronto para Produção  
**Última Atualização**: 2024-06-25  
**Versão**: 1.0.0
