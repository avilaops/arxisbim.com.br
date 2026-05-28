$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $projectRoot 'backend'
$envFile = Join-Path $projectRoot '.env'

& (Join-Path $PSScriptRoot 'link-local-deps.ps1')

if ($env:ARXISVR_SKIP_DB_PREPARE -ne 'true') {
  & (Join-Path $PSScriptRoot 'prepare-local-postgres.ps1')
}

$env:DOTENV_CONFIG_PATH = $envFile

if (Test-Path $envFile) {
  $lines = Get-Content $envFile

  # Load all environment variables from .env
  foreach ($line in $lines) {
    if ($line -match '^([^#].+?)=(.+)$') {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }

  $databaseLine = $lines | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($databaseLine) {
    $env:DATABASE_URL = (($databaseLine -split '=', 2)[1].Trim() -replace '@postgres([:/])', '@localhost$1')
  }

  $emailFromLine = $lines | Where-Object { $_ -match '^EMAIL_FROM=' } | Select-Object -First 1
  $smtpFromLine = $lines | Where-Object { $_ -match '^SMTP_FROM=' } | Select-Object -First 1
  if (-not $smtpFromLine -and $emailFromLine) {
    $env:SMTP_FROM = ($emailFromLine -split '=', 2)[1].Trim()
  }

  $signalingPortLine = $lines | Where-Object { $_ -match '^SIGNALING_PORT=' } | Select-Object -First 1
  if ($signalingPortLine -and -not $env:SIGNALING_SERVER_URL) {
    $signalingPort = ($signalingPortLine -split '=', 2)[1].Trim()
    $env:SIGNALING_SERVER_URL = "ws://localhost:$signalingPort"
  }
}

Set-Location $backendDir
npm run dev
