"""Administrative helper CLI for Orbsurv backend data."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List

from server import OrbsurvRequestHandler

DATASETS = {
    "interest": "/api/interest",
    "pilot": "/api/pilot",
    "waitlist": "/api/waitlist",
    "contact": "/api/contact",
    "users": "users",
}


def get_store(dataset: str):
    try:
        target = DATASETS[dataset]
    except KeyError as exc:  # pragma: no cover - argparse should guard
        raise ValueError(f"Unknown dataset '{dataset}'.") from exc
    if target == "users":
        return OrbsurvRequestHandler.user_store
    return OrbsurvRequestHandler.stores[target]


def iter_dataset_names(selected: Iterable[str] | None) -> Iterable[str]:
    if selected:
        for name in selected:
            if name not in DATASETS:
                raise ValueError(f"Unknown dataset '{name}'. Valid options: {', '.join(sorted(DATASETS))}.")
            yield name
    else:
        yield from DATASETS.keys()


def list_command(datasets: List[str], limit: int | None, pretty: bool) -> None:
    for idx, dataset in enumerate(iter_dataset_names(datasets)):
        store = get_store(dataset)
        records = store.all()
        if limit:
            records = records[-limit:]

        if idx:
            print()  # blank line between datasets
        print(f"# {dataset} ({len(records)} entries)")

        if pretty:
            print(json.dumps(records, ensure_ascii=False, indent=2))
        else:
            for record in records:
                print(json.dumps(record, ensure_ascii=False))


def export_command(dataset: str, destination: Path, fmt: str) -> None:
    store = get_store(dataset)
    records = store.all()
    destination.parent.mkdir(parents=True, exist_ok=True)

    if fmt == "json":
        destination.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {len(records)} records to {destination}")
        return

    if fmt == "csv":
        if not records:
            destination.write_text("", encoding="utf-8")
            print(f"No records found. Created empty file at {destination}")
            return
        headers = sorted({key for record in records for key in record.keys()})
        with destination.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=headers)
            writer.writeheader()
            writer.writerows(records)
        print(f"Wrote {len(records)} records to {destination}")
        return

    raise ValueError(f"Unsupported export format '{fmt}'.")


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect or export Orbsurv form submissions.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="Print records to stdout")
    list_parser.add_argument("datasets", nargs="*", help="Datasets to show (default: all)")
    list_parser.add_argument("--limit", type=int, default=None, help="Limit to the most recent N records")
    list_parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")

    export_parser = subparsers.add_parser("export", help="Export a dataset to JSON or CSV")
    export_parser.add_argument("dataset", choices=sorted(DATASETS), help="Dataset to export")
    export_parser.add_argument("destination", type=Path, help="File path to write")
    export_parser.add_argument("--format", choices=["json", "csv"], default="json", help="Output format")

    return parser.parse_args(argv)


def main(argv: List[str] | None = None) -> None:
    args = parse_args(argv or sys.argv[1:])

    try:
        if args.command == "list":
            list_command(args.datasets, args.limit, args.pretty)
        elif args.command == "export":
            export_command(args.dataset, args.destination, args.format)
        else:  # pragma: no cover - argparse guards this path
            raise ValueError(f"Unsupported command '{args.command}'")
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
