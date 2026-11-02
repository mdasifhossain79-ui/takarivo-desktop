/* ==========================================================================
   Takarivo — netlify/functions/import-csv.js  (Part 37)
   Purpose: Accepts a CSV body (same format as export-csv), parses each row,
   and inserts it as a transaction linked to the matching account name.
   Rows with unknown account names are skipped and reported.
   ========================================================================== */
const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

const VALID_TYPES = ["income", "expense", "transfer"];

function parseCSV(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const rows = [];
    for (let i = 1; i < lines.length; i++) {   // skip header
        const line = lines[i].trim();
        if (!line) continue;
        // Simple CSV split — handles quoted fields with commas
        const fields = [];
        let cur = "", inQuote = false;
        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '"') {
                if (inQuote && line[j + 1] === '"') { cur += '"'; j++; }
                else inQuote = !inQuote;
            } else if (ch === "," && !inQuote) {
                fields.push(cur); cur = "";
            } else {
                cur += ch;
            }
        }
        fields.push(cur);
        rows.push(fields);
    }
    return rows;
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return error("Method not allowed", 405);

    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const csvText = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

    if (!csvText || !csvText.trim()) return error("No CSV data received.", 400);

    const rows = parseCSV(csvText);
    if (rows.length === 0) return error("CSV is empty or has only a header.", 400);

    try {
        const pool = getPool();

        // Build a name→id map for the user's accounts
        const [accs] = await pool.query("SELECT id, name FROM accounts WHERE user_id = ?", [userId]);
        const accountMap = {};
        for (const a of accs) accountMap[a.name.trim().toLowerCase()] = a.id;

        let imported = 0;
        const skipped = [];

        for (const fields of rows) {
            const [date, description, category, type, amountStr, accountName] = fields.map(f => f.trim());

            // Validate
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped.push(`Bad date: ${date}`); continue; }
            if (!VALID_TYPES.includes(type))         { skipped.push(`Bad type: ${type}`); continue; }
            const amount = Number(amountStr);
            if (!(amount > 0))                       { skipped.push(`Bad amount: ${amountStr}`); continue; }
            if (!description)                        { skipped.push(`Empty description on ${date}`); continue; }

            const accountId = accountMap[accountName?.toLowerCase()];
            if (!accountId)                          { skipped.push(`Unknown account "${accountName}" on ${date}`); continue; }

            await pool.query(
                `INSERT IGNORE INTO transactions
                 (id, user_id, account_id, transaction_date, description, category, transaction_type, amount)
                 VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
                [userId, accountId, date, description, category || "Other", type, amount]
            );
            imported++;
        }

        return success({ imported, skipped }, `Imported ${imported} transaction(s).`);
    } catch (err) {
        return error(err.message, 500);
    }
};
