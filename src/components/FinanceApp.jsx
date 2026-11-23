import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Users, FileBarChart, ListFilter, LogOut, KeyRound, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { api } from '../api';
import Dashboard from './Dashboard.jsx';
import Branches from './Branches.jsx';
import UsersView from './Users.jsx';
import Reports from './Reports.jsx';
import FieldReports from './FieldReports.jsx';
import PrintableReport from './PrintableReport.jsx';
import InvoiceForm from './InvoiceForm.jsx';
import { Modal } from './ui.jsx';

const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'entry', label: 'شاشة الإدخال', icon: FileSpreadsheet },
  { id: 'branches', label: 'الفروع', icon: Building2 },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'reports', label: 'الفواتير والتقارير', icon: FileBarChart },
  { id: 'fields', label: 'تقارير الحقول', icon: ListFilter },
];
const TITLES = {
  dashboard: 'لوحة التحكم', entry: 'تفاصيل فواتير الخرج', branches: 'إدارة الفروع', users: 'إدارة المستخدمين',
  reports: 'الفواتير والتقارير', fields: 'تقارير الحقول', settings: 'إعدادات الحساب',
};

export default function FinanceApp({ user, onLogout, notify }) {
  const [tab, setTab] = useState('dashboard');
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [pass, setPass] = useState({ current: '', next: '' });

  const loadBranches = () => api('/branches').then(setBranches).catch((e) => notify(e.message, 'error'));
  const loadUsers = () => api('/users').then(setUsers).catch((e) => notify(e.message, 'error'));
  useEffect(() => { loadBranches(); loadUsers(); }, []);

  const changePass = async () => {
    try {
      notify((await api('/auth/change-password', { method: 'POST', body: { current: pass.current, next: pass.next } })).message);
      setShowPass(false); setPass({ current: '', next: '' });
    } catch (e) { notify(e.message, 'error'); }
  };

  return <>
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><FileSpreadsheet size={22} /></div>
        <div><strong>فواتير الخرج</strong><small>لوحة المالي</small></div>
      </div>
      {NAV.map((n) => <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`}
        onClick={() => setTab(n.id)}><n.icon size={18} /><span>{n.label}</span></button>)}
      <div className="sidebar-spacer" />
      <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
        <KeyRound size={18} /><span>إعدادات الحساب</span></button>
      <div className="sidebar-user">
        <strong>{user.full_name}</strong><small>مالي - صلاحيات كاملة</small>
        <button className="logout-btn" onClick={onLogout}><LogOut size={15} /> تسجيل الخروج</button>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><h2>{TITLES[tab]}</h2>
        <div className="meta"><ShieldCheck size={15} /> صلاحية المالي</div></header>
      <div className="page">
        {tab === 'dashboard' && <Dashboard notify={notify} />}
        {tab === 'entry' && <div className="card">
          <div className="card-header">
            <h3><FileSpreadsheet size={18} /> تفاصيل فواتير الخرج — شاشة الإدخال</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setTab('users')}>+ إضافة كاشير</button>
          </div>
          <div className="card-body"><InvoiceForm preview branchName={user.branch_name || 'الفرع الرئيسي'} /></div>
        </div>}
        {tab === 'branches' && <Branches branches={branches} reload={loadBranches} notify={notify} />}
        {tab === 'users' && <UsersView users={users} branches={branches} reload={loadUsers} notify={notify} />}
        {tab === 'reports' && <Reports branches={branches} users={users} notify={notify}
          onPrint={setPrintData} onUpdate={loadUsers} />}
        {tab === 'fields' && <FieldReports branches={branches} users={users} notify={notify} />}
        {tab === 'settings' && <div className="card"><div className="card-header"><h3>تغيير كلمة المرور</h3></div>
          <div className="card-body" style={{ maxWidth: 420 }}>
            <div className="field" style={{ marginBottom: 12 }}><label>كلمة المرور الحالية</label>
              <input type="password" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} /></div>
            <div className="field" style={{ marginBottom: 16 }}><label>كلمة المرور الجديدة</label>
              <input type="password" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={changePass}>حفظ كلمة المرور</button>
          </div></div>}
      </div>
    </main>
    <PrintableReport data={printData} onDone={() => setPrintData(null)} />
    {showPass && <Modal title="تغيير كلمة المرور" onClose={() => setShowPass(false)} />}
  </>;
}
