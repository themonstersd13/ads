$ErrorActionPreference = 'Stop'

$assignmentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$portalDir = Join-Path $assignmentDir 'master-master-portal\backend'
$envFile = Join-Path $portalDir '.env'
$stopScript = Join-Path $assignmentDir 'stop_master_master_portal.ps1'

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key,
    [string]$DefaultValue
  )

  if (-not (Test-Path $FilePath)) {
    return $DefaultValue
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key=" } | Select-Object -First 1
  if (-not $line) {
    return $DefaultValue
  }

  return (($line -split '=', 2)[1]).Trim()
}

$port = Get-EnvValue -FilePath $envFile -Key 'PORT' -DefaultValue '8080'

Write-Host 'Stopping any previous master-master portal instance...' -ForegroundColor Cyan
& $stopScript | Out-Null

$portInUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portInUse) {
  $portProcess = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
  $processName = if ($portProcess) { $portProcess.ProcessName } else { 'unknown-process' }
  throw "Port $port is already in use by $processName (PID $($portInUse.OwningProcess)). Stop that process or change PORT in backend\.env."
}

Write-Host 'Installing portal dependencies (if needed)...' -ForegroundColor Cyan
Set-Location $portalDir
npm install

if (-not (Test-Path $envFile)) {
  Write-Host 'No backend\.env found. Copy backend\.env.example, backend\.env.wsl.example, or backend\.env.local.example to backend\.env before using the portal.' -ForegroundColor Yellow
}

Write-Host "Starting master-master portal on 0.0.0.0:$port..." -ForegroundColor Green
npm start
