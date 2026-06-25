# 🧪 Como Testar o Sistema de API Tokens - Guia Rápido

## 1️⃣ Inicie o Backend

Abra o PowerShell/CMD e execute:

```powershell
cd D:\Projetos\arxisvr\backend
npm run dev
```

Você deve ver:
```
✅ Schema reconciler: no drift detected
✅ Migration applied: 20260625_create_api_tokens_table.sql
🚀 ArxisVR Backend API running at http://0.0.0.0:3001
```

## 2️⃣ Inicie o Frontend

Abra outro PowerShell/CMD:

```powershell
cd D:\Projetos\arxisvr\frontend
npm run dev
```

Você deve ver:
```
  Local:   http://localhost:5173/
```

## 3️⃣ Acesse a Aplicação

Abra no navegador: **http://localhost:5173**

## 4️⃣ Faça Login

Se não estiver autenticado, faça login com:
- Email: `test@arxisvr.dev` (ou qualquer email)
- Senha: sua senha de teste

## 5️⃣ Acesse a Seção de API Tokens

Na interface, navegue até:
```
Configurações → Tokens de API
```

Ou acesse direto: **http://localhost:5173/account?tab=tokens**

## 6️⃣ Crie um Token

Clique em **"+ Novo Token"** e preencha:

- **Nome**: `Test Token`
- **Ambiente**: `test`
- **Escopos**: Marque `projects:read` e `models:read`
- **Expira em**: Deixe vazio (nunca expira)

Clique em **"Criar Token"**

## 7️⃣ Copie o Token

Uma modal aparecerá mostrando o token **UMA VEZ**:

```
arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB
```

Copie o token (botão "Copiar")

## 8️⃣ Verifique a Tabela

De volta à tabela de tokens, você verá:

| Nome | Prefixo | Ambiente | Expira | Último Uso | Status |
|------|---------|----------|--------|-----------|--------|
| Test Token | `arx_test_X9Z0mQ2••••••••Z8aB` | test | Nunca | Nunca | Ativo |

Note que o prefixo é **mascarado** - você não vê o token completo!

## 9️⃣ Teste a Autenticação com cURL

Abra um terceiro PowerShell/CMD e teste:

```bash
# Token válido com escopo projects:read → 200 OK
curl http://localhost:3001/api/v1/projects `
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB"

# Resultado esperado: 200 (com dados ou vazio)
```

### Token com Escopo Insuficiente

```bash
# Token SEM escopo projects:write
curl -X POST http://localhost:3001/api/v1/projects `
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB" `
  -H "Content-Type: application/json" `
  -d '{"name":"Test Project"}'

# Resultado esperado: 403 Forbidden
# {"error": "Forbidden", "message": "Required scopes: projects:write"}
```

### Token Inválido

```bash
# Token inválido
curl http://localhost:3001/api/v1/projects `
  -H "Authorization: Bearer invalid_token"

# Resultado esperado: 401 Unauthorized
# {"error": "Unauthorized", "message": "Invalid API token format"}
```

## 🔟 Revogue o Token

De volta à UI, na linha do token, clique no botão **"Revogar"**

Confirme a exclusão

## 1️⃣1️⃣ Teste Revogação

Tente usar o token revogado:

```bash
curl http://localhost:3001/api/v1/projects `
  -H "Authorization: Bearer arx_test_X9Z0mQ2pL8fK1rW4tV6yJ3hN5sB7gD9eC0jA2bL4mN6oP8qR0sT2uV4wX6yZ8aB"

# Resultado esperado: 401 Unauthorized
# {"error": "Unauthorized", "message": "Invalid or revoked API token"}
```

## 1️⃣2️⃣ Acesse a Documentação Interna

Na interface, clique na aba **"Documentação API"**

Você verá:
- Como autenticar
- Escopos disponíveis
- Exemplos com curl, JavaScript, Python
- Tratamento de erros
- Best practices

---

## 📋 Checklist de Validação

Após testar, marque os itens:

- [ ] Backend iniciou sem erros
- [ ] Frontend acessível em http://localhost:5173
- [ ] Consegui fazer login
- [ ] Criei um novo token
- [ ] Token apareceu UMA VEZ (modal)
- [ ] Tabela mostra prefixo mascarado
- [ ] Token com escopo funciona (200)
- [ ] Token sem escopo retorna 403
- [ ] Token inválido retorna 401
- [ ] Revogação funcionou
- [ ] Token revogado retorna 401
- [ ] Documentação está acessível

---

## 🆘 Troubleshooting

### Backend não inicia

```
❌ Error: API_TOKEN_PEPPER não está configurado
```

**Solução:** Já está configurado em `.env`. Tente:
```bash
rm backend/.env
npm run dev
```

### Frontend não acha o backend

```
❌ Failed to fetch /api/v1/...
```

**Solução:** Certifique-se que:
1. Backend está rodando em `http://localhost:3001`
2. `VITE_API_URL=http://localhost:3001/api/v1` está em `backend/.env`

### Porta 5173 já está em uso

```
❌ Port 5173 is already in use
```

**Solução:**
```bash
# Matar processo na porta 5173
Get-Process node | Stop-Process -Force

# Ou use outra porta
npm run dev -- --port 5174
```

---

## 📞 Próximos Passos

1. ✅ Testar todos os cenários acima
2. ✅ Documentação: `backend/API_TOKEN_SETUP.md`
3. ✅ Setup automático: `bash backend/setup.sh`
4. ✅ Verificação pré-deploy: `bash backend/verify-production.sh`
5. ✅ Deploy para produção

---

**Divirta-se testando!** 🚀
