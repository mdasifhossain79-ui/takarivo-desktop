/* ==========================================================================
   Takarivo — js/dashboard.js
   Purpose: Fills the Dashboard from the summary API. All totals are
   calculated on the server; this file only displays them.
   ========================================================================== */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCurrency(amount) {
    return (amount < 0 ? "-" : "") + "৳" + Math.abs(amount).toLocaleString("en-US");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function currentMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// "2026-10" -> "Oct"
function monthLabel(ym) {
    return MONTH_NAMES[Number(ym.split("-")[1]) - 1];
}

function renderKPIs(data) {
    const netBalanceEl = document.getElementById("kpi-net-balance");
    if (netBalanceEl) {
        const net = data.netBalance !== undefined ? data.netBalance : data.totalBalance;
        netBalanceEl.textContent = formatCurrency(net);
        netBalanceEl.className = "kpi-value " + (net >= 0 ? "kpi-positive" : "kpi-negative");
    }

    const balanceEl = document.getElementById("kpi-balance");
    if (balanceEl) balanceEl.textContent = formatCurrency(data.totalBalance);

    const cardDueEl = document.getElementById("kpi-card-due");
    if (cardDueEl) {
        cardDueEl.textContent = formatCurrency(data.cardDue || 0);
    }

    const cardAvailEl = document.getElementById("kpi-card-available");
    if (cardAvailEl) {
        cardAvailEl.textContent = `${formatCurrency(data.cardAvailable || 0)} available credit`;
    }

    document.getElementById("kpi-income").textContent = formatCurrency(data.income);
    document.getElementById("kpi-expenses").textContent = formatCurrency(data.expenses);

    const savingsEl = document.getElementById("kpi-savings");
    savingsEl.textContent = formatCurrency(data.netSavings);
    savingsEl.className = "kpi-value " + (data.netSavings >= 0 ? "kpi-positive" : "kpi-negative");
}

function renderChart(monthly) {
    new Chart(document.getElementById("cashflow-chart"), {
        type: "line",
        data: {
            labels: monthly.months.map(monthLabel),
            datasets: [
                { label: "Income", data: monthly.income, borderColor: "#1E8E5A", backgroundColor: "#1E8E5A", tension: 0.3 },
                { label: "Expenses", data: monthly.expenses, borderColor: "#D64545", backgroundColor: "#D64545", tension: 0.3 },
            ],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });
}

function renderRecentTransactions(recent) {
    const container = document.getElementById("recent-transactions-list");

    if (recent.length === 0) {
        container.innerHTML = `<p>No transactions yet. Add one on the Transactions page.</p>`;
        return;
    }

    container.innerHTML = recent
        .map(t => {
            const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
            const colorClass = t.type === "income" ? "kpi-positive" : t.type === "expense" ? "kpi-negative" : "";
            return `
                <div class="widget-list-item">
                    <div>
                        <div>${escapeHtml(t.description)}</div>
                        <div class="item-meta">${escapeHtml(t.category)} · ${t.date}</div>
                    </div>
                    <div class="${colorClass}">${sign}${formatCurrency(t.amount)}</div>
                </div>
            `;
        })
        .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const data = await apiFetch(`summary?month=${currentMonthString()}`);
        renderKPIs(data);
        renderChart(data.monthly);
        renderRecentTransactions(data.recent);
    } catch (err) {
        const banner = document.getElementById("dashboard-error");
        banner.textContent = err.message;
        banner.classList.add("show");
    }
});
