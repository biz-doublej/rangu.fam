#!/usr/bin/env python3
"""
Convert Mongo export JSON (JSON array or NDJSON) into flattened CSV.

Usage:
  python3 scripts/json_to_csv.py --input ./exports/users.json --output ./exports/users.csv
  python3 scripts/json_to_csv.py --input ./exports/json --output ./exports/csv
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

EXTENSIONS = {".json", ".jsonl", ".ndjson"}


def normalize_bson(value: Any) -> Any:
    if isinstance(value, dict):
        if len(value) == 1:
            key, inner = next(iter(value.items()))
            if key in {"$oid", "$uuid"}:
                return str(inner)
            if key == "$date":
                if isinstance(inner, str):
                    return inner
                if isinstance(inner, dict) and "$numberLong" in inner:
                    return inner["$numberLong"]
                return inner
            if key in {"$numberInt", "$numberLong", "$numberDecimal", "$numberDouble"}:
                return inner
            if key == "$binary":
                if isinstance(inner, dict):
                    return inner.get("base64") or json.dumps(inner, ensure_ascii=False)
                return inner

        return {k: normalize_bson(v) for k, v in value.items()}

    if isinstance(value, list):
        return [normalize_bson(v) for v in value]

    return value


def flatten_dict(doc: dict[str, Any], parent: str = "", out: dict[str, Any] | None = None) -> dict[str, Any]:
    if out is None:
        out = {}

    for key, value in doc.items():
        col = f"{parent}.{key}" if parent else key

        if isinstance(value, dict):
            flatten_dict(value, col, out)
            continue

        if isinstance(value, list):
            out[col] = json.dumps(value, ensure_ascii=False)
            continue

        out[col] = value

    return out


def parse_docs(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    if text[0] == "[":
        parsed = json.loads(text)
        if not isinstance(parsed, list):
            raise ValueError(f"{path}: JSON array expected")
        return [normalize_bson(item) for item in parsed if isinstance(item, dict)]

    docs: list[dict[str, Any]] = []
    for idx, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        item = json.loads(line)
        if not isinstance(item, dict):
            raise ValueError(f"{path}:{idx}: object expected")
        docs.append(normalize_bson(item))
    return docs


def build_headers(rows: list[dict[str, Any]]) -> list[str]:
    seen: dict[str, None] = {}
    for row in rows:
        for key in row.keys():
            if key not in seen:
                seen[key] = None
    return list(seen.keys())


def convert_file(input_file: Path, output_file: Path) -> tuple[int, int]:
    docs = parse_docs(input_file)
    flat_rows = [flatten_dict(doc) for doc in docs]
    headers = build_headers(flat_rows)

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in flat_rows:
            writer.writerow({k: row.get(k, "") for k in headers})

    return len(docs), len(headers)


def discover_input_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]

    if not input_path.is_dir():
        raise FileNotFoundError(f"Input path not found: {input_path}")

    files = [p for p in sorted(input_path.rglob("*")) if p.is_file() and p.suffix.lower() in EXTENSIONS]
    return files


def resolve_output_path(input_file: Path, input_root: Path, output_path: Path) -> Path:
    if output_path.suffix.lower() == ".csv":
        return output_path

    relative = input_file.relative_to(input_root) if input_root.is_dir() else Path(input_file.name)
    return (output_path / relative).with_suffix(".csv")


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Mongo export JSON to CSV")
    parser.add_argument("--input", required=True, help="Input JSON file or directory")
    parser.add_argument("--output", required=True, help="Output CSV file or directory")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    files = discover_input_files(input_path)
    if not files:
        print(f"No JSON files found under: {input_path}")
        return 1

    for src in files:
        dst = resolve_output_path(src, input_path, output_path)
        rows, cols = convert_file(src, dst)
        print(f"{src} -> {dst}  (rows={rows}, cols={cols})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
