const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'fawateer.db');
const outPath = path.join(__dirname, '..', 'migration_seed.sql');
const db = new Database(dbPath, { readonly: true });
const q = (v) => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const tables = ['branches', 'users', 'invoices', 'invoice_rows', 'shift_rows'];
let sql = 'PRAGMA foreign_keys=OFF;\nDELETE FROM invoice_rows;\nDELETE FROM shift_rows;\nDELETE FROM invoices;\nDELETE FROM users;\nDELETE FROM branches;\n';
for (const table of tables) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  const cols = rows.length ? Object.keys(rows[0]) : db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  for (const row of rows) {
    sql += `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(c => q(row[c])).join(',')});\n`;
  }
  console.log(table, rows.length);
}
sql += 'PRAGMA foreign_keys=ON;\n';
fs.writeFileSync(outPath, sql, 'utf8');
console.log('wrote', outPath, fs.statSync(outPath).size);
db.close();
