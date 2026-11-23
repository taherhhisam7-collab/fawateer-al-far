const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'data', 'fawateer.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  city TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('finance','cashier')),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ترقية آمنة: إذا كان schema القديم موجوداً نُعيد إنشاء جداول الفواتير فقط (بدون مسح المستخدمين/الفروع)
const oldCols = db.prepare('PRAGMA table_info(invoice_rows)').all().map((c) => c.name);
if (oldCols.length && !oldCols.includes('supplier')) {
  db.exec(`DROP TABLE IF EXISTS invoice_rows; DROP TABLE IF EXISTS deduction_rows;
           DROP TABLE IF EXISTS shift_rows; DROP TABLE IF EXISTS invoices;`);
}

db.exec(`
CREATE TABLE IF NOT EXISTS invoices (
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
CREATE TABLE IF NOT EXISTS invoice_rows (
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
CREATE INDEX IF NOT EXISTS idx_inv_rows ON invoice_rows(invoice_id, section, row_index);
CREATE TABLE IF NOT EXISTS shift_rows (
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
CREATE INDEX IF NOT EXISTS idx_shift_rows ON shift_rows(invoice_id, row_index);
`);

module.exports = db;
