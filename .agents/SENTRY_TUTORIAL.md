# 🚨 Sentry - Monitoramento de Erros ArxisVR

## O que é Sentry?

Sentry é uma plataforma que **captura, agrupa e monitora erros** em tempo real.

**Benefícios:**
- ✅ Detecta bugs em produção antes de usuários reclamarem
- ✅ Agrupa erros iguais automaticamente
- ✅ Mostra stack trace completo com contexto
- ✅ Rastreia por versão (release)
- ✅ Alertas em tempo real

---

## 🔗 Acessar Sentry

| Item | Valor |
|------|-------|
| **Dashboard** | https://avilaops.sentry.io |
| **Organização** | avilaops |
| **Projeto** | arxisvr |
| **Autenticação** | GitHub OAuth |

---

## 🌍 URLs do Projeto

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| **Produção** | https://arxisvr.avilaops.com | https://api.arxisvr.avilaops.com |
| **Dev Local** | http://localhost:5173 | http://localhost:3001 |

---

## 🔑 Conceitos-Chave

### Release
**Versão do código rodando em produção.** Sem release, Sentry não sabe qual versão tem o bug.

```powershell
# Criar release via API
$body = @{
    version = "1.1.0"
    projects = @("arxisvr")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/" `
  -Headers $headers -Method Post -Body $body
```

### Issue
**Um erro agrupado automaticamente.** Se o mesmo erro acontece 100 vezes, é 1 issue com 100 eventos.

**Como Sentry agrupa:** arquivo + linha + função = fingerprint único

### Event
**Uma ocorrência individual do erro** dentro de uma issue.

---

## 📁 Onde Sentry é Configurado

### Backend (Node.js)
📄 **[backend/src/shared/observability/index.ts](backend/src/shared/observability/index.ts)**

```typescript
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),      // Captura erros HTTP
      Sentry.postgresIntegration(),  // Captura erros DB
    ],
  });
}
```

### Variáveis de Ambiente

```bash
# .env.production
SENTRY_DSN=https://[public_key]:[secret_key]@o[org_id].ingest.us.sentry.io/[project_id]
SENTRY_API_KEY=sntryu_[seu_token_aqui]  # Para usar a API
NODE_ENV=production
```

**Nota:** Sem `SENTRY_DSN`, Sentry não captura nada. Com `SENTRY_DSN` vazio, fica desativado.

---

## 🎯 Capturar Erros Manualmente

### Backend (TypeScript/Node.js)

```typescript
import * as Sentry from "@sentry/node";

// Capturar exceção
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Mensagem customizada
Sentry.captureMessage("User uploaded invalid file", "warning");

// Com contexto adicional
Sentry.captureException(error, {
  tags: {
    section: "billing",
    userId: user.id,
  },
  contexts: {
    request: { path: "/api/invoices", method: "POST" },
  },
});
```

### Frontend (React)

```typescript
import * as Sentry from "@sentry/react";

// Error Boundary automático
export default Sentry.withErrorBoundary(MyComponent, {
  fallback: <p>Algo deu errado</p>,
  showDialog: true,
});

