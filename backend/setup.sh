#!/bin/bash

# API Token System - Quick Setup Script
# Este script configura o sistema de tokens API para ArxisVR

set -e

echo "🚀 ArxisVR API Token System - Quick Setup"
echo "========================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale em: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js detectado: $(node -v)"
echo ""

# Gerar pepper
echo "📝 Gerando API_TOKEN_PEPPER seguro (48 bytes)..."
PEPPER=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
echo "✅ Pepper gerado (32+ caracteres)"
echo ""

# Verificar se .env existe
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env não encontrado. Criando..."
    cat > backend/.env << EOF
# API Token Security (GERADO AUTOMATICAMENTE)
API_TOKEN_PEPPER=${PEPPER}

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/arxisvr

# Frontend
VITE_API_URL=http://localhost:3001/api/v1

# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# JWT
JWT_SECRET=your-jwt-secret-here-min-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here-min-32-chars
EOF
    echo "✅ backend/.env criado"
else
    echo "⚠️  backend/.env já existe. Verificando API_TOKEN_PEPPER..."
    if grep -q "API_TOKEN_PEPPER=" backend/.env; then
        echo "✅ API_TOKEN_PEPPER já configurado"
    else
        echo "⚠️  API_TOKEN_PEPPER não encontrado. Adicionando..."
        echo "" >> backend/.env
        echo "# API Token Security" >> backend/.env
        echo "API_TOKEN_PEPPER=${PEPPER}" >> backend/.env
        echo "✅ API_TOKEN_PEPPER adicionado"
    fi
fi

echo ""
echo "📦 Instalando dependências..."
echo ""

# Backend
echo "📦 Backend..."
cd backend
npm ci --silent
cd ..

# Frontend
echo "📦 Frontend..."
cd frontend
npm ci --silent
cd ..

echo ""
echo "✅ Dependências instaladas"
echo ""

# Build backend
echo "🔨 Compilando backend..."
cd backend
npm run build > /dev/null 2>&1
cd ..
echo "✅ Backend compilado"
echo ""

# Migrations
echo "🗄️  Executando migrations..."
cd backend
npm run migrate > /dev/null 2>&1
cd ..
echo "✅ Migrations executadas"
echo ""

# Summary
echo "════════════════════════════════════════════"
echo "✅ Setup Completo!"
echo "════════════════════════════════════════════"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Iniciar o backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2️⃣  Em outro terminal, iniciar o frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3️⃣  Abrir navegador:"
echo "   http://localhost:5173"
echo ""
echo "4️⃣  Criar um token em:"
echo "   http://localhost:5173/account (aba 'Tokens de API')"
echo ""
echo "5️⃣  Testar a API:"
echo "   curl http://localhost:3001/api/v1/projects \\"
echo "     -H 'Authorization: Bearer arx_test_SEU_TOKEN'"
echo ""
echo "📚 Documentação completa:"
echo "   backend/API_TOKEN_SETUP.md"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - API_TOKEN_PEPPER foi salvo em backend/.env"
echo "   - NUNCA commite backend/.env no git!"
echo "   - Configure o mesmo pepper em produção (GitHub Secrets, etc)"
echo ""
