-- Spend-Wise database schema (MySQL 8.0.16+)
CREATE DATABASE IF NOT EXISTS spendwise
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE spendwise;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(20) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

-- user_id NULL = system default category
CREATE TABLE IF NOT EXISTS categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NULL,
  category_name VARCHAR(50) NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_category_per_user (user_id, category_name),
  CONSTRAINT fk_cat_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  expense_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  category_id  INT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description  TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_amount CHECK (amount > 0),
  CONSTRAINT fk_exp_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_exp_cat FOREIGN KEY (category_id)
    REFERENCES categories(category_id) ON DELETE RESTRICT,
  INDEX idx_user_date (user_id, expense_date)
) ENGINE=InnoDB;

-- category_id NULL = overall monthly cap
CREATE TABLE IF NOT EXISTS budgets (
  budget_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  category_id INT NULL,
  month_year  VARCHAR(7) NOT NULL,
  budget_cap  DECIMAL(10,2) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cap CHECK (budget_cap > 0),
  CONSTRAINT fk_bud_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_bud_cat FOREIGN KEY (category_id)
    REFERENCES categories(category_id) ON DELETE CASCADE,
  UNIQUE KEY uq_budget (user_id, category_id, month_year)
) ENGINE=InnoDB;

-- Default categories (only inserted if none exist yet)
INSERT INTO categories (user_id, category_name, is_default)
SELECT NULL, d.n, TRUE FROM (
  SELECT 'Food & Dining' AS n UNION ALL SELECT 'Transport'
  UNION ALL SELECT 'Books & Supplies' UNION ALL SELECT 'Rent & Utilities'
  UNION ALL SELECT 'Entertainment' UNION ALL SELECT 'Miscellaneous'
) AS d
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_default = TRUE);
