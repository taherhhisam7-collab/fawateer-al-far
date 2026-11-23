import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const L = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const S = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي الدخل'];

function ListTable({ rows = [], totals = {} }) {
  return <table>
    <thead><tr><th colSpan="5">تفاصيل فواتير الفرع</th></tr>
      <tr>{L.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>
      {rows.map((r, i) => <tr key={i}>
        <td>{r.supplier}</td><td>{r.invoices}</td><td>{r.payments}</td><td>{r.remaining}</td><td>{r.notes}</td>
      </tr>)}
      <tr className="print-head"><td>الإجمالي</td><td>{totals.invoices || ''}</td>
        <td>{totals.payments || ''}</td><td>{totals.remaining || ''}</td><td></td></tr>
    </tbody>
  </table>;
}

export default function PrintableReport({ data, onDone }) {
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 180);
    const done = () => { clearTimeout(t); onDone && onDone(); };
    window.addEventListener('afterprint', done);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [data]);

  if (!data) return null;
  const st = data.totals?.shifts || {};
  return createPortal(<div className="print-only"><div className="print-sheet">
    <h1>تفاصيل فواتير الفرع</h1>
    <div className="print-meta">
      <div>الرقم: <b>{data.code}</b></div>
      <div>الفرع: <b>{data.branch_name}</b></div>
      <div>الكاشير: <b>{data.user_name}</b></div>
      <div>التاريخ: <b>{data.invoice_date}</b></div>
      <div>اليوم: <b>{data.day_name}</b></div>
    </div>
    <h2>الشفت</h2>
    <table>
      <thead><tr>{S.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {(data.shifts || []).map((r, i) => <tr key={i}>
          <td>{r.shift_label}</td><td>{r.total_cash}</td><td>{r.network}</td>
          <td>{r.branch_expense}</td><td>{r.net_cash}</td><td>{r.total_amount}</td>
        </tr>)}
        <tr className="print-head"><td>الإجمالي</td><td>{st.total_cash || ''}</td><td>{st.network || ''}</td>
          <td>{st.branch_expense || ''}</td><td>{st.net_cash || ''}</td><td>{st.total_amount || ''}</td></tr>
      </tbody>
    </table>
    {data.totals?.difference && <h2>الفرق بين إجمالي المصروفات والفرع (الصرف): {data.totals.difference.text}</h2>}
    <ListTable rows={data.listB} totals={data.totals?.listB} />
    <div className="print-sign">
      <div>اسم الكاشير: .............................</div>
      <div>توقيع الكاشير: .............................</div>
      <div>اعتماد المحاسب: .............................</div>
    </div>
  </div></div>, document.body);
}
