$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path $envFile)) {
  Write-Warning ".env não encontrado em $envFile; pulando preparo do Postgres local."
  return
}

$databaseLine = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseLine) {
  Write-Warning 'DATABASE_URL não encontrado no .env; pulando preparo do Postgres local.'
  return
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Warning 'psql não está disponível no PATH; pulando preparo do Postgres local.'
  return
}

$databaseUrl = ($databaseLine -split '=', 2)[1].Trim() -replace '@postgres([:/])', '@localhost$1'
$uri = [Uri]$databaseUrl
$userInfo = $uri.UserInfo -split ':', 2
$dbUser = [Uri]::UnescapeDataString($userInfo[0])
$dbPass = if ($userInfo.Count -gt 1) { [Uri]::UnescapeDataString($userInfo[1]) } else { '' }
$dbName = $uri.AbsolutePath.TrimStart('/')

function Sql-Literal {
  param([AllowNull()][string]$Value)
  return "'" + ($Value -replace "'", "''") + "'"
}

function Sql-Identifier {
  param([Parameter(Mandatory = $true)][string]$Value)
  return '"' + ($Value -replace '"', '""') + '"'
}

$roleLiteral = Sql-Literal $dbUser
$passwordLiteral = Sql-Literal $dbPass
$roleIdentifier = Sql-Identifier $dbUser
$dbLiteral = Sql-Literal $dbName

# Host e porta saem da própria DATABASE_URL. Antes isto era `-h localhost` fixo,
# que na prática significava "porta 5432" — e a 5432 desta máquina é de OUTRO
# projeto (container catalogo_pg). O banco do ArxisVR vive em outra porta, então
# o script preparava/mediria o banco errado.
$dbHost = $uri.Host
$dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$adminArgs = @('-w', '-h', $dbHost, '-p', "$dbPort", '-U', 'postgres')

$env:PGPASSWORD = $dbPass
$check = & psql @adminArgs -d postgres -tAc 'select current_user;' 2>$null
if ($LASTEXITCODE -ne 0 -or -not $check) {
  $env:PGPASSWORD = ''
  $check = & psql @adminArgs -d postgres -tAc 'select current_user;' 2>$null
}
if ($LASTEXITCODE -ne 0 -or -not $check) {
  Write-Warning "Não foi possível acessar o Postgres em ${dbHost}:${dbPort} como postgres; pulando preparo automático."
  return
}

$roleSql = "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = $roleLiteral) THEN CREATE ROLE $roleIdentifier LOGIN PASSWORD $passwordLiteral; ELSE ALTER ROLE $roleIdentifier WITH LOGIN PASSWORD $passwordLiteral; END IF; END `$`$;"
& psql @adminArgs -d postgres -v ON_ERROR_STOP=1 -c $roleSql | Out-Null

$dbExists = & psql @adminArgs -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = $dbLiteral"
if (-not $dbExists) {
  & createdb -h $dbHost -p $dbPort -U postgres -O $dbUser $dbName
}

$schemaReady = & psql $databaseUrl -tAc "SELECT to_regclass('public.error_logs') IS NOT NULL AND to_regclass('public.projects') IS NOT NULL AND to_regclass('public.virtual_meeting_rooms') IS NOT NULL"
if ($env:ARXISVR_SKIP_MIGRATIONS -ne 'true' -and $schemaReady -ne 't') {
  $migrationDir = Join-Path $projectRoot 'backend\migrations'
  $migrationOrder = @(
    '001_create_base_tables.sql',
    '003_auth_tokens.sql',
    '003_auth_tokens_is_used.sql',
    '004_two_factor_auth.sql',
    '005_api_keys_webauthn.sql',
    '006_notifications_system.sql',
    '007_add_missing_columns.sql',
    '008_fix_multitenant_constraints.sql',
    '009_fix_notification_tenant_ids.sql',
    '010_billing_subscriptions.sql',
    '014_projects_and_ifc_models.sql',
    '015_scheduling.sql',
    '016_virtual_meetings.sql',
    '017_immersive_and_webhooks.sql',
    '018_fix_ifc_models_uploaded_by_fk.sql',
    '019_fix_notifications_tenant_id_type.sql',
    '020_budgets.sql',
    '021_fix_user_sessions_runtime_columns.sql',
    '002_observability_and_scale.sql',
    '012_fix_user_sessions_columns.sql',
    '011_scenarios.sql',
    '013_meeting_collaboration_state.sql'
  )

  foreach ($migration in $migrationOrder) {
    $migrationFile = Join-Path $migrationDir $migration
    if (-not (Test-Path $migrationFile)) {
      Write-Warning "Migration não encontrada: $migration"
      continue
    }

    Write-Output "Aplicando migration local: $migration"
    & psql $databaseUrl -v ON_ERROR_STOP=1 -f $migrationFile | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao aplicar migration local: $migration"
    }
  }
}

Write-Output 'Postgres local verificado para ArxisVR.'
