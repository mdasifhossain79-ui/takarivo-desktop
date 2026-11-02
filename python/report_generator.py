"""
Takarivo — python/report_generator.py

Purpose: Builds a plain-text financial report (summary, spending by
category, budget status, goal status) from a transactions CSV. Standalone:
no web server, no database. Standard library only.

Usage:
    python report_generator.py                       (uses sample data)
    python report_generator.py my_transactions.csv   (uses your CSV)

The report is saved as report.txt and printed on screen. Amounts use the
"BDT" prefix so they display correctly in any Windows terminal.
"""

from __future__ import annotations
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from csv_processor import read_transactions_csv
from financial_utils import (
    calculate_monthly_summary,
    calculate_budget_remaining,
    calculate_goal_progress,
    determine_budget_status,
    determine_goal_status,
)

# Example budgets and goals used when you don't supply your own.
DEMO_BUDGETS = [
    {"category": "Food", "budget_amount": 8000},
    {"category": "Utilities", "budget_amount": 3000},
    {"category": "Transport", "budget_amount": 4000},
]

DEMO_GOALS = [
    {"name": "Emergency Fund", "target_amount": 100000, "saved_amount": 62000},
    {"name": "New Laptop", "target_amount": 90000, "saved_amount": 90000},
]

DEMO_TRANSACTIONS = [
    {
        "date": "2026-10-01",
        "description": "Salary Deposit",
        "category": "Salary",
        "transaction_type": "income",
        "amount": 68500,
    },
    {
        "date": "2026-10-03",
        "description": "Grocery Store",
        "category": "Food",
        "transaction_type": "expense",
        "amount": 2450,
    },
    {
        "date": "2026-10-05",
        "description": "Electricity Bill",
        "category": "Utilities",
        "transaction_type": "expense",
        "amount": 1800,
    },
    {
        "date": "2026-10-08",
        "description": "Freelance Payment",
        "category": "Freelance",
        "transaction_type": "income",
        "amount": 15000,
    },
    {
        "date": "2026-10-12",
        "description": "Restaurant",
        "category": "Food",
        "transaction_type": "expense",
        "amount": 1200,
    },
    {
        "date": "2026-10-14",
        "description": "Ride Sharing",
        "category": "Transport",
        "transaction_type": "expense",
        "amount": 4600,
    },
]


def format_currency(amount: float) -> str:
    sign = "-" if amount < 0 else ""
    return f"{sign}BDT {abs(amount):,.2f}"


def calculate_category_totals(
    transactions: list[dict[str, Any]],
) -> dict[str, float]:
    """Total EXPENSES per category, largest first."""
    totals: dict[str, float] = defaultdict(float)
    for txn in transactions:
        if txn.get("transaction_type") == "expense":
            category = txn.get("category") or "Uncategorized"
            totals[category] += float(txn.get("amount", 0) or 0)
    return dict(
        sorted(totals.items(), key=lambda item: item[1], reverse=True)
    )


def generate_text_report(
    transactions: list[dict[str, Any]],
    budgets: list[dict[str, Any]] | None = None,
    goals: list[dict[str, Any]] | None = None,
    title: str = "Takarivo Financial Report",
) -> str:
    """Returns the full report as one string."""
    summary = calculate_monthly_summary(transactions)
    category_totals = calculate_category_totals(transactions)
    # Case-insensitive lookup, same as the app ("food" matches "Food")
    spent_by_category = {
        name.lower(): total for name, total in category_totals.items()
    }

    line = "=" * 60
    thin = "-" * 60
    out: list[str] = [line, title, line, ""]

    out += [
        "SUMMARY",
        thin,
        f"Transactions : {summary['transaction_count']}",
        f"Income       : {format_currency(summary['total_income'])}",
        f"Expenses     : {format_currency(summary['total_expenses'])}",
        f"Net savings  : {format_currency(summary['net_savings'])}",
        "",
    ]

    out += ["SPENDING BY CATEGORY", thin]
    if category_totals:
        total_expenses = summary["total_expenses"] or 1
        for category, total in category_totals.items():
            share = total / total_expenses * 100
            out.append(
                f"{category:<20} {format_currency(total):>18}   "
                f"{share:5.1f}%"
            )
    else:
        out.append("No expenses recorded.")
    out.append("")

    if budgets:
        out += ["BUDGETS", thin]
        for budget in budgets:
            amount = float(budget["budget_amount"])
            spent = spent_by_category.get(budget["category"].lower(), 0.0)
            progress = (spent / amount * 100) if amount > 0 else 0.0
            status = determine_budget_status(progress)
            remaining = calculate_budget_remaining(amount, spent)
            out.append(
                f"{budget['category']:<16} {format_currency(spent)} of "
                f"{format_currency(amount)} ({progress:.0f}%) - "
                f"{status}, {format_currency(remaining)} left"
            )
        out.append("")

    if goals:
        out += ["GOALS", thin]
        for goal in goals:
            saved = float(goal["saved_amount"])
            target = float(goal["target_amount"])
            progress = calculate_goal_progress(saved, target)
            status = determine_goal_status(saved, target)
            out.append(
                f"{goal['name']:<16} {format_currency(saved)} of "
                f"{format_currency(target)} ({progress:.0f}%) - {status}"
            )
        out.append("")

    return "\n".join(out)


def write_report(report_text: str, file_path: str | Path) -> None:
    Path(file_path).write_text(report_text, encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1])
        transactions = read_transactions_csv(csv_path)
        title = f"Takarivo Financial Report ({csv_path.name})"
    else:
        transactions = DEMO_TRANSACTIONS
        title = "Takarivo Financial Report (sample data)"

    report = generate_text_report(
        transactions, DEMO_BUDGETS, DEMO_GOALS, title)
    write_report(report, "report.txt")

    print(report)
    print("Saved to report.txt")
