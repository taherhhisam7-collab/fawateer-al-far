import React from 'react';
import { FileSpreadsheet, Printer, MessageCircle, Trash2, X, Pencil } from 'lucide-react';
import { api, download, shareWhatsApp } from '../api';
import { Modal } from './ui.jsx';

const L = ['Ø§Ù„Ù…ÙˆØ±Ø¯ Ø£Ùˆ Ø¨ÙŠØ§Ù† Ø§Ù„ØµØ±Ù', 'Ø§Ù„ÙÙˆØ§ØªÙŠØ±', 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª', 'Ø§Ù„Ø¨Ø§Ù‚ÙŠ', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª'];
const LK = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
const S = ['Ø§Ù„Ø´ÙØª', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø§Ù„Ø´Ø¨ÙƒØ©', 'Ø§Ù„ÙØ±Ø¹ (Ø§Ù„ØµØ±Ù)', 'ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„'];
const SK = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];

function Table({ title, headers, keys, rows, totals }) {
  return <>
    <h4 style={{ margin: '16px 0 8px' }}>{title}</h4>
    <div className="table-scroll"><table className="data-table">
      <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {(rows || []).map((r, i) => <tr key={i}>{keys.map((k) => <td key={k}>{r[k] || '-'}</td>)}</tr>)}
        {totals && <tr><td><b>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</b></td>{keys.slice(1).map((k) => <td key={k}><b>{totals[k] || '-'}</b></td>)}</tr>}
      </tbody>
    </table></div>
  </>;
}

export default function InvoiceDetailModal({ invoice, onClose, onUpdate, onPrint, onEdit, notify, viewOnly = false }) {
  if (!invoice) return null;
  const share = () => shareWhatsApp([
    `*ØªÙØ§ØµÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø§Ù„ÙØ±Ø¹ - ${invoice.code}*`,
    `Ø§Ù„ÙØ±Ø¹: ${invoice.branch_name}`, `Ø§Ù„ÙƒØ§Ø´ÙŠØ±: ${invoice.user_name}`,
    `Ø§Ù„ØªØ§Ø±ÙŠØ®: ${invoice.invoice_date}`, `Ø§Ù„ÙŠÙˆÙ…: ${invoice.day_name}`,
    `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ± (1): ${invoice.totals?.listA?.invoices || '-'}`,
    `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ± (2): ${invoice.totals?.listB?.invoices || '-'}`,
    `Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„: ${invoice.totals?.shifts?.total_amount || '-'}`,
  ]);
  const remove = async () => {
    if (!window.confirm(`Ø­Ø°Ù Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ ${invoice.code}ØŸ`)) return;
    try { notify((await api(`/invoices/${invoice.id}`, { method: 'DELETE' })).message); onUpdate(); onClose(); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <Modal wide title={`ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø© ${invoice.code}`} onClose={onClose}
    footer={viewOnly ? (
      <button className="btn btn-ghost" onClick={onClose}><X size={15} /> Ø¥ØºÙ„Ø§Ù‚</button>
    ) : <>
      <button className="btn btn-light" onClick={() => download(`/exports/invoice/${invoice.id}.csv`, `fatura-${invoice.code}.csv`)
        .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> Excel</button>
      <button className="btn btn-light" onClick={() => onPrint(invoice)}><Printer size={15} /> Ø·Ø¨Ø§Ø¹Ø© / PDF</button>
      <button className="btn btn-wa" onClick={share}><MessageCircle size={15} /> ÙˆØ§ØªØ³Ø§Ø¨</button>
      {onEdit && <button className="btn btn-light" onClick={() => onEdit(invoice)}><Pencil size={15} /> ØªØ¹Ø¯ÙŠÙ„</button>}
      <button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={15} /> Ø­Ø°Ù</button>
      <button className="btn btn-ghost" onClick={onClose}><X size={15} /> Ø¥ØºÙ„Ø§Ù‚</button>
    </>}>
    <div className="form-grid" style={{ marginBottom: 8 }}>
      {[['Ø§Ù„ÙØ±Ø¹', invoice.branch_name], ['Ø§Ù„ÙƒØ§Ø´ÙŠØ±', invoice.user_name], ['Ø§Ù„ØªØ§Ø±ÙŠØ®', invoice.invoice_date],
        ['Ø§Ù„ÙŠÙˆÙ…', invoice.day_name], ['ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø¶Ø§ÙØ©', invoice.created_at]].map(([k, v]) =>
        <div className="field" key={k}><label>{k}</label><input value={v || '-'} disabled /></div>)}
    </div>
    <Table title="Ø§Ù„Ø´ÙØª" headers={S} keys={SK} rows={invoice.shifts} totals={invoice.totals?.shifts} />
    <Table title="ØªÙØ§ØµÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø§Ù„ÙØ±Ø¹ (2)" headers={L} keys={LK} rows={invoice.listB} totals={invoice.totals?.listB} />
  </Modal>;
}

