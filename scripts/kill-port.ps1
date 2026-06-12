# Free a TCP port before starting dev (Windows).
# Usage: .\scripts\kill-port.ps1 -Port 3010

param([int]$Port = 3010)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "Port $Port is free."
  exit 0
}

$pids = $connections.OwningProcess | Sort-Object -Unique
foreach ($procId in $pids) {
  if ($procId -eq 0) { continue }
  Write-Host "Stopping PID $procId on port $Port ..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Write-Host "Port $Port freed."
