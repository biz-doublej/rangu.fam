# CSV to PostgreSQL Import (Staging)

This folder stores generated SQL/map files for importing Mongo-exported CSV files into PostgreSQL.

## Files

- `schema_from_csv.sql`: generated `CREATE SCHEMA/TABLE` SQL
- `csv_table_map.json`: generated CSV-to-table mapping + expected row counts

## Generate schema from CSV

```bash
python3 scripts/generate_postgres_schema_from_csv.py \
  --input-dir exports/test-csv \
  --output-sql infra/postgres/schema_from_csv.sql \
  --output-map infra/postgres/csv_table_map.json \
  --schema-name mongo_import
```

## PowerShell import (Windows)

If `psql` is not installed locally, the script automatically falls back to Docker (`postgres:16-alpine`) when Docker is available.

```powershell
.\scripts\import_csv_to_postgres.ps1 `
  -DatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/DBNAME" `
  -CsvDir ".\exports\test-csv" `
  -SchemaName "mongo_import" `
  -TruncateFirst
```

If needed, you can force all generated columns to `text`:

```powershell
.\scripts\import_csv_to_postgres.ps1 `
  -DatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/DBNAME" `
  -CsvDir ".\exports\test-csv" `
  -SchemaName "mongo_import" `
  -ForceTextTypes `
  -TruncateFirst
```

To force Docker mode even when local `psql` exists:

```powershell
.\scripts\import_csv_to_postgres.ps1 `
  -DatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/DBNAME" `
  -UseDockerPsql `
  -TruncateFirst
```

## Verify row counts after import

```powershell
.\scripts\verify_postgres_import.ps1 `
  -DatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/DBNAME" `
  -MapPath ".\infra\postgres\csv_table_map.json" `
  -SchemaName "mongo_import"
```

`verify_postgres_import.ps1` also supports Docker fallback (`-UseDockerPsql`).
