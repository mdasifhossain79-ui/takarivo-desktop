/* ==========================================================================
   Takarivo — netlify/functions/cards-payment.js
   Purpose: Pays toward a credit card from one of the user's accounts.
   Lowers the card's due amount, lowers the account balance, and saves a
   "transfer" transaction (so it is not counted as spending twice).
   A payment cannot be larger than the amount currently due.
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
    const accountId = (body.accountId || "").trim();
    const date = (body.date || "").trim();
    const amount = Number(body.amount);

    if (!cardId) return error("Card is required.", 400);
    if (!accountId) return error("Account is required.", 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return error("Date must be in YYYY-MM-DD format.", 400);
    if (!(amount > 0)) return error("Amount must be greater than 0.", 400);

    const conn = await getPool().getConnection();
    try {
        await conn.beginTransaction();

        const [cards] = await conn.query(
            "SELECT card_name, due_amount FROM cards WHERE id = ? AND user_id = ? FOR UPDATE",
            [cardId, userId]
        );
        if (cards.length === 0) throw httpError("Card not found.", 404);

        const [accounts] = await conn.query(
            "SELECT id FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE",
            [accountId, userId]
        );
        if (accounts.length === 0) throw httpError("Account not found.", 404);

        const due = Number(cards[0].due_amount);
        if (amount > due) {
            throw httpError(`Payment is more than the amount due (৳${due.toLocaleString("en-US")}).`, 400);
        }

        await conn.query(
            "UPDATE cards SET due_amount = due_amount - ? WHERE id = ? AND user_id = ?",
            [amount, cardId, userId]
        );
        await conn.query(
            "UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?",
            [amount, accountId, userId]
        );

        const txnId = crypto.randomUUID();
        await conn.query(
            `INSERT INTO transactions
             (id, user_id, account_id, card_id, transaction_date, description, category, transaction_type, amount)
             VALUES (?, ?, ?, NULL, ?, ?, 'Card Payment', 'transfer', ?)`,
            [txnId, userId, accountId, date, `Payment to ${cards[0].card_name}`, amount]
        );

        await conn.commit();
        return success({ id: txnId }, "Payment recorded.", 201);
    } catch (err) {
        await conn.rollback();
        return error(err.message, err.statusCode || 500);
    } finally {
        conn.release();
    }
};
