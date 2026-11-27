# 이랑게임센터 실시간 서버(rangu-game-rt)를 빌드해 Cloud Run 에 올린다.
#
#   pwsh ./deploy/05-game-rt.ps1 -Project <PROJECT_ID>
#
# 하는 일:
#   1. 비밀값 두 개가 없으면 무작위로 만들어 Secret Manager 에 넣는다 (값은 화면에 출력하지 않는다).
#        rangu-rt-jwt-secret       → RT_JWT_SECRET      (브라우저 접속 토큰)
#        rangu-gc-internal-secret  → GC_INTERNAL_SECRET (판 결과 서명)
#   2. services/game-rt 이미지를 Cloud Build 로 만든다.
#   3. Cloud Run 에 배포한다. 방 상태가 메모리에 있으므로 인스턴스는 최대 1개다.
#      DB 에는 붙지 않는다 (Cloud SQL 연결 없음) — 결과는 rangu-fam 내부 API 로만 보낸다.
#   4. rangu-fam 서비스에 같은 비밀값 두 개와 GAME_RT_URL 을 연결한다.
#
# 주의: deploy/03-deploy.ps1 은 --set-env-vars / --set-secrets 로 값을 통째로 바꾼다.
#       03 을 다시 돌린 뒤에는 이 스크립트를 -WireOnly 로 한 번 더 돌려 4번을 다시 적용할 것.
#
#   pwsh ./deploy/05-game-rt.ps1 -Project <PROJECT_ID> -WireOnly

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [string] $Region = 'asia-northeast1',
  [string] $Repo = 'rangu',
  [string] $Service = 'rangu-game-rt',
  [string] $MainService = 'rangu-fam',
  # 결과를 보고할 본 서버 주소와, 접속을 허용할 웹 주소
  [string] $RanguFamUrl = 'https://irang.wiki',
  [string] $AllowedOrigins = 'https://irang.wiki,https://www.irang.wiki',
  # 빌드·배포는 건너뛰고 rangu-fam 연결(4번)만 다시 한다
  [switch] $WireOnly
)

$ErrorActionPreference = 'Stop'

gcloud config set project $Project | Out-Null

$rtSecret = 'rangu-rt-jwt-secret'
$internalSecret = 'rangu-gc-internal-secret'

if (-not $WireOnly) {
  $projectNumber = gcloud projects describe $Project --format='value(projectNumber)'
  $member = "serviceAccount:$projectNumber-compute@developer.gserviceaccount.com"

  foreach ($name in @($rtSecret, $internalSecret)) {
    $exists = gcloud secrets describe $name --project=$Project --format='value(name)' 2>$null
    if ($exists) {
      Write-Host "keep   $name" -ForegroundColor DarkGray
    } else {
      Write-Host "create $name" -ForegroundColor Green
      $bytes = New-Object byte[] 48
      [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
      [Convert]::ToBase64String($bytes) | gcloud secrets create $name --project=$Project --replication-policy=automatic --data-file=- | Out-Null
    }
    gcloud secrets add-iam-policy-binding $name --project=$Project `
      "--member=$member" --role=roles/secretmanager.secretAccessor | Out-Null
  }

  Write-Host ""
  Write-Host "==> Submitting Cloud Build ($Service)" -ForegroundColor Cyan
  # 쉼표가 든 인자는 따옴표로 감싼다 (PowerShell 7 이 배열로 쪼개지 않게).
  gcloud builds submit --config services/game-rt/cloudbuild.yaml `
    "--substitutions=_REGION=$Region,_REPO=$Repo,_SERVICE=$Service" `
    --project=$Project

  $image = "$Region-docker.pkg.dev/$Project/$Repo/${Service}:latest"

  # ALLOWED_ORIGINS 값에 쉼표가 있어 구분자를 ^@^ 로 바꾼다 (gcloud topic escaping).
  $envVars = "^@^NODE_ENV=production@RANGU_FAM_URL=$RanguFamUrl@ALLOWED_ORIGINS=$AllowedOrigins"
  $secrets = @(
    "RT_JWT_SECRET=${rtSecret}:latest",
    "GC_INTERNAL_SECRET=${internalSecret}:latest"
  ) -join ','

  Write-Host ""
  Write-Host "==> Deploying $Service to Cloud Run ($Region)" -ForegroundColor Cyan
  # 웹소켓: 요청 하나가 연결 하나라 timeout 을 최대(3600초)로, 재접속이 같은 인스턴스로 가게 session affinity.
  # 최대 인스턴스 1 — 방 상태가 프로세스 메모리에 있다.
  gcloud run deploy $Service `
    --image=$image `
    --region=$Region `
    --project=$Project `
    --platform=managed `
    --allow-unauthenticated `
    --port=8080 `
    --memory=512Mi `
    --cpu=1 `
    --concurrency=200 `
    --min-instances=0 `
    --max-instances=1 `
    --timeout=3600 `
    --session-affinity `
    --labels=app=gamecenter `
    --quiet `
    "--set-env-vars=$envVars" `
    "--set-secrets=$secrets"
}

$rtUrl = gcloud run services describe $Service --region=$Region --project=$Project --format='value(status.url)'
if (-not $rtUrl) {
  Write-Error "$Service 서비스를 찾을 수 없습니다. -WireOnly 없이 먼저 배포하세요."
}

Write-Host ""
Write-Host "==> $MainService 에 실시간 서버 연결 (GAME_RT_URL, 비밀값 2개)" -ForegroundColor Cyan
$wireSecrets = @(
  "RT_JWT_SECRET=${rtSecret}:latest",
  "GC_INTERNAL_SECRET=${internalSecret}:latest"
) -join ','
gcloud run services update $MainService `
  --region=$Region `
  --project=$Project `
  --quiet `
  "--update-env-vars=GAME_RT_URL=$rtUrl" `
  "--update-secrets=$wireSecrets"

Write-Host ""
Write-Host "==> 실시간 서버 주소:" -ForegroundColor Green
Write-Host "    $rtUrl"
Write-Host "    확인: curl $rtUrl/healthz"
Write-Host "    배포는 파티가 없는 시간에 — 재시작하면 진행 중인 방이 사라진다 (끝난 판의 포인트는 안전)."
