import { D1Database } from '@cloudflare/workers-types';

export interface Filters {
  branchId?: string;
  userId?: string;
  date?: string;
  from?: string;
  to?: string;
  shift?: string;
  income?: string;
  remaining?: string;
  net?: string;
  incomeMin?: string;
  incomeMax?: string;
  expenseMin?: string;
  expenseMax?: string;
  invoiceMin?: string;
  invoiceMax?: string;
  paymentsMin?: string;
  paymentsMax?: string;
  remainingMin?: string;
  remainingMax?: string;
  notes?: string;
  q?: string;
}

export interface User {
  id: number;
  role: string;
  branch_id: number | null;
}

export const FIELDS = [
  { key: 'branch_name', label: 'الفرع', group: 'البيانات الأساسية' },
  { key: 'user_name', label: 'الكاشير', group: 'البيانات الأساسية' },
  { key: 'code', label: 'رقم النموذج', group: 'البيانات الأساسية' },
  { key: 'invoice_date', label: 'التاريخ', group: 'البيانات الأساسية' },
  { key: 'day_name', label: 'اليوم', group: 'البيانات الأساسية' },
  { key: 'notes', label: 'ملاحظات', group: 'البيانات الأساسية' },
  ...['listA', 'listB'].flatMap((s, i) => ([
    { key: `${s}.supplier`, label: `المورد أو بيان الصرف (${i + 1})`, group: `تفاصيل فواتير الفرع ${i + 1}` },
    { key: `${s}.invoices`, label: `الفواتير (${i + 1})`, group: `تفاصيل فواتير الفرع ${i + 1}` },
    { key: `${s}.payments`, label: `المدفوعات (${i + 1})`, group: `تفاصيل فواتير الفرع ${i + 1}` },
    { key: `${s}.remaining`, label: `الباقي (${i + 1})`, group: `تفاصيل فواتير الفرع ${i + 1}` },
    { key: `${s}.notes`, label: `ملاحظات القائمة ${i + 1}`, group: `تفاصيل فواتير الفرع ${i + 1}` },
  ])),
  { key: 'shift.shift_label', label: 'الشفت', group: 'الشفت' },
  { key: 'shift.total_cash', label: 'إجمالي الكاش', group: 'الشفت' },
  { key: 'shift.network', label: 'الشبكة', group: 'الشفت' },
  { key: 'shift.branch_expense', label: 'الفرع (الصرف)', group: 'الشفت' },
  { key: 'shift.net_cash', label: 'صافي الكاش', group: 'الشفت' },
  { key: 'shift.total_amount', label: 'إجمالي الدخل', group: 'الشفت' },
];

const SELECT = `SELECT i.*, b.name AS branch_name, u.full_name AS user_name,
  (SELECT r.supplier FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'
   ORDER BY r.row_index LIMIT 1) AS first_supplier
  FROM invoices i JOIN branches b ON b.id=i.branch_id JOIN users u ON u.id=i.user_id`;

