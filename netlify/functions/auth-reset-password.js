/* ==========================================================================
   Takarivo — netlify/functions/auth-reset-password.js
   Purpose: Verifies a reset token and sets the new password.
   ========================================================================== */

const { getPool } = require("./utils/mysqlClient");
const { hashPassword } = require("./utils/auth");
const { success, error } = require("./utils/response");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return error("Method not allowed", 405);
    }

    try {
        const { token, newPassword } = JSON.parse(event.body);

        if (!token || !newPassword) return error("Token and new password are required.", 400);
        if (newPassword.length < 8) return error("Password must be at least 8 characters.", 400);

        const pool = getPool();
        const [resets] = await pool.query(
            "SELECT user_id, expires_at FROM password_resets WHERE token = ?",
            [token]
        );

        if (resets.length === 0) {
            return error("Invalid or already-used reset token.", 400);
        }

        const reset = resets[0];
        if (new Date(reset.expires_at) < new Date()) {
            return error("This reset token has expired. Request a new one.", 400);
        }

        const passwordHash = await hashPassword(newPassword);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, reset.user_id]);

        // One-time use — delete it so it can't be replayed
        await pool.query("DELETE FROM password_resets WHERE token = ?", [token]);

        return success(null, "Password updated. You can now sign in.");
    } catch (err) {
        return error(err.message, 500);
    }
};