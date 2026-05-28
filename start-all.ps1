# Script para rodar todos os serviços do ArxisVR em paralelo
# Backend (Fastify), Frontend (Vite), Signaling Server (WebSocket)

Write-Host "🚀 Iniciando todos os serviços do ArxisVR..." -ForegroundColor Green
Write-Host ""

# Criar diretório de logs se não existir
$logDir = "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Iniciar Backend
Write-Host "📦 Iniciando Backend (Fastify)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location "backend"
    npm run dev
} -Name "Backend"

# Iniciar Frontend
Write-Host "🎨 Iniciando Frontend (Vite)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "frontend"
    npm run dev
} -Name "Frontend"

# Iniciar Signaling Server
Write-Host "🔌 Iniciando Signaling Server (WebSocket)..." -ForegroundColor Cyan
$signalingJob = Start-Job -ScriptBlock {
    Set-Location "signaling-server"
    npm run dev
} -Name "Signaling"

Write-Host ""
Write-Host "✅ Todos os serviços iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Serviços rodando:" -ForegroundColor Yellow
Write-Host "   - Backend:     http://localhost:3001"
Write-Host "   - Frontend:    http://localhost:5173"
Write-Host "   - Signaling:   ws://localhost:3002"
Write-Host ""
Write-Host "Pressione Ctrl+C para parar todos os serviços" -ForegroundColor Yellow
Write-Host ""

# Monitorar jobs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Verificar se algum job falhou
        if ($backendJob.State -eq "Failed") {
            Write-Host "❌ Backend falhou!" -ForegroundColor Red
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Host "❌ Frontend falhou!" -ForegroundColor Red
            break
        }
        if ($signalingJob.State -eq "Failed") {
            Write-Host "❌ Signaling Server falhou!" -ForegroundColor Red
            break
        }
        
        # Mostrar status dos jobs
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Backend: $($backendJob.State) | Frontend: $($frontendJob.State) | Signaling: $($signalingJob.State)" -ForegroundColor Gray
    }
} finally {
    Write-Host ""
    Write-Host "🛑 Parando todos os serviços..." -ForegroundColor Yellow
    
    Stop-Job -Job $backendJob, $frontendJob, $signalingJob
    Remove-Job -Job $backendJob, $frontendJob, $signalingJob -Force
    
    Write-Host "✅ Todos os serviços parados." -ForegroundColor Green
}
