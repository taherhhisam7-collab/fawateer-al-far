import React from 'react';
import { X } from 'lucide-react';
import DatePicker from './DatePicker.jsx';
import { fmtDate } from '../utils';

export function Modal({ title, onClose, children, footer, wide }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-header"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={19} /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}

const Sel = ({ label, value, onChange, options }) => <div className="field"><label>{label}</label>
  <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
    <option value="">{label === 'الشفت' ? 'كل الشفتات' : 'الكل'}</option>
    {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
  </select></div>;

const Num = ({ label, value, onChange, placeholder }) => <div className="field"><label>{label}</label>
  <input type="number" inputMode="decimal" value={value ?? ''} placeholder={placeholder || '0'}
    onChange={(e) => onChange(e.target.value)} /></div>;

export function FilterBar({ filters, setFilters, branches = [], users = [] }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return <div className="filter-bar">
    <div className="field"><label>الفرع</label>
      <select value={filters.branchId || ''} onChange={(e) => set('branchId', e.target.value)}>
        <option value="">كل الفروع</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></div>
    <div className="field"><label>الكاشير</label>
      <select value={filters.userId || ''} onChange={(e) => set('userId', e.target.value)}>
        <option value="">كل الكاشيرات</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </select></div>
    <Sel label="الشفت" value={filters.shift} onChange={(v) => set('shift', v)}
      options={[['صباحي', 'صباحي'], ['مسائي', 'مسائي']]} />
    <Sel label="الدخل" value={filters.income} onChange={(v) => set('income', v)}
      options={[['cash', 'كاش'], ['network', 'شبكة']]} />
    <Sel label="صافي الكاش" value={filters.net} onChange={(v) => set('net', v)}
      options={[['plus', 'زيادة'], ['minus', 'عجز']]} />
    <Sel label="المتبقي" value={filters.remaining} onChange={(v) => set('remaining', v)}
      options={[['due', 'عليه متبقي'], ['over', 'تجاوز السداد'], ['paid', 'مسدّد بالكامل']]} />
    <div className="field"><label>من تاريخ</label><DatePicker value={filters.from} onChange={(v) => set('from', v)} /></div>
    <div className="field"><label>إلى تاريخ</label><DatePicker value={filters.to} onChange={(v) => set('to', v)} /></div>
    <Num label="إجمالي الفواتير من" value={filters.invoiceMin} onChange={(v) => set('invoiceMin', v)} />
    <Num label="إجمالي الفواتير إلى" value={filters.invoiceMax} onChange={(v) => set('invoiceMax', v)} />
    <Num label="إجمالي المدفوعات من" value={filters.paymentsMin} onChange={(v) => set('paymentsMin', v)} />
    <Num label="إجمالي المدفوعات إلى" value={filters.paymentsMax} onChange={(v) => set('paymentsMax', v)} />
    <Num label="الباقي من" value={filters.remainingMin} onChange={(v) => set('remainingMin', v)} />
    <Num label="الباقي إلى" value={filters.remainingMax} onChange={(v) => set('remainingMax', v)} />
    <Num label="إجمالي الدخل من" value={filters.incomeMin} onChange={(v) => set('incomeMin', v)} />
    <Num label="إجمالي الدخل إلى" value={filters.incomeMax} onChange={(v) => set('incomeMax', v)} />
    <Num label="إجمالي الصرف من" value={filters.expenseMin} onChange={(v) => set('expenseMin', v)} />
    <Num label="إجمالي الصرف إلى" value={filters.expenseMax} onChange={(v) => set('expenseMax', v)} />
    <div className="field"><label>الملاحظات</label>
      <input value={filters.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="ابحث في الملاحظات" /></div>
    <div className="field" style={{ gridColumn: 'span 2' }}><label>بحث عام</label>
      <input value={filters.q || ''} onChange={(e) => set('q', e.target.value)} placeholder="رقم الفاتورة، الفرع، الكاشير..." /></div>
  </div>;
}

export function summaryText(invoices, title = 'فواتير الفرع') {
  return ['*' + title + '*', `عدد الفواتير: ${invoices.length}`, '',
    ...invoices.map((i) => `• ${i.code} | ${i.branch_name} | ${i.user_name} | ${fmtDate(i.invoice_date)} | ${i.day_name || ''}`.trim())];
}