// Capturar erro manualmente
try {
  await apiCall();
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 📡 API Sentry via PowerShell

### Setup Inicial

```powershell
# Lê a chave do .env.production
$key = (Get-Content .env.production | Select-String "SENTRY_API_KEY").ToString().Split("=")[1].Trim()

# Monta headers para requisições
$headers = @{ 
    Authorization = "Bearer $key"
    "Content-Type" = "application/json"
}
```

### 1. Listar Projetos

```powershell
Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/projects/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

**Resposta esperada:**
```json
[
  {
    "id": "4511585309229056",
    "name": "arxisvr",
    "slug": "arxisvr",
    "platform": "javascript"
  }
]
```

### 2. Listar Issues (Erros Recentes)

```powershell
Invoke-RestMethod -Uri "https://sentry.io/api/0/projects/avilaops/arxisvr/issues/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

**Campos principais:**
- `title` — descrição do erro
- `count` — quantas vezes ocorreu
- `lastSeen` — horário do último evento
- `level` — erro / warning / info
- `status` — resolved / unresolved

### 3. Consultar Eventos de Uma Issue

```powershell
$issueId = "1234567890"  # ID da issue

Invoke-RestMethod -Uri "https://sentry.io/api/0/projects/avilaops/arxisvr/issues/$issueId/events/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

### 4. Criar uma Release ✅

```powershell
$body = @{
    version = "1.1.0"
    projects = @("arxisvr")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/" `
  -Headers $headers -Method Post -Body $body | ConvertTo-Json | Write-Host
```

**Resposta esperada:**
```json
{
  "id": 1831196118,
  "version": "1.1.0",
  "status": "open",
  "dateCreated": "2026-06-18T08:02:23.343634Z",
  "projects": [{ "id": "4511585309229056", "slug": "arxisvr" }]
}
```

---

## 🔍 Ler uma Issue no Dashboard

1. **Acesse:** https://avilaops.sentry.io/issues/
2. **Clique em uma issue**
3. **Você verá:**
   - **Title:** O que é o erro
   - **Stack Trace:** Exatamente qual arquivo, linha e função falhou
   - **Breadcrumbs:** O que o usuário fez antes (cliques, requests, etc)
   - **Release:** Qual versão tem o bug
   - **Users Affected:** Quantas pessoas foram afetadas
   - **Timeline:** Histórico completo de eventos

### Entendendo Stack Trace

```
File: src/handlers/user.ts
Line: 45
Function: updateProfile

Error: TypeError: Cannot read property 'email' of undefined
```

**Significa:**
- Erro acontece em `src/handlers/user.ts`, linha 45
- Na função `updateProfile`
- Tentou acessar `.email` de algo que é `undefined`
- Provavelmente `user` é null ou undefined

---

## ⚙️ Configurações por Ambiente

### Development (localhost)

```bash
# .env.local
SENTRY_DSN=  # VAZIO = Sentry desativado
NODE_ENV=development
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
```

**Comportamento:** Erros aparecem no console do navegador/terminal, **não** em Sentry.

**Para testar localmente:** Copie `SENTRY_DSN` de `.env.production` para `.env.local` e execute `npm run dev`.

### Production (Render)

```bash
# .env.production (injetado por Render)
SENTRY_DSN=https://[complete_dsn_url]
SENTRY_API_KEY=sntryu_[seu_token]
NODE_ENV=production
VITE_API_URL=https://api.arxisvr.avilaops.com
VITE_WS_URL=wss://api.arxisvr.avilaops.com
```

**Comportamento:** Todos os erros são capturados e aparecem em avilaops.sentry.io em tempo real.

---

## 🚀 Workflow: Git Push → Deploy → Sentry Automático

### Passo 1: Dev faz commit e push

```bash
git commit -m "Fix user authentication bug"
git push origin main
```

### Passo 2: Render detecta mudança

Configuração do Render:
- **Source:** `https://github.com/avilaops/arxisvr`
- **Branch:** `main`
- **Build Command:** `cd backend && npm ci --include-dev && npm run build`
- **Start Command:** `npm start`

### Passo 3: Deploy automático

```
✓ Render faz pull do main
✓ Executa npm run build
✓ Injeta .env.production (incluindo SENTRY_DSN)
✓ Inicia npm start
✓ Backend roda com Sentry ativo
```

### Passo 4: Usuário encontra erro em produção

```
https://arxisvr.avilaops.com → Erro acontece → Backend captura
↓
Sentry.captureException() → POST para https://sentry.io
↓
Aparece em https://avilaops.sentry.io/issues/ em <1 segundo
```

### Passo 5: Dev vê a issue no Sentry

```
https://avilaops.sentry.io → Issues → Clica no erro novo
↓
Vê: Stack trace, arquivo/linha, release, usuarios afetados
↓
Abre VS Code → Vai para src/handlers/user.ts:45
↓
Corrige o bug
```

### Passo 6: Dev faz novo commit

```bash
git commit -m "Fix: handle undefined user in updateProfile"
git push origin main
```

Render faz deploy automático da fix, nova release é criada, Sentry rastreia a melhoria.

---

## 📋 Checklist para Novo Dev

- [ ] Acessa https://avilaops.sentry.io com GitHub
- [ ] Vê o projeto `arxisvr` na organização `avilaops`
- [ ] Abre uma issue e entende o stack trace
- [ ] Sabe que `.env.production` precisa ter `SENTRY_DSN` para capturar
- [ ] Consegue listar projects via PowerShell usando `arxisvr-api` token
- [ ] Entende diferença: Release = versão, Issue = erro agrupado, Event = um erro individual
- [ ] Sabe como capturar erros manualmente com `Sentry.captureException()`
- [ ] Conhece as URLs corretas: backend = `api.arxisvr.avilaops.com`, frontend = `arxisvr.avilaops.com`

---

## 🆘 Troubleshooting

### "Não vejo erros em Sentry"

**Checklist:**
1. `.env.production` tem `SENTRY_DSN` com URL completa? (não vazio)
2. Backend rodando em produção (Render)?
3. `NODE_ENV=production`?
4. O erro **não** está dentro de um `try/catch` não tratado?
5. Sentry SDK está importado? (`import * as Sentry from "@sentry/node"`)

### "SENTRY_DSN vazio ou não configurado"

Sentry não captura nada. Solução:
1. Acesse https://avilaops.sentry.io/projects/arxisvr/
2. Copie o DSN completo
3. Adicione em `.env.production`: `SENTRY_DSN=https://...`
4. Deploy Render automaticamente (ou manual via webhook)

### "Erro 401 ao usar API"

Token expirou ou não tem permissões:
1. Vá para https://avilaops.sentry.io/settings/account/api/auth-tokens/
2. Crie novo token chamado `arxisvr-api`
3. Selecione escopos: `org:read`, `org:write`, `project:read`, `project:write`, `project:releases`
4. Copie e atualize `.env.production`: `SENTRY_API_KEY=sntryu_...`

### "Como testar Sentry localmente?"

```bash
# 1. Copie SENTRY_DSN de .env.production
# 2. Cole em .env.local (descomente a linha)
# 3. npm run dev
# 4. Abra um erro no seu código (ex: throw new Error("test"))
# 5. Vá para https://avilaops.sentry.io/issues/
# 6. Deve aparecer uma nova issue em segundos
```

---

## 📚 Links Úteis

- **Sentry Dashboard:** https://avilaops.sentry.io
- **Sentry API Docs:** https://docs.sentry.io/api/
- **Sentry SDK Node.js:** https://docs.sentry.io/platforms/node/
- **Sentry SDK React:** https://docs.sentry.io/platforms/javascript/guides/react/
- **GitHub Projeto:** https://github.com/avilaops/arxisvr
- **Render Backend:** https://api.arxisvr.avilaops.com
- **Frontend:** https://arxisvr.avilaops.com

---

## ✅ Próximos Passos

1. Ler este tutorial até o final
2. Acessar https://avilaops.sentry.io e explorar
3. Ter `.env.production` com `SENTRY_DSN` configurado
4. Criar uma release via PowerShell
5. Testar capturando um erro manualmente
6. Pronto para monitorar produção! 🎉

---

**Dúvidas? Pergunta no Slack!**
