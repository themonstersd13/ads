$ErrorActionPreference = 'Stop'

param(
  [string]$DistroName = 'Ubuntu'
)

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$linuxRoot = (wsl.exe -d $DistroName wslpath -a $rootDir).Trim()

Write-Host "Running WSL setup inside distro '$DistroName'..." -ForegroundColor Cyan
wsl.exe -d $DistroName bash -lc "cd '$linuxRoot' && sudo bash ./setup_wsl_cluster.sh"

if ($LASTEXITCODE -ne 0) {
  throw "WSL cluster setup failed in distro '$DistroName'."
}

Write-Host 'WSL cluster setup completed.' -ForegroundColor Green
