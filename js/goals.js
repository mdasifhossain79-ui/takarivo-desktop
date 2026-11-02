/* ==========================================================================
   Takarivo — js/goals.js
   Purpose: Goals page. Progress, remaining and status come from the server.
   ========================================================================== */

let goals = [];
let editingId = null;

function formatCurrency(amount) {
    return "৳" + Number(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderGoals() {
    const container = document.getElementById("goals-list");

    if (goals.length === 0) {
        container.innerHTML = `<p>No goals yet. Click "+ Add Goal" to create one.</p>`;
        return;
    }

    container.innerHTML = goals
        .map(g => `
            <div class="budget-item">
                <div class="flex-between">
                    <strong>${escapeHtml(g.goalName)}</strong>
                    <span class="badge ${g.status === "completed" ? "badge-success" : "badge-neutral"}">${g.status.replace("-", " ")}</span>
                </div>
                <div class="item-meta mt-sm">
                    ${formatCurrency(g.savedAmount)} of ${formatCurrency(g.targetAmount)} saved (${g.progress.toFixed(0)}%)
                    · ${formatCurrency(g.remaining)} to go
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill ${g.status === "completed" ? "on-track" : "near-limit"}" style="width: ${Math.min(g.progress, 100)}%;"></div>
                </div>
                <div class="flex gap-sm mt-sm">
                    <button class="btn btn-primary" data-action="contribute" data-id="${g.id}">+ Add Savings</button>
                    <button class="btn btn-secondary" data-action="edit" data-id="${g.id}">Edit</button>
                    <button class="btn" style="color: var(--color-danger);" data-action="delete" data-id="${g.id}">Delete</button>
                </div>
            </div>
        `)
        .join("");
}

async function loadGoals() {
    try {
        goals = await apiFetch("goals");
        renderGoals();
    } catch (err) {
        document.getElementById("goals-list").innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}

function openForm(goal = null) {
    editingId = goal ? goal.id : null;
    document.getElementById("goal-form-title").textContent = goal ? "Edit Goal" : "Add Goal";
    document.getElementById("goal-name").value = goal ? goal.goalName : "";
    document.getElementById("goal-target").value = goal ? goal.targetAmount : "";
    document.getElementById("goal-saved").value = goal ? goal.savedAmount : 0;
    document.getElementById("goal-form-error").classList.remove("show");
    document.getElementById("goal-form-card").hidden = false;
}

function closeForm() {
    editingId = null;
    document.getElementById("goal-form-card").hidden = true;
    document.getElementById("goal-form").reset();
}

document.addEventListener("DOMContentLoaded", () => {
    loadGoals();

    document.getElementById("add-goal-btn").addEventListener("click", () => openForm());
    document.getElementById("goal-cancel-btn").addEventListener("click", closeForm);

    document.getElementById("goal-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const banner = document.getElementById("goal-form-error");
        banner.classList.remove("show");

        const body = JSON.stringify({
            goalName: document.getElementById("goal-name").value,
            targetAmount: document.getElementById("goal-target").value,
            savedAmount: document.getElementById("goal-saved").value,
        });

        try {
            if (editingId) {
                await apiFetch(`goals?id=${editingId}`, { method: "PUT", body });
            } else {
                await apiFetch("goals", { method: "POST", body });
            }
            closeForm();
            await loadGoals();
        } catch (err) {
            banner.textContent = err.message;
            banner.classList.add("show");
        }
    });

    document.getElementById("goals-list").addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const goal = goals.find(g => g.id === button.dataset.id);
        if (!goal) return;

        try {
            if (button.dataset.action === "edit") {
                openForm(goal);
            } else if (button.dataset.action === "contribute") {
                const input = prompt(`How much to add to "${goal.goalName}"? (৳)`);
                if (input === null) return;
                await apiFetch(`goals?id=${goal.id}&action=contribute`, {
                    method: "POST",
                    body: JSON.stringify({ amount: input }),
                });
                await loadGoals();
            } else if (button.dataset.action === "delete") {
                if (!confirm(`Delete the "${goal.goalName}" goal?`)) return;
                await apiFetch(`goals?id=${goal.id}`, { method: "DELETE" });
                await loadGoals();
            }
        } catch (err) {
            alert(err.message);
        }
    });
});
