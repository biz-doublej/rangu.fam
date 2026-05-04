# Map custom domains to the Cloud Run service.
#
#   pwsh ./deploy/04-domains.ps1 -Project <PROJECT_ID>
#
# Then add the printed DNS records to Cloudflare (DNS-only, gray cloud).
# Cloud Run provisions managed SSL automatically once DNS resolves.

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [string] $Region = 'asia-northeast1',
  [string] $Service = 'rangu-fam',
  [string[]] $Domains = @('rangu-fam.com', 'www.rangu-fam.com', 'irang.wiki', 'www.irang.wiki')
)

$ErrorActionPreference = 'Stop'

gcloud config set project $Project | Out-Null

# Cloud Run domain mapping requires beta + a region that supports it.
# asia-northeast1 supports it.
foreach ($domain in $Domains) {
  Write-Host ""
  Write-Host "==> Verifying domain: $domain" -ForegroundColor Cyan
  Write-Host "    If not yet verified, open the URL printed by:"
  Write-Host "      gcloud domains verify $domain"
  Write-Host "    and complete TXT verification on Cloudflare DNS first."

  Write-Host "==> Creating mapping for $domain" -ForegroundColor Cyan
  gcloud beta run domain-mappings create `
    --service=$Service `
    --domain=$domain `
    --region=$Region 2>&1 | Tee-Object -Variable mappingOut

  if ($LASTEXITCODE -ne 0 -and $mappingOut -notmatch 'already exists') {
    Write-Warning "Mapping for $domain failed. Check verification status."
    continue
  }

  Write-Host "==> DNS records to add for $domain (Cloudflare DNS-only):" -ForegroundColor Yellow
  gcloud beta run domain-mappings describe `
    --domain=$domain `
    --region=$Region `
    --format='value(status.resourceRecords)'
}

Write-Host ""
Write-Host "==> After DNS propagates (~5-30 min):" -ForegroundColor Green
Write-Host "    - SSL certs auto-provision"
Write-Host "    - Test: curl -I https://rangu-fam.com"
Write-Host "    - Test: curl -I https://irang.wiki"
