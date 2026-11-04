# .env.local 의 구글, 네이버, Discord 로그인 값을 Secret Manager 에 등록한다.
# 값은 화면에 출력하지 않는다. 다시 실행하면 새 버전을 추가한다.
#
#   pwsh ./deploy/04-login-secrets.ps1 -Project <PROJECT_ID> -Account <GCLOUD_ACCOUNT>

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [Parameter(Mandatory=$true)] [string] $Account,
  [string] $EnvFile = '.env.local'
)

$ErrorActionPreference = 'Stop'

$mapping = [ordered]@{
  'rangu-google-client-id'     = 'GOOGLE_CLIENT_ID'
  'rangu-google-client-secret' = 'GOOGLE_CLIENT_SECRET'
  'rangu-naver-client-id'      = 'NAVER_CLIENT_ID'
  'rangu-naver-client-secret'  = 'NAVER_CLIENT_SECRET'
  'rangu-discord-client-id'    = 'DISCORD_CLIENT_ID'
}

$projectNumber = gcloud projects describe $Project --account=$Account --format='value(projectNumber)'
$member = "serviceAccount:$projectNumber-compute@developer.gserviceaccount.com"
$lines = Get-Content $EnvFile

foreach ($secret in $mapping.Keys) {
  $key = $mapping[$secret]
  $line = $lines | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "$key 가 $EnvFile 에 없습니다." }
  $value = ($line -replace "^$key=", '').Trim().Trim('"', "'")
  if (-not $value) { throw "$key 값이 비어 있습니다." }

  gcloud secrets describe $secret --project=$Project --account=$Account 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    gcloud secrets create $secret --project=$Project --account=$Account --replication-policy=automatic | Out-Null
  }

  $tempFile = New-TemporaryFile
  try {
    [IO.File]::WriteAllText($tempFile.FullName, $value)
    gcloud secrets versions add $secret --project=$Project --account=$Account --data-file=$($tempFile.FullName) | Out-Null
  } finally {
    Remove-Item $tempFile.FullName -Force
  }

  gcloud secrets add-iam-policy-binding $secret --project=$Project --account=$Account `
    --member=$member --role=roles/secretmanager.secretAccessor --format=none | Out-Null
  Write-Host "등록 완료: $secret"
}
