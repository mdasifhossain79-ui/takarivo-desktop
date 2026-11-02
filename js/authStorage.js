/* ==========================================================================
   Takarivo — js/authStorage.js
   Purpose: Reads/writes the logged-in user's token in localStorage. Used
   by auth.js (to save it after login) and authGuard.js (to check it on
   every protected page).
   ========================================================================== */

const TOKEN_KEY = "takarivo_token";
const USER_KEY = "takarivo_user";

function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}