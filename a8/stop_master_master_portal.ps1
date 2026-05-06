$ErrorActionPreference = 'Continue'

Write-Host 'Stopping master-master portal node process...' -ForegroundColor Cyan
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match 'node(.exe)?' -and
    $_.CommandLine -match '23510009_Assignment_8\\master-master-portal\\backend\\src\\server.js'
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host 'Done.' -ForegroundColor Green