export function buildFilter(filters: Filters, user: User) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (user && user.role === 'cashier') {
    clauses.push('i.user_id = ?');
    params.push(user.id);
  }

  const map: Record<string, string | ((v: string) => string)> = {
    branchId: 'i.branch_id = ?',
    userId: 'i.user_id = ?',
    date: "date(i.invoice_date) = date(?)",
    from: "date(i.invoice_date) >= date(?)",
    to: "date(i.invoice_date) <= date(?)",
    shift: "EXISTS (SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND s.shift_label=?)",
    income: (v) => v === 'cash'
      ? "EXISTS (SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND CAST(REPLACE(s.total_cash,',','') AS REAL)>0)"
      : "EXISTS (SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND CAST(REPLACE(s.network,',','') AS REAL)>0)",
    remaining: (v) => v === 'due'
      ? "EXISTS (SELECT 1 FROM invoice_rows r WHERE r.invoice_id=i.id AND CAST(REPLACE(COALESCE(r.remaining,'0'),'٬','') AS REAL)>0)"
      : v === 'over'
        ? "EXISTS (SELECT 1 FROM invoice_rows r WHERE r.invoice_id=i.id AND CAST(REPLACE(COALESCE(r.remaining,'0'),'٬','') AS REAL)<0)"
        : "NOT EXISTS (SELECT 1 FROM invoice_rows r WHERE r.invoice_id=i.id AND CAST(REPLACE(COALESCE(r.remaining,'0'),'٬','') AS REAL)<>0)",
    net: (v) => v === 'plus'
      ? "EXISTS (SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND CAST(REPLACE(COALESCE(s.net_cash,'0'),'٬','') AS REAL)>0)"
      : "EXISTS (SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND CAST(REPLACE(COALESCE(s.net_cash,'0'),'٬','') AS REAL)<0)",
  };

  Object.keys(map).forEach((k) => {
    const v = filters[k as keyof Filters];
    if (v === undefined || v === null || v === '') return;
    const clause = typeof map[k] === 'function' ? map[k](v) : map[k];
    clauses.push(clause);
    if (typeof map[k] !== 'function') params.push(v);
  });

  const amount = (v: string | undefined) => {
    const n = Number(String(v ?? '').replace(/[٬,]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const ranges = [
    ['incomeMin', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(s.total_amount,'0'),'٬','') AS REAL)) FROM shift_rows s WHERE s.invoice_id=i.id),0) >= ?"],
    ['incomeMax', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(s.total_amount,'0'),'٬','') AS REAL)) FROM shift_rows s WHERE s.invoice_id=i.id),0) <= ?"],
    ['expenseMin', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(s.branch_expense,'0'),'٬','') AS REAL)) FROM shift_rows s WHERE s.invoice_id=i.id),0) >= ?"],
    ['expenseMax', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(s.branch_expense,'0'),'٬','') AS REAL)) FROM shift_rows s WHERE s.invoice_id=i.id),0) <= ?"],
    ['invoiceMin', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.invoices,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) >= ?"],
    ['invoiceMax', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.invoices,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) <= ?"],
    ['paymentsMin', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.payments,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) >= ?"],
    ['paymentsMax', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.payments,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) <= ?"],
    ['remainingMin', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.remaining,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) >= ?"],
    ['remainingMax', "COALESCE((SELECT SUM(CAST(REPLACE(COALESCE(r.remaining,'0'),'٬','') AS REAL)) FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'),0) <= ?"],
  ];

  ranges.forEach(([key, clause]) => {
    const v = filters[key as keyof Filters];
    if (v === undefined || v === null || v === '') return;
    clauses.push(clause);
    params.push(amount(v));
  });

  if (filters.notes) {
    const n = `%${filters.notes}%`;
    clauses.push('(i.notes LIKE ? OR EXISTS (SELECT 1 FROM invoice_rows r WHERE r.invoice_id=i.id AND r.notes LIKE ?))');
    params.push(n, n);
  }

  if (filters.q) {
    clauses.push(`(i.code LIKE ? OR i.invoice_date LIKE ? OR i.day_name LIKE ? OR i.notes LIKE ?
      OR b.name LIKE ? OR u.full_name LIKE ? OR EXISTS (
        SELECT 1 FROM invoice_rows r WHERE r.invoice_id=i.id
        AND (r.supplier LIKE ? OR r.notes LIKE ? OR r.invoices LIKE ? OR r.payments LIKE ? OR r.remaining LIKE ?))
      OR EXISTS (
        SELECT 1 FROM shift_rows s WHERE s.invoice_id=i.id AND
        (s.total_cash LIKE ? OR s.network LIKE ? OR s.branch_expense LIKE ? OR s.net_cash LIKE ? OR s.total_amount LIKE ?))
      OR i.totals LIKE ?)`);
    const q = `%${filters.q}%`;
    params.push(q, q, q, q, q, q, q, q, q, q, q, q, q, q, q, q, q);
  }

  return {
    where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
    params,
  };
}

export async function listInvoices(db: D1Database, filters: Filters, user: User) {
  const { where, params } = buildFilter(filters, user);
  const sql = `${SELECT} ${where} ORDER BY date(i.invoice_date) DESC, i.id DESC`;
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    return (await stmt.bind(...params).all()).results;
  }
  return (await stmt.all()).results;
}

