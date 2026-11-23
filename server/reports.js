const ExcelJS = require('exceljs');

const FIELDS = [
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

const LIST_HEADERS = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const SHIFT_HEADERS = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي الدخل'];

function buildFilter(filters = {}, user) {
  const clauses = [];
  const params = [];
  if (user && user.role === 'cashier') { clauses.push('i.user_id = ?'); params.push(user.id); }
  const map = {
    branchId: 'i.branch_id = ?',
    userId: 'i.user_id = ?',
    from: 'date(i.invoice_date) >= date(?)',
    to: 'date(i.invoice_date) <= date(?)',
  };
  Object.keys(map).forEach((k) => {
    const v = filters[k];
    if (v === undefined || v === null || v === '') return;
    clauses.push(map[k]); params.push(v);
  });
  if (filters.q) {
    clauses.push('(i.code LIKE ? OR i.invoice_date LIKE ? OR i.day_name LIKE ? OR i.notes LIKE ? OR b.name LIKE ? OR u.full_name LIKE ?)');
    const q = `%${filters.q}%`;
    params.push(q, q, q, q, q, q);
  }
  return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', params };
}

const SELECT = `SELECT i.*, b.name AS branch_name, u.full_name AS user_name,
  (SELECT r.supplier FROM invoice_rows r WHERE r.invoice_id=i.id AND r.section='listB'
   ORDER BY r.row_index LIMIT 1) AS first_supplier
  FROM invoices i JOIN branches b ON b.id=i.branch_id JOIN users u ON u.id=i.user_id`;
function listInvoices(db, filters, user) {
  const { where, params } = buildFilter(filters, user);
  return db.prepare(`${SELECT} ${where} ORDER BY date(i.invoice_date) DESC, i.id DESC`).all(...params);
}
function getInvoice(db, id, user) {
  const { where, params } = buildFilter({}, user);
  const rows = db.prepare(`${SELECT} ${where} ${where ? 'AND' : 'WHERE'} i.id = ?`).all(...params, id);
  if (!rows.length) return null;
  const invoice = rows[0];
  const listA = db.prepare(`SELECT * FROM invoice_rows WHERE invoice_id=? AND section='listA' ORDER BY row_index`).all(id);
  const listB = db.prepare(`SELECT * FROM invoice_rows WHERE invoice_id=? AND section='listB' ORDER BY row_index`).all(id);
  const shifts = db.prepare(`SELECT * FROM shift_rows WHERE invoice_id=? ORDER BY row_index`).all(id);
  let totals = {};
  try { totals = JSON.parse(invoice.totals || '{}'); } catch { totals = {}; }
  return { ...invoice, totals, listA, listB, shifts };
}
function fieldReport(db, fieldKey, filters, user) {
  const invoices = listInvoices(db, filters, user);
  const field = FIELDS.find((f) => f.key === fieldKey);
  if (!field) return { field: null, rows: [] };
  const map = new Map();
  const add = (value, invoice) => {
    const v = (value === null || value === undefined || String(value).trim() === '') ? '(فارغ)' : String(value).trim();
    if (!map.has(v)) map.set(v, { value: v, forms: new Set(), occurrences: 0, branches: new Set(), sum: 0, numeric: true });
    const e = map.get(v);
    e.occurrences += 1; e.forms.add(invoice.id); e.branches.add(invoice.branch_name);
    const n = Number(String(v).replace(/[٬,]/g, ''));
    if (v !== '(فارغ)' && Number.isFinite(n)) e.sum += n;
    else e.numeric = false;
  };
  invoices.forEach((inv) => {
    if (!field.key.includes('.')) { add(inv[field.key], inv); return; }
    const [group, prop] = field.key.split('.');
    if (group === 'listA' || group === 'listB') {
      db.prepare('SELECT * FROM invoice_rows WHERE invoice_id=? AND section=?').all(inv.id, group)
        .forEach((r) => add(r[prop], inv));
    } else if (group === 'shift') {
      db.prepare('SELECT * FROM shift_rows WHERE invoice_id=?').all(inv.id)
        .forEach((r) => add(r[prop], inv));
    }
  });
  const rows = [...map.values()].map((e) => ({
    value: e.value, forms: e.forms.size, occurrences: e.occurrences,
    branches: [...e.branches].join('، '), sum: e.numeric ? e.sum : null,
  })).sort((a, b) => b.occurrences - a.occurrences);
  return { field, rows };
}

const TITLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E2D7' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8D1C3' } };
const BORDER = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
function title(ws, range, text) {
  ws.mergeCells(range);
  const c = ws.getCell(range.split(':')[0]);
  c.value = text; c.fill = TITLE_FILL;
  c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15, name: 'Arial' };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;
}
function head(row, fill = HEAD_FILL) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = fill; cell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = BORDER;
  });
}
function body(ws, headerRow) {
  ws.views = [{ rightToLeft: true, showGridLines: true }];
  ws.eachRow((row, i) => {
    if (i <= headerRow) return;
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER; cell.font = { name: 'Arial', size: 10 };
    });
  });
}
function widths(ws, arr) { arr.forEach((w, i) => { ws.getColumn(i + 1).width = w; }); }

