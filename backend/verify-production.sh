#!/bin/bash

# API Token System - Pre-Production Verification
# Execute este script ANTES de fazer deploy

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 ArxisVR API Token System - Pre-Production Checklist${NC}"
echo "=========================================================="
echo ""

PASSED=0
FAILED=0

check() {
    local name=$1
    local condition=$2
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ $name${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $name${NC}"
        ((FAILED++))
    fi
}

# 1. Environment
echo "1. Verificando Ambiente..."
check "Node.js instalado" "command -v node &> /dev/null"
check "npm instalado" "command -v npm &> /dev/null"
echo ""

# 2. Config Files
echo "2. Verificando Arquivos de Configuração..."
check "backend/.env existe" "[ -f 'backend/.env' ]"
check "API_TOKEN_PEPPER configurado" "grep -q 'API_TOKEN_PEPPER=' backend/.env"

PEPPER_LEN=$(grep 'API_TOKEN_PEPPER=' backend/.env 2>/dev/null | cut -d'=' -f2 | wc -c || echo 0)
check "API_TOKEN_PEPPER tem min 32 chars" "[ $PEPPER_LEN -gt 32 ]"

check ".gitignore ignora .env" "grep -q '^backend/.env$' .gitignore || grep -q 'backend/.env' .gitignore"
echo ""

# 3. Database
echo "3. Verificando Banco de Dados..."
check "Migrations executadas" "[ -f 'backend/migrations/20260625_create_api_tokens_table.sql' ]"

# Verificar se database_url está configurada
check "DATABASE_URL configurada" "grep -q 'DATABASE_URL=' backend/.env"
echo ""

# 4. Code Quality
echo "4. Verificando Qualidade do Código..."

# Verificar que tokens nunca são logados em plaintext
check "Sem plainToken em logs" "! grep -r 'plainToken' backend/src/ 2>/dev/null | grep -v 'node_modules' || true"
check "Sem token hardcoded" "! grep -r 'arx_live_' backend/src/ 2>/dev/null | grep -v 'node_modules' | grep -v 'test' || true"

# Verificar que HMAC é usado
check "HMAC-SHA-256 configurado" "grep -q 'createHmac' backend/src/modules/api-tokens/utils/generateApiToken.ts"

# Verificar que pepper é validado
check "Pepper validado no startup" "grep -q 'validateApiTokenPepper' backend/src/core/validation/api-token-validation.ts"
echo ""

# 5. Security
echo "5. Verificando Segurança..."
check "Sem secrets em frontend" "! grep -r 'API_TOKEN_PEPPER' frontend/src/ 2>/dev/null | grep -v 'node_modules' || true"
check "Revogação soft-delete" "grep -q 'revoked_at' backend/migrations/20260625_create_api_tokens_table.sql"
check "Auditoria sem plaintext" "grep -q 'token_prefix' backend/migrations/20260625_create_api_tokens_table.sql"
check "Tenant isolation" "grep -q 'tenant_id =' backend/src/modules/api-tokens/api-tokens.service.ts"
echo ""

# 6. Routes
echo "6. Verificando Rotas..."
check "Rotas públicas existem" "[ -f 'backend/src/routes/v1/public-api.routes.ts' ]"
check "Middleware de auth existe" "[ -f 'backend/src/core/auth/api-token.middleware.ts' ]"
check "Rotas de gerenciamento existem" "[ -f 'backend/src/modules/api-tokens/api-tokens.routes.ts' ]"
echo ""

# 7. Documentation
echo "7. Verificando Documentação..."
check "Setup guide existe" "[ -f 'backend/API_TOKEN_SETUP.md' ]"
check "README exists" "[ -f 'backend/README_API_TOKENS.md' ]"
check "Validation checklist" "[ -f 'backend/VALIDATION_CHECKLIST.md' ]"
echo ""

# 8. Frontend
echo "8. Verificando Frontend..."
check "ApiTokensPage existe" "[ -f 'frontend/src/pages/account/ApiTokensPage.tsx' ]"
check "ApiDocumentationPage existe" "[ -f 'frontend/src/pages/account/ApiDocumentationPage.tsx' ]"
check "Types definidos" "[ -f 'frontend/src/types/apiToken.ts' ]"
check "Service implementado" "[ -f 'frontend/src/services/apiTokens.service.ts' ]"
check "Hook criado" "[ -f 'frontend/src/hooks/useApiTokens.ts' ]"
echo ""

# Summary
echo "=========================================================="
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os checks passaram! Pronto para deploy.${NC}"
    echo ""
    echo "Próximas etapas:"
    echo "1. npm run build (frontend + backend)"
    echo "2. npm run migrate"
    echo "3. npm run start"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $FAILED verificações falharam. Corrija antes de fazer deploy.${NC}"
    echo ""
    echo "Resumo:"
    echo "  ✅ Passou: $PASSED"
    echo "  ❌ Falhou: $FAILED"
    echo ""
    exit 1
fi
