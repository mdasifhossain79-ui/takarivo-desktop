/* ==========================================================================
   Takarivo — netlify/functions/auth-login.js
   Purpose: Verifies email + password against MySQL and returns a JWT.
   ========================================================================== */

const { getPool } = require("./utils/mysqlClient");
const { verifyPassword, generateToken } = require("./utils/auth");
const { success, error } = require("./utils/response");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return error("Method not allowed", 405);
    }

    try {
             const body = JSON.parse(event.body || "{}");
        const email = (body.email || "").trim();
        const password = body.password;

        if (!email || !password) {
            return error("Email and password are required.", 400);
        }

        const pool = getPool();
        const [rows] = await pool.query(
            "SELECT id, full_name, email, password_hash FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return error("Invalid email or password.", 401);
        }

        const user = rows[0];
        const passwordMatches = await verifyPassword(password, user.password_hash);

        if (!passwordMatches) {
            return error("Invalid email or password.", 401);
        }

        const token = generateToken(user);

        return success({ token, user: { id: user.id, fullName: user.full_name, email: user.email } }, "Signed in.");
    } catch (err) {
        return error(err.message, 500);
    }
};
