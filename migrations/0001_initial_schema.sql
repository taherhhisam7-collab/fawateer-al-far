-- D1 Database Schema for فواتير الفرع
-- Migration 0001: Initial schema

CREATE TABLE branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  city TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('accountant','cashier')),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  invoice_date TEXT NOT NULL DEFAULT '',
  day_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  totals TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE invoice_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK(section IN ('listA','listB')),
  row_index INTEGER NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  invoices TEXT NOT NULL DEFAULT '',
  payments TEXT NOT NULL DEFAULT '',
  remaining TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_inv_rows ON invoice_rows(invoice_id, section, row_index);

CREATE TABLE shift_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  shift_label TEXT NOT NULL DEFAULT '',
  total_cash TEXT NOT NULL DEFAULT '',
  network TEXT NOT NULL DEFAULT '',
  branch_expense TEXT NOT NULL DEFAULT '',
  net_cash TEXT NOT NULL DEFAULT '',
  total_amount TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_shift_rows ON shift_rows(invoice_id, row_index);

-- Insert default branch if none exists
INSERT OR IGNORE INTO branches (name, code, city) VALUES ('الفرع الرئيسي', 'MAIN', 'المدينة المنورة');