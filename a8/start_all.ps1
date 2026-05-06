$ErrorActionPreference = 'Stop'

function Wait-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $status = (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).StatusCode
      if ($status -ge 200 -and $status -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  return $false
}

function Start-NodeProcess {
  param(
    [string]$Title,
    [string]$WorkingDir,
    [string[]]$EnvLines,
    [string]$Command
  )

  $envSetup = if ($EnvLines -and $EnvLines.Count -gt 0) { ($EnvLines -join '; ') + '; ' } else { '' }
  $psCmd = "$envSetup Set-Location '$WorkingDir'; $Command"

  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "`$Host.UI.RawUI.WindowTitle = '$Title'; $psCmd"
  ) | Out-Null
}

Write-Host 'Stopping any old app processes from previous run...' -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "e:\PROGRAMING\ADS\23510009_Assignment_8\stop_all.ps1" | Out-Null

Write-Host 'Ensuring PostgreSQL is installed in WSL Ubuntu...' -ForegroundColor Cyan
wsl -d ubuntu -u root -- bash -lc "command -v pg_lsclusters >/dev/null || (apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib)"

Write-Host 'Configuring 3-node PostgreSQL distributed cluster in WSL...' -ForegroundColor Cyan
wsl -d ubuntu -u root -- bash -lc "chmod +x /mnt/e/PROGRAMING/ADS/23510009_Assignment_8/distributed-postgres/setup_wsl_pg_cluster.sh"
wsl -d ubuntu -u root -- bash -lc "/mnt/e/PROGRAMING/ADS/23510009_Assignment_8/distributed-postgres/setup_wsl_pg_cluster.sh"

Write-Host 'Initializing Assignment 3 and Assignment 4 databases...' -ForegroundColor Cyan
wsl -d ubuntu -u root -- bash -lc "chmod +x /mnt/e/PROGRAMING/ADS/23510009_Assignment_8/distributed-postgres/init_assignment_dbs_wsl.sh"
wsl -d ubuntu -u root -- bash -lc "/mnt/e/PROGRAMING/ADS/23510009_Assignment_8/distributed-postgres/init_assignment_dbs_wsl.sh"

Write-Host 'Installing npm dependencies (if needed)...' -ForegroundColor Cyan
Set-Location 'e:\PROGRAMING\ADS\23510009_Assignment_3\23510009_Assignment_3\project\backend'
npm install
Set-Location 'e:\PROGRAMING\ADS\23510009_Assignment_3\23510009_Assignment_3\project'
npm install
Set-Location 'e:\PROGRAMING\ADS\23510009_Assignment_4\codes\backend'
npm install
Set-Location 'e:\PROGRAMING\ADS\23510009_Assignment_4\codes\frontend'
npm install

Write-Host 'Seeding Assignment 4 database users/questions...' -ForegroundColor Cyan
Set-Location 'e:\PROGRAMING\ADS\23510009_Assignment_4\codes\backend'
$env:DB_HOST='localhost'
$env:DB_PORT='5433'
$env:DB_NAME='exam_system'
$env:DB_USER='postgres'
$env:DB_PASSWORD='postgres'
npm run db:seed

Write-Host 'Starting Assignment 3 backend (port 3000, DB node1)...' -ForegroundColor Green
Start-NodeProcess -Title 'A3 Backend (3000)' -WorkingDir 'e:\PROGRAMING\ADS\23510009_Assignment_3\23510009_Assignment_3\project\backend' -EnvLines @(
  "`$env:PGHOST='localhost'",
  "`$env:PGPORT='5433'",
  "`$env:PGDATABASE='student_mis'",
  "`$env:PGUSER='postgres'",
  "`$env:PGPASSWORD='postgres'",
  "`$env:PORT='3000'"
) -Command 'npm start'

Write-Host 'Starting Assignment 3 frontend (port 4200)...' -ForegroundColor Green
Start-NodeProcess -Title 'A3 Frontend (4200)' -WorkingDir 'e:\PROGRAMING\ADS\23510009_Assignment_3\23510009_Assignment_3\project' -EnvLines @() -Command 'npm start -- --port 4200 --host 0.0.0.0'

Write-Host 'Starting Assignment 4 backend (port 3001, DB node1)...' -ForegroundColor Green
Start-NodeProcess -Title 'A4 Backend (3001)' -WorkingDir 'e:\PROGRAMING\ADS\23510009_Assignment_4\codes\backend' -EnvLines @(
  "`$env:PORT='3001'",
  "`$env:DB_HOST='localhost'",
  "`$env:DB_PORT='5433'",
  "`$env:DB_NAME='exam_system'",
  "`$env:DB_USER='postgres'",
  "`$env:DB_PASSWORD='postgres'",
  "`$env:NODE_ENV='development'",
  "`$env:CORS_ORIGIN='http://localhost:4201'",
  "`$env:SOCKET_CORS_ORIGIN='http://localhost:4201'"
) -Command 'npm run dev'

Write-Host 'Starting Assignment 4 frontend (port 4201)...' -ForegroundColor Green
Start-NodeProcess -Title 'A4 Frontend (4201)' -WorkingDir 'e:\PROGRAMING\ADS\23510009_Assignment_4\codes\frontend' -EnvLines @() -Command 'npm start -- --port 4201 --host 0.0.0.0'

Write-Host 'Waiting for APIs to become ready...' -ForegroundColor Cyan
$a3Ready = Wait-HttpReady -Url 'http://localhost:3000/api/health' -TimeoutSeconds 90
$a4Ready = Wait-HttpReady -Url 'http://localhost:3001/api/health' -TimeoutSeconds 90

Write-Host ''
Write-Host 'All services launched.' -ForegroundColor Green
Write-Host 'Assignment 3 Portal: http://localhost:4200' -ForegroundColor Yellow
Write-Host 'Assignment 4 Portal: http://localhost:4201' -ForegroundColor Yellow
Write-Host 'Assignment 3 API:    http://localhost:3000/api/health' -ForegroundColor Yellow
Write-Host 'Assignment 4 API:    http://localhost:3001/api/health' -ForegroundColor Yellow
Write-Host "A3 API Ready:        $a3Ready" -ForegroundColor Yellow
Write-Host "A4 API Ready:        $a4Ready" -ForegroundColor Yellow
Write-Host 'Use stop_all.ps1 to stop Node and Angular processes.' -ForegroundColor Yellow
