/* ==========================================================================
   Takarivo — netlify/functions/export-csv.js  (Part 37)
   Purpose: Returns all of the user's transactions as a CSV download.
   ========================================================================== */
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { error } = require("./utils/response");

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") return error("Method not allowed", 405);

    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    try {
        const pool = getPool();
        const [rows] = await pool.query(
            `SELECT t.transaction_date, t.description, t.category,
                    t.transaction_type, t.amount,
                    COALESCE(a.name, c.card_name) AS source_name
             FROM transactions t
             LEFT JOIN accounts a ON t.account_id = a.id
             LEFT JOIN cards    c ON t.card_id    = c.id
             WHERE t.user_id = ?
             ORDER BY t.transaction_date DESC, t.created_at DESC`,
            [userId]
        );

        const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = ["Date", "Description", "Category", "Type", "Amount", "Account"].join(",");
        const lines = rows.map(r =>
            [r.transaction_date, r.description, r.category,
             r.transaction_type, r.amount, r.source_name].map(escape).join(",")
        );

        const csv = [header, ...lines].join("\r\n");
        const date = new Date().toISOString().slice(0, 10);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="takarivo-transactions-${date}.csv"`,
            },
            body: csv,
        };
    } catch (err) {
        return error(err.message, 500);
    }
};
