-- ==========================================================================
-- Takarivo — database/users.sql
-- Purpose: Replaces Supabase's built-in auth.users table. Stores user
-- accounts for the custom, local auth system. MySQL syntax.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Never store a plain password — only the bcrypt hash, set by the
    -- auth backend in Part 23.
    password_hash VARCHAR(255) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for fast lookup during login
CREATE INDEX idx_users_email ON users (email);