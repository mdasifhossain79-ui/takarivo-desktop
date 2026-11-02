/* ==========================================================================
   Takarivo — netlify/functions/auth-register.js
   Purpose: Creates a new user — hashes the password, inserts into MySQL,
   and returns a JWT so the user is logged in immediately after signup.
   ========================================================================== */

const { getPool } = require("./utils/mysqlClient");
const { hashPassword, generateToken } = require("./utils/auth");
const { success, error } = require("./utils/response");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return error("Method not allowed", 405);
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const fullName = (body.fullName || "").trim();
        const email = (body.email || "").trim();
        const password = body.password;

        if (!fullName || !email || !password) {
            return error("Full name, email, and password are required.", 400);
        }
        if (password.length < 8) {
            return error("Password must be at least 8 characters.", 400);
        }

        const pool = getPool();

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return error("An account with this email already exists.", 409);
        }

        const passwordHash = await hashPassword(password);

        await pool.query(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            [fullName, email, passwordHash]
        );

        const [rows] = await pool.query("SELECT id, full_name, email FROM users WHERE email = ?", [email]);
        const user = rows[0];
        const token = generateToken(user);

        return success({ token, user: { id: user.id, fullName: user.full_name, email: user.email } }, "Account created.");
    } catch (err) {
        return error(err.message, 500);
    }
};
