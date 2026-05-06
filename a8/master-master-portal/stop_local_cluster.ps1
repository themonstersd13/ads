$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $rootDir 'docker-compose.yml'

Write-Host 'Stopping local master-master cluster...' -ForegroundColor Cyan
docker compose -f $composeFile down

Write-Host 'Cluster stopped.' -ForegroundColor Green
Write-Host 'Use docker compose -f master-master-portal\docker-compose.yml down -v if you also want to remove all data volumes.' -ForegroundColor Yellow
