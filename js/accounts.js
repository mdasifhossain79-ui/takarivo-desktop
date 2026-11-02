/* ==========================================================================
   Takarivo — js/accounts.js
   Purpose: Lists, adds, edits, and deletes accounts via the accounts API.
            Includes support for MFS (bKash, Nagad, Rocket, Upay, etc.).
   ========================================================================== */

let accounts = [];
let editingId = null;

function formatCurrency(amount) {
    return "৳" + Number(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : text;
    return div.innerHTML;
}

function renderAccounts() {
    const tbody = document.getElementById("accounts-table-body");

    if (accounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;">No accounts found. Click "+ Add Account" to create one.</td></tr>`;
        return;
    }

    tbody.innerHTML = accounts
        .map(acc => `
            <tr>
                <td>${escapeHtml(acc.name)}</td>
                <td>${escapeHtml(acc.accountType)}</td>
                <td>${formatCurrency(acc.balance)}</td>
                <td><span class="badge ${acc.status === "active" ? "badge-success" : "badge-neutral"}">${escapeHtml(acc.status)}</span></td>
                <td>
                    <button class="btn btn-secondary" data-action="edit" data-id="${acc.id}">Edit</button>
                    <button class="btn" style="color: var(--color-danger);" data-action="delete" data-id="${acc.id}">Delete</button>
                </td>
            </tr>
        `)
        .join("");
}

async function loadAccounts() {
    try {
        accounts = await apiFetch("accounts");
        renderAccounts();
    } catch (err) {
        document.getElementById("accounts-table-body").innerHTML =
            `<tr><td colspan="5" style="text-align: center; color: var(--color-danger); padding: 24px;">${escapeHtml(err.message)}</td></tr>`;
    }
}

function updateMfsVisibility() {
    const typeSelect = document.getElementById("account-type");
    const mfsContainer = document.getElementById("mfs-providers-container");
    if (!typeSelect || !mfsContainer) return;

    const isMfs = typeSelect.value === "MFS" || typeSelect.value === "Mobile Wallet";
    mfsContainer.style.display = isMfs ? "block" : "none";
}

function openForm(account = null) {
    editingId = account ? account.id : null;
    document.getElementById("account-form-title").textContent = account ? "Edit Account" : "Add Account";
    document.getElementById("account-name").value = account ? account.name : "";

    const typeSelect = document.getElementById("account-type");
    const targetType = account ? account.accountType : "Checking";
    if (account && ![...typeSelect.options].some(opt => opt.value === targetType)) {
        const customOpt = document.createElement("option");
        customOpt.value = targetType;
        customOpt.textContent = targetType;
        typeSelect.appendChild(customOpt);
    }
    typeSelect.value = targetType;

    document.getElementById("account-balance").value = account ? account.balance : "";
    document.getElementById("account-status").value = account ? account.status : "active";

    const banner = document.getElementById("account-form-error");
    banner.textContent = "";
    banner.classList.remove("show");

    updateMfsVisibility();
    document.getElementById("account-form-card").hidden = false;
    document.getElementById("account-name").focus();
}

function closeForm() {
    editingId = null;
    document.getElementById("account-form-card").hidden = true;
    document.getElementById("account-form").reset();
    updateMfsVisibility();
    const banner = document.getElementById("account-form-error");
    banner.textContent = "";
    banner.classList.remove("show");
}

document.addEventListener("DOMContentLoaded", () => {
    loadAccounts();

    document.getElementById("add-account-btn").addEventListener("click", () => openForm());
    document.getElementById("account-cancel-btn").addEventListener("click", closeForm);

    const typeSelect = document.getElementById("account-type");
    if (typeSelect) {
        typeSelect.addEventListener("change", updateMfsVisibility);
    }

    document.querySelectorAll(".mfs-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            const provider = btn.dataset.provider;
            const nameInput = document.getElementById("account-name");
            const currentVal = nameInput.value.trim();

            if (!currentVal || /^(bkash|nagad|rocket|upay)(\s+(account|wallet))?$/i.test(currentVal)) {
                nameInput.value = `${provider} Account`;
            } else if (!currentVal.toLowerCase().includes(provider.toLowerCase())) {
                nameInput.value = `${provider} - ${currentVal}`;
            }
            nameInput.focus();
        });
    });

    document.getElementById("account-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const banner = document.getElementById("account-form-error");
        banner.textContent = "";
        banner.classList.remove("show");

        const body = JSON.stringify({
            name: document.getElementById("account-name").value.trim(),
            accountType: document.getElementById("account-type").value,
            balance: Number(document.getElementById("account-balance").value),
            status: document.getElementById("account-status").value,
        });

        try {
            if (editingId) {
                await apiFetch(`accounts?id=${editingId}`, { method: "PUT", body });
            } else {
                await apiFetch("accounts", { method: "POST", body });
            }
            closeForm();
            await loadAccounts();
        } catch (err) {
            banner.textContent = err.message;
            banner.classList.add("show");
        }
    });

    document.getElementById("accounts-table-body").addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const account = accounts.find(a => a.id === button.dataset.id);
        if (!account) return;

        if (button.dataset.action === "edit") {
            openForm(account);
        } else if (button.dataset.action === "delete") {
            if (!confirm(`Delete account "${account.name}"? This will also remove any transactions associated with it.`)) return;
            try {
                await apiFetch(`accounts?id=${account.id}`, { method: "DELETE" });
                await loadAccounts();
            } catch (err) {
                alert(err.message);
            }
        }
    });
});