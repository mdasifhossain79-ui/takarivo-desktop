/* ==========================================================================
   Takarivo — js/authGuard.js
   Purpose: Protects every app-shell page. Hides the page immediately
   (via a CSS class, before paint) and redirects to login.html if there's
   no token. Must be loaded BEFORE authStorage.js's dependents and as
   early as possible in <head> or top of <body> — see Step 3.
   ========================================================================== */

(function () {
    const token = localStorage.getItem("takarivo_token");

    if (!token) {
        window.location.replace("login.html");
    }
})();