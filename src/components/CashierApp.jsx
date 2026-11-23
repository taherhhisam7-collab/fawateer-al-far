import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, LogOut, Store, User, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { api } from '../api';
import InvoiceForm from './InvoiceForm.jsx';
import InvoiceDetailModal from './InvoiceDetailModal.jsx';

export default function CashierApp({ user, onLogout, notify }) {
  const [last, setLast] = useState(null);
  const [records, setRecords] = useState([]);
  const [detail, setDetail] = useState(null);

  const load = () => api('/invoices').then(setRecords).catch((e) => notify(e.message, 'error'));
  useEffect(() => { load(); }, []);

  const submit = async (payload) => {
    try {
      const res = await api('/invoices', { method: 'POST', body: payload });
      setLast(res.code);
      notify(`تم إدخال الفاتورة ${res.code} بنجاح`);
      await load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return res;
    } catch (e) { notify(e.message, 'error'); throw e; }
  };

  const open = async (id) => {
    try { setDetail(await api(`/invoices/${id}`)); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <>
    <header className="topbar">
      <div>
        <h2>تفاصيل فواتير الفرع</h2>
        <div className="meta"><Store size={14} /> {user.branch_name} <span>•</span> <User size={14} /> {user.full_name} <span>•</span> كاشير</div>
      </div>
      <button className="btn btn-light btn-sm" onClick={onLogout}><LogOut size={15} /> خروج</button>
    </header>

    <div className="page">
      {last && <div className="success-banner"><CheckCircle2 size={20} />
        <span>تم إدخال الفاتورة <b>{last}</b> عن فرع <b>{user.branch_name}</b>. يمكنك إدخال فاتورة جديدة الآن.</span>
        <button className="icon-btn" onClick={() => setLast(null)}>×</button>
      </div>}
      <div className="card">
        <div className="card-header"><h3><FileSpreadsheet size={18} /> إدخال فاتورة جديدة</h3>
          <span className="badge badge-submitted">{user.branch_name}</span></div>
        <div className="card-body">
          <InvoiceForm onSubmit={submit} branchName={user.branch_name} submitLabel="إدخال الفاتورة" />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>حركاتي — السجلات المحفوظة ({records.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> تحديث</button></div>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>الرقم</th><th>الفرع</th><th>التاريخ</th><th>اليوم</th>
            <th>المورد</th><th>الفواتير</th><th>المدفوعات</th><th>إجمالي الدخل</th><th>الفرق</th><th>الإجراءات</th></tr></thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan="10" className="center muted">لا توجد حركات بعد — احفظ أول فاتورة لتظهر هنا</td></tr>}
            {records.map((r) => {
              let t = {}; try { t = JSON.parse(r.totals || '{}'); } catch { /* ignore */ }
              return <tr key={r.id}>
                <td><b>{r.code}</b></td><td>{r.branch_name}</td>
                <td>{r.invoice_date || '-'}</td><td>{r.day_name || '-'}</td>
                <td>{r.first_supplier || '-'}</td><td>{t.listB?.invoices || '0'}</td>
                <td>{t.listB?.payments || '0'}</td>
                <td>{t.shifts?.total_amount || '0'}</td>
                <td className={t.difference?.state === 'plus' ? 'diff-plus' : t.difference?.state === 'minus' ? 'diff-minus' : ''}>
                  {t.difference?.text || '-'}</td>
                <td><button className="btn btn-light btn-sm" title="عرض" onClick={() => open(r.id)}><Eye size={14} /></button></td>
              </tr>;
            })}
          </tbody>
        </table></div>
      </div>
    </div>

    {detail && <InvoiceDetailModal invoice={detail} viewOnly notify={notify} onClose={() => setDetail(null)} />}
  </>;
}
