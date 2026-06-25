#!/bin/bash
# Quick test setup - ArxisVR API Tokens

cd "D:/Projetos/arxisvr"

echo "🚀 ArxisVR API Token System - Quick Test Setup"
echo "================================================"
echo ""

# 1. Verificar pasta frontend
if [ ! -d "frontend" ]; then
    echo "❌ Pasta frontend não encontrada"
    exit 1
fi

# 2. Verificar pasta backend
if [ ! -d "backend" ]; then
    echo "❌ Pasta backend não encontrada"
    exit 1
fi

echo "✅ Estrutura de pastas OK"
echo ""

# 3. Install dependencies
echo "📦 Instalando dependências frontend..."
cd frontend
npm install --silent
cd ..

echo "📦 Instalando dependências backend..."
cd backend
npm install --silent
cd ..

echo "✅ Dependências instaladas"
echo ""

# 4. Display instructions
echo "════════════════════════════════════════════"
echo "✅ Setup Completo!"
echo "════════════════════════════════════════════"
echo ""
echo "Para testar pela UI, abra 2 terminais:"
echo ""
echo "TERMINAL 1 - Backend:"
echo "  cd D:\Projetos\arxisvr\backend"
echo "  npm run dev"
echo ""
echo "TERMINAL 2 - Frontend:"
echo "  cd D:\Projetos\arxisvr\frontend"
echo "  npm run dev"
echo ""
echo "Depois acesse:"
echo "  http://localhost:5173"
echo ""
echo "Para testar API Tokens:"
echo "  1. Faça login"
echo "  2. Acesse: Configurações → Tokens de API"
echo "  3. Clique em '+ Novo Token'"
echo "  4. Configure e crie"
echo ""
