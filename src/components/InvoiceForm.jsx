import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Send, Calculator, CalendarDays, Store, Sun, Moon } from 'lucide-react';

const LIST_HEADERS = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const LIST_KEYS = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
const SHIFT_HEADERS = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي المبلغ'];
const SHIFT_KEYS = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];

const num = (v) => { const n = Number(String(v ?? '').replace(/[٬,]/g, '')); return Number.isFinite(n) ? n : 0; };
const calc = (a, b) => {
  if (String(a ?? '').trim() === '' && String(b ?? '').trim() === '') return '';
  return String(num(a) - num(b));
};
const sum = (rows, key) => String(rows.reduce((t, r) => t + num(r[key]), 0));
const blank = () => ({ supplier: '', invoices: '', payments: '', remaining: '', notes: '' });
const blankShift = (shift_label = '') => ({
  shift_label, total_cash: '', network: '', branch_expense: '', net_cash: '', total_amount: '',
});
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const dayName = (d) => {
  const date = d ? new Date(d) : new Date();
  return Number.isNaN(date.getTime()) ? '' : DAYS[date.getDay()];
};

function emptyForm(branchName) {
  const date = new Date().toISOString().slice(0, 10);
  return {
    invoice_date: date, day_name: dayName(date), notes: '',
    listA: Array.from({ length: 10 }, blank),
    listB: Array.from({ length: 10 }, blank),
    shifts: [blankShift('صباحي'), blankShift('مسائي')],
    branchName,
  };
}

