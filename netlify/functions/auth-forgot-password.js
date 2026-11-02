/* ==========================================================================
   Takarivo — netlify/functions/auth-forgot-password.js
   Purpose: Generates a reset token for the given email and returns it
   directly in the response (offline app — no email server to send it
   through). The token expires in 1 hour.
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { success, error } = require("./utils/response");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return error("Method not allowed", 405);
    }

    try {
        const { email } = JSON.parse(event.body);
        if (!email) return error("Email is required.", 400);

        const pool = getPool();
        const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

        // Always respond success-looking, even if the email doesn't exist,
        // so this endpoint can't be used to find out who has an account.
        if (users.length === 0) {
            return success({ token: null }, "If that email exists, a reset token has been generated.");
        }

        const userId = users[0].id;
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
            "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
            [userId, token, expiresAt]
        );

        return success({ token }, "Reset token generated. Copy it into the Reset Password page.");
    } catch (err) {
        return error(err.message, 500);
    }
};