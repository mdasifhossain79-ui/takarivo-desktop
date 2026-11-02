/* ==========================================================================
   Takarivo — netlify/functions/utils/response.js
   Purpose: Consistent JSON response shape across every function.
   ========================================================================== */

function success(data, message = "OK", statusCode = 200) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, message, data }),
    };
}

function error(message, statusCode = 400) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message, data: null }),
    };
}

module.exports = { success, error };