/* ==========================================================================
   Takarivo — js/navigation.js
   Purpose: App shell behavior shared by every logged-in page:
     - mobile sidebar drawer (button, backdrop click, Escape, link click)
     - marks the current page's sidebar link as active
     - Logout button
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    const menuToggle = document.querySelector(".menu-toggle");

    if (sidebar && menuToggle) {
        sidebar.id = sidebar.id || "app-sidebar";
        menuToggle.setAttribute("aria-controls", sidebar.id);
        menuToggle.setAttribute("aria-label", "Open menu");
        menuToggle.setAttribute("aria-expanded", "false");

        const backdrop = document.createElement("div");
        backdrop.className = "sidebar-backdrop";
        document.body.appendChild(backdrop);

        function setMenuOpen(open) {
            sidebar.classList.toggle("open", open);
            backdrop.classList.toggle("show", open);
            menuToggle.setAttribute("aria-expanded", String(open));
            menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        menuToggle.addEventListener("click", () => setMenuOpen(!sidebar.classList.contains("open")));
        backdrop.addEventListener("click", () => setMenuOpen(false));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        });
        sidebar.querySelectorAll(".sidebar-link").forEach(link =>
            link.addEventListener("click", () => setMenuOpen(false)));

        // Growing the window to desktop width closes the drawer state
        window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => {
            if (e.matches) setMenuOpen(false);
        });
    }

    // Mark the sidebar link matching the current page as active
    const currentFile = window.location.pathname.split("/").pop();
    document.querySelectorAll(".sidebar-link").forEach((link) => {
        const linkFile = link.getAttribute("href").split("/").pop();
        if (linkFile === currentFile) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("takarivo_token");
            localStorage.removeItem("takarivo_user");
            window.location.href = "login.html";
        });
    }
});
