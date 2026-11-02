/* ==========================================================================
   Takarivo — js/budgets.js
   Purpose: Budgets page. Spent, remaining, progress and status all come
   from the server; this file only displays them and handles the form.
   ========================================================================== */

let budgets = [];
let editingId = null;

const STATUS_BADGES = {
    "on-track": "badge-success",
    "near-limit": "badge-warning",
    "critical": "badge-warning",
    "over-budget": "badge-danger",
};

function formatCurrency(amount) {
    return "৳" + Number(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function pad(n) {
    return String(n).padStart(2, "0");
}

// First and last day of the current month, as YYYY-MM-DD
function currentMonthRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
        start: `${year}-${pad(month + 1)}-01`,
        end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
    };
}

function renderBudgets() {
    const container = document.getElementById("budgets-list");

    if (budgets.length === 0) {
        container.innerHTML = `<p>No budgets yet. Click "+ Add Budget" to create one.</p>`;
        return;
    }

    container.innerHTML = budgets
        .map(b => `
            <div class="budget-item">
                <div class="flex-between">
                    <strong>${escapeHtml(b.category)}</strong>
                    <span class="badge ${STATUS_BADGES[b.status]}">${b.status.replace("-", " ")}</span>
                </div>
                <div class="item-meta mt-sm">
                    ${formatCurrency(b.spentAmount)} of ${formatCurrency(b.budgetAmount)} spent
                    · ${b.remaining >= 0 ? formatCurrency(b.remaining) + " left" : formatCurrency(Math.abs(b.remaining)) + " over"}
                    · ${b.startDate} to ${b.endDate}
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill ${b.status}" style="width: ${Math.min(b.progress, 100)}%;"></div>
                </div>
                <div class="flex gap-sm mt-sm">
                    <button class="btn btn-secondary" data-action="edit" data-id="${b.id}">Edit</button>
                    <button class="btn" style="color: var(--color-danger);" data-action="delete" data-id="${b.id}">Delete</button>
                </div>
            </div>
        `)
        .join("");
}

async function loadBudgets() {
    try {
        budgets = await apiFetch("budgets");
        renderBudgets();
    } catch (err) {
        document.getElementById("budgets-list").innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}

function openForm(budget = null) {
    editingId = budget ? budget.id : null;
    const range = currentMonthRange();
    document.getElementById("budget-form-title").textContent = budget ? "Edit Budget" : "Add Budget";
    document.getElementById("budget-category").value = budget ? budget.category : "";
    document.getElementById("budget-amount").value = budget ? budget.budgetAmount : "";
    document.getElementById("budget-start").value = budget ? budget.startDate : range.start;
    document.getElementById("budget-end").value = budget ? budget.endDate : range.end;
    document.getElementById("budget-form-error").classList.remove("show");
    document.getElementById("budget-form-card").hidden = false;
}

function closeForm() {
    editingId = null;
    document.getElementById("budget-form-card").hidden = true;
    document.getElementById("budget-form").reset();
}

document.addEventListener("DOMContentLoaded", () => {
    loadBudgets();

    document.getElementById("add-budget-btn").addEventListener("click", () => openForm());
    document.getElementById("budget-cancel-btn").addEventListener("click", closeForm);

    document.getElementById("budget-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const banner = document.getElementById("budget-form-error");
        banner.classList.remove("show");

        const body = JSON.stringify({
            category: document.getElementById("budget-category").value,
            budgetAmount: document.getElementById("budget-amount").value,
            startDate: document.getElementById("budget-start").value,
            endDate: document.getElementById("budget-end").value,
        });

        try {
            if (editingId) {
                await apiFetch(`budgets?id=${editingId}`, { method: "PUT", body });
            } else {
                await apiFetch("budgets", { method: "POST", body });
            }
            closeForm();
            await loadBudgets();
        } catch (err) {
            banner.textContent = err.message;
            banner.classList.add("show");
        }
    });

    document.getElementById("budgets-list").addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const budget = budgets.find(b => b.id === button.dataset.id);
        if (!budget) return;

        if (button.dataset.action === "edit") {
            openForm(budget);
        } else if (button.dataset.action === "delete") {
            if (!confirm(`Delete the "${budget.category}" budget?`)) return;
            try {
                await apiFetch(`budgets?id=${budget.id}`, { method: "DELETE" });
                await loadBudgets();
            } catch (err) {
                alert(err.message);
            }
        }
    });
});
