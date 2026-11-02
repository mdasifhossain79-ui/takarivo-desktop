/* ==========================================================================
   Takarivo — netlify/functions/accounts.js
   Purpose: CRUD for the logged-in user's accounts.
     GET    /accounts            -> list
     POST   /accounts            -> create
     PUT    /accounts?id=...     -> update
     DELETE /accounts?id=...     -> delete
   MySQL has no RLS, so EVERY query below filters by user_id.
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

const VALID_STATUSES = ["active", "inactive"];

function validateAccount(body) {
    const name = (body.name || "").trim();
    const accountType = (body.accountType || "").trim();
    const balance = Number(body.balance);
    const status = body.status || "active";

    if (!name) return { error: "Account name is required." };
    if (!accountType) return { error: "Account type is required." };
    if (Number.isNaN(balance)) return { error: "Balance must be a number." };
    if (!VALID_STATUSES.includes(status)) return { error: "Status must be active or inactive." };

    return { value: { name, accountType, balance, status } };
}

function toClient(row) {
    return {
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        balance: Number(row.balance),
        status: row.status,
    };
}

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const id = event.queryStringParameters && event.queryStringParameters.id;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query(
                "SELECT id, name, account_type, balance, status FROM accounts WHERE user_id = ? ORDER BY created_at DESC",
                [userId]
            );
            return success(rows.map(toClient));
        }

        if (event.httpMethod === "POST") {
            const parsed = validateAccount(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const newId = crypto.randomUUID();
            const { name, accountType, balance, status } = parsed.value;

            await pool.query(
                "INSERT INTO accounts (id, user_id, name, account_type, balance, status) VALUES (?, ?, ?, ?, ?, ?)",
                [newId, userId, name, accountType, balance, status]
            );
            return success({ id: newId, name, accountType, balance, status }, "Account created.", 201);
        }

        if (event.httpMethod === "PUT") {
            if (!id) return error("Account id is required.", 400);
            const parsed = validateAccount(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const { name, accountType, balance, status } = parsed.value;
            const [result] = await pool.query(
                "UPDATE accounts SET name = ?, account_type = ?, balance = ?, status = ? WHERE id = ? AND user_id = ?",
                [name, accountType, balance, status, id, userId]
            );

            if (result.affectedRows === 0) return error("Account not found.", 404);
            return success({ id, name, accountType, balance, status }, "Account updated.");
        }

        if (event.httpMethod === "DELETE") {
            if (!id) return error("Account id is required.", 400);

            const [result] = await pool.query(
                "DELETE FROM accounts WHERE id = ? AND user_id = ?",
                [id, userId]
            );

            if (result.affectedRows === 0) return error("Account not found.", 404);
            return success(null, "Account deleted.");
        }

        return error("Method not allowed", 405);
    } catch (err) {
        return error(err.message, 500);
    }
};
