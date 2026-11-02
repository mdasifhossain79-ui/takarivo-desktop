/* ==========================================================================
   Takarivo — js/help.js
   Purpose: Accessible accordion behavior for the Help page FAQ list.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".faq-question").forEach((button) => {
        button.addEventListener("click", () => {
            const expanded = button.getAttribute("aria-expanded") === "true";
            const answer = document.getElementById(button.getAttribute("aria-controls"));

            button.setAttribute("aria-expanded", String(!expanded));
            answer.classList.toggle("open", !expanded);
        });
    });
});