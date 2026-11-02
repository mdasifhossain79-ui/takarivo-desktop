-- ==========================================================================
-- Takarivo — database/transactions_add_card_id.sql
-- Purpose: Lets a transaction belong to a CARD instead of an account.
-- Exactly one of account_id / card_id is set; the backend enforces that
-- (MySQL does not allow a CHECK on columns used in cascading foreign keys).
-- Run once, against the takarivo database.
-- ==========================================================================
ALTER TABLE transactions
MODIFY account_id CHAR(36) NULL,
  ADD COLUMN card_id CHAR(36) NULL
AFTER account_id,
  ADD CONSTRAINT fk_transactions_card FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE;
CREATE INDEX idx_transactions_card_id ON transactions (card_id);
