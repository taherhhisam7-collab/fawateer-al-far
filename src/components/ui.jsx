import React from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, footer, wide }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-header"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={19} /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>;
}

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
    <div className="field"><label>من تاريخ</label><input type="date" value={filters.from || ''} onChange={(e) => set('from', e.target.value)} /></div>
    <div className="field"><label>إلى تاريخ</label><input type="date" value={filters.to || ''} onChange={(e) => set('to', e.target.value)} /></div>
    <div className="field" style={{ gridColumn: 'span 2' }}><label>بحث عام</label>
      <input value={filters.q || ''} onChange={(e) => set('q', e.target.value)} placeholder="رقم الفاتورة، الفرع، الكاشير، ملاحظات..." /></div>
  </div>;
}

export function summaryText(invoices, title = 'فواتير الخرج') {
  return ['*' + title + '*', `عدد الفواتير: ${invoices.length}`, '',
    ...invoices.map((i) => `• ${i.code} | ${i.branch_name} | ${i.user_name} | ${i.store || '-'} | ${i.region || '-'} | ${i.invoice_date || '-'}`)];
}
