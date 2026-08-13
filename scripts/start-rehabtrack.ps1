[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Find-CommandPath {
    param([Parameter(Mandatory)][string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Test-RehabConfiguration {
    param([Parameter(Mandatory)][string]$Path)

    $required = @(
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        'DEVICE_API_KEY'
    )
    $values = @{}

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([^#][A-Z0-9_]+)\s*=\s*(.*)\s*$') {
            $values[$matches[1]] = $matches[2].Trim()
        }
    }

    foreach ($name in $required) {
        $value = $values[$name]
        if ([string]::IsNullOrWhiteSpace($value) -or
            $value -match 'YOUR_|CHANGE_THIS|YOUR-PROJECT') {
            return $false
        }
    }

    $serverKey = $values['SUPABASE_SECRET_KEY']
    if ([string]::IsNullOrWhiteSpace($serverKey)) {
        $serverKey = $values['SUPABASE_SERVICE_ROLE_KEY']
    }
    if ([string]::IsNullOrWhiteSpace($serverKey) -or
        $serverKey -match 'YOUR_|CHANGE_THIS') {
        return $false
    }

    return $values['NEXT_PUBLIC_SUPABASE_URL'] -match '^https://.+\.supabase\.co/?$'
}

Write-Host ''
Write-Host '=========================================' -ForegroundColor DarkYellow
Write-Host '       RehabTrack Web - Pelancar' -ForegroundColor Yellow
Write-Host '=========================================' -ForegroundColor DarkYellow
Write-Host ''

$nodePath = Find-CommandPath -Name 'node'
if (-not $nodePath) {
    $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundledNode) {
        $nodePath = $bundledNode
    }
}

if (-not $nodePath) {
    Write-Host 'Node.js belum dipasang.' -ForegroundColor Red
    Write-Host 'Pasang Node.js 20.9 atau lebih baru, kemudian klik MULA_REHABTRACK.cmd semula.'
    Write-Host 'Muat turun: https://nodejs.org/'
    exit 1
}

$nodeDirectory = Split-Path -Parent $nodePath
$env:Path = "$nodeDirectory;$env:Path"

$packageManager = Find-CommandPath -Name 'pnpm.cmd'
if (-not $packageManager) {
    $bundledPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (Test-Path -LiteralPath $bundledPnpm) {
        $packageManager = $bundledPnpm
    }
}
if (-not $packageManager) {
    $packageManager = Find-CommandPath -Name 'npm.cmd'
}

if (-not $packageManager) {
    Write-Host 'npm atau pnpm tidak dijumpai. Pasang semula Node.js dan cuba lagi.' -ForegroundColor Red
    exit 1
}

$envFile = Join-Path $projectRoot '.env.local'
if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot '.env.example') -Destination $envFile
    Write-Host 'Fail konfigurasi pertama kali telah disediakan.' -ForegroundColor Yellow
    Write-Host 'Isi empat nilai Supabase dan DEVICE_API_KEY dalam fail .env.local.'
    Write-Host 'Jalankan juga supabase\schema.sql dalam Supabase SQL Editor.'
    Start-Process notepad.exe -ArgumentList $envFile
    exit 1
}

if (-not (Test-RehabConfiguration -Path $envFile)) {
    Write-Host 'Konfigurasi .env.local belum lengkap atau URL Supabase tidak sah.' -ForegroundColor Yellow
    Write-Host 'Isi semua nilai sebenar, simpan fail, kemudian klik launcher ini semula.'
    Start-Process notepad.exe -ArgumentList $envFile
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
    Write-Host 'Pemasangan pertama kali sedang dijalankan. Ini mungkin mengambil beberapa minit...' -ForegroundColor Cyan
    & $packageManager install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

try {
    $existing = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2
    if ($existing.StatusCode -ge 200) {
        Write-Host 'RehabTrack sudah berjalan. Membuka website...' -ForegroundColor Green
        Start-Process 'http://localhost:3000'
        exit 0
    }
} catch {
    # Port is not serving an HTTP site yet; continue with startup.
}

$browserPoll = @'
$ErrorActionPreference = 'SilentlyContinue'
for ($attempt = 0; $attempt -lt 90; $attempt++) {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200) {
        Start-Process 'http://localhost:3000'
        break
    }
    Start-Sleep -Seconds 1
}
'@

Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $browserPoll

Write-Host 'RehabTrack sedang dihidupkan...' -ForegroundColor Green
Write-Host 'Website akan dibuka sendiri. Biarkan tetingkap ini terbuka semasa digunakan.'
Write-Host 'Tekan Ctrl+C untuk mematikan sistem.'
Write-Host ''

& $packageManager run dev:launcher
exit $LASTEXITCODE