export default function InvoiceForm({ initial, onSubmit, branchName, preview = false, submitLabel = 'حفظ النموذج' }) {
  const [form, setForm] = useState(() => initial ? {
    ...emptyForm(branchName), ...initial,
    listA: initial.listA?.length ? initial.listA : emptyForm(branchName).listA,
    listB: initial.listB?.length ? initial.listB : emptyForm(branchName).listB,
    shifts: initial.shifts?.length ? initial.shifts : emptyForm(branchName).shifts,
  } : emptyForm(branchName));
  const [busy, setBusy] = useState(false);

  const setField = (k, v) => setForm((f) => ({
    ...f, [k]: v, ...(k === 'invoice_date' ? { day_name: dayName(v) } : {}),
  }));
  const setCell = (key, i, k, v) => setForm((f) => ({
    ...f, [key]: f[key].map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, [k]: v };
      if (key === 'listA' || key === 'listB') {
        if (k === 'invoices' || k === 'payments') next.remaining = calc(next.invoices, next.payments);
      }
      if (key === 'shifts') {
        if (k === 'total_cash' || k === 'branch_expense') next.net_cash = calc(next.total_cash, next.branch_expense);
        if (k === 'total_cash' || k === 'branch_expense' || k === 'network') {
          next.total_amount = String(num(next.net_cash) + num(next.network));
        }
      }
      return next;
    }),
  }));
  const addRow = (key, make) => setForm((f) => ({ ...f, [key]: [...f[key], make()] }));
  const delRow = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));

  const totals = useMemo(() => ({
    listA: { invoices: sum(form.listA, 'invoices'), payments: sum(form.listA, 'payments'), remaining: sum(form.listA, 'remaining') },
    listB: { invoices: sum(form.listB, 'invoices'), payments: sum(form.listB, 'payments'), remaining: sum(form.listB, 'remaining') },
    shifts: Object.fromEntries(SHIFT_KEYS.filter((k) => k !== 'shift_label').map((k) => [k, sum(form.shifts, k)])),
  }), [form]);

  const submit = async (e) => {
    e?.preventDefault();
    if (preview) return;
    setBusy(true);
    try {
      await onSubmit({
        invoice_date: form.invoice_date, day_name: form.day_name, notes: form.notes,
        listA: form.listA, listB: form.listB, shifts: form.shifts, totals,
      });
      if (!initial) setForm(emptyForm(branchName));
    } finally { setBusy(false); }
  };

  const ListTable = ({ keyName, t }) => (
    <div className="sheet-table">
      <table className="sheet-grid list-grid">
        <thead><tr>
          {LIST_HEADERS.map((h, i) => <th key={h} className={i === 3 ? 'calc-col' : ''}>{h}</th>)}
          <th className="act-col"></th>
        </tr></thead>
        <tbody>
          {form[keyName].map((r, i) => <tr key={i}>
            {LIST_KEYS.map((k, ki) => (
              <td key={k} className={ki === 3 ? 'calc-col' : ''}>
                <input value={r[k] ?? ''} inputMode={ki === 1 || ki === 2 ? 'decimal' : 'text'}
                  onChange={(e) => setCell(keyName, i, k, e.target.value)} />
              </td>
            ))}
            <td className="act-col"><button type="button" className="sheet-del" title="حذف الصف"
              onClick={() => delRow(keyName, i)}><Trash2 size={14} /></button></td>
          </tr>)}
        </tbody>
        <tfoot><tr>
          <td>الإجمالي</td>
          <td><b>{t.invoices}</b></td><td><b>{t.payments}</b></td><td className="calc-col"><b>{t.remaining}</b></td>
          <td></td><td className="act-col"></td>
        </tr></tfoot>
      </table>
      <button type="button" className="add-row" onClick={() => addRow(keyName, blank)}><Plus size={13} /> إضافة صف</button>
    </div>
  );

  const ShiftTable = () => (
    <div className="sheet-table shift-block">
      <table className="sheet-grid shift-grid">
        <thead><tr>{SHIFT_HEADERS.map((h) => <th key={h}>{h}</th>)}<th className="act-col"></th></tr></thead>
        <tbody>
          {form.shifts.map((r, i) => <tr key={i}>
            {SHIFT_KEYS.map((k, ki) => (
              <td key={k} className={ki >= 4 ? 'calc-col' : ''}>
                {ki === 0 ? (
                  <div className="shift-label">
                    {r.shift_label === 'صباحي' ? <Sun size={15} /> : r.shift_label === 'مسائي' ? <Moon size={15} /> : null}
                    <input value={r.shift_label} onChange={(e) => setCell('shifts', i, k, e.target.value)} />
                  </div>
                ) : (
                  <input value={r[k] ?? ''} inputMode="decimal" readOnly={ki >= 4}
                    onChange={(e) => setCell('shifts', i, k, e.target.value)} />
                )}
              </td>
            ))}
            <td className="act-col"><button type="button" className="sheet-del" onClick={() => delRow('shifts', i)}>
              <Trash2 size={14} /></button></td>
          </tr>)}
        </tbody>
        <tfoot><tr>
          <td>الإجمالي</td>
          {SHIFT_KEYS.slice(1).map((k) => <td key={k}><b>{totals.shifts[k]}</b></td>)}
          <td className="act-col"></td>
        </tr></tfoot>
      </table>
      <button type="button" className="add-row" onClick={() => addRow('shifts', () => blankShift())}><Plus size={13} /> إضافة شفت</button>
    </div>
  );

  return (
    <form className="invoice-sheet" onSubmit={submit}>
      <div className="sheet-banner">
        <div className="sheet-banner-title"><span className="gold-line" /> تفاصيل فواتير الفرع</div>
        <div className="sheet-banner-sub">{preview ? 'معاينة شاشة الإدخال — الإدخال الفعلي بحساب الكاشير' : 'أدخل بيانات الفواتير والمصروفات عن اليوم'}</div>
      </div>

      <ListTable keyName="listA" t={totals.listA} />

      <div className="sheet-meta">
        <div className="meta-card">
          <div className="meta-label"><Store size={15} /> اسم الفرع /</div>
          <input value={branchName || ''} readOnly />
        </div>
        <div className="meta-card">
          <div className="meta-label"><CalendarDays size={15} /> التاريخ /</div>
          <input type="date" value={form.invoice_date} onChange={(e) => setField('invoice_date', e.target.value)} />
        </div>
        <div className="meta-card">
          <div className="meta-label"><Calculator size={15} /> اليوم /</div>
          <input value={form.day_name} readOnly />
        </div>
      </div>

      <ShiftTable />

      <div className="sheet-banner second">
        <div className="sheet-banner-title"><span className="gold-line" /> تفاصيل فواتير الفرع</div>
        <div className="sheet-banner-sub">القائمة الثانية — إدخال إضافي لنفس اليوم</div>
      </div>
      <ListTable keyName="listB" t={totals.listB} />

      <div className="sheet-submit">
        <div className="sheet-hint">
          <Calculator size={16} /> الحقول المحسوبة (الباقي، صافي الكاش، إجمالي المبلغ) تتحدث تلقائياً أثناء الإدخال.
        </div>
        {preview
          ? <button className="btn btn-ghost" type="button" disabled><Send size={16} /> معاينة فقط</button>
          : <button className="btn sheet-submit-btn" type="submit" disabled={busy}>
              <Send size={17} /> {busy ? 'جاري الحفظ...' : submitLabel}
            </button>}
      </div>
    </form>
  );
}
