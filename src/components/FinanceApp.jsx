import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Building2, Users, FileBarChart, ListFilter, LogOut, KeyRound, ShieldCheck,
  FileSpreadsheet, Eye, Pencil, Trash2, Plus, X, Wallet, Landmark
} from 'lucide-react';
import { api, query } from '../api';
import Dashboard from './Dashboard.jsx';
import Branches from './Branches.jsx';
import UsersView from './Users.jsx';
import Reports from './Reports.jsx';
import FieldReports from './FieldReports.jsx';
import PrintableReport from './PrintableReport.jsx';
import InvoiceForm from './InvoiceForm.jsx';
import InvoiceDetailModal from './InvoiceDetailModal.jsx';
import { Modal, FilterBar } from './ui.jsx';
import SupplierReport from './SupplierReport.jsx';
import CashNetworkReport from './CashNetworkReport.jsx';
import { fmtDate } from '../utils';

const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'entry', label: 'شاشة الإدخال', icon: FileSpreadsheet },
  { id: 'branches', label: 'الفروع', icon: Building2 },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'reports', label: 'الفواتير', icon: FileBarChart },
  { id: 'suppliers', label: 'كشف الموردين', icon: Wallet },
  { id: 'cashnet', label: 'كشف الصندوق والشبكة', icon: Landmark },
  { id: 'fields', label: 'التقارير', icon: ListFilter },
];
const TITLES = {
  dashboard: 'لوحة التحكم', entry: 'تفاصيل فواتير الفرع', branches: 'إدارة الفروع', users: 'إدارة المستخدمين',
  reports: 'الفواتير', suppliers: 'كشف الموردين', cashnet: 'كشف الصندوق والشبكة', fields: 'التقارير', settings: 'إعدادات الحساب',
};

