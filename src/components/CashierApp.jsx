import React, { useState } from 'react';
import { FileSpreadsheet, LogOut, Store, User, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import InvoiceForm from './InvoiceForm.jsx';

export default function CashierApp({ user, onLogout, notify }) {
  const [last, setLast] = useState(null);

  const submit = async (payload) => {
    try {
      const res = await api('/invoices', { method: 'POST', body: payload });
      setLast(res.code);
      notify(`تم إدخال الفاتورة ${res.code} بنجاح`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return res;
    } catch (e) { notify(e.message, 'error'); throw e; }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h2>تفاصيل فواتير الخرج</h2>
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
          <div className="card-header"><h3><FileSpreadsheet size={18} /> إدخال فاتورة خرج جديدة</h3>
            <span className="badge badge-submitted">{user.branch_name}</span></div>
          <div className="card-body">
            <InvoiceForm onSubmit={submit} branchName={user.branch_name} submitLabel="إدخال الفاتورة" />
          </div>
        </div>
      </div>
    </>
  );
}
