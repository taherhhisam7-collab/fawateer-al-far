const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const R = require('./reports');

const crypto = require('crypto');

const app = express();
const SECRET = process.env.JWT_SECRET || 'fawateer-kharj-secret-change-me';
const PORT = process.env.PORT || 3001;

// ÙŠØ¯Ø¹Ù… ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© (bcrypt) ÙˆØ§Ù„Ø¬Ø¯ÙŠØ¯Ø© (PBKDF2 Ù…Ù† Ù†Ø³Ø®Ø© Ø§Ù„Ø³Ø­Ø§Ø¨Ø©)
function verifyPassword(password, hash) {
  hash = String(hash || '');
  if (hash.startsWith('pbkdf2$')) {
    const parts = hash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], 'hex');
    const expected = parts[3];
    const computed = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  }
  try { return bcrypt.compareSync(String(password), hash); } catch { return false; }
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ message: 'ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' });
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch { res.status(401).json({ message: 'Ø§Ù†ØªÙ‡Øª Ø§Ù„Ø¬Ù„Ø³Ø©ØŒ ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ø¬Ø¯Ø¯Ø§Ù‹' }); }
}
const isAcc = (role) => role === 'accountant' || role === 'finance';
function finance(req, res, next) {
  if (!isAcc(req.user.role)) return res.status(403).json({ message: 'Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ù„Ù„Ù…Ø­Ø§Ø³Ø¨ ÙÙ‚Ø·' });
  next();
}
function pub(u) {
  return { id: u.id, email: u.email, full_name: u.full_name,
    role: u.role === 'finance' ? 'accountant' : u.role,
    branch_id: u.branch_id, branch_name: u.branch_name, active: !!u.active };
}
function withBranch(u) {
  const b = u.branch_id ? db.prepare('SELECT name FROM branches WHERE id=?').get(u.branch_id) : null;
  return { ...pub(u), branch_name: b ? b.name : null };
}

/* ---------- First-run setup (real data, no demo) ---------- */
app.get('/api/setup/status', (req, res) => {
  res.json({ needed: db.prepare('SELECT COUNT(*) n FROM users').get().n === 0 });
});
app.post('/api/setup', (req, res) => {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n > 0)
    return res.status(403).json({ message: 'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø£ÙˆÙ„ Ù…Ø³Ø¨Ù‚Ø§Ù‹' });
  const { full_name, email, password, branch_name } = req.body || {};
  if (!full_name || !email || !password || !branch_name)
    return res.status(400).json({ message: 'Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯ ÙˆÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙˆØ§Ø³Ù… Ø§Ù„ÙØ±Ø¹ Ù…Ø·Ù„ÙˆØ¨Ø©' });
  if (String(password).length < 6) return res.status(400).json({ message: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' });
  const result = db.transaction(() => {
    const b = db.prepare('INSERT INTO branches (name, code, city) VALUES (?,?,?)')
      .run(String(branch_name).trim(), 'MAIN', 'Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© Ø§Ù„Ù…Ù†ÙˆØ±Ø©');
    const u = db.prepare(`INSERT INTO users (email,full_name,password_hash,role,branch_id)
      VALUES (?,?,?, 'accountant', ?)`).run(String(email).trim(), String(full_name).trim(),
        bcrypt.hashSync(String(password), 10), b.lastInsertRowid);
    return db.prepare('SELECT * FROM users WHERE id=?').get(u.lastInsertRowid);
  })();
  const token = jwt.sign({ id: result.id, email: result.email, role: result.role, branch_id: result.branch_id },
    SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: withBranch(result) });
});

