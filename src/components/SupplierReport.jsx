import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, FileSpreadsheet, Printer, MessageCircle, Search, RefreshCw } from 'lucide-react';
import { api, download, query, shareWhatsApp } from '../api';
import { fmtDate } from '../utils';
import DatePicker from './DatePicker.jsx';

function Printable({ rows, title, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 160);
    const done = () => { clearTimeout(t); onDone(); };
    window.addEventListener('afterprint', done);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, []);
  if (!rows) return null;
  return createPortal(<div className="print-only"><div className="print-sheet">
    <h1>كشف حساب الموردين</h1>
    <table>
      <thead><tr><th>المورد</th><th>الفرع</th><th>عدد الفواتير</th><th>إجمالي الفواتير</th>
        <th>المدفوعات</th><th>المتبقي</th><th>آخر تاريخ</th></tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>
          <td>{r.supplier}</td><td>{r.branches}</td><td>{r.count}</td><td>{r.invoices}</td>
          <td>{r.payments}</td><td><b>{r.remaining}</b></td><td>{fmtDate(r.lastDate)}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="print-sign"><div>المحاسب: ......................</div><div>التاريخ: ......................</div></div>
  </div></div>, document.body);
}

export default function SupplierReport({ branches = [], notify, title = 'كشف حساب الموردين' }) {
  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [print, setPrint] = useState(null);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    api(`/reports/suppliers${query(filters)}`).then(setRows)
      .catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const share = () => shareWhatsApp([
    `*${title}*`, 'المورد | المتبقي | المدفوعات | آخر تاريخ',
    ...rows.map((r) => `${r.supplier} | ${r.remaining} | ${r.payments} | ${fmtDate(r.lastDate)}`),
  ]);

  return <>
    <div className="card">
      <div className="card-header"><h3><Wallet size={18} /> {title}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> مسح</button></div>
      <div className="card-body">
        <div className="filter-bar">
          <div className="field"><label>الفرع</label>
            <select value={filters.branchId || ''} onChange={(e) => set('branchId', e.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div className="field"><label>من تاريخ</label><DatePicker value={filters.from} onChange={(v) => set('from', v)} /></div>
          <div className="field"><label>إلى تاريخ</label><DatePicker value={filters.to} onChange={(v) => set('to', v)} /></div>
          <div className="field"><label>بحث المورد</label><input value={filters.q || ''} onChange={(e) => set('q', e.target.value)} placeholder="اسم المورد" /></div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={load}><Search size={15} /> تحديث</button>
          <button className="btn btn-light btn-sm" onClick={() => download(`/exports/suppliers.xlsx${query(filters)}`, `suppliers-${Date.now()}.xlsx`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> Excel</button>
          <button className="btn btn-light btn-sm" onClick={() => setPrint({ rows, title })}><Printer size={15} /> طباعة / PDF</button>
          <button className="btn btn-wa btn-sm" onClick={share}><MessageCircle size={15} /> واتساب</button>
          <span className="muted">الموردون: {rows.length} {loading ? '...' : ''}</span>
        </div>
      </div>
    </div>
    <div className="card">
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>المورد</th><th>الفرع</th><th>عدد الفواتير</th><th>إجمالي الفواتير</th>
          <th>المدفوعات</th><th>المتبقي</th><th>آخر تاريخ</th><th>الفواتير</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="8" className="center muted">لا يوجد موردون بمبالغ متبقية</td></tr>}
          {rows.map((r, i) => <tr key={i}>
            <td><b>{r.supplier}</b></td><td>{r.branches}</td><td>{r.count}</td>
            <td>{r.invoices}</td><td>{r.payments}</td>
            <td className={r.remaining > 0 ? 'diff-plus' : r.remaining < 0 ? 'diff-minus' : ''}><b>{r.remaining}</b></td>
            <td>{fmtDate(r.lastDate)}</td><td>{r.codes.join('، ')}</td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
    {print && <Printable rows={print.rows} title={print.title} onDone={() => setPrint(null)} />}
  </>;
}
