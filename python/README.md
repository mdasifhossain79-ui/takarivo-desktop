# Takarivo — Python utilities

Small standalone scripts. They are NOT part of the web app: no server, no
database, nothing to install (Python standard library only).

Run them from inside the `python` folder:

    cd python

| Script                | What it does                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `financial_utils.py`  | The app's formulas (net savings, utilization, budget/goal progress and status), importable from other scripts.                   |
| `csv_processor.py`    | Reads/writes transactions as CSV. `python csv_processor.py` creates `sample_transactions.csv` and `sample_summary.csv`.          |
| `report_generator.py` | Builds a text report. `python report_generator.py` uses sample data; `python report_generator.py my_file.csv` uses your own CSV. |

## CSV format

Header row: `date,description,category,transaction_type,amount`
(optional: `merchant,account,notes`). `transaction_type` must be
`income`, `expense` or `transfer`. Dates look like `2026-10-25`.
