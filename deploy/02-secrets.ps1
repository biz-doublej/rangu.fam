# Create / update secrets in Secret Manager for Rangu.fam.
#
#   pwsh ./deploy/02-secrets.ps1 -Project <PROJECT_ID>
#
# Reads sensitive values from your local .env.local — does NOT echo them
# to the terminal. Idempotent (overwrites existing secret versions).

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [string] $EnvFile = '.env.local'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file not found: $EnvFile"
}

# Parse .env.local
$envMap = @{}
foreach ($line in Get-Content $EnvFile) {
  if ($line -match '^\s*#') { continue }
  if ($line -match '^\s*$') { continue }
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $key = $Matches[1]
    $val = $Matches[2].Trim('"').Trim("'")
    $envMap[$key] = $val
  }
}

# Map of secretName → envKey
$secrets = @{
  'rangu-jwt-secret'           = 'JWT_SECRET'
  'rangu-nextauth-secret'      = 'NEXTAUTH_SECRET'
  'rangu-postgres-bridge-uri'  = 'POSTGRES_BRIDGE_URI'
  'rangu-oidc-client-secret'   = 'OIDC_CLIENT_SECRET'
  'rangu-discord-client-secret'= 'DISCORD_CLIENT_SECRET'
  'rangu-discord-webhook-url'  = 'DISCORD_WEBHOOK_URL'
}

gcloud config set project $Project | Out-Null

foreach ($entry in $secrets.GetEnumerator()) {
  $name = $entry.Key
  $envKey = $entry.Value
  $value = $envMap[$envKey]

  if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'PASTE_NEW_SECRET_HERE' -or $value -eq 'replace-me') {
    Write-Host "skip   $name  (env $envKey is empty or placeholder)" -ForegroundColor DarkYellow
    continue
  }

  $exists = gcloud secrets describe $name --format='value(name)' 2>$null
  if ($exists) {
    Write-Host "update $name" -ForegroundColor Cyan
    $value | gcloud secrets versions add $name --data-file=- | Out-Null
  } else {
    Write-Host "create $name" -ForegroundColor Green
    $value | gcloud secrets create $name --replication-policy=automatic --data-file=- | Out-Null
  }
}

Write-Host ""
Write-Host "Granting Cloud Run runtime access to the secrets..." -ForegroundColor Cyan
$projectNumber = gcloud projects describe $Project --format='value(projectNumber)'
$runSa = "$projectNumber-compute@developer.gserviceaccount.com"

foreach ($name in $secrets.Keys) {
  $exists = gcloud secrets describe $name --format='value(name)' 2>$null
  if (-not $exists) { continue }
  gcloud secrets add-iam-policy-binding $name `
    --member="serviceAccount:$runSa" `
    --role='roles/secretmanager.secretAccessor' --quiet 2>$null | Out-Null
}

Write-Host "==> Secrets ready." -ForegroundColor Green
