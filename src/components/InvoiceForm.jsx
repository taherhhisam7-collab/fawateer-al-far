import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Send, Calculator, CalendarDays, Store, Sun, Moon } from 'lucide-react';
import DatePicker from './DatePicker.jsx';
import { fmtDate } from '../utils';

const LIST_HEADERS = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const LIST_SUBS = ['', '(إجمالي مبلغ الفاتورة)', '(المبلغ المدفوع)', '(المتبقي من الفاتورة بعد خصم المدفوع)', ''];
const LIST_KEYS = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
const SHIFT_HEADERS = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي الدخل'];
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

/* مكوّنات خارجية ثابتة — حتى لا يُعاد تركيب الإدخال عند كل حرف */
function ListTable({ rows, totals, onCell, onDel, onAdd, readOnly }) {
  return (
    <div className="sheet-table">
      <table className="sheet-grid list-grid">
        <colgroup>
          <col style={{ width: '30%' }} /><col style={{ width: '17%' }} /><col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} /><col style={{ width: '19%' }} /><col style={{ width: 36 }} />
        </colgroup>
        <thead><tr>
          {LIST_HEADERS.map((h, i) => <th key={h} className={i === 3 ? 'calc-col' : ''}>
            {h}{LIST_SUBS[i] && <small className="th-sub">{LIST_SUBS[i]}</small>}
          </th>)}
          <th className="act-col"></th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {LIST_KEYS.map((k, ki) => (
                <td key={k} className={ki === 3 ? 'calc-col' : ''}>
                  <input value={r[k] ?? ''} disabled={readOnly}
                    inputMode={ki === 1 || ki === 2 || ki === 3 ? 'decimal' : 'text'}
                    dir={ki === 1 || ki === 2 || ki === 3 ? 'ltr' : 'rtl'}
                    className={ki === 1 || ki === 2 || ki === 3 ? 'num-input' : ''}
                    onChange={(e) => onCell(i, k, e.target.value)} />
                </td>
              ))}
              <td className="act-col">{!readOnly && <button type="button" className="sheet-del" title="حذف الصف"
                onClick={() => onDel(i)}><Trash2 size={14} /></button>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr>
          <td>الإجمالي</td>
          <td><b>{totals.invoices}</b></td><td><b>{totals.payments}</b></td>
          <td className="calc-col"><b>{totals.remaining}</b></td>
          <td></td><td className="act-col"></td>
        </tr></tfoot>
      </table>
      {!readOnly && <button type="button" className="add-row" onClick={onAdd}><Plus size={13} /> إضافة صف</button>}
    </div>
  );
}

