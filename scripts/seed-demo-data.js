/* ==========================================================================
   Takarivo — scripts/seed-demo-data.js
   Purpose: Creates (or re-creates) a DEMO user with sample data.
   Usage:   npm run seed
   Login:   demo@takarivo.local  /  demo12345
   It only touches the demo user; your real account is never changed.
   ========================================================================== */

require("dotenv").config();
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const DEMO_EMAIL = "demo@takarivo.local";
const DEMO_PASSWORD = "demo12345";

const now = new Date();

function pad(n) {
    return String(n).padStart(2, "0");
}

function toDateString(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// A date `monthsAgo` months back; this month's days never land in the future
function dateIn(monthsAgo, day) {
    const safeDay = monthsAgo === 0 ? Math.min(day, now.getDate()) : Math.min(day, 28);
    return toDateString(new Date(now.getFullYear(), now.getMonth() - monthsAgo, safeDay));
}

function monthBounds() {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return [dateIn(0, 1), `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(last)}`];
}

function delta(type, amount) {
    return type === "income" ? amount : type === "expense" ? -amount : 0;
}

// [account name, months ago, day, description, category, type, amount]
const ACCOUNT_TRANSACTIONS = [
    ["Main Account", 0, 1, "Salary Deposit", "Salary", "income", 68500],
    ["Main Account", 0, 3, "Grocery Store", "Food", "expense", 2450],
    ["Main Account", 0, 5, "Electricity Bill", "Utilities", "expense", 1800],
    ["Main Account", 0, 8, "Freelance Payment", "Freelance", "income", 15000],
    ["Main Account", 0, 12, "Restaurant", "Food", "expense", 1200],
    ["bKash Wallet", 0, 10, "Ride Sharing", "Transport", "expense", 600],
    ["Main Account", 1, 1, "Salary Deposit", "Salary", "income", 68500],
    ["Main Account", 1, 4, "Grocery Store", "Food", "expense", 5200],
    ["Main Account", 1, 6, "Electricity Bill", "Utilities", "expense", 2100],
    ["Main Account", 1, 15, "Cinema & Snacks", "Entertainment", "expense", 1500],
    ["bKash Wallet", 1, 18, "Transport", "Transport", "expense", 1800],
    ["Main Account", 2, 1, "Salary Deposit", "Salary", "income", 68500],
    ["Main Account", 2, 5, "Grocery Store", "Food", "expense", 6100],
    ["Main Account", 2, 7, "Electricity Bill", "Utilities", "expense", 1950],
    ["Main Account", 2, 20, "Freelance Payment", "Freelance", "income", 12000],
];

// [months ago, day, description, category, amount]
const CARD_EXPENSES = [
    [1, 12, "Phone Accessories", "Shopping", 4500],
    [0, 7, "Laptop Bag", "Shopping", 5000],
    [0, 9, "Family Dinner", "Food", 3200],
];

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    try {
        await conn.beginTransaction();

        // Re-create the demo user (cascade removes its old data)
        await conn.query("DELETE FROM users WHERE email = ?", [DEMO_EMAIL]);

        const userId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
        await conn.query(
            "INSERT INTO users (id, full_name, email, password_hash) VALUES (?, ?, ?, ?)",
            [userId, "Demo User", DEMO_EMAIL, passwordHash]
        );

        // Accounts (opening balances; transactions adjust them below)
        const accounts = {
            "Main Account": { id: crypto.randomUUID(), type: "Checking", balance: 50000 },
            "Savings Account": { id: crypto.randomUUID(), type: "Savings", balance: 100000 },
            "bKash Wallet": { id: crypto.randomUUID(), type: "MFS", balance: 3000 },
        };

        // Card
        const card = { id: crypto.randomUUID(), name: "City Bank Visa", limit: 100000, due: 0 };

        // Account transactions
        const transactionRows = [];
        for (const [accountName, monthsAgo, day, description, category, type, amount] of ACCOUNT_TRANSACTIONS) {
            const account = accounts[accountName];
            account.balance += delta(type, amount);
            transactionRows.push([crypto.randomUUID(), userId, account.id, null, dateIn(monthsAgo, day), description, category, type, amount]);
        }

        // Card expenses raise the due amount
        for (const [monthsAgo, day, description, category, amount] of CARD_EXPENSES) {
            card.due += amount;
            transactionRows.push([crypto.randomUUID(), userId, null, card.id, dateIn(monthsAgo, day), description, category, "expense", amount]);
        }

        // One card payment from the main account (recorded as a transfer)
        const payment = 3000;
        card.due -= payment;
        accounts["Main Account"].balance -= payment;
        transactionRows.push([crypto.randomUUID(), userId, accounts["Main Account"].id, null, dateIn(0, 11), "Payment to City Bank Visa", "Card Payment", "transfer", payment]);

        // Save accounts and the card with their final numbers
        for (const [name, account] of Object.entries(accounts)) {
            await conn.query(
                "INSERT INTO accounts (id, user_id, name, account_type, balance, status) VALUES (?, ?, ?, ?, ?, 'active')",
                [account.id, userId, name, account.type, account.balance]
            );
        }
        await conn.query(
            "INSERT INTO cards (id, user_id, card_name, credit_limit, due_amount) VALUES (?, ?, ?, ?, ?)",
            [card.id, userId, card.name, card.limit, card.due]
        );

        // Transactions (after accounts and the card exist, because of foreign keys)
        for (const row of transactionRows) {
            await conn.query(
                `INSERT INTO transactions
                 (id, user_id, account_id, card_id, transaction_date, description, category, transaction_type, amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                row
            );
        }

        // Budgets for this month
        const [monthStart, monthEnd] = monthBounds();
        const budgets = [["Food", 8000], ["Utilities", 3000], ["Entertainment", 2000], ["Transport", 4000]];
        for (const [category, amount] of budgets) {
            await conn.query(
                "INSERT INTO budgets (id, user_id, category, budget_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
                [crypto.randomUUID(), userId, category, amount, monthStart, monthEnd]
            );
        }

        // Goals
        const goals = [["Emergency Fund", 100000, 62000], ["New Laptop", 90000, 90000], ["Vacation Trip", 50000, 18000]];
        for (const [name, target, saved] of goals) {
            await conn.query(
                "INSERT INTO goals (id, user_id, goal_name, target_amount, saved_amount) VALUES (?, ?, ?, ?, ?)",
                [crypto.randomUUID(), userId, name, target, saved]
            );
        }

        await conn.commit();
        console.log("Demo data created.");
        console.log(`  Email:    ${DEMO_EMAIL}`);
        console.log(`  Password: ${DEMO_PASSWORD}`);
    } catch (err) {
        await conn.rollback();
        console.error("Could not create demo data:", err.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

main();
