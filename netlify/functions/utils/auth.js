/* ==========================================================================
   Takarivo — netlify/functions/utils/auth.js
   Purpose: Password hashing + JWT helpers used by every auth-related
   function, and by authenticate() to protect the data APIs later.
   ========================================================================== */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;

async function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
}

function generateToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing in your .env file. Add it and restart netlify dev.");
    }
    return jwt.sign(
        { sub: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

/**
 * Reads the Bearer token from the request, verifies it, and returns the
 * logged-in user's id — or null if missing/invalid. Every protected API
 * (accounts, transactions, cards, budgets, goals) will call this and use
 * the returned id in a WHERE user_id = ? clause, since MySQL has no RLS
 * to do that automatically.
 */
function getUserIdFromRequest(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    if (!process.env.JWT_SECRET) {
        console.error("[Takarivo] JWT_SECRET is missing in .env, so no one can stay logged in.");
        return null;
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return payload.sub;
    } catch (err) {
        return null;
    }
}

module.exports = { hashPassword, verifyPassword, generateToken, getUserIdFromRequest };
