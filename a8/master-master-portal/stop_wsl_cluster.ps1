$ErrorActionPreference = 'Stop'

param(
  [string]$DistroName = 'Ubuntu'
)

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$linuxRoot = (wsl.exe -d $DistroName wslpath -a $rootDir).Trim()

Write-Host "Stopping WSL PostgreSQL clusters in distro '$DistroName'..." -ForegroundColor Cyan
wsl.exe -d $DistroName bash -lc "cd '$linuxRoot' && sudo bash ./stop_wsl_cluster.sh"

if ($LASTEXITCODE -ne 0) {
  throw "WSL cluster stop failed in distro '$DistroName'."
}

Write-Host 'WSL clusters stopped.' -ForegroundColor Green
