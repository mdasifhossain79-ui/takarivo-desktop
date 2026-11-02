/* ==========================================================================
   Takarivo — netlify/functions/transactions.js
   Purpose: CRUD for the logged-in user's transactions, keeping the linked
   account's balance in sync (income +, expense -, transfer 0).
   Every query filters by user_id. Writes run inside a DB transaction so a
   failure never leaves a transaction saved but the balance unchanged.
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

const VALID_TYPES = ["income", "expense", "transfer"];

const SELECT_SQL = `
    SELECT t.id, t.account_id, t.card_id, t.transaction_date, t.description,
           t.category, t.transaction_type, t.amount,
           COALESCE(a.name, c.card_name) AS source_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN cards    c ON t.card_id    = c.id
`;

function balanceDelta(type, amount) {
    if (type === "income") return amount;
    if (type === "expense") return -amount;
    return 0;
}

function validateTransaction(body) {
    const accountId = (body.accountId || "").trim();
    const date = (body.date || "").trim();
    const description = (body.description || "").trim();
    const category = (body.category || "").trim();
    const type = body.type;
    const amount = Number(body.amount);

    if (!accountId) return { error: "Account is required." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date must be in YYYY-MM-DD format." };
    if (!description) return { error: "Description is required." };
    if (!category) return { error: "Category is required." };
    if (!VALID_TYPES.includes(type)) return { error: "Type must be income, expense, or transfer." };
    if (!(amount > 0)) return { error: "Amount must be greater than 0." };

    return { value: { accountId, date, description, category, type, amount } };
}

function toClient(row) {
    return {
        id: row.id,
        accountId: row.account_id,
        cardId: row.card_id,
        accountName: row.card_id ? `${row.source_name} (card)` : row.source_name,
        date: row.transaction_date,
        description: row.description,
        category: row.category,
        type: row.transaction_type,
        amount: Number(row.amount),
    };
}



// Throws a tagged error so the handler can return a clean 4xx
function httpError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

async function assertOwnsAccount(conn, accountId, userId) {
    const [rows] = await conn.query(
        "SELECT id FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE",
        [accountId, userId]
    );
    if (rows.length === 0) throw httpError("Account not found.", 404);
}

async function adjustBalance(conn, accountId, userId, delta) {
    if (delta === 0) return;
    await conn.query(
        "UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?",
        [delta, accountId, userId]
    );
}

async function getOwnedTransaction(conn, id, userId) {
    const [rows] = await conn.query(
        "SELECT id, account_id, card_id, transaction_type, amount FROM transactions WHERE id = ? AND user_id = ? FOR UPDATE",
        [id, userId]
    );
    if (rows.length === 0) throw httpError("Transaction not found.", 404);
    if (rows[0].card_id) {
        throw httpError("Card expenses are managed from the Cards page.", 400);
    }
    return rows[0];
}

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const id = event.queryStringParameters && event.queryStringParameters.id;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query(
                SELECT_SQL + " WHERE t.user_id = ? ORDER BY t.transaction_date DESC, t.created_at DESC",
                [userId]
            );
            return success(rows.map(toClient));
        }

        if (!["POST", "PUT", "DELETE"].includes(event.httpMethod)) {
            return error("Method not allowed", 405);
        }
        if (event.httpMethod !== "POST" && !id) {
            return error("Transaction id is required.", 400);
        }

        let input = null;
        if (event.httpMethod !== "DELETE") {
            const parsed = validateTransaction(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);
            input = parsed.value;
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            if (event.httpMethod === "POST") {
                await assertOwnsAccount(conn, input.accountId, userId);
                const newId = crypto.randomUUID();
                await conn.query(
                    `INSERT INTO transactions
                     (id, user_id, account_id, transaction_date, description, category, transaction_type, amount)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newId, userId, input.accountId, input.date, input.description, input.category, input.type, input.amount]
                );
                await adjustBalance(conn, input.accountId, userId, balanceDelta(input.type, input.amount));
                await conn.commit();
                return success({ id: newId }, "Transaction added.", 201);
            }

            if (event.httpMethod === "PUT") {
                const old = await getOwnedTransaction(conn, id, userId);
                await assertOwnsAccount(conn, input.accountId, userId);

                // Undo the old effect, then apply the new one
                await adjustBalance(conn, old.account_id, userId, -balanceDelta(old.transaction_type, Number(old.amount)));
                await adjustBalance(conn, input.accountId, userId, balanceDelta(input.type, input.amount));

                await conn.query(
                    `UPDATE transactions
                     SET account_id = ?, transaction_date = ?, description = ?, category = ?, transaction_type = ?, amount = ?
                     WHERE id = ? AND user_id = ?`,
                    [input.accountId, input.date, input.description, input.category, input.type, input.amount, id, userId]
                );
                await conn.commit();
                return success({ id }, "Transaction updated.");
            }

            // DELETE
            const old = await getOwnedTransaction(conn, id, userId);
            await adjustBalance(conn, old.account_id, userId, -balanceDelta(old.transaction_type, Number(old.amount)));
            await conn.query("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, userId]);
            await conn.commit();
            return success(null, "Transaction deleted.");
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (err) {
        return error(err.message, err.statusCode || 500);
    }
};
