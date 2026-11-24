import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Printer, MessageCircle, Search, RefreshCw, Eye, Pencil, Trash2 } from 'lucide-react';
import { api, download, query, shareWhatsApp } from '../api';
import { FilterBar, summaryText } from './ui.jsx';
import InvoiceDetailModal from './InvoiceDetailModal.jsx';

export default function Reports({ branches, users, notify, onPrint, onUpdate, onEdit, onDelete }) {
  const [filters, setFilters] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api(`/invoices${query(filters)}`).then(setInvoices).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const open = async (id) => {
    try { setDetail(await api(`/invoices/${id}`)); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <>
    <div className="card">
      <div className="card-header"><h3><Search size={18} /> Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆØ§Ù„ÙÙ„Ø§ØªØ±</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±</button></div>
      <div className="card-body">
        <FilterBar filters={filters} setFilters={setFilters} branches={branches} users={users} />
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={load}><Search size={15} /> Ø¨Ø­Ø«</button>
          <button className="btn btn-light" onClick={() => download(`/exports/invoices.csv${query(filters)}`, `fawateer-${Date.now()}.csv`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> ØªØµØ¯ÙŠØ± Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Excel</button>
          <button className="btn btn-wa" onClick={() => shareWhatsApp(summaryText(invoices))}>
            <MessageCircle size={15} /> Ù…Ø´Ø§Ø±ÙƒØ© Ø§Ù„Ù†ØªØ§Ø¦Ø¬ ÙˆØ§ØªØ³Ø§Ø¨</button>
          <span className="muted" style={{ alignSelf: 'center' }}>Ø§Ù„Ù†ØªØ§Ø¦Ø¬: {invoices.length} {loading ? '(Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...)' : ''}</span>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-header"><h3>Ø§Ù„ÙÙˆØ§ØªÙŠØ±</h3></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Ø§Ù„Ø±Ù‚Ù…</th><th>Ø§Ù„ÙØ±Ø¹</th><th>Ø§Ù„ÙƒØ§Ø´ÙŠØ±</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„ÙŠÙˆÙ…</th>
          <th>ÙÙˆØ§ØªÙŠØ± (1)</th><th>ÙÙˆØ§ØªÙŠØ± (2)</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„</th><th>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
        <tbody>
          {invoices.length === 0 && <tr><td colSpan="9" className="center muted">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…Ø·Ø§Ø¨Ù‚Ø©</td></tr>}
          {invoices.map((i) => {
            let t = {}; try { t = JSON.parse(i.totals || '{}'); } catch { /* ignore */ }
            return <tr key={i.id}>
              <td><b>{i.code}</b></td><td>{i.branch_name}</td><td>{i.user_name}</td>
              <td>{i.invoice_date || '-'}</td><td>{i.day_name || '-'}</td>
              <td>{t.listA?.invoices || '-'}</td><td>{t.listB?.invoices || '-'}</td>
              <td>{t.shifts?.total_amount || '-'}</td>
              <td><div className="btn-row">
                <button className="btn btn-light btn-sm" title="Ø¹Ø±Ø¶" onClick={() => open(i.id)}><Eye size={14} /></button>
                <button className="btn btn-light btn-sm" title="ØªØ¹Ø¯ÙŠÙ„" onClick={() => onEdit && onEdit(i.id)}><Pencil size={14} /></button>
                <button className="btn btn-light btn-sm" title="Ø·Ø¨Ø§Ø¹Ø© / PDF" onClick={async () => {
                  try { onPrint(await api(`/invoices/${i.id}`)); } catch (e) { notify(e.message, 'error'); }
                }}><Printer size={14} /></button>
                <button className="btn btn-danger btn-sm" title="Ø­Ø°Ù" onClick={() => onDelete && onDelete(i.id)}><Trash2 size={14} /></button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table></div>
    </div>

    {detail && <InvoiceDetailModal invoice={detail} onClose={() => setDetail(null)} notify={notify}
      onUpdate={() => { load(); onUpdate && onUpdate(); }} onPrint={onPrint} />}
  </>;
}

