-- ==========================================================================
-- Takarivo — database/new_features.sql
-- Parts 37-41: categories, recurring transactions
-- Run in MySQL Workbench against your takarivo database.
-- ==========================================================================
USE takarivo;

-- ---------- user_categories (Part 38) ----------
CREATE TABLE IF NOT EXISTS user_categories (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_category (user_id, name),
  INDEX idx_categories_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default categories for existing users (safe to skip if you prefer empty)
-- INSERT INTO user_categories (user_id, name)
-- SELECT id, c.name FROM users CROSS JOIN
--   (SELECT 'Salary' AS name UNION SELECT 'Freelance' UNION SELECT 'Food'
--    UNION SELECT 'Utilities' UNION SELECT 'Transport'
--    UNION SELECT 'Entertainment' UNION SELECT 'Shopping' UNION SELECT 'Other') c
-- ON DUPLICATE KEY UPDATE name = c.name;

-- ---------- recurring_transactions (Part 39) ----------
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id               CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id          CHAR(36)     NOT NULL,
  account_id       CHAR(36)     NOT NULL,
  description      VARCHAR(255) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  transaction_type ENUM('income','expense','transfer') NOT NULL,
  amount           DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  frequency        ENUM('monthly') NOT NULL DEFAULT 'monthly',
  day_of_month     TINYINT      NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  next_run_date    DATE         NOT NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recurring_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
  INDEX idx_recurring_user (user_id),
  INDEX idx_recurring_next_run (next_run_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
