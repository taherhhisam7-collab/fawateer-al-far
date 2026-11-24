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
    <h1>ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†</h1>
    <table>
      <thead><tr><th>Ø§Ù„Ù…ÙˆØ±Ø¯</th><th>Ø§Ù„ÙØ±Ø¹</th><th>Ø¹Ø¯Ø¯ Ø§Ù„ÙÙˆØ§ØªÙŠØ±</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ±</th>
        <th>Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</th><th>Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</th><th>Ø¢Ø®Ø± ØªØ§Ø±ÙŠØ®</th></tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>
          <td>{r.supplier}</td><td>{r.branches}</td><td>{r.count}</td><td>{r.invoices}</td>
          <td>{r.payments}</td><td><b>{r.remaining}</b></td><td>{fmtDate(r.lastDate)}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="print-sign"><div>Ø§Ù„Ù…Ø­Ø§Ø³Ø¨: ......................</div><div>Ø§Ù„ØªØ§Ø±ÙŠØ®: ......................</div></div>
  </div></div>, document.body);
}

export default function SupplierReport({ branches = [], notify, title = 'ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†' }) {
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
    `*${title}*`, 'Ø§Ù„Ù…ÙˆØ±Ø¯ | Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ | Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª | Ø¢Ø®Ø± ØªØ§Ø±ÙŠØ®',
    ...rows.map((r) => `${r.supplier} | ${r.remaining} | ${r.payments} | ${fmtDate(r.lastDate)}`),
  ]);

  return <>
    <div className="card">
      <div className="card-header"><h3><Wallet size={18} /> {title}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> Ù…Ø³Ø­</button></div>
      <div className="card-body">
        <div className="filter-bar">
          <div className="field"><label>Ø§Ù„ÙØ±Ø¹</label>
            <select value={filters.branchId || ''} onChange={(e) => set('branchId', e.target.value)}>
              <option value="">ÙƒÙ„ Ø§Ù„ÙØ±ÙˆØ¹</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div className="field"><label>Ø§Ù„Ø´ÙØª</label>
            <select value={filters.shift || ''} onChange={(e) => set('shift', e.target.value)}>
              <option value="">ÙƒÙ„ Ø§Ù„Ø´ÙØªØ§Øª</option>
              <option value="ØµØ¨Ø§Ø­ÙŠ">ØµØ¨Ø§Ø­ÙŠ</option>
              <option value="Ù…Ø³Ø§Ø¦ÙŠ">Ù…Ø³Ø§Ø¦ÙŠ</option>
            </select></div>
          <div className="field"><label>Ù…Ù† ØªØ§Ø±ÙŠØ®</label><DatePicker value={filters.from} onChange={(v) => set('from', v)} /></div>
          <div className="field"><label>Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®</label><DatePicker value={filters.to} onChange={(v) => set('to', v)} /></div>
          <div className="field"><label>Ø¨Ø­Ø« Ø§Ù„Ù…ÙˆØ±Ø¯</label><input value={filters.q || ''} onChange={(e) => set('q', e.target.value)} placeholder="Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯" /></div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={load}><Search size={15} /> ØªØ­Ø¯ÙŠØ«</button>
          <button className="btn btn-light btn-sm" onClick={() => download(`/exports/suppliers.csv${query(filters)}`, `suppliers-${Date.now()}.csv`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> Excel</button>
          <button className="btn btn-light btn-sm" onClick={() => setPrint({ rows, title })}><Printer size={15} /> Ø·Ø¨Ø§Ø¹Ø© / PDF</button>
          <button className="btn btn-wa btn-sm" onClick={share}><MessageCircle size={15} /> ÙˆØ§ØªØ³Ø§Ø¨</button>
          <span className="muted">Ø§Ù„Ù…ÙˆØ±Ø¯ÙˆÙ†: {rows.length} {loading ? '...' : ''}</span>
        </div>
      </div>
    </div>
    <div className="card">
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Ø§Ù„Ù…ÙˆØ±Ø¯</th><th>Ø§Ù„ÙØ±Ø¹</th><th>Ø¹Ø¯Ø¯ Ø§Ù„ÙÙˆØ§ØªÙŠØ±</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ±</th>
          <th>Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</th><th>Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</th><th>Ø¢Ø®Ø± ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ÙÙˆØ§ØªÙŠØ±</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="8" className="center muted">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ±Ø¯ÙˆÙ† Ø¨Ù…Ø¨Ø§Ù„Øº Ù…ØªØ¨Ù‚ÙŠØ©</td></tr>}
          {rows.map((r, i) => <tr key={i}>
            <td><b>{r.supplier}</b></td><td>{r.branches}</td><td>{r.count}</td>
            <td>{r.invoices}</td><td>{r.payments}</td>
            <td className={r.remaining > 0 ? 'diff-plus' : r.remaining < 0 ? 'diff-minus' : ''}><b>{r.remaining}</b></td>
            <td>{fmtDate(r.lastDate)}</td><td>{r.codes.join('ØŒ ')}</td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
    {print && <Printable rows={print.rows} title={print.title} onDone={() => setPrint(null)} />}
  </>;
}

