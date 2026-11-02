/* ==========================================================================
   Takarivo — netlify/functions/utils/httpError.js
   Purpose: Creates an Error that carries an HTTP status code, so handlers
   can return a clean 400/404 instead of a generic 500.
   ========================================================================== */

function httpError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

module.exports = { httpError };
