-- ==========================================================================
-- Takarivo — database/setup.sql
-- Purpose: Creates the whole database in one go (fresh installs only).
-- Run it in MySQL Workbench: File > Open SQL Script > Execute (lightning bolt).
-- Safe to re-run: every table uses IF NOT EXISTS.
-- ==========================================================================
CREATE DATABASE IF NOT EXISTS takarivo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE takarivo;
-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- accounts ----------
CREATE TABLE IF NOT EXISTS accounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_accounts_user_id (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- cards ----------
CREATE TABLE IF NOT EXISTS cards (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  card_name VARCHAR(150) NOT NULL,
  credit_limit DECIMAL(14, 2) NOT NULL CHECK (credit_limit > 0),
  due_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  available_balance DECIMAL(14, 2) GENERATED ALWAYS AS (credit_limit - due_amount) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_cards_user_id (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- transactions ----------
-- Exactly one of account_id / card_id is set (enforced by the backend).
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  account_id CHAR(36) NULL,
  card_id CHAR(36) NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  transaction_type ENUM('income', 'expense', 'transfer') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_account FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_card FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_account_id (account_id),
  INDEX idx_transactions_card_id (card_id),
  INDEX idx_transactions_date (transaction_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- budgets ----------
-- spent_amount is not used: the backend calculates spending from transactions.
CREATE TABLE IF NOT EXISTS budgets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  budget_amount DECIMAL(14, 2) NOT NULL CHECK (budget_amount > 0),
  spent_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_budgets_dates CHECK (end_date >= start_date),
  INDEX idx_budgets_user_category (user_id, category)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- goals ----------
CREATE TABLE IF NOT EXISTS goals (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  goal_name VARCHAR(150) NOT NULL,
  target_amount DECIMAL(14, 2) NOT NULL CHECK (target_amount > 0),
  saved_amount DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_goals_user_id (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- ---------- password_resets ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token CHAR(36) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