export async function getInvoice(db: D1Database, id: string, user: User) {
  const { where, params } = buildFilter({}, user);
  const baseParams = [...params, id];
  const whereClause = where ? `${where} AND` : 'WHERE';
  const sql = `${SELECT} ${whereClause} i.id = ?`;
  const stmt = db.prepare(sql).bind(...baseParams);
  const result = await stmt.all();
  if (!result.results.length) return null;

  const invoice = result.results[0];

  const listA = (await db.prepare(`SELECT * FROM invoice_rows WHERE invoice_id=? AND section='listA' ORDER BY row_index`).bind(id).all()).results;
  const listB = (await db.prepare(`SELECT * FROM invoice_rows WHERE invoice_id=? AND section='listB' ORDER BY row_index`).bind(id).all()).results;
  const shifts = (await db.prepare(`SELECT * FROM shift_rows WHERE invoice_id=? ORDER BY row_index`).bind(id).all()).results;

  let totals = {};
  try { totals = JSON.parse(invoice.totals || '{}'); } catch { totals = {}; }

  return { ...invoice, totals, listA, listB, shifts };
}

export async function nextCode(db: D1Database) {
  const y = new Date().getFullYear();
  const row = await db.prepare(`SELECT code FROM invoices WHERE code LIKE ? ORDER BY CAST(SUBSTR(code, 10) AS INTEGER) DESC LIMIT 1`).bind(`FKH-${y}-%`).first<{ code: string }>();
  const m = row && row.code.match(/-(\d+)$/);
  const n = m ? Number(m[1]) + 1 : 1;
  return `FKH-${y}-${String(n).padStart(4, '0')}`;
}

export function invoiceFields(b: any) {
  return [String(b.invoice_date || ''), String(b.day_name || ''), String(b.notes || ''), JSON.stringify(b.totals || {})];
}

