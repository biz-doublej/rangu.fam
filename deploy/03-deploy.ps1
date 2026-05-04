# Build the rangu-fam container with Cloud Build, then deploy to Cloud Run.
#
#   pwsh ./deploy/03-deploy.ps1 -Project <PROJECT_ID>
#
# Re-run any time the code changes.

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [string] $Region = 'asia-northeast1',
  [string] $Repo = 'rangu',
  [string] $Service = 'rangu-fam'
)

$ErrorActionPreference = 'Stop'

gcloud config set project $Project | Out-Null

Write-Host "==> Submitting Cloud Build" -ForegroundColor Cyan
# NOTE: Quote comma-separated args. PowerShell 7 treats unquoted commas as
# array constructors, splitting them into multiple positional args, which
# makes gcloud reject them. (Windows PowerShell 5.1 is more forgiving.)
gcloud builds submit --config cloudbuild.yaml `
  "--substitutions=_REGION=$Region,_REPO=$Repo,_SERVICE=$Service" `
  --project=$Project

$image = "$Region-docker.pkg.dev/$Project/$Repo/${Service}:latest"

$envVars = @(
  'NODE_ENV=production',
  'AUTH_MODE=sso',
  'OIDC_ISSUER=https://auth.doublej.app',
  'OIDC_CLIENT_ID=rangu-fam-web',
  'OIDC_SCOPE=openid profile email offline_access',
  'ACCOUNTS_BASE_URL=https://accounts.doublej.app',
  'NEXT_PUBLIC_ACCOUNTS_BASE_URL=https://accounts.doublej.app',
  'DISCORD_REDIRECT_BASE_URL=https://rangu-fam.com'
) -join ','

$secrets = @(
  'JWT_SECRET=rangu-jwt-secret:latest',
  'NEXTAUTH_SECRET=rangu-nextauth-secret:latest',
  # Code reads DATABASE_URL (src/db/client.ts). POSTGRES_BRIDGE_URI is FerretDB-era leftover.
  'DATABASE_URL=rangu-database-url:latest',
  'OIDC_CLIENT_SECRET=rangu-oidc-client-secret:latest',
  'DISCORD_CLIENT_SECRET=rangu-discord-client-secret:latest',
  'DISCORD_WEBHOOK_URL=rangu-discord-webhook-url:latest'
) -join ','

Write-Host ""
Write-Host "==> Deploying $Service to Cloud Run ($Region)" -ForegroundColor Cyan
gcloud run deploy $Service `
  --image=$image `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --memory=1Gi `
  --cpu=1 `
  --concurrency=80 `
  --min-instances=0 `
  --max-instances=4 `
  --timeout=60 `
  "--set-env-vars=$envVars" `
  "--set-secrets=$secrets"

Write-Host ""
Write-Host "==> Service URL:" -ForegroundColor Green
gcloud run services describe $Service --region=$Region --format='value(status.url)'
