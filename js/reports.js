/* ==========================================================================
   Takarivo — js/reports.js
   Purpose: Reports page. Loads the summary API for the chosen month and
   draws the category doughnut and the 6-month net-savings bar chart.
   ========================================================================== */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORY_COLORS = ["#3B4FBF", "#1E8E5A", "#D64545", "#E0A800", "#6B7280", "#8E44AD", "#16A0B5", "#E0732A"];

let categoryChart = null;
let trendChart = null;

function formatCurrency(amount) {
    return (amount < 0 ? "-" : "") + "৳" + Math.abs(amount).toLocaleString("en-US");
}

function currentMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym) {
    return MONTH_NAMES[Number(ym.split("-")[1]) - 1];
}

function renderKPIs(data) {
    document.getElementById("rep-income").textContent = formatCurrency(data.income);
    document.getElementById("rep-expenses").textContent = formatCurrency(data.expenses);

    const netEl = document.getElementById("rep-net");
    netEl.textContent = formatCurrency(data.netSavings);
    netEl.className = "kpi-value " + (data.netSavings >= 0 ? "kpi-positive" : "kpi-negative");
}

function renderCategoryChart(categories) {
    const empty = document.getElementById("category-empty");
    const wrap = document.getElementById("category-chart-wrap");

    if (categoryChart) categoryChart.destroy();
    categoryChart = null;

    if (categories.length === 0) {
        empty.hidden = false;
        wrap.hidden = true;
        return;
    }

    empty.hidden = true;
    wrap.hidden = false;

    categoryChart = new Chart(document.getElementById("category-chart"), {
        type: "doughnut",
        data: {
            labels: categories.map(c => c.category),
            datasets: [{
                data: categories.map(c => c.total),
                backgroundColor: categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
            }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });
}

function renderTrendChart(monthly) {
    if (trendChart) trendChart.destroy();

    trendChart = new Chart(document.getElementById("trend-chart"), {
        type: "bar",
        data: {
            labels: monthly.months.map(monthLabel),
            datasets: [{
                label: "Net Savings",
                data: monthly.netSavings,
                backgroundColor: monthly.netSavings.map(v => (v >= 0 ? "#1E8E5A" : "#D64545")),
            }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });
}

async function loadReport(month) {
    const banner = document.getElementById("report-error");
    banner.classList.remove("show");

    try {
        const data = await apiFetch(`summary?month=${month}`);
        renderKPIs(data);
        renderCategoryChart(data.categories);
        renderTrendChart(data.monthly);
    } catch (err) {
        banner.textContent = err.message;
        banner.classList.add("show");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const monthInput = document.getElementById("report-month");
    monthInput.value = currentMonthString();

    monthInput.addEventListener("change", () => {
        if (monthInput.value) loadReport(monthInput.value);
    });

    loadReport(monthInput.value);
});
