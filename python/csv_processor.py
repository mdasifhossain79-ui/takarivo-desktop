"""
Takarivo — python/csv_processor.py

Purpose: Reads and writes transaction data as CSV, for importing bank
exports or exporting a report to a spreadsheet-friendly format.
Standalone — no web server, no database connection. Uses only the
Python standard library (csv, pathlib).

Usage (as a script):
    python csv_processor.py

Usage (as a module):
    from csv_processor import read_transactions_csv, write_summary_csv
"""

from __future__ import annotations
import csv
from pathlib import Path
from typing import Any

from financial_utils import calculate_monthly_summary

REQUIRED_COLUMNS = {
    "date",
    "description",
    "category",
    "transaction_type",
    "amount",
}


def read_transactions_csv(
    file_path: str | Path,
) -> list[dict[str, Any]]:
    """
    Reads a transactions CSV file and returns a list of dicts.

    Required columns (header row): date, description, category,
    transaction_type, amount. Optional: merchant, account, notes.

    Raises ValueError if a required column is missing or a row is
    invalid, so bad input fails loudly instead of producing wrong totals.
    """
    file_path = Path(file_path)
    transactions: list[dict[str, Any]] = []

    with file_path.open("r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        if reader.fieldnames is None:
            raise ValueError(f"{file_path} appears to be empty.")

        missing = REQUIRED_COLUMNS - set(reader.fieldnames)
        if missing:
            raise ValueError(
                f"{file_path} is missing required column(s): "
                f"{', '.join(sorted(missing))}"
            )

        for row_number, row in enumerate(reader, start=2):
            try:
                amount = float(row["amount"])
            except (TypeError, ValueError):
                raise ValueError(
                    f"Row {row_number}: invalid amount "
                    f"'{row.get('amount')}'."
                )

            transaction_type = (
                row.get("transaction_type") or ""
            ).strip().lower()
            if transaction_type not in {"income", "expense", "transfer"}:
                raise ValueError(
                    f"Row {row_number}: transaction_type must be "
                    "income, expense, or transfer "
                    f"(got '{row.get('transaction_type')}')."
                )

            transactions.append(
                {
                    "date": (row.get("date") or "").strip(),
                    "description": (row.get("description") or "").strip(),
                    "merchant": (row.get("merchant") or "").strip() or None,
                    "category": (row.get("category") or "").strip(),
                    "account": (row.get("account") or "").strip() or None,
                    "transaction_type": transaction_type,
                    "amount": amount,
                    "notes": (row.get("notes") or "").strip() or None,
                }
            )

    return transactions


def write_transactions_csv(
    transactions: list[dict[str, Any]],
    file_path: str | Path,
) -> None:
    """
    Writes transactions to a CSV file in the same column format
    read_transactions_csv() expects, so a written file can be read back.
    """
    file_path = Path(file_path)
    fieldnames = [
        "date",
        "description",
        "merchant",
        "category",
        "account",
        "transaction_type",
        "amount",
        "notes",
    ]

    with file_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for txn in transactions:
            writer.writerow({key: txn.get(key) or "" for key in fieldnames})


def write_summary_csv(
    transactions: list[dict[str, Any]],
    file_path: str | Path,
) -> None:
    """
    Writes a single-row CSV summary (total_income, total_expenses,
    net_savings, transaction_count).
    """
    file_path = Path(file_path)
    summary = calculate_monthly_summary(transactions)

    with file_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "total_income",
                "total_expenses",
                "net_savings",
                "transaction_count",
            ],
        )
        writer.writeheader()
        writer.writerow(summary)


if __name__ == "__main__":
    # Demo run: write a sample transactions CSV, read it back, and write a
    # summary CSV, so you can see it work without needing a real export.
    demo_transactions = [
        {
            "date": "2026-10-01",
            "description": "Salary Deposit",
            "merchant": None,
            "category": "Salary",
            "account": "Main Account",
            "transaction_type": "income",
            "amount": 68500,
            "notes": None,
        },
        {
            "date": "2026-10-03",
            "description": "Grocery Store",
            "merchant": "Shwapno",
            "category": "Food",
            "account": "Main Account",
            "transaction_type": "expense",
            "amount": 2450,
            "notes": None,
        },
        {
            "date": "2026-10-05",
            "description": "Electricity Bill",
            "merchant": None,
            "category": "Utilities",
            "account": "Main Account",
            "transaction_type": "expense",
            "amount": 1800,
            "notes": None,
        },
    ]

    sample_path = Path("sample_transactions.csv")
    summary_path = Path("sample_summary.csv")

    write_transactions_csv(demo_transactions, sample_path)
    loaded = read_transactions_csv(sample_path)
    write_summary_csv(loaded, summary_path)

    print(f"Wrote {sample_path} ({len(loaded)} transactions)")
    print(f"Wrote {summary_path}")
