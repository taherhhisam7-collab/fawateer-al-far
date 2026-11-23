$conn = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
for ($i = 0; $i -lt 20; $i++) {
  if (-not (Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Milliseconds 250
}
Start-Process -FilePath node -ArgumentList "server/index.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
for ($i = 0; $i -lt 40; $i++) {
  if (Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue) { Write-Output "ready"; exit 0 }
  Start-Sleep -Milliseconds 250
}
Write-Output "failed to start"
exit 1
