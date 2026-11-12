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
  status        VARCHAR(20) NOT NULL DEFAULT 'Active',
  avatar_path   VARCHAR(255) NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'student',
  last_login    DATETIME NULL
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

-- v3: money coming in
CREATE TABLE IF NOT EXISTS income (
  income_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  income_date DATE NOT NULL,
  source      VARCHAR(100) NOT NULL DEFAULT 'Other',
  notes       TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_income_amount CHECK (amount > 0),
  CONSTRAINT fk_inc_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_inc_user_date (user_id, income_date)
) ENGINE=InnoDB;

-- v3: savings goals
CREATE TABLE IF NOT EXISTS goals (
  goal_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  saved_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_date   DATE NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_goal_target CHECK (target_amount > 0),
  CONSTRAINT chk_goal_saved CHECK (saved_amount >= 0),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- v3: expenses that repeat every month (rent, subscriptions...)
CREATE TABLE IF NOT EXISTS recurring_expenses (
  recurring_id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT NOT NULL,
  category_id          INT NOT NULL,
  amount               DECIMAL(10,2) NOT NULL,
  description          VARCHAR(255) NULL,
  day_of_month         TINYINT NOT NULL,
  start_date           DATE NOT NULL,
  last_generated_month VARCHAR(7) NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rec_amount CHECK (amount > 0),
  CONSTRAINT chk_rec_day CHECK (day_of_month BETWEEN 1 AND 31),
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_cat FOREIGN KEY (category_id)
    REFERENCES categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- v3: forgot-password tokens (only a hash of the token is stored)
CREATE TABLE IF NOT EXISTS password_resets (
  reset_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_reset_hash (token_hash)
) ENGINE=InnoDB;

-- Default categories (only inserted if none exist yet)
INSERT INTO categories (user_id, category_name, is_default)
SELECT NULL, d.n, TRUE FROM (
  SELECT 'Food & Dining' AS n UNION ALL SELECT 'Transport'
  UNION ALL SELECT 'Books & Supplies' UNION ALL SELECT 'Rent & Utilities'
  UNION ALL SELECT 'Entertainment' UNION ALL SELECT 'Miscellaneous'
) AS d
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_default = TRUE);
