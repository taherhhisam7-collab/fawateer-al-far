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
      <div className="card-header"><h3><Search size={18} /> التقارير والفلاتر</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}><RefreshCw size={14} /> مسح الفلاتر</button></div>
      <div className="card-body">
        <FilterBar filters={filters} setFilters={setFilters} branches={branches} users={users} />
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={load}><Search size={15} /> بحث</button>
          <button className="btn btn-light" onClick={() => download(`/exports/invoices.csv${query(filters)}`, `fawateer-${Date.now()}.csv`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> تصدير النتائج Excel</button>
          <button className="btn btn-wa" onClick={() => shareWhatsApp(summaryText(invoices))}>
            <MessageCircle size={15} /> مشاركة النتائج واتساب</button>
          <span className="muted" style={{ alignSelf: 'center' }}>النتائج: {invoices.length} {loading ? '(جاري التحميل...)' : ''}</span>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="card-header"><h3>الفواتير</h3></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>الرقم</th><th>الفرع</th><th>الكاشير</th><th>التاريخ</th><th>اليوم</th>
          <th>فواتير (1)</th><th>فواتير (2)</th><th>إجمالي الدخل</th><th>الإجراءات</th></tr></thead>
        <tbody>
          {invoices.length === 0 && <tr><td colSpan="9" className="center muted">لا توجد فواتير مطابقة</td></tr>}
          {invoices.map((i) => {
            let t = {}; try { t = JSON.parse(i.totals || '{}'); } catch { /* ignore */ }
            return <tr key={i.id}>
              <td><b>{i.code}</b></td><td>{i.branch_name}</td><td>{i.user_name}</td>
              <td>{i.invoice_date || '-'}</td><td>{i.day_name || '-'}</td>
              <td>{t.listA?.invoices || '-'}</td><td>{t.listB?.invoices || '-'}</td>
              <td>{t.shifts?.total_amount || '-'}</td>
              <td><div className="btn-row">
                <button className="btn btn-light btn-sm" title="عرض" onClick={() => open(i.id)}><Eye size={14} /></button>
                <button className="btn btn-light btn-sm" title="تعديل" onClick={() => onEdit && onEdit(i.id)}><Pencil size={14} /></button>
                <button className="btn btn-light btn-sm" title="طباعة / PDF" onClick={async () => {
                  try { onPrint(await api(`/invoices/${i.id}`)); } catch (e) { notify(e.message, 'error'); }
                }}><Printer size={14} /></button>
                <button className="btn btn-danger btn-sm" title="حذف" onClick={() => onDelete && onDelete(i.id)}><Trash2 size={14} /></button>
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
