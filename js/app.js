/* ==========================================================================
   Takarivo — js/app.js
   Purpose: One place to call the backend. Adds the login token to every
   request and sends the user back to login if the token is rejected.
   Load AFTER authStorage-free pages are fine: it reads localStorage directly.
   ========================================================================== */

// -------------------------------------------------------------------------
// Landing Page — wire up Login and Get Started buttons
// Only runs on index.html (the root landing page), not on app pages.
// -------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const isLandingPage = path === "/" || path.endsWith("/index.html") || path.endsWith("takarivo_2/");
    if (!isLandingPage) return;

    // If already logged in, skip the landing page entirely
    if (localStorage.getItem("takarivo_token")) {
        window.location.replace("pages/dashboard.html");
        return;
    }

    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "pages/login.html";
        });
    }

    const getStartedBtn = document.getElementById("get-started-btn");
    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", () => {
            window.location.href = "pages/register.html";
        });
    }
});

// -------------------------------------------------------------------------
// API helper — used by every protected page
// -------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("takarivo_token");

    const res = await fetch(`/.netlify/functions/${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (res.status === 401) {
        localStorage.removeItem("takarivo_token");
        localStorage.removeItem("takarivo_user");
        window.location.href = "login.html";
        throw new Error("Session expired. Please sign in again.");
    }

    const result = await res.json();
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.data;
}
