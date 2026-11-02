/* ==========================================================================
   Takarivo — netlify/functions/utils/mysqlClient.js
   Purpose: Connection pool for MySQL database queries using mysql2/promise.
   Accepts both MYSQL_* and MySQL_* variable names.
   ========================================================================== */

const mysql = require("mysql2/promise");

let pool;

// Return the first non-empty env value found under any of the given names
function readEnv(...names) {
    for (const name of names) {
        const value = process.env[name];
        if (value !== undefined && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return undefined;
}

function getPool() {
    if (!pool) {
        const config = {
            host: readEnv("MYSQL_HOST", "MySQL_HOST") || "localhost",
            port: Number(readEnv("MYSQL_PORT", "MySQL_PORT")) || 3306,
            user: readEnv("MYSQL_USER", "MySQL_USER"),
            password: readEnv("MYSQL_PASSWORD", "MySQL_PASSWORD") || "",
            database: readEnv("MYSQL_DATABASE", "MySQL_DATABASE", "MYSQL_NAME", "MySQL_NAME"),
        };

        const missing = [];
        if (!config.user) missing.push("MYSQL_USER");
        if (!config.database) missing.push("MYSQL_DATABASE");
        if (missing.length > 0) {
            throw new Error(`[Takarivo] Missing in .env: ${missing.join(", ")}`);
        }

        pool = mysql.createPool({
            ...config,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}

module.exports = { getPool };
