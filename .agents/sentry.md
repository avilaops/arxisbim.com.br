# 📚 Tutorial Sentry para Novos Devs - ArxisVR (Atualizado)

```markdown
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

**URL:** https://avilaops.sentry.io

**Organização:** avilaops

**Projeto principal:** arxisvr

**Credenciais:** Usar conta GitHub (OAuth)

---

## 📊 Dashboard - O que você vê

Ao entrar, você vê:

```
Issues (Erros)
├─ Title: "TypeError: Cannot read property 'foo' of undefined"
├─ Count: 42 eventos
├─ Last: 2 horas atrás
├─ Release: 1.1.0
└─ Environment: production
```

**Clicar em uma issue mostra:**
- Stack trace completo (arquivo, linha, função)
- Breadcrumbs (ações que levaram ao erro)
- User info (qual usuário viu o erro)
- Release associada
- Timeline (quando ocorreu)

---

## 🔑 Conceitos-Chave

### Release
**Versão do código rodando em produção.** Sem release, você não sabe qual versão tem o bug.

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
**Um erro agrupado por fingerprint.** Se o mesmo erro acontece 100x, é 1 issue com 100 eventos.

**Fingerprint = arquivo + linha + nome da função**

### Event
**Uma ocorrência individual do erro.** Part de uma issue.

---

## 📁 Estrutura Backend - Sentry integrado

### Onde fica configurado?

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

### Variáveis de ambiente

```bash
# .env.production
SENTRY_DSN=https://[public_key]:[secret_key]@o[org_id].ingest.us.sentry.io/[project_id]
SENTRY_API_KEY=sntryu_[seu_token_aqui]  # Necessário para API
```

**Nota:** SENTRY_DSN ativa a integração. Sem ela, Sentry não funciona.

---

## 🎯 Capturar Erros Manualmente

### Backend (Node.js)

```typescript
import * as Sentry from "@sentry/node";

// Erro automático (não capturado)
try {
  throw new Error("Algo deu errado!");
} catch (error) {
  Sentry.captureException(error);  // Envia pro Sentry
}

// Mensagem customizada
Sentry.captureMessage("User uploaded invalid file", "warning");

// Com contexto
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

// Erro em componente React
export function BadComponent() {
  throw new Error("Render error!");
}

