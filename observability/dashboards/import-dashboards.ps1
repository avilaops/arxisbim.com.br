<#
.SYNOPSIS
    Importa dashboards do Grafana para o ArxisVR

.DESCRIPTION
    Script para importar automaticamente todos os dashboards JSON do ArxisVR no Grafana

.EXAMPLE
    .\import-dashboards.ps1
    .\import-dashboards.ps1 -GrafanaUrl "http://localhost:3000" -ApiKey "your-api-key"
#>

param(
    [string]$GrafanaUrl = "http://localhost:3000",
    [string]$ApiKey = "glsa_9Ir9YKVl8LAyjTjPDy0Rn9kVpS8hhcAK_00948a94",
    [string]$DashboardsPath = ".",
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          📊 ArxisVR - Grafana Dashboard Importer             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📡 Grafana URL: $GrafanaUrl" -ForegroundColor Gray
Write-Host "📁 Dashboards Path: $DashboardsPath`n" -ForegroundColor Gray

# Verificar se o Grafana está acessível
Write-Host "🔍 Verificando conexão com Grafana..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GrafanaUrl/api/health" -Method Get
    Write-Host "✅ Grafana está online!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro: Não foi possível conectar ao Grafana em $GrafanaUrl" -ForegroundColor Red
    Write-Host "   Certifique-se de que o Grafana está rodando.`n" -ForegroundColor Red
    exit 1
}

# Listar arquivos JSON de dashboards
$dashboardFiles = Get-ChildItem -Path $DashboardsPath -Filter "arxisvr-*.json"

if ($dashboardFiles.Count -eq 0) {
    Write-Host "❌ Nenhum dashboard encontrado em $DashboardsPath" -ForegroundColor Red
    Write-Host "   Procurando por arquivos: arxisvr-*.json`n" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Dashboards encontrados: $($dashboardFiles.Count)`n" -ForegroundColor Cyan

# Criar folder no Grafana (se não existir)
$folderName = "ArxisVR"
Write-Host "📁 Criando folder '$folderName' no Grafana..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $ApiKey"
        "Content-Type" = "application/json"
    }
    
    $folderBody = @{
        "title" = $folderName
    } | ConvertTo-Json
    
    $folder = Invoke-RestMethod -Uri "$GrafanaUrl/api/folders" -Method Post -Headers $headers -Body $folderBody -ErrorAction SilentlyContinue
    Write-Host "✅ Folder criado com sucesso!" -ForegroundColor Green
    $folderId = $folder.id
} catch {
    # Folder já existe, buscar ID
    $folders = Invoke-RestMethod -Uri "$GrafanaUrl/api/folders" -Method Get -Headers $headers
    $existingFolder = $folders | Where-Object { $_.title -eq $folderName }
    if ($existingFolder) {
        $folderId = $existingFolder.id
        Write-Host "ℹ️  Folder já existe (ID: $folderId)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Não foi possível criar ou encontrar o folder" -ForegroundColor Yellow
        $folderId = 0
    }
}

Write-Host ""

# Importar cada dashboard
$imported = 0
$failed = 0

foreach ($file in $dashboardFiles) {
    Write-Host "📊 Importando: $($file.Name)..." -ForegroundColor Cyan
    
    try {
        # Ler conteúdo do arquivo
        $dashboardJson = Get-Content -Path $file.FullName -Raw | ConvertFrom-Json
        
        # Preparar payload para importação
        $importPayload = @{
            "dashboard" = $dashboardJson
            "folderId" = $folderId
            "overwrite" = $Force.IsPresent
        } | ConvertTo-Json -Depth 100
        
        # Importar dashboard
        $result = Invoke-RestMethod `
            -Uri "$GrafanaUrl/api/dashboards/db" `
            -Method Post `
            -Headers $headers `
            -Body $importPayload
        
        Write-Host "   ✅ Importado com sucesso!" -ForegroundColor Green
        Write-Host "   📊 UID: $($result.uid)" -ForegroundColor Gray
        Write-Host "   🔗 URL: $GrafanaUrl$($result.url)`n" -ForegroundColor Gray
        
        $imported++
    } catch {
        Write-Host "   ❌ Erro ao importar: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.ErrorDetails.Message) {
            $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   💡 Detalhes: $($errorDetail.message)`n" -ForegroundColor Yellow
        } else {
            Write-Host ""
        }
        
        $failed++
    }
}

# Resumo
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✅ IMPORTAÇÃO CONCLUÍDA!                              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 Dashboards importados: $imported" -ForegroundColor Cyan
if ($failed -gt 0) {
    Write-Host "❌ Falhas: $failed" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎯 Próximos passos:`n" -ForegroundColor Yellow
Write-Host "   • Acesse o Grafana: $GrafanaUrl" -ForegroundColor Gray
Write-Host "   • Vá para Dashboards → Folder: ArxisVR" -ForegroundColor Gray
Write-Host "   • Configure alertas e notificações conforme necessário`n" -ForegroundColor Gray

# Lista de dashboards importados
if ($imported -gt 0) {
    Write-Host "📋 Dashboards disponíveis:" -ForegroundColor Cyan
    Write-Host "   • ArxisVR - Overview (visão geral do sistema)" -ForegroundColor Gray
    Write-Host "   • ArxisVR - Authentication & Security (auth e segurança)" -ForegroundColor Gray
    Write-Host "   • ArxisVR - IFC Processing (processamento BIM)`n" -ForegroundColor Gray
}

exit 0
