#!/usr/bin/env python3
"""
Generate PostgreSQL schema SQL from a directory of CSV files.

Usage:
  python scripts/generate_postgres_schema_from_csv.py \
    --input-dir ./exports/test-csv \
    --output-sql ./infra/postgres/schema_from_csv.sql \
    --output-map ./infra/postgres/csv_table_map.json \
    --schema-name mongo_import
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


CSV_GLOB = "*.csv"
BOOL_VALUES = {"true", "false"}
INT_PATTERN = re.compile(r"^-?\d+$")

# Large base64/blob-like CSV fields can exceed default parser limits.
try:
    csv.field_size_limit(sys.maxsize)
except OverflowError:
    csv.field_size_limit(2**31 - 1)


@dataclass
class ColumnState:
    non_empty: bool = False
    all_bool: bool = True
    all_int: bool = True
    all_numeric: bool = True
    all_timestamp: bool = True
    all_json_object_or_array: bool = True


def quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def sanitize_table_name(stem: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9]+", "_", stem).strip("_").lower()
    if not name:
        name = "table"
    if name[0].isdigit():
        name = f"t_{name}"
    return name


def is_id_like(column_name: str) -> bool:
    name = column_name.lower()
    return (
        name == "_id"
        or name.endswith("id")
        or name.endswith("_id")
        or ".id" in name
        or name.endswith("ids")
    )


def is_bool(value: str) -> bool:
    return value.lower() in BOOL_VALUES


def is_int(value: str) -> bool:
    return bool(INT_PATTERN.fullmatch(value))


def is_numeric(value: str) -> bool:
    try:
        Decimal(value)
        return True
    except (InvalidOperation, ValueError):
        return False


def is_timestamp(value: str) -> bool:
    value = value.strip()
    if not value:
        return False

    if not any(ch in value for ch in ("-", ":", "T", "t", " ")):
        return False

    try:
        candidate = value.replace("Z", "+00:00")
        dt.datetime.fromisoformat(candidate)
        return True
    except ValueError:
        return False


def is_json_object_or_array(value: str) -> bool:
    value = value.strip()
    if not value:
        return False
    if value[0] not in "[{":
        return False
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return False
    return isinstance(parsed, (dict, list))


def infer_sql_type(column_name: str, state: ColumnState, force_text: bool) -> str:
    if force_text:
        return "text"
    if not state.non_empty:
        return "text"
    if is_id_like(column_name):
        return "text"
    if state.all_bool:
        return "boolean"
    if state.all_int:
        return "bigint"
    if state.all_numeric:
        return "numeric"
    if state.all_timestamp:
        return "timestamptz"
    if state.all_json_object_or_array:
        return "jsonb"
    return "text"


def analyze_csv(path: Path, force_text: bool) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        headers = next(reader, [])

    if not headers:
        return {
            "csv": path.name,
            "table": sanitize_table_name(path.stem),
            "skipped": True,
            "reason": "empty_header",
            "row_count": 0,
            "columns": [],
        }

    states: dict[str, ColumnState] = {h: ColumnState() for h in headers}
    row_count = 0

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_count += 1
            for column in headers:
                raw = row.get(column, "")
                value = (raw or "").strip()
                if not value:
                    continue

                st = states[column]
                st.non_empty = True
                st.all_bool = st.all_bool and is_bool(value)
                st.all_int = st.all_int and is_int(value)
                st.all_numeric = st.all_numeric and is_numeric(value)
                st.all_timestamp = st.all_timestamp and is_timestamp(value)
                st.all_json_object_or_array = st.all_json_object_or_array and is_json_object_or_array(value)

    columns = []
    for column in headers:
        sql_type = infer_sql_type(column, states[column], force_text)
        columns.append(
            {
                "name": column,
                "sql_type": sql_type,
            }
        )

    return {
        "csv": path.name,
        "table": sanitize_table_name(path.stem),
        "skipped": False,
        "reason": "",
        "row_count": row_count,
        "columns": columns,
    }


def render_schema_sql(schema_name: str, table_specs: list[dict[str, Any]]) -> str:
    schema_q = quote_ident(schema_name)
    lines: list[str] = []
    lines.append("-- Auto-generated by scripts/generate_postgres_schema_from_csv.py")
    lines.append("-- Review column types before production cutover.")
    lines.append("")
    lines.append(f"CREATE SCHEMA IF NOT EXISTS {schema_q};")
    lines.append("")

    for spec in table_specs:
        if spec["skipped"]:
            lines.append(f"-- SKIPPED {spec['csv']} (reason={spec['reason']})")
            continue

        table_q = quote_ident(spec["table"])
        lines.append(f"-- Source: {spec['csv']} (rows={spec['row_count']})")
        lines.append(f"CREATE TABLE IF NOT EXISTS {schema_q}.{table_q} (")

        col_lines = []
        for col in spec["columns"]:
            col_lines.append(f"  {quote_ident(col['name'])} {col['sql_type']}")
        lines.append(",\n".join(col_lines))
        lines.append(");")

        has_id = any(col["name"] == "_id" for col in spec["columns"])
        if has_id:
            idx_name = f"idx_{spec['table']}_id"
            lines.append(
                f"CREATE INDEX IF NOT EXISTS {quote_ident(idx_name)} "
                f"ON {schema_q}.{table_q} ({quote_ident('_id')});"
            )
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate PostgreSQL schema from CSV files")
    parser.add_argument("--input-dir", required=True, help="Directory containing CSV files")
    parser.add_argument("--output-sql", required=True, help="Output SQL file path")
    parser.add_argument("--output-map", required=True, help="Output JSON mapping file path")
    parser.add_argument("--schema-name", default="mongo_import", help="PostgreSQL schema name")
    parser.add_argument(
        "--force-text-types",
        action="store_true",
        help="Force all columns to text type",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_sql = Path(args.output_sql)
    output_map = Path(args.output_map)
    schema_name = args.schema_name

    if not input_dir.is_dir():
        raise FileNotFoundError(f"Input CSV directory not found: {input_dir}")

    csv_files = sorted(input_dir.glob(CSV_GLOB))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in: {input_dir}")

    table_specs = [analyze_csv(path, args.force_text_types) for path in csv_files]

    output_sql.parent.mkdir(parents=True, exist_ok=True)
    output_map.parent.mkdir(parents=True, exist_ok=True)

    schema_sql = render_schema_sql(schema_name=schema_name, table_specs=table_specs)
    output_sql.write_text(schema_sql, encoding="utf-8")

    payload = {
        "schema_name": schema_name,
        "source_dir": str(input_dir),
        "tables": table_specs,
    }
    output_map.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    for spec in table_specs:
        if spec["skipped"]:
            print(f"SKIP {spec['csv']}: {spec['reason']}")
        else:
            print(
                f"OK   {spec['csv']} -> {schema_name}.{spec['table']} "
                f"(rows={spec['row_count']}, cols={len(spec['columns'])})"
            )

    print(f"\nWrote schema SQL: {output_sql}")
    print(f"Wrote table map : {output_map}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
