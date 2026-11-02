/* ==========================================================================
   Takarivo — netlify/functions/summary.js
   Purpose: One read-only endpoint that feeds the Dashboard and Reports.
     GET /summary?month=YYYY-MM
   Returns, for the logged-in user only:
     - totalBalance (sum of ACTIVE accounts)
     - income / expenses / netSavings for the chosen month
     - monthly: the last 6 months ending at the chosen month
     - categories: expense totals per category for the chosen month
     - recent: the 5 latest transactions
   Transfers (e.g. card payments) are excluded from income/expenses.
   ========================================================================== */

const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// ["2026-05", ..., "2026-10"] — `count` months ending at `month`
function monthsEndingAt(month, count) {
    const [year, mon] = month.split("-").map(Number);
    const months = [];
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(year, mon - 1 - i, 1));
        months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    return months;
}

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);
    if (event.httpMethod !== "GET") return error("Method not allowed", 405);

    const month = (event.queryStringParameters || {}).month || "";
    if (!MONTH_PATTERN.test(month)) return error("Month must be in YYYY-MM format.", 400);

    const pool = getPool();

    try {
        const months = monthsEndingAt(month, 6);
        const rangeStart = `${months[0]}-01`;
        const selectedFirstDay = `${month}-01`;

        const [[balanceRow]] = await pool.query(
            "SELECT COALESCE(SUM(balance), 0) AS total FROM accounts WHERE user_id = ? AND status = 'active'",
            [userId]
        );

        const [[cardRow]] = await pool.query(
            "SELECT COALESCE(SUM(due_amount), 0) AS totalDue, COALESCE(SUM(available_balance), 0) AS totalAvailable FROM cards WHERE user_id = ?",
            [userId]
        );

        const totalAccountBalance = Number(balanceRow.total);
        const totalCardDue = Number(cardRow.totalDue);
        const totalCardAvailable = Number(cardRow.totalAvailable);
        const netBalance = totalAccountBalance - totalCardDue;

        // Income/expense totals per month, for the 6-month window
        const [monthlyRows] = await pool.query(
            `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS ym, transaction_type, SUM(amount) AS total
             FROM transactions
             WHERE user_id = ?
               AND transaction_type IN ('income', 'expense')
               AND transaction_date >= ?
               AND transaction_date < DATE_ADD(?, INTERVAL 1 MONTH)
             GROUP BY ym, transaction_type`,
            [userId, rangeStart, selectedFirstDay]
        );

        const byMonth = {};
        months.forEach(m => { byMonth[m] = { income: 0, expenses: 0 }; });
        monthlyRows.forEach(row => {
            const key = row.transaction_type === "income" ? "income" : "expenses";
            byMonth[row.ym][key] = Number(row.total);
        });

        const [categoryRows] = await pool.query(
            `SELECT category, SUM(amount) AS total
             FROM transactions
             WHERE user_id = ?
               AND transaction_type = 'expense'
               AND transaction_date >= ?
               AND transaction_date < DATE_ADD(?, INTERVAL 1 MONTH)
             GROUP BY category
             ORDER BY total DESC`,
            [userId, selectedFirstDay, selectedFirstDay]
        );

        const [recentRows] = await pool.query(
            `SELECT id, DATE_FORMAT(transaction_date, '%Y-%m-%d') AS transaction_date,
                    description, category, transaction_type, amount
             FROM transactions
             WHERE user_id = ?
             ORDER BY transaction_date DESC, created_at DESC
             LIMIT 5`,
            [userId]
        );

        const income = byMonth[month].income;
        const expenses = byMonth[month].expenses;

        return success({
            month,
            totalBalance: totalAccountBalance,
            cardDue: totalCardDue,
            cardAvailable: totalCardAvailable,
            netBalance,
            income,
            expenses,
            netSavings: income - expenses,
            monthly: {
                months,
                income: months.map(m => byMonth[m].income),
                expenses: months.map(m => byMonth[m].expenses),
                netSavings: months.map(m => byMonth[m].income - byMonth[m].expenses),
            },
            categories: categoryRows.map(r => ({ category: r.category, total: Number(r.total) })),
            recent: recentRows.map(r => ({
                id: r.id,
                date: r.transaction_date,
                description: r.description,
                category: r.category,
                type: r.transaction_type,
                amount: Number(r.amount),
            })),
        });
    } catch (err) {
        return error(err.message, 500);
    }
};
