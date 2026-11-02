-- ==========================================================================
-- Takarivo — database/cards.sql — MySQL syntax
-- ==========================================================================

CREATE TABLE IF NOT EXISTS cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,

    card_name VARCHAR(150) NOT NULL,
    credit_limit DECIMAL(14, 2) NOT NULL CHECK (credit_limit > 0),
    due_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,

    -- Generated column: MySQL 5.7.6+ supports STORED generated columns.
    available_balance DECIMAL(14, 2)
        GENERATED ALWAYS AS (credit_limit - due_amount) STORED,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cards_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cards_user_id ON cards (user_id);