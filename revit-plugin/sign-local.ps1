<#
.SYNOPSIS
    Assina as DLLs do plugin com um certificado de code-signing local (dev).
.DESCRIPTION
    - Cria (uma vez) um certificado self-signed "AvilaOps - ArxisVR (dev)"
    - Instala o certificado em CurrentUser\Root e CurrentUser\TrustedPublisher
      (o import no Root abre um popup do Windows -- clique "Sim")
    - Assina ArxisVR.RevitPlugin.dll com timestamp
    Depois disso o Revit reconhece o autor e o "Sempre carregar" persiste
    entre rebuilds. Para producao, usar certificado comercial (OV/EV) no CI.
#>
param(
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$subject = 'CN=AvilaOps - ArxisVR'

# 1. Certificado: reusa se ja existe, senao cria (valido 5 anos)
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -eq $subject } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1

if (-not $cert) {
    Write-Host '==> Criando certificado de code-signing (dev)...' -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $subject `
        -FriendlyName 'ArxisVR Revit Plugin (dev)' `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter (Get-Date).AddYears(5)
    Write-Host "    Thumbprint: $($cert.Thumbprint)"
}

# 2. Confiar no certificado (Root pode abrir popup de confirmacao -- clicar Sim)
$cerPath = Join-Path $env:TEMP 'arxisvr-codesign.cer'
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

$inRoot = Get-ChildItem Cert:\CurrentUser\Root -ErrorAction SilentlyContinue |
    Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if (-not $inRoot) {
    Write-Host '==> Instalando em Trusted Root (confirme o popup do Windows)...' -ForegroundColor Yellow
    Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
}

$inPublisher = Get-ChildItem Cert:\CurrentUser\TrustedPublisher -ErrorAction SilentlyContinue |
    Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if (-not $inPublisher) {
    Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null
    Write-Host '==> Instalado em Trusted Publishers' -ForegroundColor Cyan
}

# 3. Assinar a DLL do plugin
$binDir = Join-Path $PSScriptRoot "ArxisVR.RevitPlugin\bin\$Configuration"
$dll = Join-Path $binDir 'ArxisVR.RevitPlugin.dll'
if (-not (Test-Path $dll)) { throw "DLL nao encontrada: $dll (rode o build antes)" }

Write-Host '==> Assinando ArxisVR.RevitPlugin.dll...' -ForegroundColor Cyan
$result = Set-AuthenticodeSignature -FilePath $dll -Certificate $cert `
    -TimestampServer 'http://timestamp.digicert.com' -HashAlgorithm SHA256

if ($result.Status -ne 'Valid') {
    throw "Assinatura falhou: $($result.Status) - $($result.StatusMessage)"
}

Write-Host ''
Write-Host 'OK Assinatura valida!' -ForegroundColor Green
Write-Host "   Autor: $subject"
Write-Host '   O Revit agora mostra o autor verificado; "Sempre carregar" persiste entre builds.'
