<#
.SYNOPSIS
    Builds the ArxisVR plugin and installs it into Revit 2027 for the current user.
.DESCRIPTION
    - dotnet build (Release)
    - Copies DLL + dependencies + .addin manifest to %APPDATA%\Autodesk\Revit\Addins\2027
    - Restart Revit to load the plugin (tab "ArxisVR" in the ribbon)
#>
param(
    [string]$RevitVersion = '2027',
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host "==> Building ($Configuration)..." -ForegroundColor Cyan
dotnet build "$root\ArxisVR.RevitPlugin.slnx" --configuration $Configuration
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$binDir = Join-Path $root "ArxisVR.RevitPlugin\bin\$Configuration"
$addinsDir = Join-Path $env:APPDATA "Autodesk\Revit\Addins\$RevitVersion"
$targetDir = Join-Path $addinsDir 'ArxisVR'

Write-Host "==> Installing to $targetDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# DLLs do plugin + dependências
Copy-Item "$binDir\*.dll" -Destination $targetDir -Force

# Manifest aponta para a subpasta ArxisVR
$manifest = Get-Content "$root\ArxisVR.RevitPlugin\ArxisVR.addin" -Raw
$manifest = $manifest -replace '<Assembly>ArxisVR\.RevitPlugin\.dll</Assembly>', "<Assembly>ArxisVR\ArxisVR.RevitPlugin.dll</Assembly>"
Set-Content -Path (Join-Path $addinsDir 'ArxisVR.addin') -Value $manifest -Encoding UTF8

Write-Host ""
Write-Host "✅ Plugin instalado!" -ForegroundColor Green
Write-Host "   Reinicie o Revit $RevitVersion — a aba 'ArxisVR' aparecerá no ribbon." -ForegroundColor Green
Write-Host "   Logs: %APPDATA%\ArxisVR\logs\" -ForegroundColor DarkGray