export default function FinanceApp({ user, onLogout, notify }) {
  const [tab, setTab] = useState('dashboard');
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [entryFilters, setEntryFilters] = useState({});
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [pass, setPass] = useState({ current: '', next: '' });

  const loadBranches = () => api('/branches').then(setBranches).catch((e) => notify(e.message, 'error'));
  const loadUsers = () => api('/users').then(setUsers).catch((e) => notify(e.message, 'error'));
  const loadRecords = (f = entryFilters) =>
    api(`/invoices${query(f)}`).then(setRecords).catch((e) => notify(e.message, 'error'));
  useEffect(() => { loadBranches(); loadUsers(); loadRecords(); }, []);

  const openDetail = async (id) => {
    try { setDetail(await api(`/invoices/${id}`)); }
    catch (e) { notify(e.message, 'error'); }
  };
  const openEdit = async (id) => {
    try { setEditing(await api(`/invoices/${id}`)); }
    catch (e) { notify(e.message, 'error'); }
  };
  const remove = async (id) => {
    if (!window.confirm('حذف هذا السجل نهائياً؟')) return;
    try { notify((await api(`/invoices/${id}`, { method: 'DELETE' })).message); loadRecords(); }
    catch (e) { notify(e.message, 'error'); }
  };
  const save = async (payload) => {
    const res = editing
      ? await api(`/invoices/${editing.id}`, { method: 'PUT', body: payload })
      : await api('/invoices', { method: 'POST', body: payload });
    notify(res.message);
    return res;
  };
  const ActionIcons = ({ row }) => <div className="btn-row">
    <button className="btn btn-light btn-sm" title="عرض" onClick={() => openDetail(row.id)}><Eye size={14} /></button>
    <button className="btn btn-light btn-sm" title="تعديل" onClick={() => openEdit(row.id)}><Pencil size={14} /></button>
    <button className="btn btn-danger btn-sm" title="حذف" onClick={() => remove(row.id)}><Trash2 size={14} /></button>
  </div>;

  return <>
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><FileSpreadsheet size={22} /></div>
        <div><strong>فواتير الفرع</strong><small>لوحة المحاسب</small></div>
      </div>
      {NAV.map((n) => <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`}
        onClick={() => setTab(n.id)}><n.icon size={18} /><span>{n.label}</span></button>)}
      <div className="sidebar-spacer" />
      <button className="nav-item" onClick={() => setTab('settings')}>
        <KeyRound size={18} /><span>إعدادات الحساب</span></button>
      <div className="sidebar-user">
        <strong>{user.full_name}</strong><small>محاسب (المالك) — كل الصلاحيات</small>
        <button className="logout-btn" onClick={onLogout}><LogOut size={15} /> تسجيل الخروج</button>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><h2>{TITLES[tab]}</h2>
        <div className="meta"><ShieldCheck size={15} /> صلاحية المالك — كل شي مسموح</div></header>
      <div className="page">
        {tab === 'dashboard' && <Dashboard notify={notify} />}

        {tab === 'entry' && <>
          <div className="card">
            <div className="card-header">
              <h3><FileSpreadsheet size={18} /> تفاصيل فواتير الفرع — شاشة الإدخال</h3>
              <div className="btn-row">
                <button className="btn btn-light btn-sm" onClick={() => setTab('users')}><Plus size={14} /> إضافة كاشير</button>
                <button className="btn btn-light btn-sm" onClick={() => { setEditing(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>جديد</button>
              </div>
            </div>
            <div className="card-body">
              <InvoiceForm key={editing ? `edit-${editing.id}` : 'new'} initial={editing || undefined}
                onSubmit={save} onError={notify} branches={branches} allowBranch
                submitLabel={editing ? 'حفظ التعديلات' : 'حفظ'}
                onSaved={() => { setEditing(null); loadRecords(); }} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>استعراض السجلات — كل الأيام ({records.length})</h3>
              <div className="btn-row">
                <button className="btn btn-primary btn-sm" onClick={() => loadRecords()}>بحث</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEntryFilters({}); loadRecords({}); }}>مسح الفلاتر</button>
              </div></div>
            <div className="card-body">
              <FilterBar filters={entryFilters} setFilters={setEntryFilters} branches={branches} users={users} />
            </div>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>الرقم</th><th>الفرع</th><th>الكاشير</th><th>التاريخ</th><th>اليوم</th>
                <th>المورد</th><th>الفواتير</th><th>المدفوعات</th><th>إجمالي الدخل</th><th>الفرق</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan="11" className="center muted">لا توجد سجلات مطابقة للفلاتر</td></tr>}
                {records.map((r) => {
                  let t = {}; try { t = JSON.parse(r.totals || '{}'); } catch { /* ignore */ }
                  return <tr key={r.id}>
                    <td><b>{r.code}</b></td><td>{r.branch_name}</td><td>{r.user_name}</td>
                    <td>{fmtDate(r.invoice_date)}</td><td>{r.day_name || '-'}</td>
                    <td>{r.first_supplier || '-'}</td>
                    <td>{t.listB?.invoices || '-'}</td><td>{t.listB?.payments || '-'}</td>
                    <td>{t.shifts?.total_amount || '-'}</td>
                    <td className={t.difference?.state === 'plus' ? 'diff-plus' : t.difference?.state === 'minus' ? 'diff-minus' : ''}>
                      {t.difference?.text || '-'}</td>
                    <td><ActionIcons row={r} /></td>
                  </tr>;
                })}
              </tbody>
            </table></div>
          </div>
        </>}

        {tab === 'branches' && <Branches branches={branches} reload={loadBranches} notify={notify} />}
        {tab === 'users' && <UsersView users={users} branches={branches} reload={loadUsers} notify={notify} />}
        {tab === 'reports' && <Reports branches={branches} users={users} notify={notify}
          onPrint={setPrintData} onUpdate={() => { loadUsers(); loadRecords(); }}
          onEdit={openEdit} onDelete={remove} />}
        {tab === 'suppliers' && <SupplierReport branches={branches} notify={notify} />}
        {tab === 'cashnet' && <CashNetworkReport branches={branches} users={users} notify={notify} />}
        {tab === 'fields' && <FieldReports branches={branches} users={users} notify={notify} />}
        {tab === 'settings' && <div className="card"><div className="card-header"><h3>تغيير كلمة المرور</h3></div>
          <div className="card-body" style={{ maxWidth: 420 }}>
            <div className="field" style={{ marginBottom: 12 }}><label>كلمة المرور الحالية</label>
              <input type="password" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 16 }}><label>كلمة المرور الجديدة</label>
              <input type="password" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={async () => {
              try { notify((await api('/auth/change-password', { method: 'POST', body: { current: pass.current, next: pass.next } })).message); }
              catch (e) { notify(e.message, 'error'); }
            }}>حفظ كلمة المرور</button>
          </div></div>}
      </div>
    </main>

    {detail && <InvoiceDetailModal invoice={detail} onClose={() => setDetail(null)} notify={notify}
      onPrint={setPrintData} onUpdate={loadRecords} onEdit={(inv) => { setDetail(null); openEdit(inv.id); }} />}
    {editing && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
      <div className="modal wide">
        <div className="modal-header"><h3>تعديل السجل {editing.code}</h3>
          <button className="icon-btn" onClick={() => setEditing(null)}><X size={19} /></button></div>
        <div className="modal-body">
          <InvoiceForm initial={editing} onSubmit={save} onError={notify} branches={branches} allowBranch
            submitLabel="حفظ التعديلات" onSaved={() => { setEditing(null); loadRecords(); }} />
        </div>
      </div>
    </div>}
    <PrintableReport data={printData} onDone={() => setPrintData(null)} />
  </>;
}
