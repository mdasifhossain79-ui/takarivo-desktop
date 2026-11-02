/* ==========================================================================
   Takarivo — js/cards.js
   Purpose: Cards page — list, add/edit/delete cards, pay a card from an
   account, and record a card expense. All numbers come from the server.
   ========================================================================== */

let cards = [];
let accounts = [];
let editingId = null;
let activeCardId = null;

const FORM_IDS = ["card-form-card", "payment-form-card", "expense-form-card"];

function formatCurrency(amount) {
    return "৳" + Number(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function todayString() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function hideAllForms() {
    FORM_IDS.forEach(id => { document.getElementById(id).hidden = true; });
    ["card-form", "payment-form", "expense-form"].forEach(id => document.getElementById(id).reset());
    ["card-form-error", "payment-form-error", "expense-form-error"].forEach(id =>
        document.getElementById(id).classList.remove("show"));
    editingId = null;
    activeCardId = null;
}

function showBanner(id, message) {
    const banner = document.getElementById(id);
    banner.textContent = message;
    banner.classList.add("show");
}

function renderCards() {
    const container = document.getElementById("cards-list");

    if (cards.length === 0) {
        container.innerHTML = `<p>No cards yet. Click "+ Add Card" to create one.</p>`;
        return;
    }

    container.innerHTML = cards
        .map(c => {
            const isHigh = c.utilization >= 70;
            return `
                <div class="credit-card-item">
                    <div class="flex-between">
                        <strong>${escapeHtml(c.cardName)}</strong>
                        <span>${formatCurrency(c.dueAmount)} / ${formatCurrency(c.creditLimit)}</span>
                    </div>
                    <div class="utilization-bar-track">
                        <div class="utilization-bar-fill ${isHigh ? "high" : ""}" style="width: ${Math.min(c.utilization, 100)}%;"></div>
                    </div>
                    <div class="item-meta mt-sm">
                        ${c.utilization.toFixed(1)}% utilized · ${formatCurrency(c.availableBalance)} available
                    </div>
                    <div class="flex flex-wrap gap-sm mt-sm">
                        <button class="btn btn-primary" data-action="pay" data-id="${c.id}">Pay</button>
                        <button class="btn btn-secondary" data-action="expense" data-id="${c.id}">Add Expense</button>
                        <button class="btn btn-secondary" data-action="edit" data-id="${c.id}">Edit</button>
                        <button class="btn" style="color: var(--color-danger);" data-action="delete" data-id="${c.id}">Delete</button>
                    </div>
                </div>
            `;
        })
        .join("");
}

async function loadAll() {
    try {
        [cards, accounts] = await Promise.all([apiFetch("cards"), apiFetch("accounts")]);
        renderCards();
    } catch (err) {
        document.getElementById("cards-list").innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}

function openCardForm(card = null) {
    hideAllForms();
    editingId = card ? card.id : null;
    document.getElementById("card-form-title").textContent = card ? "Edit Card" : "Add Card";
    document.getElementById("card-name").value = card ? card.cardName : "";
    document.getElementById("card-limit").value = card ? card.creditLimit : "";
    document.getElementById("card-due").value = card ? card.dueAmount : 0;
    document.getElementById("card-form-card").hidden = false;
}

function openPaymentForm(card) {
    const activeAccounts = accounts.filter(a => a.status === "active");
    if (activeAccounts.length === 0) {
        alert("You need an active account to pay from. Add one on the Accounts page first.");
        return;
    }
    hideAllForms();
    activeCardId = card.id;
    document.getElementById("payment-form-title").textContent =
        `Pay ${card.cardName} (due ${formatCurrency(card.dueAmount)})`;
    document.getElementById("pay-account").innerHTML = activeAccounts
        .map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${formatCurrency(a.balance)})</option>`)
        .join("");
    document.getElementById("pay-amount").value = card.dueAmount > 0 ? card.dueAmount : "";
    document.getElementById("pay-date").value = todayString();
    document.getElementById("payment-form-card").hidden = false;
}

function openExpenseForm(card) {
    hideAllForms();
    activeCardId = card.id;
    document.getElementById("expense-form-title").textContent =
        `Add expense on ${card.cardName} (${formatCurrency(card.availableBalance)} available)`;
    document.getElementById("exp-date").value = todayString();
    document.getElementById("expense-form-card").hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
    loadAll();

    document.getElementById("add-card-btn").addEventListener("click", () => openCardForm());
    document.querySelectorAll("[data-close-form]").forEach(btn => btn.addEventListener("click", hideAllForms));

    // Add / edit card
    document.getElementById("card-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = JSON.stringify({
            cardName: document.getElementById("card-name").value,
            creditLimit: document.getElementById("card-limit").value,
            dueAmount: document.getElementById("card-due").value,
        });
        try {
            if (editingId) {
                await apiFetch(`cards?id=${editingId}`, { method: "PUT", body });
            } else {
                await apiFetch("cards", { method: "POST", body });
            }
            hideAllForms();
            await loadAll();
        } catch (err) {
            showBanner("card-form-error", err.message);
        }
    });

    // Pay card
    document.getElementById("payment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = JSON.stringify({
            cardId: activeCardId,
            accountId: document.getElementById("pay-account").value,
            amount: document.getElementById("pay-amount").value,
            date: document.getElementById("pay-date").value,
        });
        try {
            await apiFetch("cards-payment", { method: "POST", body });
            hideAllForms();
            await loadAll();
        } catch (err) {
            showBanner("payment-form-error", err.message);
        }
    });

    // Card expense
    document.getElementById("expense-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = JSON.stringify({
            cardId: activeCardId,
            description: document.getElementById("exp-description").value,
            category: document.getElementById("exp-category").value,
            amount: document.getElementById("exp-amount").value,
            date: document.getElementById("exp-date").value,
        });
        try {
            await apiFetch("cards-expense", { method: "POST", body });
            hideAllForms();
            await loadAll();
        } catch (err) {
            showBanner("expense-form-error", err.message);
        }
    });

    // Buttons on each card
    document.getElementById("cards-list").addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const card = cards.find(c => c.id === button.dataset.id);
        if (!card) return;

        switch (button.dataset.action) {
            case "pay": openPaymentForm(card); break;
            case "expense": openExpenseForm(card); break;
            case "edit": openCardForm(card); break;
            case "delete":
                if (!confirm(`Delete "${card.cardName}"? Its recorded card expenses will be deleted too.`)) return;
                try {
                    await apiFetch(`cards?id=${card.id}`, { method: "DELETE" });
                    await loadAll();
                } catch (err) {
                    alert(err.message);
                }
                break;
        }
    });
});
