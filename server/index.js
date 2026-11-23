const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const R = require('./reports');

const app = express();
const SECRET = process.env.JWT_SECRET || 'fawateer-kharj-secret-change-me';
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return res.status(401).json({ message: 'يرجى تسجيل الدخول' });
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch { res.status(401).json({ message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' }); }
}
const isAcc = (role) => role === 'accountant' || role === 'finance';
function finance(req, res, next) {
  if (!isAcc(req.user.role)) return res.status(403).json({ message: 'هذا الإجراء للمحاسب فقط' });
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
    return res.status(403).json({ message: 'تم إنشاء الحساب الأول مسبقاً' });
  const { full_name, email, password, branch_name } = req.body || {};
  if (!full_name || !email || !password || !branch_name)
    return res.status(400).json({ message: 'الاسم والبريد وكلمة المرور واسم الفرع مطلوبة' });
  if (String(password).length < 6) return res.status(400).json({ message: 'كلمة المرور 6 أحرف على الأقل' });
  const result = db.transaction(() => {
    const b = db.prepare('INSERT INTO branches (name, code) VALUES (?,?)')
      .run(String(branch_name).trim(), 'MAIN');
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
  if (!email || !password) return res.status(400).json({ message: 'البريد وكلمة المرور مطلوبان' });
  const u = db.prepare('SELECT * FROM users WHERE email=? COLLATE NOCASE').get(String(email).trim());
  if (!u || !bcrypt.compareSync(String(password), u.password_hash))
    return res.status(401).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
  if (!u.active) return res.status(403).json({ message: 'تم تعطيل هذا الحساب' });
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role, branch_id: u.branch_id }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: withBranch(u) });
});
app.get('/api/auth/me', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!u || !u.active) return res.status(401).json({ message: 'حساب غير صالح' });
  res.json({ user: withBranch(u) });
});
app.post('/api/auth/change-password', auth, (req, res) => {
  const { current, next: nextPass } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(String(current || ''), u.password_hash))
    return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
  if (!nextPass || String(nextPass).length < 6)
    return res.status(400).json({ message: 'كلمة المرور الجديدة 6 أحرف على الأقل' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(nextPass), 10), u.id);
  res.json({ message: 'تم تغيير كلمة المرور' });
});

/* ---------- Branches (finance only) ---------- */
app.get('/api/branches', auth, finance, (req, res) =>
  res.json(db.prepare('SELECT * FROM branches ORDER BY id').all()));
app.post('/api/branches', auth, finance, (req, res) => {
  const { name, code, city } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'اسم الفرع مطلوب' });
  try {
    const r = db.prepare('INSERT INTO branches (name,code,city) VALUES (?,?,?)')
      .run(String(name).trim(), String(code || '').trim() || null, String(city || '').trim() || null);
    res.status(201).json(db.prepare('SELECT * FROM branches WHERE id=?').get(r.lastInsertRowid));
  } catch { res.status(400).json({ message: 'اسم الفرع أو الرمز مستخدم مسبقاً' }); }
});
app.put('/api/branches/:id', auth, finance, (req, res) => {
  const { name, code, city, active } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'اسم الفرع مطلوب' });
  try {
    db.prepare('UPDATE branches SET name=?,code=?,city=?,active=? WHERE id=?')
      .run(String(name).trim(), String(code || '').trim() || null, String(city || '').trim() || null,
        active === false ? 0 : 1, req.params.id);
    res.json(db.prepare('SELECT * FROM branches WHERE id=?').get(req.params.id));
  } catch { res.status(400).json({ message: 'اسم الفرع أو الرمز مستخدم مسبقاً' }); }
});
app.delete('/api/branches/:id', auth, finance, (req, res) => {
  const u = db.prepare('SELECT COUNT(*) n FROM users WHERE branch_id=?').get(req.params.id).n;
  const i = db.prepare('SELECT COUNT(*) n FROM invoices WHERE branch_id=?').get(req.params.id).n;
  if (u || i) return res.status(400).json({ message: `لا يمكن الحذف: الفرع مرتبط بـ ${u} مستخدم و ${i} فاتورة` });
  db.prepare('DELETE FROM branches WHERE id=?').run(req.params.id);
  res.json({ message: 'تم حذف الفرع' });
});

