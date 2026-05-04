# Rangu.fam — One-time GCP project bootstrap.
# Run once per GCP project. Idempotent (safe to re-run).
#
#   pwsh ./deploy/01-setup-gcp.ps1 -Project <PROJECT_ID> -Region asia-northeast1
#
# Prerequisites: gcloud auth login, billing enabled on the project.

param(
  [Parameter(Mandatory=$true)] [string] $Project,
  [string] $Region = 'asia-northeast1',
  [string] $Repo = 'rangu'
)

$ErrorActionPreference = 'Stop'

Write-Host "==> Setting active project: $Project" -ForegroundColor Cyan
gcloud config set project $Project | Out-Null

Write-Host "==> Enabling required APIs" -ForegroundColor Cyan
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  compute.googleapis.com `
  iam.googleapis.com

Write-Host "==> Creating Artifact Registry repo: $Repo ($Region)" -ForegroundColor Cyan
$exists = gcloud artifacts repositories list --location=$Region --format="value(name)" | Select-String -SimpleMatch $Repo
if (-not $exists) {
  gcloud artifacts repositories create $Repo `
    --repository-format=docker `
    --location=$Region `
    --description='Rangu.fam container images'
} else {
  Write-Host "    (already exists)" -ForegroundColor DarkGray
}

Write-Host "==> Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  2. Create secrets:        pwsh ./deploy/02-secrets.ps1"
Write-Host "  3. Build + deploy app:    pwsh ./deploy/03-deploy.ps1 -Project $Project"
Write-Host "  4. Map domains:           pwsh ./deploy/04-domains.ps1 -Project $Project"
