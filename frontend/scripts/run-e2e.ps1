$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root '..\backend'
$frontend = $root

function Ensure-PortFree([int]$Port) {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    foreach ($conn in $conns) {
      try { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop } catch {}
    }
    Start-Sleep -Seconds 1
  }
}

Ensure-PortFree 3001
Ensure-PortFree 5173

$env:PORT = '3001'
$backendProc = Start-Process node -ArgumentList 'dist/src/main.js' -WorkingDirectory $backend -PassThru
Remove-Item Env:PORT -ErrorAction SilentlyContinue
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$frontendProc = Start-Process $npmCmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--strictPort' -WorkingDirectory $frontend -PassThru

try {
  Start-Sleep -Seconds 6
  npm run test:e2e
}
finally {
  foreach ($proc in @($frontendProc, $backendProc)) {
    if ($proc -and -not $proc.HasExited) {
      try { Stop-Process -Id $proc.Id -Force } catch {}
    }
  }
}
