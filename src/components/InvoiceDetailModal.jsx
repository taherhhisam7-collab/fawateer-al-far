import React from 'react';
import { FileSpreadsheet, Printer, MessageCircle, Trash2, X, Pencil } from 'lucide-react';
import { api, download, shareWhatsApp } from '../api';
import { Modal } from './ui.jsx';

const L = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const LK = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
const S = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي الدخل'];
const SK = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];

function Table({ title, headers, keys, rows, totals }) {
  return <>
    <h4 style={{ margin: '16px 0 8px' }}>{title}</h4>
    <div className="table-scroll"><table className="data-table">
      <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {(rows || []).map((r, i) => <tr key={i}>{keys.map((k) => <td key={k}>{r[k] || '-'}</td>)}</tr>)}
        {totals && <tr><td><b>الإجمالي</b></td>{keys.slice(1).map((k) => <td key={k}><b>{totals[k] || '-'}</b></td>)}</tr>}
      </tbody>
    </table></div>
  </>;
}

export default function InvoiceDetailModal({ invoice, onClose, onUpdate, onPrint, onEdit, notify, viewOnly = false }) {
  if (!invoice) return null;
  const share = () => shareWhatsApp([
    `*تفاصيل فواتير الفرع - ${invoice.code}*`,
    `الفرع: ${invoice.branch_name}`, `الكاشير: ${invoice.user_name}`,
    `التاريخ: ${invoice.invoice_date}`, `اليوم: ${invoice.day_name}`,
    `إجمالي الفواتير (1): ${invoice.totals?.listA?.invoices || '-'}`,
    `إجمالي الفواتير (2): ${invoice.totals?.listB?.invoices || '-'}`,
    `إجمالي الدخل: ${invoice.totals?.shifts?.total_amount || '-'}`,
  ]);
  const remove = async () => {
    if (!window.confirm(`حذف النموذج ${invoice.code}؟`)) return;
    try { notify((await api(`/invoices/${invoice.id}`, { method: 'DELETE' })).message); onUpdate(); onClose(); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <Modal wide title={`تفاصيل الفاتورة ${invoice.code}`} onClose={onClose}
    footer={viewOnly ? (
      <button className="btn btn-ghost" onClick={onClose}><X size={15} /> إغلاق</button>
    ) : <>
      <button className="btn btn-light" onClick={() => download(`/exports/invoice/${invoice.id}.xlsx`, `fatura-${invoice.code}.xlsx`)
        .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> Excel</button>
      <button className="btn btn-light" onClick={() => onPrint(invoice)}><Printer size={15} /> طباعة / PDF</button>
      <button className="btn btn-wa" onClick={share}><MessageCircle size={15} /> واتساب</button>
      {onEdit && <button className="btn btn-light" onClick={() => onEdit(invoice)}><Pencil size={15} /> تعديل</button>}
      <button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={15} /> حذف</button>
      <button className="btn btn-ghost" onClick={onClose}><X size={15} /> إغلاق</button>
    </>}>
    <div className="form-grid" style={{ marginBottom: 8 }}>
      {[['الفرع', invoice.branch_name], ['الكاشير', invoice.user_name], ['التاريخ', invoice.invoice_date],
        ['اليوم', invoice.day_name], ['تاريخ الإضافة', invoice.created_at]].map(([k, v]) =>
        <div className="field" key={k}><label>{k}</label><input value={v || '-'} disabled /></div>)}
    </div>
    <Table title="الشفت" headers={S} keys={SK} rows={invoice.shifts} totals={invoice.totals?.shifts} />
    <Table title="تفاصيل فواتير الفرع (2)" headers={L} keys={LK} rows={invoice.listB} totals={invoice.totals?.listB} />
  </Modal>;
}