async function workbookForInvoices(invoices) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('فواتير الفرع');
  title(ws, 'A1:H1', 'تفاصيل فواتير الفرع — التقرير');
  ws.addRow([]);
  ws.addRow(['رقم النموذج', 'الفرع', 'الكاشير', 'التاريخ', 'اليوم', 'إجمالي الفواتير (1)', 'إجمالي الفواتير (2)', 'إجمالي الدخل']);
  head(ws.getRow(3));
  invoices.forEach((i) => {
    let t = {}; try { t = JSON.parse(i.totals || '{}'); } catch { /* ignore */ }
    ws.addRow([i.code, i.branch_name, i.user_name, i.invoice_date, i.day_name,
      t.listA?.invoices || '', t.listB?.invoices || '', t.shifts?.total_amount || '']);
  });
  widths(ws, [18, 22, 18, 14, 14, 18, 18, 18]); body(ws, 3);
  return wb;
}
async function workbookForInvoice(inv) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'نظام فواتير الفرع';
  const ws = wb.addWorksheet('نموذج الفرع');
  ws.views = [{ rightToLeft: true, showGridLines: true }];
  ws.mergeCells('A1:F1');
  const c = ws.getCell('A1'); c.value = 'تفاصيل فواتير الفرع'; c.fill = TITLE_FILL;
  c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15, name: 'Arial' };
  c.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 30;

  const addList = (list, totals) => {
    ws.addRow([]); ws.addRow(LIST_HEADERS); head(ws.getRow(ws.rowCount));
    (list || []).forEach((r) => ws.addRow([r.supplier, r.invoices, r.payments, r.remaining, r.notes]));
    ws.addRow(['الإجمالي', totals?.invoices || '', totals?.payments || '', totals?.remaining || '', '']);
    head(ws.getRow(ws.rowCount), TOTAL_FILL);
  };
  addList(inv.listA, inv.totals?.listA);
  ws.addRow([]);
  ws.addRow(['', '', `اسم الفرع: ${inv.branch_name}`, `التاريخ: ${inv.invoice_date}`, `اليوم: ${inv.day_name}`, '']);
  ws.addRow(['', '', 'الكاشير', inv.user_name, '', '']);
  ws.addRow([]);
  ws.addRow(SHIFT_HEADERS); head(ws.getRow(ws.rowCount));
  (inv.shifts || []).forEach((r) => ws.addRow([r.shift_label, r.total_cash, r.network,
    r.branch_expense, r.net_cash, r.total_amount]));
  const st = inv.totals?.shifts || {};
  ws.addRow(['الإجمالي', st.total_cash || '', st.network || '', st.branch_expense || '', st.net_cash || '', st.total_amount || '']);
  head(ws.getRow(ws.rowCount), TOTAL_FILL);
  addList(inv.listB, inv.totals?.listB);
  if (inv.totals?.difference) ws.addRow(['الفرق بين إجمالي المصروفات والفرع (الصرف)', inv.totals.difference.text]);
  widths(ws, [31, 15, 15, 15, 15, 22]);
  body(ws, 1);
  return wb;
}
async function workbookForField(field, rows) {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('تقرير الحقل');
  title(ws, 'A1:E1', `تقرير حقل: ${field.label}`);
  ws.addRow(['القيمة', 'عدد النماذج', 'عدد السجلات', 'المجاميع', 'الفروع']); head(ws.getRow(2));
  rows.forEach((r) => ws.addRow([r.value, r.forms, r.occurrences, r.sum === null ? '' : r.sum, r.branches]));
  widths(ws, [38, 16, 16, 18, 40]); body(ws, 2);
  return wb;
}
async function sendWorkbook(res, wb, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  await wb.xlsx.write(res); res.end();
}
module.exports = { FIELDS, LIST_HEADERS, SHIFT_HEADERS, buildFilter, listInvoices, getInvoice, fieldReport,
  workbookForInvoices, workbookForInvoice, workbookForField, sendWorkbook };
