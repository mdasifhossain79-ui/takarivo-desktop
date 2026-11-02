/* ==========================================================================
   Takarivo — netlify/functions/budgets.js
   Purpose: CRUD for the logged-in user's budgets. "Spent" is calculated
   from expense transactions in the same category within the budget's date
   range, so it always matches real data. Remaining, progress and status
   are also calculated here (one place only).
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateBudget(body) {
    const category = (body.category || "").trim();
    const budgetAmount = Number(body.budgetAmount);
    const startDate = (body.startDate || "").trim();
    const endDate = (body.endDate || "").trim();

    if (!category) return { error: "Category is required." };
    if (!(budgetAmount > 0)) return { error: "Budget amount must be greater than 0." };
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
        return { error: "Start and end dates must be in YYYY-MM-DD format." };
    }
    if (endDate < startDate) return { error: "End date cannot be before the start date." };

    return { value: { category, budgetAmount, startDate, endDate } };
}

// Status thresholds: <70 on-track, 70-89 near-limit, 90-100 critical, >100 over-budget
function determineStatus(progress) {
    if (progress > 100) return "over-budget";
    if (progress >= 90) return "critical";
    if (progress >= 70) return "near-limit";
    return "on-track";
}

function toClient(row) {
    const budgetAmount = Number(row.budget_amount);
    const spentAmount = Number(row.spent);
    const progress = Math.round((spentAmount / budgetAmount) * 10000) / 100;

    return {
        id: row.id,
        category: row.category,
        budgetAmount,
        spentAmount,
        remaining: budgetAmount - spentAmount,
        progress,
        status: determineStatus(progress),
        startDate: row.start_date,
        endDate: row.end_date,
    };
}

const LIST_SQL = `
    SELECT b.id, b.category, b.budget_amount,
           DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
           DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
           COALESCE((
               SELECT SUM(t.amount) FROM transactions t
               WHERE t.user_id = b.user_id
                 AND t.transaction_type = 'expense'
                 AND t.category = b.category
                 AND t.transaction_date BETWEEN b.start_date AND b.end_date
           ), 0) AS spent
    FROM budgets b
    WHERE b.user_id = ?
`;

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const id = event.queryStringParameters && event.queryStringParameters.id;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query(LIST_SQL + " ORDER BY b.end_date DESC, b.created_at DESC", [userId]);
            return success(rows.map(toClient));
        }

        if (event.httpMethod === "POST") {
            const parsed = validateBudget(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const newId = crypto.randomUUID();
            const { category, budgetAmount, startDate, endDate } = parsed.value;
            await pool.query(
                "INSERT INTO budgets (id, user_id, category, budget_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
                [newId, userId, category, budgetAmount, startDate, endDate]
            );
            return success({ id: newId }, "Budget created.", 201);
        }

        if (event.httpMethod === "PUT") {
            if (!id) return error("Budget id is required.", 400);
            const parsed = validateBudget(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const { category, budgetAmount, startDate, endDate } = parsed.value;
            const [result] = await pool.query(
                "UPDATE budgets SET category = ?, budget_amount = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?",
                [category, budgetAmount, startDate, endDate, id, userId]
            );
            if (result.affectedRows === 0) return error("Budget not found.", 404);
            return success({ id }, "Budget updated.");
        }

        if (event.httpMethod === "DELETE") {
            if (!id) return error("Budget id is required.", 400);
            const [result] = await pool.query("DELETE FROM budgets WHERE id = ? AND user_id = ?", [id, userId]);
            if (result.affectedRows === 0) return error("Budget not found.", 404);
            return success(null, "Budget deleted.");
        }

        return error("Method not allowed", 405);
    } catch (err) {
        return error(err.message, 500);
    }
};
