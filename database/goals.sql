-- ==========================================================================
-- Takarivo — database/goals.sql — MySQL syntax
-- ==========================================================================

CREATE TABLE IF NOT EXISTS goals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,

    goal_name VARCHAR(150) NOT NULL,
    target_amount DECIMAL(14, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_goals_user_id ON goals (user_id);
