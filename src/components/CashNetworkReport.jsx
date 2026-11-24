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
    <h1>ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„Ø´Ø¨ÙƒØ©</h1>
    <table>
      <thead><tr><th>Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©</th><th>Ø§Ù„ÙØ±Ø¹</th><th>Ø§Ù„ÙƒØ§Ø´ÙŠØ±</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
        <th>Ø§Ù„Ø´ÙØª</th><th>Ø§Ù„ÙƒØ§Ø´</th><th>Ø§Ù„Ø´Ø¨ÙƒØ©</th><th>Ø§Ù„ØµØ±Ù</th><th>ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„</th></tr></thead>
      <tbody>
        {report.rows.map((r, i) => <tr key={i}>
          <td>{r.code}</td><td>{r.branch}</td><td>{r.cashier}</td><td>{fmtDate(r.date)}</td>
          <td>{r.shift}</td><td>{r.cash}</td><td>{r.network}</td><td>{r.expense}</td>
          <td>{r.net}</td><td>{r.income}</td>
        </tr>)}
        <tr className="print-head"><td colSpan="5">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</td><td>{s.cash}</td><td>{s.network}</td>
          <td>{s.expense}</td><td>{s.net}</td><td>{s.cash + s.network}</td></tr>
      </tbody>
    </table>
    <div className="print-sign"><div>Ø§Ù„Ù…Ø­Ø§Ø³Ø¨: ................</div><div>Ø§Ù„ØªØ§Ø±ÙŠØ®: ................</div></div>
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
    shareWhatsApp(['*ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„Ø´Ø¨ÙƒØ©*',
      `Ø§Ù„ÙƒØ§Ø´: ${s.cash} | Ø§Ù„Ø´Ø¨ÙƒØ©: ${s.network} | Ø§Ù„ØµØ±Ù: ${s.expense}`,
      `ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´: ${s.net} | Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„: ${s.cash + s.network}`, '',
      ...report.rows.map((r) => `${fmtDate(r.date)} | ${r.shift} | ${r.branch} | ÙƒØ§Ø´ ${r.cash} | Ø´Ø¨ÙƒØ© ${r.network} | ØµØ§ÙÙŠ ${r.net}`)]);
  };
  const s = report.totals;

  return <>
    <div className="card">
      <div className="card-header"><h3><Wallet size={18} /> ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„Ø´Ø¨ÙƒØ©</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±</button></div>
      <div className="card-body">
        <FilterBar filters={filters} setFilters={setFilters} branches={branches} users={users} />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={load}><Search size={15} /> ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙƒØ´Ù</button>
          <button className="btn btn-light btn-sm" onClick={() => download(`/exports/cash-network.csv${query(filters)}`, `cash-network-${Date.now()}.csv`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> ØªØµØ¯ÙŠØ± Excel</button>
          <button className="btn btn-light btn-sm" onClick={() => setPrint(report)}><Printer size={15} /> Ø·Ø¨Ø§Ø¹Ø© / PDF</button>
          <button className="btn btn-wa btn-sm" onClick={share}><MessageCircle size={15} /> Ù…Ø´Ø§Ø±ÙƒØ© ÙˆØ§ØªØ³Ø§Ø¨</button>
          <span className="muted">Ø§Ù„ØµÙÙˆÙ: {report.rows.length} {loading ? '...' : ''}</span>
        </div>
      </div>
    </div>

    <div className="stat-grid" style={{ marginBottom: 18 }}>
      <div className="stat-card"><span className="icon"><Landmark size={20} /></span><div className="label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒØ§Ø´</div><div className="value">{s.cash}</div></div>
      <div className="stat-card"><span className="icon"><Wallet size={20} /></span><div className="label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø´Ø¨ÙƒØ©</div><div className="value">{s.network}</div></div>
      <div className="stat-card"><span className="icon"><Landmark size={20} /></span><div className="label">ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´</div><div className="value">{s.net}</div></div>
      <div className="stat-card"><span className="icon"><Wallet size={20} /></span><div className="label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„</div><div className="value">{s.cash + s.network}</div></div>
    </div>

    <div className="card">
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Ø§Ù„Ø±Ù‚Ù…</th><th>Ø§Ù„ÙØ±Ø¹</th><th>Ø§Ù„ÙƒØ§Ø´ÙŠØ±</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ÙŠÙˆÙ…</th><th>Ø§Ù„Ø´ÙØª</th>
          <th>Ø§Ù„ÙƒØ§Ø´</th><th>Ø§Ù„Ø´Ø¨ÙƒØ©</th><th>Ø§Ù„ØµØ±Ù</th><th>ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„</th></tr></thead>
        <tbody>
          {report.rows.length === 0 && <tr><td colSpan="11" className="center muted">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„ÙÙ„Ø§ØªØ±</td></tr>}
          {report.rows.map((r, i) => <tr key={i}>
            <td><b>{r.code}</b></td><td>{r.branch}</td><td>{r.cashier}</td>
            <td>{fmtDate(r.date)}</td><td>{r.day || '-'}</td><td>{r.shift}</td>
            <td>{r.cash}</td><td>{r.network}</td><td>{r.expense}</td>
            <td className={r.net > 0 ? 'diff-plus' : r.net < 0 ? 'diff-minus' : ''}>{r.net}</td>
            <td><b>{r.income}</b></td>
          </tr>)}
          <tr className="print-head"><td colSpan="6"><b>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</b></td>
            <td><b>{s.cash}</b></td><td><b>{s.network}</b></td><td><b>{s.expense}</b></td>
            <td><b>{s.net}</b></td><td><b>{s.cash + s.network}</b></td></tr>
        </tbody>
      </table></div>
    </div>
    {print && <Printable report={print} onDone={() => setPrint(null)} />}
  </>;
}

