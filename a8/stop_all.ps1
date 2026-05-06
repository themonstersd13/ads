$ErrorActionPreference = 'Continue'

Write-Host 'Stopping Node.js app processes started for Assignment 8...' -ForegroundColor Cyan
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match 'node(.exe)?' -and (
      $_.CommandLine -match '23510009_Assignment_3\\23510009_Assignment_3\\project' -or
      $_.CommandLine -match '23510009_Assignment_4\\codes\\backend' -or
      $_.CommandLine -match '23510009_Assignment_4\\codes\\frontend'
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host 'Node processes stopped.' -ForegroundColor Green
Write-Host 'WSL PostgreSQL clusters remain running for faster next startup.' -ForegroundColor Yellow
Write-Host 'To stop DB clusters manually:' -ForegroundColor Yellow
Write-Host "wsl -d ubuntu -u root -- bash -lc 'pg_ctlcluster 16 node1 stop; pg_ctlcluster 16 node2 stop; pg_ctlcluster 16 node3 stop'" -ForegroundColor Yellow
