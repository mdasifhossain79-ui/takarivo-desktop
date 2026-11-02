/* ==========================================================================
   Takarivo — netlify/functions/cards.js
   Purpose: CRUD for the logged-in user's credit cards.
     GET    /cards            -> list (with utilization + available credit)
     POST   /cards            -> create
     PUT    /cards?id=...     -> update
     DELETE /cards?id=...     -> delete
   available_balance is a MySQL generated column (credit_limit - due_amount),
   so it is never written here, only read. Every query filters by user_id.
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

function validateCard(body) {
    const cardName = (body.cardName || "").trim();
    const creditLimit = Number(body.creditLimit);
    const dueAmount = body.dueAmount === "" || body.dueAmount === undefined ? 0 : Number(body.dueAmount);

    if (!cardName) return { error: "Card name is required." };
    if (!(creditLimit > 0)) return { error: "Credit limit must be greater than 0." };
    if (Number.isNaN(dueAmount) || dueAmount < 0) return { error: "Due amount cannot be negative." };

    return { value: { cardName, creditLimit, dueAmount } };
}

// Utilization (%) = Due Amount / Credit Limit x 100 (calculated here only)
function calculateUtilization(dueAmount, creditLimit) {
    if (!creditLimit || creditLimit <= 0) return 0;
    return Math.round((dueAmount / creditLimit) * 10000) / 100;
}

function toClient(row) {
    const creditLimit = Number(row.credit_limit);
    const dueAmount = Number(row.due_amount);
    return {
        id: row.id,
        cardName: row.card_name,
        creditLimit,
        dueAmount,
        availableBalance: Number(row.available_balance),
        utilization: calculateUtilization(dueAmount, creditLimit),
    };
}

const SELECT_COLUMNS = "id, card_name, credit_limit, due_amount, available_balance";

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const id = event.queryStringParameters && event.queryStringParameters.id;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query(
                `SELECT ${SELECT_COLUMNS} FROM cards WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );
            return success(rows.map(toClient));
        }

        if (event.httpMethod === "POST") {
            const parsed = validateCard(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const newId = crypto.randomUUID();
            const { cardName, creditLimit, dueAmount } = parsed.value;

            await pool.query(
                "INSERT INTO cards (id, user_id, card_name, credit_limit, due_amount) VALUES (?, ?, ?, ?, ?)",
                [newId, userId, cardName, creditLimit, dueAmount]
            );

            const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM cards WHERE id = ? AND user_id = ?`, [newId, userId]);
            return success(toClient(rows[0]), "Card created.", 201);
        }

        if (event.httpMethod === "PUT") {
            if (!id) return error("Card id is required.", 400);
            const parsed = validateCard(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const { cardName, creditLimit, dueAmount } = parsed.value;
            const [result] = await pool.query(
                "UPDATE cards SET card_name = ?, credit_limit = ?, due_amount = ? WHERE id = ? AND user_id = ?",
                [cardName, creditLimit, dueAmount, id, userId]
            );
            if (result.affectedRows === 0) return error("Card not found.", 404);

            const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM cards WHERE id = ? AND user_id = ?`, [id, userId]);
            return success(toClient(rows[0]), "Card updated.");
        }

        if (event.httpMethod === "DELETE") {
            if (!id) return error("Card id is required.", 400);
            const [result] = await pool.query("DELETE FROM cards WHERE id = ? AND user_id = ?", [id, userId]);
            if (result.affectedRows === 0) return error("Card not found.", 404);
            return success(null, "Card deleted.");
        }

        return error("Method not allowed", 405);
    } catch (err) {
        return error(err.message, 500);
    }
};
