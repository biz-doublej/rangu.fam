param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [string]$Database,

    [string[]]$Collections,

    [string]$OutputRoot = ".\\exports"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command mongoexport -ErrorAction SilentlyContinue)) {
    throw "mongoexport not found. Install MongoDB Database Tools first."
}

if (-not $Collections -or $Collections.Count -eq 0) {
    if (-not (Get-Command mongosh -ErrorAction SilentlyContinue)) {
        throw "Collections not provided and mongosh not found. Install mongosh or pass -Collections."
    }

    Write-Host "[INFO] No collections provided. Discovering from $Database ..."
    $collectionText = mongosh "$Uri" --quiet --eval "db.getSiblingDB('$Database').getCollectionNames().join(' ')"
    if ([string]::IsNullOrWhiteSpace($collectionText)) {
        throw "Could not discover collections from DB: $Database"
    }

    $Collections = $collectionText.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
    Write-Host "[INFO] Discovered collections: $($Collections -join ', ')"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "python not found. Install Python 3 first."
}

$projectRoot = (Get-Location).Path
$jsonDir = Join-Path $OutputRoot $Database
$csvDir = Join-Path $OutputRoot ("{0}-csv" -f $Database)

New-Item -ItemType Directory -Force -Path $jsonDir | Out-Null
New-Item -ItemType Directory -Force -Path $csvDir | Out-Null

Write-Host "[INFO] DB: $Database"
Write-Host "[INFO] JSON dir: $jsonDir"
Write-Host "[INFO] CSV dir : $csvDir"

foreach ($col in $Collections) {
    if ([string]::IsNullOrWhiteSpace($col)) {
        continue
    }

    $jsonFile = Join-Path $jsonDir ("{0}.json" -f $col)

    Write-Host "[EXPORT] $Database.$col -> $jsonFile"
    mongoexport `
      --uri "$Uri" `
      --db "$Database" `
      --collection "$col" `
      --out "$jsonFile" `
      --jsonArray

    if (-not (Test-Path $jsonFile)) {
        Write-Warning "Export file not created: $jsonFile"
        continue
    }

    $size = (Get-Item $jsonFile).Length
    if ($size -le 2) {
        Write-Warning "No rows (or collection missing): $Database.$col"
    }
}

Write-Host "[CONVERT] JSON -> CSV"
python .\scripts\json_to_csv.py --input "$jsonDir" --output "$csvDir"

Write-Host "[DONE]"
