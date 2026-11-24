import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Landmark, FileSpreadsheet, Printer, MessageCircle, Search, RefreshCw } from 'lucide-react';
import { api, download, query, shareWhatsApp } from '../api';
import { fmtDate } from '../utils';
import { FilterBar } from './ui.jsx';

function Printable({ report, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 160);
    const done = () => { clearTimeout(t); onDone(); };
    window.addEventListener('afterprint', done);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, []);
  if (!report) return null;
  const s = report.totals;
  return createPortal(<div className="print-only"><div className="print-sheet">
    <h1>كشف حساب الصندوق والشبكة</h1>
    <table>
      <thead><tr><th>رقم الفاتورة</th><th>الفرع</th><th>الكاشير</th><th>التاريخ</th>
        <th>الشفت</th><th>الكاش</th><th>الشبكة</th><th>الصرف</th><th>صافي الكاش</th><th>إجمالي الدخل</th></tr></thead>
      <tbody>
        {report.rows.map((r, i) => <tr key={i}>
          <td>{r.code}</td><td>{r.branch}</td><td>{r.cashier}</td><td>{fmtDate(r.date)}</td>
          <td>{r.shift}</td><td>{r.cash}</td><td>{r.network}</td><td>{r.expense}</td>
          <td>{r.net}</td><td>{r.income}</td>
        </tr>)}
        <tr className="print-head"><td colSpan="5">الإجمالي</td><td>{s.cash}</td><td>{s.network}</td>
          <td>{s.expense}</td><td>{s.net}</td><td>{s.cash + s.network}</td></tr>
      </tbody>
    </table>
    <div className="print-sign"><div>المحاسب: ................</div><div>التاريخ: ................</div></div>
  </div></div>, document.body);
}

export default function CashNetworkReport({ branches, users, notify }) {
  const [filters, setFilters] = useState({});
  const [report, setReport] = useState({ rows: [], totals: { cash: 0, network: 0, expense: 0, net: 0, income: 0 } });
  const [loading, setLoading] = useState(false);
  const [print, setPrint] = useState(null);

  const load = () => {
    setLoading(true);
    api(`/reports/cash-network${query(filters)}`).then(setReport)
      .catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const share = () => {
    const s = report.totals;
    shareWhatsApp(['*كشف حساب الصندوق والشبكة*',
      `الكاش: ${s.cash} | الشبكة: ${s.network} | الصرف: ${s.expense}`,
      `صافي الكاش: ${s.net} | إجمالي الدخل: ${s.cash + s.network}`, '',
      ...report.rows.map((r) => `${fmtDate(r.date)} | ${r.shift} | ${r.branch} | كاش ${r.cash} | شبكة ${r.network} | صافي ${r.net}`)]);
  };
  const s = report.totals;

  return <>
    <div className="card">
      <div className="card-header"><h3><Wallet size={18} /> كشف حساب الصندوق والشبكة</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> مسح الفلاتر</button></div>
      <div className="card-body">
        <FilterBar filters={filters} setFilters={setFilters} branches={branches} users={users} />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={load}><Search size={15} /> تحديث الكشف</button>
          <button className="btn btn-light btn-sm" onClick={() => download(`/exports/cash-network.csv${query(filters)}`, `cash-network-${Date.now()}.csv`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> تصدير Excel</button>
          <button className="btn btn-light btn-sm" onClick={() => setPrint(report)}><Printer size={15} /> طباعة / PDF</button>
          <button className="btn btn-wa btn-sm" onClick={share}><MessageCircle size={15} /> مشاركة واتساب</button>
          <span className="muted">الصفوف: {report.rows.length} {loading ? '...' : ''}</span>
        </div>
      </div>
    </div>

    <div className="stat-grid" style={{ marginBottom: 18 }}>
      <div className="stat-card"><span className="icon"><Landmark size={20} /></span><div className="label">إجمالي الكاش</div><div className="value">{s.cash}</div></div>
      <div className="stat-card"><span className="icon"><Wallet size={20} /></span><div className="label">إجمالي الشبكة</div><div className="value">{s.network}</div></div>
      <div className="stat-card"><span className="icon"><Landmark size={20} /></span><div className="label">صافي الكاش</div><div className="value">{s.net}</div></div>
      <div className="stat-card"><span className="icon"><Wallet size={20} /></span><div className="label">إجمالي الدخل</div><div className="value">{s.cash + s.network}</div></div>
    </div>

    <div className="card">
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>الرقم</th><th>الفرع</th><th>الكاشير</th><th>التاريخ</th><th>اليوم</th><th>الشفت</th>
          <th>الكاش</th><th>الشبكة</th><th>الصرف</th><th>صافي الكاش</th><th>إجمالي الدخل</th></tr></thead>
        <tbody>
          {report.rows.length === 0 && <tr><td colSpan="11" className="center muted">لا توجد بيانات مطابقة للفلاتر</td></tr>}
          {report.rows.map((r, i) => <tr key={i}>
            <td><b>{r.code}</b></td><td>{r.branch}</td><td>{r.cashier}</td>
            <td>{fmtDate(r.date)}</td><td>{r.day || '-'}</td><td>{r.shift}</td>
            <td>{r.cash}</td><td>{r.network}</td><td>{r.expense}</td>
            <td className={r.net > 0 ? 'diff-plus' : r.net < 0 ? 'diff-minus' : ''}>{r.net}</td>
            <td><b>{r.income}</b></td>
          </tr>)}
          <tr className="print-head"><td colSpan="6"><b>الإجمالي</b></td>
            <td><b>{s.cash}</b></td><td><b>{s.network}</b></td><td><b>{s.expense}</b></td>
            <td><b>{s.net}</b></td><td><b>{s.cash + s.network}</b></td></tr>
        </tbody>
      </table></div>
    </div>
    {print && <Printable report={print} onDone={() => setPrint(null)} />}
  </>;
}
