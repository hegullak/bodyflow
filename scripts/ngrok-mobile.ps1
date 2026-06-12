# Start ngrok for bodyflow mobile testing (Next.js on port 3010).
# Usage: .\scripts\ngrok-mobile.ps1
# Requires: ngrok on PATH, dev server on http://localhost:3010

$ErrorActionPreference = "Stop"
$Port = 3010
$EnvFile = Join-Path $PSScriptRoot ".." ".env.local" | Resolve-Path
$ClerkAppId = "app_3F1YgZupaC522xCiwUnzuAqMFsn"

function Get-NgrokHttpsUrl {
  $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
  $https = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
  if (-not $https) {
    throw "No HTTPS ngrok tunnel found. Is ngrok running? (ngrok http $Port)"
  }
  return $https.public_url.TrimEnd("/")
}

function Test-NgrokRunning {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-NgrokRunning)) {
  Write-Host "Starting ngrok http $Port ..."
  Start-Process -FilePath "ngrok" -ArgumentList "http", "$Port" -WindowStyle Minimized
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if (Test-NgrokRunning) { break }
  }
  if (-not (Test-NgrokRunning)) {
    throw "ngrok did not start within 15s"
  }
}

$baseUrl = Get-NgrokHttpsUrl
$hostName = ([Uri]$baseUrl).Host

Write-Host "ngrok URL: $baseUrl"
Write-Host "Updating $EnvFile ..."

$content = Get-Content -Raw -Path $EnvFile

$replacements = @{
  'WITHINGS_REDIRECT_URI="[^"]*"' = "WITHINGS_REDIRECT_URI=`"$baseUrl/api/integrations/withings/callback`""
  'NEXT_PUBLIC_APP_URL="[^"]*"'   = "NEXT_PUBLIC_APP_URL=`"$baseUrl`""
  'ALLOWED_DEV_ORIGINS="[^"]*"'   = "ALLOWED_DEV_ORIGINS=`"localhost,$hostName`""
}

foreach ($pattern in $replacements.Keys) {
  if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacements[$pattern]
  } else {
    $content += "`n$($replacements[$pattern])`n"
  }
}

Set-Content -Path $EnvFile -Value $content.TrimEnd() + "`n" -NoNewline

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. Restart dev server (npm run dev) so env picks up changes"
Write-Host "  2. Clerk Dashboard -> Domains -> add: $baseUrl"
Write-Host "     https://dashboard.clerk.com/apps/$ClerkAppId/instances/ins_dev/domains"
Write-Host "  3. Open on iPhone: $baseUrl"
Write-Host "     (ngrok free: tap 'Visit Site' on first load)"
Write-Host "  4. Add to Home Screen for PWA + push reminders"
Write-Host ""
Write-Host "Inspector: http://127.0.0.1:4040"
