param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$CsvDir = ".\\exports\\test-csv",
    [string]$SchemaName = "mongo_import",
    [string]$SchemaSqlPath = ".\\infra\\postgres\\schema_from_csv.sql",
    [string]$MapPath = ".\\infra\\postgres\\csv_table_map.json",
    [switch]$ForceTextTypes,
    [switch]$TruncateFirst,
    [switch]$UseDockerPsql,
    [string]$PsqlDockerImage = "postgres:16-alpine"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DatabaseUrl is required. Pass -DatabaseUrl or set DATABASE_URL."
}

if (-not (Test-Path $CsvDir)) {
    throw "CsvDir not found: $CsvDir"
}

$hasLocalPsql = [bool](Get-Command psql -ErrorAction SilentlyContinue)
$useDockerPsqlMode = $UseDockerPsql.IsPresent -or -not $hasLocalPsql

if ($useDockerPsqlMode -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "psql not found and Docker not available. Install psql or Docker first."
}

$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    throw "Python not found. Install Python 3 first."
}

function Invoke-PsqlSql {
    param(
        [string]$Sql,
        [string]$FailureMessage
    )

    if ($useDockerPsqlMode) {
        $args = @(
            "run", "--rm", "-i",
            $PsqlDockerImage,
            "psql", $DatabaseUrl,
            "-v", "ON_ERROR_STOP=1",
            "-c", $Sql
        )
        & docker @args
    } else {
        & psql "$DatabaseUrl" -v ON_ERROR_STOP=1 -c $Sql
    }

    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Invoke-PsqlFile {
    param(
        [string]$FilePath,
        [string]$FailureMessage
    )

    if ($useDockerPsqlMode) {
        $resolved = (Resolve-Path $FilePath).Path
        $dir = Split-Path -Parent $resolved
        $name = Split-Path -Leaf $resolved
        $mount = "${dir}:/import"
        $dockerFile = "/import/$name"

        $args = @(
            "run", "--rm", "-i",
            "-v", $mount,
            $PsqlDockerImage,
            "psql", $DatabaseUrl,
            "-v", "ON_ERROR_STOP=1",
            "-f", $dockerFile
        )
        & docker @args
    } else {
        & psql "$DatabaseUrl" -v ON_ERROR_STOP=1 -f "$FilePath"
    }

    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Invoke-PsqlCopyCsv {
    param(
        [string]$QualifiedTable,
        [string]$CsvPath,
        [string]$CsvLabel
    )

    if ($useDockerPsqlMode) {
        $resolved = (Resolve-Path $CsvPath).Path
        $dir = Split-Path -Parent $resolved
        $name = Split-Path -Leaf $resolved
        $mount = "${dir}:/import"
        $dockerCsv = "/import/" + $name.Replace("'", "''")
        $copySql = "\copy $QualifiedTable FROM '$dockerCsv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

        $args = @(
            "run", "--rm", "-i",
            "-v", $mount,
            $PsqlDockerImage,
            "psql", $DatabaseUrl,
            "-v", "ON_ERROR_STOP=1",
            "-c", $copySql
        )
        & docker @args
    } else {
        $absPath = (Resolve-Path $CsvPath).Path
        $copyPath = $absPath.Replace('\', '/').Replace("'", "''")
        $copySql = "\copy $QualifiedTable FROM '$copyPath' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')"

        & psql "$DatabaseUrl" -v ON_ERROR_STOP=1 -c $copySql
    }

    if ($LASTEXITCODE -ne 0) {
        throw "COPY failed for $CsvLabel"
    }
}

Write-Host "[INFO] CSV dir     : $CsvDir"
Write-Host "[INFO] Schema name : $SchemaName"
Write-Host "[INFO] Schema SQL  : $SchemaSqlPath"
Write-Host "[INFO] Map path    : $MapPath"
if ($useDockerPsqlMode) {
    Write-Host "[INFO] psql mode   : docker ($PsqlDockerImage)"
} else {
    Write-Host "[INFO] psql mode   : local binary"
}

$genArgs = @(
    ".\scripts\generate_postgres_schema_from_csv.py",
    "--input-dir", $CsvDir,
    "--output-sql", $SchemaSqlPath,
    "--output-map", $MapPath,
    "--schema-name", $SchemaName
)

if ($ForceTextTypes) {
    $genArgs += "--force-text-types"
}

Write-Host "[STEP] Generate schema and table map"
& $pythonCmd @genArgs
if ($LASTEXITCODE -ne 0) {
    throw "Schema generation failed with exit code $LASTEXITCODE"
}

Write-Host "[STEP] Apply schema SQL"
Invoke-PsqlFile -FilePath $SchemaSqlPath -FailureMessage "Applying schema failed"

if (-not (Test-Path $MapPath)) {
    throw "Table map not found: $MapPath"
}

$mapRaw = Get-Content $MapPath -Raw -Encoding UTF8
$map = $mapRaw | ConvertFrom-Json

if (-not $map.tables) {
    throw "No tables in map file: $MapPath"
}

foreach ($entry in $map.tables) {
    if ($entry.skipped) {
        Write-Warning "Skipping $($entry.csv): $($entry.reason)"
        continue
    }

    $csvPath = Join-Path $CsvDir $entry.csv
    if (-not (Test-Path $csvPath)) {
        Write-Warning "CSV not found, skipping: $csvPath"
        continue
    }

    $tableName = [string]$entry.table
    $schemaQ = '"' + $SchemaName.Replace('"', '""') + '"'
    $tableQ = '"' + $tableName.Replace('"', '""') + '"'
    $qualifiedTable = "$schemaQ.$tableQ"

    if ($TruncateFirst) {
        Write-Host "[TRUNCATE] $qualifiedTable"
        Invoke-PsqlSql -Sql "TRUNCATE TABLE $qualifiedTable;" -FailureMessage "Truncate failed for $qualifiedTable"
    }

    Write-Host "[COPY] $($entry.csv) -> $qualifiedTable"
    Invoke-PsqlCopyCsv -QualifiedTable $qualifiedTable -CsvPath $csvPath -CsvLabel $entry.csv
}

Write-Host "[DONE] CSV import completed."
