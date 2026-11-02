/* ==========================================================================
   Takarivo — netlify/functions/profile.js
   Purpose: Settings page backend for the logged-in user.
     GET                       -> name + email
     PUT                       -> update full name
     POST ?action=password     -> change password (needs current password)
   NOTE: wrong-current-password returns 400, not 401, because the frontend
   treats 401 as "session expired" and logs the user out.
   ========================================================================== */

const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest, hashPassword, verifyPassword } = require("./utils/auth");
const { success, error } = require("./utils/response");

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const action = (event.queryStringParameters || {}).action;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query("SELECT full_name, email FROM users WHERE id = ?", [userId]);
            if (rows.length === 0) return error("User not found.", 404);
            return success({ fullName: rows[0].full_name, email: rows[0].email });
        }

        if (event.httpMethod === "PUT") {
            const fullName = (JSON.parse(event.body || "{}").fullName || "").trim();
            if (!fullName) return error("Full name is required.", 400);
            if (fullName.length > 150) return error("Full name is too long (max 150 characters).", 400);

            await pool.query("UPDATE users SET full_name = ? WHERE id = ?", [fullName, userId]);
            return success({ fullName }, "Profile updated.");
        }

        if (event.httpMethod === "POST" && action === "password") {
            const { currentPassword, newPassword } = JSON.parse(event.body || "{}");
            if (!currentPassword || !newPassword) return error("Current and new password are required.", 400);
            if (newPassword.length < 8) return error("New password must be at least 8 characters.", 400);

            const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
            if (rows.length === 0) return error("User not found.", 404);

            const matches = await verifyPassword(currentPassword, rows[0].password_hash);
            if (!matches) return error("Current password is incorrect.", 400);

            const newHash = await hashPassword(newPassword);
            await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
            return success(null, "Password changed.");
        }

        return error("Method not allowed", 405);
    } catch (err) {
        return error(err.message, 500);
    }
};