function ShiftTable({ rows, totals, onCell, onDel, onAdd, readOnly }) {
  return (
    <div className="sheet-table shift-block">
      <table className="sheet-grid shift-grid">
        <colgroup>
          <col style={{ width: '14%' }} />
          {SHIFT_KEYS.slice(1).map((k) => <col key={k} style={{ width: '14.3%' }} />)}
          <col style={{ width: 36 }} />
        </colgroup>
        <thead><tr>{SHIFT_HEADERS.map((h) => <th key={h}>{h}</th>)}<th className="act-col"></th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {SHIFT_KEYS.map((k, ki) => (
                <td key={k} className={ki >= 4 ? 'calc-col' : ''}>
                  {ki === 0 ? (
                    <div className="shift-label">
                      {r.shift_label === 'صباحي' ? <Sun size={15} /> : r.shift_label === 'مسائي' ? <Moon size={15} /> : null}
                      <input value={r.shift_label} disabled={readOnly} onChange={(e) => onCell(i, k, e.target.value)} />
                    </div>
                  ) : (
                    <input value={r[k] ?? ''} inputMode="decimal" dir="ltr" className="num-input"
                      readOnly={ki >= 4 || readOnly} disabled={readOnly} onChange={(e) => onCell(i, k, e.target.value)} />
                  )}
                </td>
              ))}
              <td className="act-col">{!readOnly && <button type="button" className="sheet-del" onClick={() => onDel(i)}>
                <Trash2 size={14} /></button>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr>
          <td>الإجمالي</td>
          {SHIFT_KEYS.slice(1).map((k) => <td key={k}><b>{totals[k]}</b></td>)}
          <td className="act-col"></td>
        </tr></tfoot>
      </table>
      {!readOnly && <button type="button" className="add-row" onClick={onAdd}><Plus size={13} /> إضافة شفت</button>}
    </div>
  );
}

export default function InvoiceForm({ initial, onSubmit, branchName, branches = [], allowBranch = false, onSaved, onError, preview = false, readOnly = false, submitLabel = 'حفظ' }) {
  const [branchId, setBranchId] = useState(initial?.branch_id || '');
  const [error, setError] = useState('');
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
  const setCell = (section, i, k, v) => setForm((f) => ({
    ...f, [section]: f[section].map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, [k]: v };
      if (section === 'listA' || section === 'listB') {
        // إجمالي الفاتورة − المدفوع = المتبقي
        if (k === 'invoices' || k === 'payments') next.remaining = calc(next.invoices, next.payments);
      }
      if (section === 'shifts') {
        if (k === 'total_cash' || k === 'branch_expense') next.net_cash = calc(next.total_cash, next.branch_expense);
        if (k === 'total_cash' || k === 'branch_expense' || k === 'network') {
          next.total_amount = String(num(next.total_cash) + num(next.network));
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
    difference: (() => {
      const payments = sum(form.listB, 'payments');
      const expense = sum(form.shifts, 'branch_expense');
      const diff = num(payments) - num(expense);
      return {
        payments, expense, diff: String(diff),
        text: diff > 0 ? `زيادة في الكاش: ${diff}`
          : diff < 0 ? `عجز في الكاش: ${Math.abs(diff)}`
            : 'لا فرق — إجمالي المدفوعات يساوي إجمالي الفرع (الصرف)',
        state: diff > 0 ? 'plus' : diff < 0 ? 'minus' : 'equal',
      };
    })(),
  }), [form]);

  const submit = async (e) => {
    e?.preventDefault();
    if (preview) return;
    const msgs = [];
    if (allowBranch && !branchId) msgs.push('• لازم تختار الفرع قبل الحفظ.');
    if (!form.invoice_date) msgs.push('• لازم تحدد التاريخ (يوم / شهر / سنة).');
    const hasSupplier = form.listB.some((r) => String(r.supplier || '').trim());
    if (!hasSupplier) msgs.push('• لازم تكتب اسم المورد في سطر المورد — ما نضيف ولا نغيّر الاسم.');
    const rowMissingSupplier = form.listB.findIndex((r) =>
      !String(r.supplier || '').trim() &&
      ['invoices', 'payments', 'remaining', 'notes'].some((k) => String(r[k] || '').trim()));
    if (rowMissingSupplier >= 0) msgs.push(`• الصف ${rowMissingSupplier + 1}: لازم تكتب اسم المورد قبل باقي البيانات.`);
    const payIdx = form.listB.findIndex((r) => String(r.supplier || '').trim() && !String(r.payments || '').trim());
    if (payIdx >= 0) msgs.push(`• الصف ${payIdx + 1}: لازم تعبي مبلغ المدفوع للمورد.`);
    const invIdx = form.listB.findIndex((r) => String(r.supplier || '').trim() && !String(r.invoices || '').trim());
    if (invIdx >= 0) msgs.push(`• الصف ${invIdx + 1}: لازم تعبي إجمالي مبلغ الفاتورة.`);
    if (msgs.length) {
      setError(msgs.join('\n'));
      onError?.('في حقول إلزامية ناقصة — راجع الرسائل تحت زر الحفظ');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        branch_id: branchId || undefined, invoice_date: form.invoice_date, day_name: form.day_name, notes: form.notes,
        listA: [], listB: form.listB, shifts: form.shifts,
        totals: { ...totals, listA: { invoices: '', payments: '', remaining: '' } },
      });
      onSaved?.();
      if (!initial) setForm(emptyForm(branchName));
    } finally { setBusy(false); }
  };

  return (
    <form className="invoice-sheet" onSubmit={submit}>
      <div className="sheet-banner">
        <div className="sheet-banner-title"><span className="gold-line" /> تفاصيل فواتير الفرع</div>
        <div className="sheet-banner-sub">{preview ? 'معاينة شاشة الإدخال — الإدخال الفعلي بحساب الكاشير' : 'أدخل بيانات الفواتير والمصروفات عن اليوم'}</div>
      </div>

      <div className="sheet-actions-top">
        <span className="muted">{allowBranch ? 'المحاسب: اختر الفرع ثم احفظ' : 'الكاشير: الفرع مُثبّت بحسابك'}</span>
        {preview || readOnly
          ? <button className="btn btn-ghost btn-sm" type="button" disabled><Send size={15} /> {readOnly ? 'قراءة فقط' : 'معاينة فقط'}</button>
          : <button className="btn sheet-submit-btn btn-sm" type="submit" disabled={busy}>
              <Send size={15} /> {busy ? 'جاري الحفظ...' : 'حفظ'}
            </button>}
      </div>

      <div className="sheet-meta">
        {allowBranch ? (
          <div className="meta-card">
            <div className="meta-label"><Store size={15} /> الفرع /</div>
            <select value={branchId} disabled={readOnly} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">-- اختر الفرع --</option>
              {branches.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="meta-card">
            <div className="meta-label"><Store size={15} /> اسم الفرع /</div>
            <input value={branchName || ''} readOnly />
          </div>
        )}
        <div className="meta-card">
          <div className="meta-label"><CalendarDays size={15} /> التاريخ /</div>
          {readOnly ? <input value={fmtDate(form.invoice_date)} disabled dir="ltr" /> :
            <DatePicker value={form.invoice_date} onChange={(v) => setField('invoice_date', v)} />}
        </div>
        <div className="meta-card">
          <div className="meta-label"><Calculator size={15} /> اليوم /</div>
          <input value={form.day_name} readOnly />
        </div>
      </div>

      <ShiftTable rows={form.shifts} totals={totals.shifts} readOnly={readOnly}
        onCell={(i, k, v) => setCell('shifts', i, k, v)}
        onDel={(i) => delRow('shifts', i)} onAdd={() => addRow('shifts', () => blankShift())} />

      <div className={`diff-strip ${totals.difference.state}`}>
        <div className="diff-title">الفرق بين إجمالي المصروفات والفرع (الصرف)</div>
        <div className="diff-numbers">
          <span>المدفوعات: <b>{totals.difference.payments || '0'}</b></span>
          <span>الفرع (الصرف): <b>{totals.difference.expense || '0'}</b></span>
        </div>
        <div className="diff-result">{totals.difference.text}</div>
      </div>

      <div className="sheet-banner second">
        <div className="sheet-banner-title"><span className="gold-line" /> تفاصيل فواتير الفرع</div>
        <div className="sheet-banner-sub">المورد أو بيان الصرف — الفواتير والمدفوعات والباقي</div>
      </div>
      {error && <div className="sheet-error">{error}</div>}

      <ListTable rows={form.listB} totals={totals.listB} readOnly={readOnly}
        onCell={(i, k, v) => setCell('listB', i, k, v)}
        onDel={(i) => delRow('listB', i)} onAdd={() => addRow('listB', blank)} />

      <div className="sheet-submit">
        <div className="sheet-hint">
          <Calculator size={16} /> المتبقي = إجمالي الفاتورة − المدفوع، وصافي الكاش وإجمالي الدخل يُحسبان تلقائياً.
        </div>
        {preview || readOnly
          ? <button className="btn btn-ghost" type="button" disabled><Send size={16} /> {readOnly ? 'قراءة فقط' : 'معاينة فقط'}</button>
          : <button className="btn sheet-submit-btn" type="submit" disabled={busy}>
              <Send size={17} /> {busy ? 'جاري الحفظ...' : submitLabel}
            </button>}
      </div>
    </form>
  );
}
