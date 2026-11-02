/* ==========================================================================
   Takarivo — netlify/functions/cards-expense.js
   Purpose: Records a purchase on a credit card. Raises the card's due
   amount and saves an expense transaction (linked to the card) so it
   shows up in history, budgets and reports. Blocked if it would exceed
   the credit limit. Runs in one DB transaction.
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");
const { httpError } = require("./utils/httpError");

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);
    if (event.httpMethod !== "POST") return error("Method not allowed", 405);

    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch (err) {
        return error("Invalid request body.", 400);
    }

    const cardId = (body.cardId || "").trim();
    const date = (body.date || "").trim();
    const description = (body.description || "").trim();
    const category = (body.category || "").trim();
    const amount = Number(body.amount);

    if (!cardId) return error("Card is required.", 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return error("Date must be in YYYY-MM-DD format.", 400);
    if (!description) return error("Description is required.", 400);
    if (!category) return error("Category is required.", 400);
    if (!(amount > 0)) return error("Amount must be greater than 0.", 400);

    const conn = await getPool().getConnection();
    try {
        await conn.beginTransaction();

        const [cards] = await conn.query(
            "SELECT credit_limit, due_amount FROM cards WHERE id = ? AND user_id = ? FOR UPDATE",
            [cardId, userId]
        );
        if (cards.length === 0) throw httpError("Card not found.", 404);

        const limit = Number(cards[0].credit_limit);
        const due = Number(cards[0].due_amount);
        if (due + amount > limit) {
            throw httpError(`This exceeds your available credit (৳${(limit - due).toLocaleString("en-US")} left).`, 400);
        }

        await conn.query(
            "UPDATE cards SET due_amount = due_amount + ? WHERE id = ? AND user_id = ?",
            [amount, cardId, userId]
        );

        const txnId = crypto.randomUUID();
        await conn.query(
            `INSERT INTO transactions
             (id, user_id, account_id, card_id, transaction_date, description, category, transaction_type, amount)
             VALUES (?, ?, NULL, ?, ?, ?, ?, 'expense', ?)`,
            [txnId, userId, cardId, date, description, category, amount]
        );

        await conn.commit();
        return success({ id: txnId }, "Card expense recorded.", 201);
    } catch (err) {
        await conn.rollback();
        return error(err.message, err.statusCode || 500);
    } finally {
        conn.release();
    }
};
