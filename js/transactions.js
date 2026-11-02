/* ==========================================================================
   Takarivo — js/transactions.js
   Purpose: Lists, adds, edits, deletes and filters transactions via the
   transactions API. Account balances are updated by the backend.
   ========================================================================== */

let transactions = [];
let accounts = [];
let editingId = null;

function formatCurrency(amount) {
    return "৳" + Number(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Net Cash Flow = Income - Expenses (transfers are excluded)
function calculateNetCashFlow(income, expenses) {
    return income - expenses;
}

function renderSummary() {
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const net = calculateNetCashFlow(income, expenses);

    document.getElementById("sum-income").textContent = formatCurrency(income);
    document.getElementById("sum-expenses").textContent = formatCurrency(expenses);

    const netEl = document.getElementById("sum-net");
    netEl.textContent = (net < 0 ? "-" : "") + formatCurrency(Math.abs(net));
    netEl.className = "kpi-value " + (net >= 0 ? "kpi-positive" : "kpi-negative");
}

function renderTransactions() {
    const filter = document.getElementById("type-filter").value;
    const rows = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
    const tbody = document.getElementById("transactions-table-body");

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">No transactions to show.</td></tr>`;
        return;
    }

    const badgeClass = { income: "badge-success", expense: "badge-danger", transfer: "badge-neutral" };

    tbody.innerHTML = rows
        .map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${escapeHtml(t.description)}</td>
                <td>${escapeHtml(t.accountName)}</td>
                <td>${escapeHtml(t.category)}</td>
                <td><span class="badge ${badgeClass[t.type]}">${t.type}</span></td>
                <td>${t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}${formatCurrency(t.amount)}</td>
                  <td>
                    ${t.cardId
                        ? `<span class="item-meta">Managed in Cards</span>`
                        : `<button class="btn btn-secondary" data-action="edit" data-id="${t.id}">Edit</button>
                           <button class="btn" style="color: var(--color-danger);" data-action="delete" data-id="${t.id}">Delete</button>`}
                </td>
            </tr>
        `)
        .join("");
}

async function loadAll() {
    try {
        [transactions, accounts] = await Promise.all([apiFetch("transactions"), apiFetch("accounts")]);
        renderSummary();
        renderTransactions();
    } catch (err) {
        document.getElementById("transactions-table-body").innerHTML =
            `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
    }
}

function fillAccountOptions(selectedId) {
    const select = document.getElementById("txn-account");
    const usable = accounts.filter(a => a.status === "active" || a.id === selectedId);
    select.innerHTML = usable
        .map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`)
        .join("");
    if (selectedId) select.value = selectedId;
}

function todayString() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function openForm(txn = null) {
    if (accounts.length === 0) {
        alert("Create an account first (Accounts page), then add transactions to it.");
        return;
    }

    editingId = txn ? txn.id : null;
    document.getElementById("transaction-form-title").textContent = txn ? "Edit Transaction" : "Add Transaction";
    fillAccountOptions(txn ? txn.accountId : null);
    document.getElementById("txn-date").value = txn ? txn.date : todayString();
    document.getElementById("txn-description").value = txn ? txn.description : "";
    document.getElementById("txn-category").value = txn ? txn.category : "";
    document.getElementById("txn-type").value = txn ? txn.type : "expense";
    document.getElementById("txn-amount").value = txn ? txn.amount : "";
    document.getElementById("transaction-form-error").classList.remove("show");
    document.getElementById("transaction-form-card").hidden = false;
}

function closeForm() {
    editingId = null;
    document.getElementById("transaction-form-card").hidden = true;
    document.getElementById("transaction-form").reset();
}

document.addEventListener("DOMContentLoaded", () => {
    loadAll();

    document.getElementById("add-transaction-btn").addEventListener("click", () => openForm());
    document.getElementById("transaction-cancel-btn").addEventListener("click", closeForm);
    document.getElementById("type-filter").addEventListener("change", renderTransactions);

    document.getElementById("transaction-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const banner = document.getElementById("transaction-form-error");
        banner.classList.remove("show");

        const body = JSON.stringify({
            accountId: document.getElementById("txn-account").value,
            date: document.getElementById("txn-date").value,
            description: document.getElementById("txn-description").value,
            category: document.getElementById("txn-category").value,
            type: document.getElementById("txn-type").value,
            amount: document.getElementById("txn-amount").value,
        });

        try {
            if (editingId) {
                await apiFetch(`transactions?id=${editingId}`, { method: "PUT", body });
            } else {
                await apiFetch("transactions", { method: "POST", body });
            }
            closeForm();
            await loadAll();
        } catch (err) {
            banner.textContent = err.message;
            banner.classList.add("show");
        }
    });

    document.getElementById("transactions-table-body").addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const txn = transactions.find(t => t.id === button.dataset.id);
        if (!txn) return;

        if (button.dataset.action === "edit") {
            openForm(txn);
        } else if (button.dataset.action === "delete") {
            if (!confirm(`Delete "${txn.description}"? The account balance will be adjusted back.`)) return;
            try {
                await apiFetch(`transactions?id=${txn.id}`, { method: "DELETE" });
                await loadAll();
            } catch (err) {
                alert(err.message);
            }
        }
    });
});