// Wrap com error boundary
export default Sentry.withErrorBoundary(BadComponent, {
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

## 📡 Usar API Sentry (PowerShell)

### Setup inicial

```powershell
# Lê a chave do .env.production
$key = (Get-Content .env.production | Select-String "SENTRY_API_KEY").ToString().Split("=")[1].Trim()

# Monta headers
$headers = @{ 
    Authorization = "Bearer $key"
    "Content-Type" = "application/json"
}
```

### 1. Listar todos os projects

```powershell
Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/projects/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

**Resposta:**
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

### 2. Listar issues (últimos erros)

```powershell
Invoke-RestMethod -Uri "https://sentry.io/api/0/projects/avilaops/arxisvr/issues/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

**Campos úteis:**
- `title` — título do erro
- `count` — quantas vezes ocorreu
- `lastSeen` — último horário
- `level` — error / warning / info
- `status` — resolved / unresolved

### 3. Consultar eventos de uma issue

```powershell
$issueId = "1234567890"  # ID da issue

Invoke-RestMethod -Uri "https://sentry.io/api/0/projects/avilaops/arxisvr/issues/$issueId/events/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

### 4. Criar uma release

```powershell
$body = @{
    version = "1.1.0"
    projects = @("arxisvr")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/" `
  -Headers $headers -Method Post -Body $body | ConvertTo-Json | Write-Host
```

### 5. Associar commits a uma release

```powershell
$releaseId = "1.1.0"
$body = @{
    commits = @(
        @{
            id = "abc123def"
            repository = "arxisvr"
            message = "Fix user login bug"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/$releaseId/commits/" `
  -Headers $headers -Method Post -Body $body
```

---

## 🔍 Ler uma Issue no Dashboard

1. **Acesse:** https://avilaops.sentry.io/issues/
2. **Clique em uma issue**
3. **Veja:**
   - **Title:** O que é o erro
   - **Stack Trace:** Arquivo → Linha → Função onde falhou
   - **Breadcrumbs:** O que o usuário fez antes (cliques, requests, etc)
   - **Release:** Qual versão tem o bug
   - **Users Affected:** Quantas pessoas viram
   - **Timeline:** Histórico completo

### Entender Stack Trace

```
File: src/handlers/user.ts
Line: 45
Function: updateProfile

Error: TypeError: Cannot read property 'email' of undefined
```

**Significa:**
- Arquivo `src/handlers/user.ts`, linha 45
- Função `updateProfile` tentou acessar `.email` de algo que é undefined
- Provavelmente o objeto `user` é null/undefined

---

## ⚙️ Configurações por Ambiente

### Development (localhost)

```bash
# .env.local
SENTRY_DSN=  # Vazio — não captura (opcional)
NODE_ENV=development
```

**Resultado:** Erros aparecem no console, não em Sentry

**Dica:** Se quiser testar Sentry localmente, copie o SENTRY_DSN de .env.production para .env.local

### Production (Render)

```bash
# .env.production
SENTRY_DSN=https://[complete_dsn_here]
SENTRY_API_KEY=sntryu_[seu_token_aqui]
NODE_ENV=production
```

**Resultado:** Erros capturados em tempo real em avilaops.sentry.io

---

## 🚀 Workflow Típico

### 1. Dev faz commit

```bash
git commit -m "Fix user profile bug"
git push origin main
```

### 2. Release é criada

```powershell
$key = (Get-Content .env.production | Select-String "SENTRY_API_KEY").ToString().Split("=")[1].Trim()
$headers = @{ Authorization = "Bearer $key"; "Content-Type" = "application/json" }

$body = @{
    version = "1.2.0"
    projects = @("arxisvr")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/" `
  -Headers $headers -Method Post -Body $body
```

### 3. Deploy em produção

```bash
npm run build && npm run start
```

Render injeta `SENTRY_DSN` automaticamente → Sentry ativa

### 4. Usuário vê erro em produção

Sentry captura:
```
File: src/handlers/user.ts:45
Function: updateProfile
Error: TypeError: Cannot read property 'email' of undefined
Release: 1.2.0
User: user_123@example.com
Timestamp: 2026-06-18 10:30:45 UTC
```

### 5. Dev vê issue no dashboard

https://avilaops.sentry.io → Issues → Clica no erro

Vê:
- Exatamente qual arquivo/linha falhou
- Quem foi afetado
- Em qual versão começou
- O que o usuário fez antes

### 6. Dev corrige

```typescript
// Antes (bug)
const email = user.email;  // user pode ser undefined

// Depois (fix)
const email = user?.email || "unknown@example.com";
```

---

## 📋 Checklist para Novo Dev

- [ ] Acessa https://avilaops.sentry.io com GitHub
- [ ] Vê o projeto `arxisvr`
- [ ] Abre uma issue e entende stack trace
- [ ] Sabe que `SENTRY_DSN` em .env.production ativa o monitoramento
- [ ] Pode consultar API via PowerShell (com token `arxisvr-api`)
- [ ] Entende diferença entre Release, Issue, Event
- [ ] Sabe como capturar erros manualmente em código

---

## 🆘 Troubleshooting

### "Não vejo erros em Sentry"

**Checklist:**
1. .env.production tem `SENTRY_DSN` com URL completa?
2. Backend rodando em produção (Render)?
3. `NODE_ENV=production`?
4. O erro é não-capturado (não está dentro de try/catch)?

### "SENTRY_DSN vazio significa que?"

Sentry desativado. Backend não envia erros. Use em **dev** apenas.

### "Como testar localmente?"

```bash
# 1. Copie SENTRY_DSN de .env.production
# 2. Cole em .env.local
# 3. npm run dev
# 4. Trigger um erro
# 5. Vá para Sentry — deve aparecer
```

### "Erro 401 na API?"

Token `SENTRY_API_KEY` expirou ou não tem permissões. Crie um novo em:
https://avilaops.sentry.io/settings/account/api/auth-tokens/

---

## 📚 Links Úteis

- **Dashboard:** https://avilaops.sentry.io
- **API Docs:** https://docs.sentry.io/api/
- **SDK Node.js:** https://docs.sentry.io/platforms/node/
- **SDK React:** https://docs.sentry.io/platforms/javascript/guides/react/

---

**Dúvidas? Pergunta no Slack! 🚀**
```

Pronto! Tutorial atualizado com:
✅ Organização: **avilaops**
✅ URL: **https://avilaops.sentry.io**
✅ Token: **arxisvr-api**
✅ Projeto: **arxisvr**

Cola isso em `SENTRY_TUTORIAL.md` na raiz do projeto!Pronto! Tutorial atualizado com:
✅ Organização: **avilaops**
✅ URL: **https://avilaops.sentry.io**
✅ Token: **arxisvr-api**
✅ Projeto: **arxisvr**

Cola isso em `SENTRY_TUTORIAL.md` na raiz do projeto!

Ótimo! Vi as imagens do Render. Vou fazer um **último ajuste no tutorial** removendo a seção que retorna 405 e adicionando **dica sobre Render & Sentry**:

Remova a seção "### 5. Associar commits a uma release" (que retorna 405) e no lugar coloque:

```markdown
### 4. Criar uma release ✅ FUNCIONA

```powershell
$body = @{
    version = "1.1.0"
    projects = @("arxisvr")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://sentry.io/api/0/organizations/avilaops/releases/" `
  -Headers $headers -Method Post -Body $body | ConvertTo-Json | Write-Host
```

**Resultado esperado:**
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

## 🚀 Deploy em Render + Sentry Automático

### Como funciona:

1. **Git Push → GitHub**
   ```bash
   git commit -m "Fix user auth bug"
   git push origin main
   ```

2. **Render detecta mudança** (configurado em Build Source)
   - Build Source: `https://github.com/avilaops/arxisvr`
   - Branch: `main`
   - Build Command: `cd backend && npm ci --include-dev && npm run build`

3. **Render roda build & deploy**
   - Injeta .env.production automaticamente
   - **SENTRY_DSN é injetado aqui** ✅
   - Executa: `npm start`

4. **Backend inicia com Sentry ativo**
   ```
   ✓ SENTRY_DSN configurado
   ✓ Sentry.init() executa no startup
   ✓ Pronto para capturar erros
   ```

5. **Usuário encontra erro em https://arxisvr.onrender.com**
   - Backend captura erro automaticamente
   - Envia para Sentry em <100ms
   - Aparece em avilaops.sentry.io em segundos

### Verificar Sentry em Produção

```powershell
$key = (Get-Content .env.production | Select-String "SENTRY_API_KEY").ToString().Split("=")[1].Trim()
$headers = @{ Authorization = "Bearer $key"; "Content-Type" = "application/json" }

# Listar issues do projeto
Invoke-RestMethod -Uri "https://sentry.io/api/0/projects/avilaops/arxisvr/issues/" `
  -Headers $headers | ConvertTo-Json | Write-Host
```

Se vir issues listadas, **Sentry está capturando erros em produção!** 🎉

---
```

Pronto! Tutorial agora tem:
✅ Seção 5 removida (endpoint 405)
✅ Explicação de como Render + Sentry funcionam juntos
✅ Comando para verificar issues em produção
✅ Confirmação visual de que está funcionando

