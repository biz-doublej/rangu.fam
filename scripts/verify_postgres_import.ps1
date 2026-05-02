param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$MapPath = ".\\infra\\postgres\\csv_table_map.json",
    [string]$SchemaName = "",
    [switch]$UseDockerPsql,
    [string]$PsqlDockerImage = "postgres:16-alpine"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DatabaseUrl is required. Pass -DatabaseUrl or set DATABASE_URL."
}

$hasLocalPsql = [bool](Get-Command psql -ErrorAction SilentlyContinue)
$useDockerPsqlMode = $UseDockerPsql.IsPresent -or -not $hasLocalPsql

if ($useDockerPsqlMode -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "psql not found and Docker not available. Install psql or Docker first."
}

if (-not (Test-Path $MapPath)) {
    throw "Map file not found: $MapPath"
}

function Invoke-PsqlScalar {
    param([string]$Sql)

    if ($useDockerPsqlMode) {
        $args = @(
            "run", "--rm", "-i",
            $PsqlDockerImage,
            "psql", $DatabaseUrl,
            "-At",
            "-v", "ON_ERROR_STOP=1",
            "-c", $Sql
        )
        return (& docker @args)
    }

    return (& psql "$DatabaseUrl" -At -v ON_ERROR_STOP=1 -c $Sql)
}

$mapRaw = Get-Content $MapPath -Raw -Encoding UTF8
$map = $mapRaw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($SchemaName)) {
    $SchemaName = [string]$map.schema_name
}

if (-not $map.tables) {
    throw "No tables in map file: $MapPath"
}

$mismatch = 0
$checked = 0
if ($useDockerPsqlMode) {
    Write-Host "[INFO] psql mode   : docker ($PsqlDockerImage)"
} else {
    Write-Host "[INFO] psql mode   : local binary"
}

foreach ($entry in $map.tables) {
    if ($entry.skipped) {
        continue
    }

    $tableName = [string]$entry.table
    $expected = [int64]$entry.row_count

    $schemaQ = '"' + $SchemaName.Replace('"', '""') + '"'
    $tableQ = '"' + $tableName.Replace('"', '""') + '"'
    $sql = "SELECT COUNT(*) FROM $schemaQ.$tableQ;"

    $actualRaw = Invoke-PsqlScalar -Sql $sql
    if ($LASTEXITCODE -ne 0) {
        throw "Count query failed for $SchemaName.$tableName"
    }

    $actual = 0
    if (-not [int64]::TryParse(($actualRaw | Select-Object -Last 1), [ref]$actual)) {
        throw "Invalid count output for $SchemaName.$tableName : $actualRaw"
    }

    $checked++
    if ($actual -ne $expected) {
        $mismatch++
        Write-Host "[MISMATCH] $SchemaName.$tableName expected=$expected actual=$actual"
    } else {
        Write-Host "[OK]       $SchemaName.$tableName rows=$actual"
    }
}

Write-Host ""
Write-Host "[SUMMARY] checked=$checked mismatch=$mismatch"

if ($mismatch -gt 0) {
    exit 1
}
