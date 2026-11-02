-- ==========================================================================
-- Takarivo — database/budgets.sql — MySQL syntax
-- ==========================================================================

CREATE TABLE IF NOT EXISTS budgets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,

    category VARCHAR(100) NOT NULL,
    budget_amount DECIMAL(14, 2) NOT NULL CHECK (budget_amount > 0),
    spent_amount DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_budgets_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_budgets_user_id ON budgets (user_id);
CREATE INDEX idx_budgets_user_category ON budgets (user_id, category);