export async function saveLines(tx: any, id: number, b: any) {
  await tx.prepare('DELETE FROM invoice_rows WHERE invoice_id=?').bind(id).run();
  await tx.prepare('DELETE FROM shift_rows WHERE invoice_id=?').bind(id).run();

  const ri = tx.prepare(`INSERT INTO invoice_rows
    (invoice_id, section, row_index, supplier, invoices, payments, remaining, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  for (const sec of ['listA', 'listB']) {
    const rows = normRows(b[sec]);
    for (const r of rows as any[]) {
      await ri.bind(id, sec, r.row_index, r.supplier, r.invoices, r.payments, r.remaining, r.notes).run();
    }
  }

  const rs = tx.prepare(`INSERT INTO shift_rows
    (invoice_id, row_index, shift_label, total_cash, network, branch_expense, net_cash, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  for (const r of normShifts(b.shifts) as any[]) {
    await rs.bind(id, r.row_index, r.shift_label, r.total_cash, r.network, r.branch_expense, r.net_cash, r.total_amount).run();
  }
}

function normRows(arr: any[]) {
  if (!Array.isArray(arr)) return [];
  const keys = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
  return arr.map((r, i) => {
    const o: any = { row_index: i };
    keys.forEach((k) => { o[k] = String(r[k] || ''); });
    return o;
  }).filter((r) => keys.some((k) => r[k].trim() !== ''));
}

function normShifts(arr: any[]) {
  if (!Array.isArray(arr)) return [];
  const keys = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];
  return arr.map((r, i) => {
    const o: any = { row_index: i };
    keys.forEach((k) => { o[k] = String(r[k] || ''); });
    return o;
  }).filter((r) => keys.some((k) => r[k].trim() !== ''));
}

const num = (v: any) => { const n = Number(String(v ?? '').replace(/[٬,]/g, '')); return Number.isFinite(n) ? n : 0; };

export async function supplierReport(db: D1Database, filters: Filters, user: User) {
  const invoices = await listInvoices(db, filters, user);
  const map = new Map<string, any>();

  for (const inv of invoices) {
    const rows = (await db.prepare(`SELECT * FROM invoice_rows WHERE invoice_id=? AND section='listB' ORDER BY row_index`).bind(inv.id).all()).results;
    for (const r of rows) {
      const name = String(r.supplier || '').trim();
      if (!name) continue;

      if (!map.has(name)) {
        map.set(name, { supplier: name, invoices: 0, payments: 0, remaining: 0, count: 0, branches: new Set(), cashiers: new Set(), lastDate: '', codes: [] });
      }
      const e = map.get(name);
      e.invoices += num(r.invoices);
      e.payments += num(r.payments);
      e.remaining += num(r.remaining);
      e.count += 1;
      e.branches.add(inv.branch_name);
      e.cashiers.add(inv.user_name);
      if (inv.invoice_date > e.lastDate) e.lastDate = inv.invoice_date;
      if (e.codes.length < 5) e.codes.push(inv.code);
    }
  }

  return [...map.values()]
    .map((e) => ({ ...e, branches: [...e.branches].join('، '), cashiers: [...e.cashiers].join('، ') }))
    .filter((e) => Math.abs(e.remaining) > 0.001)
    .sort((a, b) => Math.abs(b.remaining) - Math.abs(a.remaining));
}

export async function cashNetworkReport(db: D1Database, filters: Filters, user: User) {
  const invoices = await listInvoices(db, filters, user);
  const rows: any[] = [];
  const totals = { cash: 0, network: 0, expense: 0, net: 0, income: 0 };
  const shiftFilter = String(filters.shift || '').trim();
  const incomeFilter = String(filters.income || '').trim();
  const netFilter = String(filters.net || '').trim();

  for (const inv of invoices) {
    const shifts = (await db.prepare('SELECT * FROM shift_rows WHERE invoice_id=? ORDER BY row_index').bind(inv.id).all()).results;
    for (const s of shifts) {
      if (shiftFilter && s.shift_label !== shiftFilter) continue;
      if (incomeFilter === 'cash' && num(s.total_cash) <= 0) continue;
      if (incomeFilter === 'network' && num(s.network) <= 0) continue;
      if (netFilter === 'plus' && num(s.net_cash) <= 0) continue;
      if (netFilter === 'minus' && num(s.net_cash) >= 0) continue;

      const row = {
        code: inv.code, branch: inv.branch_name, cashier: inv.user_name,
        date: inv.invoice_date, day: inv.day_name, shift: s.shift_label,
        cash: num(s.total_cash), network: num(s.network), expense: num(s.branch_expense),
        net: num(s.net_cash), income: num(s.total_amount),
      };
      rows.push(row);
      Object.keys(totals).forEach((k) => { totals[k as keyof typeof totals] += row[k as keyof typeof row]; });
    }
  }
  return { rows, totals };
}

export async function fieldReport(db: D1Database, fieldKey: string, filters: Filters, user: User) {
  const invoices = await listInvoices(db, filters, user);
  const field = FIELDS.find((f) => f.key === fieldKey);
  if (!field) return { field: null, rows: [] };

  const map = new Map<string, any>();
  const add = (value: any, invoice: any) => {
    const v = (value === null || value === undefined || String(value).trim() === '') ? '(فارغ)' : String(value).trim();
    if (!map.has(v)) map.set(v, { value: v, forms: new Set(), occurrences: 0, branches: new Set(), sum: 0, numeric: true });
    const e = map.get(v);
    e.occurrences += 1;
    e.forms.add(invoice.id);
    e.branches.add(invoice.branch_name);
    const n = Number(String(v).replace(/[٬,]/g, ''));
    if (v !== '(فارغ)' && Number.isFinite(n)) e.sum += n;
    else e.numeric = false;
  };

  for (const inv of invoices) {
    if (!field.key.includes('.')) {
      add(inv[field.key], inv);
      continue;
    }
    const [group, prop] = field.key.split('.');
    if (group === 'listA' || group === 'listB') {
      const rows = (await db.prepare('SELECT * FROM invoice_rows WHERE invoice_id=? AND section=?').bind(inv.id, group).all()).results;
      rows.forEach((r: any) => add(r[prop], inv));
    } else if (group === 'shift') {
      const rows = (await db.prepare('SELECT * FROM shift_rows WHERE invoice_id=?').bind(inv.id).all()).results;
      rows.forEach((r: any) => add(r[prop], inv));
    }
  }

  const rows = [...map.values()].map((e) => ({
    value: e.value, forms: e.forms.size, occurrences: e.occurrences,
    branches: [...e.branches].join('، '), sum: e.numeric ? e.sum : null,
  })).sort((a, b) => b.occurrences - a.occurrences);

  return { field, rows };
}
