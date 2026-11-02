/* ==========================================================================
   Takarivo — js/auth.js
   Purpose: Handles the Login, Register, Forgot Password, and Reset
   Password forms. Wires Login and Register to Netlify serverless functions.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // Login Form
    // -------------------------------------------------------------------------
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const banner = document.getElementById("login-error");
            banner.classList.remove("show");

            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const res = await fetch("/.netlify/functions/auth-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                const result = await res.json();

                if (!result.success) {
                    banner.textContent = result.message;
                    banner.classList.add("show");
                    return;
                }

                saveSession(result.data.token, result.data.user);
                window.location.href = "dashboard.html";
            } catch (err) {
                banner.textContent = "Unable to reach the server. Is 'netlify dev' running?";
                banner.classList.add("show");
            }
        });
    }

    // -------------------------------------------------------------------------
    // Register Form
    // -------------------------------------------------------------------------
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const banner = document.getElementById("register-error");
            banner.classList.remove("show");

            const fullName = document.getElementById("register-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const confirm = document.getElementById("register-confirm").value;

            if (password !== confirm) {
                banner.textContent = "Passwords do not match.";
                banner.classList.add("show");
                return;
            }

            try {
                const res = await fetch("/.netlify/functions/auth-register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, email, password }),
                });
                const result = await res.json();

                if (!result.success) {
                    banner.textContent = result.message;
                    banner.classList.add("show");
                    return;
                }

                saveSession(result.data.token, result.data.user);
                window.location.href = "dashboard.html";
            } catch (err) {
                banner.textContent = "Unable to reach the server. Is 'netlify dev' running?";
                banner.classList.add("show");
            }
        });
    }

    // -------------------------------------------------------------------------
    // Forgot Password Form (UI placeholder until backend is connected)
    // -------------------------------------------------------------------------
        const forgotForm = document.getElementById("forgot-form");
    if (forgotForm) {
        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const banner = document.getElementById("forgot-message");
            banner.classList.remove("show");

            const email = document.getElementById("forgot-email").value;

            try {
                const res = await fetch("/.netlify/functions/auth-forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
                const result = await res.json();

                if (result.data && result.data.token) {
                    banner.innerHTML = `
                        <p style="margin-bottom: 8px;"><strong>Reset token generated:</strong></p>
                        <code style="display: block; padding: 8px 10px; background: rgba(0,0,0,0.06); border-radius: 4px; font-size: 13px; word-break: break-all; margin-bottom: 12px; font-family: monospace;">${result.data.token}</code>
                        <a href="reset-password.html?token=${encodeURIComponent(result.data.token)}" class="btn btn-primary" style="display: block; width: 100%; text-align: center; text-decoration: none; color: #fff; margin-top: 8px;">Proceed to Reset Password &rarr;</a>
                    `;
                } else {
                    banner.textContent = result.message;
                }
                banner.classList.add("show");
            } catch (err) {
                banner.textContent = "Unable to reach the server. Is 'netlify dev' running?";
                banner.classList.add("show");
            }
        });
    }

    // -------------------------------------------------------------------------
    // Reset Password Form
    // -------------------------------------------------------------------------
    const resetForm = document.getElementById("reset-form");
    if (resetForm) {
        // Automatically prefill token if passed via URL ?token=...
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get("token");
        const tokenInput = document.getElementById("reset-token");
        if (tokenFromUrl && tokenInput) {
            tokenInput.value = tokenFromUrl;
            const pwdInput = document.getElementById("reset-password");
            if (pwdInput) pwdInput.focus();
        }

        resetForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const banner = document.getElementById("reset-error");
            banner.className = "form-banner error";
            banner.classList.remove("show");

            const token = document.getElementById("reset-token").value.trim();
            const password = document.getElementById("reset-password").value;
            const confirmInput = document.getElementById("reset-confirm");
            const confirm = confirmInput ? confirmInput.value : password;

            if (password !== confirm) {
                banner.textContent = "Passwords do not match.";
                banner.classList.add("show");
                return;
            }

            try {
                const res = await fetch("/.netlify/functions/auth-reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, newPassword: password }),
                });
                const result = await res.json();

                if (result.success) {
                    banner.className = "form-banner success show";
                    banner.textContent = result.message || "Password updated successfully! Redirecting to login...";
                    setTimeout(() => { window.location.href = "login.html"; }, 1500);
                } else {
                    banner.className = "form-banner error show";
                    banner.textContent = result.message || "Failed to reset password.";
                }
            } catch (err) {
                banner.className = "form-banner error show";
                banner.textContent = "Unable to reach the server. Is 'netlify dev' running?";
            }
        });
    }
});