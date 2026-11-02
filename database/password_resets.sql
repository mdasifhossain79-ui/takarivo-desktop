-- ==========================================================================
-- Takarivo — database/password_resets.sql — MySQL syntax
-- Purpose: Short-lived tokens for the offline password reset flow.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token CHAR(36) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;