/* ---------- Users (finance only) ---------- */
app.get('/api/users', auth, finance, (req, res) => {
  const rows = db.prepare(`SELECT u.*, b.name AS branch_name FROM users u
    LEFT JOIN branches b ON b.id=u.branch_id ORDER BY u.id`).all();
  res.json(rows.map(pub));
});
app.post('/api/users', auth, finance, (req, res) => {
  const { email, full_name, password, role, branch_id } = req.body || {};
  if (!email || !full_name || !password) return res.status(400).json({ message: 'البريد والاسم وكلمة المرور مطلوبة' });
  const finalRole = role === 'finance' ? 'accountant' : role;
  if (!['accountant', 'cashier'].includes(finalRole)) return res.status(400).json({ message: 'دور غير صالح' });
  if (finalRole === 'cashier' && !branch_id) return res.status(400).json({ message: 'الكاشير يجب أن يكون مرتبطاً بفرع' });
  if (branch_id && !db.prepare('SELECT id FROM branches WHERE id=?').get(branch_id))
    return res.status(400).json({ message: 'الفرع غير موجود' });
  try {
    const r = db.prepare(`INSERT INTO users (email,full_name,password_hash,role,branch_id)
      VALUES (?,?,?,?,?)`).run(String(email).trim(), String(full_name).trim(),
        bcrypt.hashSync(String(password), 10), finalRole, branch_id || null);
    res.status(201).json(withBranch(db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid)));
  } catch { res.status(400).json({ message: 'البريد مستخدم مسبقاً' }); }
});
app.put('/api/users/:id', auth, finance, (req, res) => {
  const { email, full_name, role, branch_id, active, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ message: 'المستخدم غير موجود' });
  const finalRole = role === 'finance' ? 'accountant' : (role || u.role);
  if (finalRole === 'cashier' && !branch_id) return res.status(400).json({ message: 'الكاشير يجب أن يكون مرتبطاً بفرع' });
  try {
    db.prepare('UPDATE users SET email=?,full_name=?,role=?,branch_id=?,active=? WHERE id=?')
      .run(String(email || u.email).trim(), String(full_name || u.full_name).trim(), finalRole,
        branch_id || null, active === false ? 0 : 1, u.id);
    if (password) db.prepare('UPDATE users SET password_hash=? WHERE id=?')
      .run(bcrypt.hashSync(String(password), 10), u.id);
    res.json(withBranch(db.prepare('SELECT * FROM users WHERE id=?').get(u.id)));
  } catch { res.status(400).json({ message: 'البريد مستخدم مسبقاً' }); }
});
app.delete('/api/users/:id', auth, finance, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'لا يمكن حذف حسابك' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'تم حذف المستخدم' });
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
  // لا نعتمد على العدد (قد يكون حُذف سجل فيتكرر الرقم) — نأخذ أكبر raqam مستخدم + 1
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
  if (!i) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
  res.json(i);
});

// الكاشير: إدخال فقط — الفرع يُؤخذ من حسابه ويُ تجاهل أي فرع مرسل من الواجهة
app.post('/api/invoices', auth, (req, res) => {
  const b = req.body || {};
  const branchId = isAcc(req.user.role) ? (b.branch_id || req.user.branch_id) : req.user.branch_id;
  if (!branchId) return res.status(400).json({ message: 'اختر الفرع أو راجع المحاسب' });
  if (!db.prepare('SELECT id FROM branches WHERE id=? AND active=1').get(branchId))
    return res.status(400).json({ message: 'الفرع غير نشط — راجع المحاسب' });
  const id = db.transaction(() => {
    const info = db.prepare(`INSERT INTO invoices
      (code,user_id,branch_id,invoice_date,day_name,notes,totals)
      VALUES (?,?,?,?,?,?,?)`).run(nextCode(), req.user.id, branchId, ...invoiceFields(b));
    saveLines(info.lastInsertRowid, b);
    return info.lastInsertRowid;
  })();
  res.status(201).json({ id, code: db.prepare('SELECT code FROM invoices WHERE id=?').get(id).code,
    message: 'تم إدخال الفاتورة بنجاح' });
});

// المحاسب فقط: تعديل/حذف/إدخال كامل
app.put('/api/invoices/:id', auth, finance, (req, res) => {
  const i = R.getInvoice(db, req.params.id, req.user);
  if (!i) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
  const b = req.body || {};
  db.transaction(() => {
    const branchId = b.branch_id || i.branch_id;
    db.prepare(`UPDATE invoices SET branch_id=?,invoice_date=?,day_name=?,notes=?,totals=? WHERE id=?`)
      .run(branchId, ...invoiceFields(b), i.id);
    saveLines(i.id, b);
  })();
  res.json({ message: 'تم حفظ التعديلات' });
});
app.delete('/api/invoices/:id', auth, finance, (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id=?').run(req.params.id);
  res.json({ message: 'تم حذف الفاتورة' });
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
  if (!i) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
  await R.sendWorkbook(res, await R.workbookForInvoice(i), `fatura-${i.code}.xlsx`);
});
app.get('/api/exports/field.xlsx', auth, finance, async (req, res) => {
  const rep = R.fieldReport(db, req.query.field, req.query, req.user);
  if (!rep.field) return res.status(400).json({ message: 'حقل غير صالح' });
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
  res.status(500).json({ message: err.message || 'خطأ في الخادم' });
});
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
