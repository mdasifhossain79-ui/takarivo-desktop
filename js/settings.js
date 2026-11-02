/* ==========================================================================
   Takarivo — js/settings.js
   Purpose: Settings page — loads the profile, saves the name, and changes
   the password via the profile API.
   ========================================================================== */

function showBanner(id, message, type) {
    const banner = document.getElementById(id);
    banner.textContent = message;
    banner.classList.remove("error", "success");
    banner.classList.add(type, "show");
}

function hideBanner(id) {
    document.getElementById(id).classList.remove("show");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const profile = await apiFetch("profile");
        document.getElementById("full-name").value = profile.fullName;
        document.getElementById("email").value = profile.email;
    } catch (err) {
        showBanner("profile-banner", err.message, "error");
    }

    document.getElementById("settings-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideBanner("profile-banner");

        try {
            const result = await apiFetch("profile", {
                method: "PUT",
                body: JSON.stringify({ fullName: document.getElementById("full-name").value }),
            });

            // Keep the name saved in the browser in sync
            const stored = JSON.parse(localStorage.getItem("takarivo_user") || "{}");
            stored.fullName = result.fullName;
            localStorage.setItem("takarivo_user", JSON.stringify(stored));

            showBanner("profile-banner", "Profile updated.", "success");
        } catch (err) {
            showBanner("profile-banner", err.message, "error");
        }
    });

    document.getElementById("password-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideBanner("password-banner");

        const currentPassword = document.getElementById("current-password").value;
        const newPassword = document.getElementById("new-password").value;
        const confirm = document.getElementById("confirm-password").value;

        if (newPassword !== confirm) {
            showBanner("password-banner", "New passwords do not match.", "error");
            return;
        }

        try {
            await apiFetch("profile?action=password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            document.getElementById("password-form").reset();
            showBanner("password-banner", "Password changed.", "success");
        } catch (err) {
            showBanner("password-banner", err.message, "error");
        }
    });
});
