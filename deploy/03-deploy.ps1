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

# Cloud SQL Auth Proxy socket. DATABASE_URL uses host=/cloudsql/<conn>, so the
# service MUST mount this instance or every DB query fails and the wiki shows
# 0 docs (the homepage still works — it is DB-less). Missing this flag is what
# left the wiki dead after the 2026-06-05 restore.
$cloudSqlInstance = "${Project}:${Region}:rangu-pg"

# 이랑게임센터 실시간 서버(rangu-game-rt)가 배포돼 있으면 그 주소와 비밀값 두 개를 함께 넣는다.
# 아래 --set-env-vars / --set-secrets 는 값을 통째로 바꾸므로, 여기서 빠지면 방 게임(오목·퀴즈 등)이 멈춘다.
# 실시간 서버가 아직 없으면(05-game-rt.ps1 을 돌리기 전) 건너뛴다 — 비밀값도 그 스크립트가 만든다.
$gameRtService = 'rangu-game-rt'
$gameRtUrl = gcloud run services describe $gameRtService --region=$Region --project=$Project --format='value(status.url)' 2>$null
if ($LASTEXITCODE -ne 0) { $gameRtUrl = $null }

$envVarList = @(
  'NODE_ENV=production',
  'AUTH_MODE=sso',
  'DISCORD_REDIRECT_BASE_URL=https://rangu-fam.com'
)
if ($gameRtUrl) { $envVarList += "GAME_RT_URL=$gameRtUrl" }
$envVars = $envVarList -join ','

$secretList = @(
  'JWT_SECRET=rangu-jwt-secret:latest',
  'NEXTAUTH_SECRET=rangu-nextauth-secret:latest',
  # Code reads DATABASE_URL (src/db/client.ts). POSTGRES_BRIDGE_URI is FerretDB-era leftover.
  'DATABASE_URL=rangu-database-url:latest',
  'GOOGLE_CLIENT_ID=rangu-google-client-id:latest',
  'GOOGLE_CLIENT_SECRET=rangu-google-client-secret:latest',
  'NAVER_CLIENT_ID=rangu-naver-client-id:latest',
  'NAVER_CLIENT_SECRET=rangu-naver-client-secret:latest',
  'DISCORD_CLIENT_ID=rangu-discord-client-id:latest',
  'DISCORD_CLIENT_SECRET=rangu-discord-client-secret:latest',
  'DISCORD_WEBHOOK_URL=rangu-discord-webhook-url:latest'
)
if ($gameRtUrl) {
  $secretList += 'RT_JWT_SECRET=rangu-rt-jwt-secret:latest'
  $secretList += 'GC_INTERNAL_SECRET=rangu-gc-internal-secret:latest'
  Write-Host "==> Game center realtime server: $gameRtUrl" -ForegroundColor DarkGray
} else {
  Write-Host "==> $gameRtService not deployed yet - skipping GAME_RT_URL and realtime secrets (run deploy/05-game-rt.ps1)" -ForegroundColor DarkYellow
}
$secrets = $secretList -join ','

Write-Host ""
Write-Host "==> Deploying $Service to Cloud Run ($Region)" -ForegroundColor Cyan
# --project 명시 필수: gcloud config 가 다른 project 일 때 prompt 로 멈추거나 잘못된 곳에 deploy.
gcloud run deploy $Service `
  --image=$image `
  --region=$Region `
  --project=$Project `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --memory=1Gi `
  --cpu=1 `
  --concurrency=80 `
  --min-instances=0 `
  --max-instances=4 `
  --timeout=60 `
  --quiet `
  "--set-cloudsql-instances=$cloudSqlInstance" `
  "--set-env-vars=$envVars" `
  "--set-secrets=$secrets"

Write-Host ""
Write-Host "==> Service URL:" -ForegroundColor Green
gcloud run services describe $Service --region=$Region --project=$Project --format='value(status.url)'
