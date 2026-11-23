import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Building2, Users, RefreshCw } from 'lucide-react';
import { api } from '../api';

function Stat({ icon: Icon, label, value }) {
  return <div className="stat-card"><span className="icon"><Icon size={22} /></span>
    <div className="label">{label}</div><div className="value">{value}</div></div>;
}

export default function Dashboard({ notify }) {
  const [s, setS] = useState(null);
  const load = () => api('/stats').then(setS).catch((e) => notify(e.message, 'error'));
  useEffect(() => { load(); }, []);
  const max = Math.max(1, ...(s?.perBranch || []).map((b) => b.n));

  return <>
    <div className="card">
      <div className="card-header"><h3>لوحة التحكم المالية</h3>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> تحديث</button></div>
      <div className="card-body">
        <div className="stat-grid">
          <Stat icon={FileSpreadsheet} label="فواتير الخرج" value={s?.total ?? '...'} />
          <Stat icon={Building2} label="الفروع" value={s?.branches ?? '...'} />
          <Stat icon={Users} label="الكاشيرات" value={s?.users ?? '...'} />
        </div>
      </div>
    </div>
    <div className="card">
      <div className="card-header"><h3>الفواتير حسب الفرع</h3></div>
      <div className="card-body">
        {(s?.perBranch || []).map((b) => <div className="bar-row" key={b.name}>
          <div className="name">{b.name}</div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(b.n / max) * 100}%` }} /></div>
          <div className="n">{b.n}</div>
        </div>)}
      </div>
    </div>
    <div className="card">
      <div className="card-header"><h3>إدخال الكاشيرات</h3></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>الكاشير</th><th>الفرع</th><th>عدد الفواتير</th></tr></thead>
        <tbody>
          {(s?.perCashier || []).map((u, i) => <tr key={i}><td>{u.full_name}</td><td>{u.branch || '-'}</td><td>{u.n}</td></tr>)}
          {s && s.perCashier.length === 0 && <tr><td colSpan="3" className="center muted">لا يوجد كاشيرات بعد — أضفهم من شاشة المستخدمين</td></tr>}
        </tbody>
      </table></div>
    </div>
    <div className="card">
      <div className="card-header"><h3>أحدث الفواتير</h3></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>الرقم</th><th>الفرع</th><th>الكاشير</th><th>التاريخ</th><th>اليوم</th></tr></thead>
        <tbody>
          {(s?.recent || []).map((r) => <tr key={r.id}>
            <td>{r.code}</td><td>{r.branch}</td><td>{r.user}</td><td>{r.date || '-'}</td><td>{r.day || '-'}</td>
          </tr>)}
          {s && s.recent.length === 0 && <tr><td colSpan="5" className="center muted">لا توجد فواتير بعد</td></tr>}
        </tbody>
      </table></div>
    </div>
  </>;
}
