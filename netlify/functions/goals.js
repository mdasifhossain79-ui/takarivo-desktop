/* ==========================================================================
   Takarivo — netlify/functions/goals.js
   Purpose: CRUD for the logged-in user's savings goals, plus contributions.
     GET    /goals                          -> list
     POST   /goals                          -> create
     POST   /goals?id=...&action=contribute -> add savings to a goal
     PUT    /goals?id=...                   -> update
     DELETE /goals?id=...                   -> delete
   Progress, remaining and status are calculated here (one place only).
   ========================================================================== */

const crypto = require("crypto");
const { getPool } = require("./utils/mysqlClient");
const { getUserIdFromRequest } = require("./utils/auth");
const { success, error } = require("./utils/response");

function validateGoal(body) {
    const goalName = (body.goalName || "").trim();
    const targetAmount = Number(body.targetAmount);
    const savedAmount = body.savedAmount === "" || body.savedAmount === undefined ? 0 : Number(body.savedAmount);

    if (!goalName) return { error: "Goal name is required." };
    if (!(targetAmount > 0)) return { error: "Target amount must be greater than 0." };
    if (Number.isNaN(savedAmount) || savedAmount < 0) return { error: "Saved amount cannot be negative." };

    return { value: { goalName, targetAmount, savedAmount } };
}

// Progress (%) = Saved / Target x 100 (not capped, so an overfunded goal shows >100)
function toClient(row) {
    const targetAmount = Number(row.target_amount);
    const savedAmount = Number(row.saved_amount);
    return {
        id: row.id,
        goalName: row.goal_name,
        targetAmount,
        savedAmount,
        remaining: Math.max(targetAmount - savedAmount, 0),
        progress: Math.round((savedAmount / targetAmount) * 10000) / 100,
        status: savedAmount >= targetAmount ? "completed" : "in-progress",
    };
}

exports.handler = async (event) => {
    const userId = getUserIdFromRequest(event);
    if (!userId) return error("Unauthorized", 401);

    const pool = getPool();
    const query = event.queryStringParameters || {};
    const id = query.id;

    try {
        if (event.httpMethod === "GET") {
            const [rows] = await pool.query(
                "SELECT id, goal_name, target_amount, saved_amount FROM goals WHERE user_id = ? ORDER BY created_at DESC",
                [userId]
            );
            return success(rows.map(toClient));
        }

        if (event.httpMethod === "POST" && id && query.action === "contribute") {
            const amount = Number(JSON.parse(event.body || "{}").amount);
            if (!(amount > 0)) return error("Amount must be greater than 0.", 400);

            const [result] = await pool.query(
                "UPDATE goals SET saved_amount = saved_amount + ? WHERE id = ? AND user_id = ?",
                [amount, id, userId]
            );
            if (result.affectedRows === 0) return error("Goal not found.", 404);
            return success({ id }, "Savings added.");
        }

        if (event.httpMethod === "POST") {
            const parsed = validateGoal(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const newId = crypto.randomUUID();
            const { goalName, targetAmount, savedAmount } = parsed.value;
            await pool.query(
                "INSERT INTO goals (id, user_id, goal_name, target_amount, saved_amount) VALUES (?, ?, ?, ?, ?)",
                [newId, userId, goalName, targetAmount, savedAmount]
            );
            return success({ id: newId }, "Goal created.", 201);
        }

        if (event.httpMethod === "PUT") {
            if (!id) return error("Goal id is required.", 400);
            const parsed = validateGoal(JSON.parse(event.body || "{}"));
            if (parsed.error) return error(parsed.error, 400);

            const { goalName, targetAmount, savedAmount } = parsed.value;
            const [result] = await pool.query(
                "UPDATE goals SET goal_name = ?, target_amount = ?, saved_amount = ? WHERE id = ? AND user_id = ?",
                [goalName, targetAmount, savedAmount, id, userId]
            );
            if (result.affectedRows === 0) return error("Goal not found.", 404);
            return success({ id }, "Goal updated.");
        }

        if (event.httpMethod === "DELETE") {
            if (!id) return error("Goal id is required.", 400);
            const [result] = await pool.query("DELETE FROM goals WHERE id = ? AND user_id = ?", [id, userId]);
            if (result.affectedRows === 0) return error("Goal not found.", 404);
            return success(null, "Goal deleted.");
        }

        return error("Method not allowed", 405);
    } catch (err) {
        return error(err.message, 500);
    }
};