/* ---------- Auth ---------- */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙˆÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' });
  const u = db.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').get(String(email).trim());
  if (!u) return res.status(401).json({ message: 'Ù‡Ø°Ø§ Ø§Ù„Ø¨Ø±ÙŠØ¯ ØºÙŠØ± Ù…Ø³Ø¬Ù‘Ù„ ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… â€” ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨' });
  if (!verifyPassword(password, u.password_hash))
    return res.status(401).json({ message: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø© â€” ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ù„Ø­Ø±ÙˆÙ ÙˆØ§Ù„Ø£Ø±Ù‚Ø§Ù…' });
  if (!u.active) return res.status(403).json({ message: 'ØªÙ… ØªØ¹Ø·ÙŠÙ„ Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨ â€” ØªÙˆØ§ØµÙ„ Ù…Ø¹ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨' });
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role, branch_id: u.branch_id }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: withBranch(u) });
});
app.get('/api/auth/me', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!u || !u.active) return res.status(401).json({ message: 'Ø­Ø³Ø§Ø¨ ØºÙŠØ± ØµØ§Ù„Ø­' });
  res.json({ user: withBranch(u) });
});
app.post('/api/auth/change-password', auth, (req, res) => {
  const { current, next: nextPass } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!verifyPassword(current || '', u.password_hash))
    return res.status(400).json({ message: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
  if (!nextPass || String(nextPass).length < 6)
    return res.status(400).json({ message: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(nextPass), 10), u.id);
  res.json({ message: 'ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' });
});

/* ---------- Branches (finance only) ---------- */
app.get('/api/branches', auth, finance, (req, res) =>
  res.json(db.prepare('SELECT * FROM branches ORDER BY id').all()));
app.post('/api/branches', auth, finance, (req, res) => {
  const { name, code, city } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ Ù…Ø·Ù„ÙˆØ¨' });
  try {
    const r = db.prepare('INSERT INTO branches (name,code,city) VALUES (?,?,?)')
      .run(String(name).trim(), String(code || '').trim() || null, String(city || '').trim() || null);
    res.status(201).json(db.prepare('SELECT * FROM branches WHERE id=?').get(r.lastInsertRowid));
  } catch { res.status(400).json({ message: 'Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ Ø£Ùˆ Ø§Ù„Ø±Ù…Ø² Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹' }); }
});
app.put('/api/branches/:id', auth, finance, (req, res) => {
  const { name, code, city, active } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ Ù…Ø·Ù„ÙˆØ¨' });
  try {
    db.prepare('UPDATE branches SET name=?,code=?,city=?,active=? WHERE id=?')
      .run(String(name).trim(), String(code || '').trim() || null, String(city || '').trim() || null,
        active === false ? 0 : 1, req.params.id);
    res.json(db.prepare('SELECT * FROM branches WHERE id=?').get(req.params.id));
  } catch { res.status(400).json({ message: 'Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ Ø£Ùˆ Ø§Ù„Ø±Ù…Ø² Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹' }); }
});
app.delete('/api/branches/:id', auth, finance, (req, res) => {
  const u = db.prepare('SELECT COUNT(*) n FROM users WHERE branch_id=?').get(req.params.id).n;
  const i = db.prepare('SELECT COUNT(*) n FROM invoices WHERE branch_id=?').get(req.params.id).n;
  if (u || i) return res.status(400).json({ message: `Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø­Ø°Ù: Ø§Ù„ÙØ±Ø¹ Ù…Ø±ØªØ¨Ø· Ø¨Ù€ ${u} Ù…Ø³ØªØ®Ø¯Ù… Ùˆ ${i} ÙØ§ØªÙˆØ±Ø©` });
  db.prepare('DELETE FROM branches WHERE id=?').run(req.params.id);
  res.json({ message: 'ØªÙ… Ø­Ø°Ù Ø§Ù„ÙØ±Ø¹' });
});

/* ---------- Users (finance only) ---------- */
app.get('/api/users', auth, finance, (req, res) => {
  const rows = db.prepare(`SELECT u.*, b.name AS branch_name FROM users u
    LEFT JOIN branches b ON b.id=u.branch_id ORDER BY u.id`).all();
  res.json(rows.map(pub));
});
app.post('/api/users', auth, finance, (req, res) => {
  const { email, full_name, password, role, branch_id } = req.body || {};
  if (!email || !full_name || !password) return res.status(400).json({ message: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ ÙˆØ§Ù„Ø§Ø³Ù… ÙˆÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ù…Ø·Ù„ÙˆØ¨Ø©' });
  const finalRole = role === 'finance' ? 'accountant' : role;
  if (!['accountant', 'cashier'].includes(finalRole)) return res.status(400).json({ message: 'Ø¯ÙˆØ± ØºÙŠØ± ØµØ§Ù„Ø­' });
  if (!branch_id) return res.status(400).json({ message: 'Ù„Ø§Ø²Ù… ØªØ®ØªØ§Ø± Ø§Ù„ÙØ±Ø¹ ÙˆØªØ±Ø¨Ø· Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ù‡ Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸' });
  if (branch_id && !db.prepare('SELECT id FROM branches WHERE id=?').get(branch_id))
    return res.status(400).json({ message: 'Ø§Ù„ÙØ±Ø¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
  try {
    const r = db.prepare(`INSERT INTO users (email,full_name,password_hash,role,branch_id)
      VALUES (?,?,?,?,?)`).run(String(email).trim(), String(full_name).trim(),
        bcrypt.hashSync(String(password), 10), finalRole, branch_id || null);
    res.status(201).json(withBranch(db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid)));
  } catch { res.status(400).json({ message: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹' }); }
});
app.put('/api/users/:id', auth, finance, (req, res) => {
  const { email, full_name, role, branch_id, active, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ message: 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
  const finalRole = role === 'finance' ? 'accountant' : (role || u.role);
  if (!branch_id) return res.status(400).json({ message: 'Ù„Ø§Ø²Ù… ØªØ®ØªØ§Ø± Ø§Ù„ÙØ±Ø¹ ÙˆØªØ±Ø¨Ø· Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¨Ù‡ Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸' });
  try {
    db.prepare('UPDATE users SET email=?,full_name=?,role=?,branch_id=?,active=? WHERE id=?')
      .run(String(email || u.email).trim(), String(full_name || u.full_name).trim(), finalRole,
        branch_id || null, active === false ? 0 : 1, u.id);
    if (password) db.prepare('UPDATE users SET password_hash=? WHERE id=?')
      .run(bcrypt.hashSync(String(password), 10), u.id);
    res.json(withBranch(db.prepare('SELECT * FROM users WHERE id=?').get(u.id)));
  } catch { res.status(400).json({ message: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹' }); }
});
app.post('/api/users/:id/reset-password', auth, finance, (req, res) => {
  const password = String((req.body || {}).password || '');
  if (password.length < 6) return res.status(400).json({ message: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' });
  const u = db.prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ message: 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), u.id);
  res.json({ message: 'ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' });
});
app.delete('/api/users/:id', auth, finance, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø­Ø³Ø§Ø¨Ùƒ' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…' });
});

/* ---------- Invoices ---------- */
function normRows(arr) {
  if (!Array.isArray(arr)) return [];
  const keys = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
  return arr.map((r, i) => {
    const o = { row_index: i };
    keys.forEach((k) => { o[k] = String(r[k] || ''); });
    return o;
  }).filter((r) => keys.some((k) => r[k].trim() !== ''));
}
function normShifts(arr) {
  if (!Array.isArray(arr)) return [];
  const keys = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];
  return arr.map((r, i) => {
    const o = { row_index: i };
    keys.forEach((k) => { o[k] = String(r[k] || ''); });
    return o;
  }).filter((r) => keys.some((k) => r[k].trim() !== ''));
}
function saveLines(id, b) {
  db.prepare('DELETE FROM invoice_rows WHERE invoice_id=?').run(id);
  db.prepare('DELETE FROM shift_rows WHERE invoice_id=?').run(id);
  const ri = db.prepare(`INSERT INTO invoice_rows
    (invoice_id,section,row_index,supplier,invoices,payments,remaining,notes) VALUES (?,?,?,?,?,?,?,?)`);
  ['listA', 'listB'].forEach((sec) => normRows(b[sec]).forEach((r) =>
    ri.run(id, sec, r.row_index, r.supplier, r.invoices, r.payments, r.remaining, r.notes)));
  const rs = db.prepare(`INSERT INTO shift_rows
    (invoice_id,row_index,shift_label,total_cash,network,branch_expense,net_cash,total_amount)
    VALUES (@invoice_id,@row_index,@shift_label,@total_cash,@network,@branch_expense,@net_cash,@total_amount)`);
  normShifts(b.shifts).forEach((r) => rs.run({ invoice_id: id, ...r }));
}
function nextCode() {
  const y = new Date().getFullYear();
  // Ù„Ø§ Ù†Ø¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ø¯Ø¯ (Ù‚Ø¯ ÙŠÙƒÙˆÙ† Ø­ÙØ°Ù Ø³Ø¬Ù„ ÙÙŠØªÙƒØ±Ø± Ø§Ù„Ø±Ù‚Ù…) â€” Ù†Ø£Ø®Ø° Ø£ÙƒØ¨Ø± raqam Ù…Ø³ØªØ®Ø¯Ù… + 1
  const row = db.prepare(`SELECT code FROM invoices WHERE code LIKE ?
    ORDER BY CAST(SUBSTR(code, 10) AS INTEGER) DESC LIMIT 1`).get(`FKH-${y}-%`);
  const m = row && row.code.match(/-(\d+)$/);
  const n = m ? Number(m[1]) + 1 : 1;
  return `FKH-${y}-${String(n).padStart(4, '0')}`;
}
function invoiceFields(b) {
  return [String(b.invoice_date || ''), String(b.day_name || ''),
    String(b.notes || ''), JSON.stringify(b.totals || {})];
}

app.get('/api/invoices', auth, (req, res) =>
  res.json(R.listInvoices(db, req.query, req.user)));
app.get('/api/invoices/:id', auth, (req, res) => {
  const i = R.getInvoice(db, req.params.id, req.user);
  if (!i) return res.status(404).json({ message: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' });
  res.json(i);
});

// Ø§Ù„ÙƒØ§Ø´ÙŠØ±: Ø¥Ø¯Ø®Ø§Ù„ ÙÙ‚Ø· â€” Ø§Ù„ÙØ±Ø¹ ÙŠÙØ¤Ø®Ø° Ù…Ù† Ø­Ø³Ø§Ø¨Ù‡ ÙˆÙŠÙ ØªØ¬Ø§Ù‡Ù„ Ø£ÙŠ ÙØ±Ø¹ Ù…Ø±Ø³Ù„ Ù…Ù† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©
app.post('/api/invoices', auth, (req, res) => {
  const b = req.body || {};
  const branchId = isAcc(req.user.role) ? (b.branch_id || req.user.branch_id) : req.user.branch_id;
  if (!branchId) return res.status(400).json({ message: 'Ø§Ø®ØªØ± Ø§Ù„ÙØ±Ø¹ Ø£Ùˆ Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨' });
  if (!db.prepare('SELECT id FROM branches WHERE id=? AND active=1').get(branchId))
    return res.status(400).json({ message: 'Ø§Ù„ÙØ±Ø¹ ØºÙŠØ± Ù†Ø´Ø· â€” Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø­Ø§Ø³Ø¨' });
  const id = db.transaction(() => {
    const info = db.prepare(`INSERT INTO invoices
      (code,user_id,branch_id,invoice_date,day_name,notes,totals)
      VALUES (?,?,?,?,?,?,?)`).run(nextCode(), req.user.id, branchId, ...invoiceFields(b));
    saveLines(info.lastInsertRowid, b);
    return info.lastInsertRowid;
  })();
  res.status(201).json({ id, code: db.prepare('SELECT code FROM invoices WHERE id=?').get(id).code,
    message: 'ØªÙ… Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­' });
});

// Ø§Ù„Ù…Ø­Ø§Ø³Ø¨ ÙÙ‚Ø·: ØªØ¹Ø¯ÙŠÙ„/Ø­Ø°Ù/Ø¥Ø¯Ø®Ø§Ù„ ÙƒØ§Ù…Ù„
app.put('/api/invoices/:id', auth, finance, (req, res) => {
  const i = R.getInvoice(db, req.params.id, req.user);
  if (!i) return res.status(404).json({ message: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' });
  const b = req.body || {};
  db.transaction(() => {
    const branchId = b.branch_id || i.branch_id;
    db.prepare(`UPDATE invoices SET branch_id=?,invoice_date=?,day_name=?,notes=?,totals=? WHERE id=?`)
      .run(branchId, ...invoiceFields(b), i.id);
    saveLines(i.id, b);
  })();
  res.json({ message: 'ØªÙ… Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' });
});
app.delete('/api/invoices/:id', auth, finance, (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id);
  res.json({ message: 'ØªÙ… Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø©' });
});

/* ---------- Stats & reports (finance only) ---------- */
app.get('/api/stats', auth, finance, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) n FROM invoices').get().n;
  const perBranch = db.prepare(`SELECT b.name, COUNT(i.id) n FROM branches b
    LEFT JOIN invoices i ON i.branch_id=b.id GROUP BY b.id ORDER BY n DESC`).all();
  const perCashier = db.prepare(`SELECT u.full_name, COUNT(i.id) n, b.name AS branch
    FROM users u LEFT JOIN invoices i ON i.user_id=u.id LEFT JOIN branches b ON b.id=u.branch_id
    WHERE u.role='cashier' GROUP BY u.id ORDER BY n DESC`).all();
  const recent = R.listInvoices(db, {}, req.user).slice(0, 6).map((i) => ({
    id: i.id, code: i.code, branch: i.branch_name, user: i.user_name,
    date: i.invoice_date, day: i.day_name,
  }));
  res.json({ total, branches: db.prepare('SELECT COUNT(*) n FROM branches').get().n,
    users: db.prepare("SELECT COUNT(*) n FROM users WHERE role='cashier'").get().n,
    perBranch, perCashier, recent });
});
app.get('/api/reports/suppliers', auth, (req, res) =>
  res.json(R.supplierReport(db, req.query, req.user)));
app.get('/api/reports/cash-network', auth, (req, res) =>
  res.json(R.cashNetworkReport(db, req.query, req.user)));
app.get('/api/exports/cash-network.xlsx', auth, async (req, res) => {
  const rep = R.cashNetworkReport(db, req.query, req.user);
  await R.sendWorkbook(res, await R.workbookForCashNetwork(rep), `cash-network-${Date.now()}.xlsx`);
});
app.get('/api/exports/suppliers.xlsx', auth, async (req, res) => {
  const rows = R.supplierReport(db, req.query, req.user);
  await R.sendWorkbook(res, await R.workbookForSuppliers(rows), `suppliers-${Date.now()}.xlsx`);
});
app.get('/api/reports/fields', auth, finance, (req, res) => res.json(R.FIELDS));
app.get('/api/reports/field', auth, finance, (req, res) =>
  res.json(R.fieldReport(db, req.query.field, req.query, req.user)));

/* ---------- Excel exports (finance only) ---------- */
app.get('/api/exports/invoices.xlsx', auth, finance, async (req, res) => {
  const invoices = R.listInvoices(db, req.query, req.user);
  await R.sendWorkbook(res, await R.workbookForInvoices(invoices), `fawateer-${Date.now()}.xlsx`);
});
app.get('/api/exports/invoice/:id.xlsx', auth, finance, async (req, res) => {
  const i = R.getInvoice(db, req.params.id, req.user);
  if (!i) return res.status(404).json({ message: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' });
  await R.sendWorkbook(res, await R.workbookForInvoice(i), `fatura-${i.code}.xlsx`);
});
app.get('/api/exports/field.xlsx', auth, finance, async (req, res) => {
  const rep = R.fieldReport(db, req.query.field, req.query, req.user);
  if (!rep.field) return res.status(400).json({ message: 'Ø­Ù‚Ù„ ØºÙŠØ± ØµØ§Ù„Ø­' });
  await R.sendWorkbook(res, await R.workbookForField(rep.field, rep.rows),
    `field-${rep.field.key.replace('.', '-')}.xlsx`);
});

/* ---------- Static frontend + PWA ---------- */
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist, { setHeaders(res, file) {
  if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  if (file.endsWith('manifest.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json');
} }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found' });
  res.sendFile(path.join(dist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…' });
});
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

