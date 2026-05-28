$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$productsRoot = Resolve-Path (Join-Path $projectRoot '..')
$appsRoot = Resolve-Path (Join-Path $productsRoot '..')
$nodeModules = Join-Path $projectRoot 'node_modules'
$emailPackage = Join-Path $productsRoot 'arxisvr.worktrees\agents-custom-hook-creation\frontend\smtp\avilaops-email'

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Ensure-Junction {
  param(
    [Parameter(Mandatory = $true)][string]$Link,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not (Test-Path $Target)) {
    Write-Warning "[$Name] alvo não encontrado: $Target"
    return
  }

  $parent = Split-Path -Parent $Link
  Ensure-Directory $parent

  if (Test-Path $Link) {
    Write-Output "[$Name] OK: $Link"
    return
  }

  cmd /c mklink /J "$Link" "$Target" | Out-Null
  Write-Output "[$Name] vinculado: $Link -> $Target"
}

Ensure-Directory $nodeModules

Ensure-Junction `
  -Name '@avilaops/email' `
  -Link (Join-Path $nodeModules '@avilaops\email') `
  -Target $emailPackage

Ensure-Junction `
  -Name 'nodemailer para @avilaops/email' `
  -Link (Join-Path $emailPackage 'node_modules\nodemailer') `
  -Target (Join-Path $productsRoot 'flow182\node_modules\nodemailer')

Ensure-Junction `
  -Name 'pino-pretty' `
  -Link (Join-Path $nodeModules 'pino-pretty') `
  -Target (Join-Path $appsRoot 'unified\admin\node_modules\.ignored\pino-pretty')

Write-Output 'Links locais verificados.'
