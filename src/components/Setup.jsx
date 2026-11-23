import React, { useState } from 'react';
import { FileSpreadsheet, UserCog, Building2, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function Setup({ onDone, notify }) {
  const [f, setF] = useState({ full_name: '', email: '', password: '', branch_name: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { onDone(await api('/setup', { method: 'POST', body: f })); }
    catch (err) { notify(err.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><FileSpreadsheet size={32} /></div>
        <h1>تفاصيل فواتير الخرج</h1>
        <p className="sub">الإعداد الأولي — إنشاء حساب المالي والفرع الرئيسي</p>
        <div className="form-grid">
          <div className="field"><label>اسمك الكامل *</label>
            <input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} required /></div>
          <div className="field"><label>بريدك الإلكتروني *</label>
            <input type="email" dir="ltr" value={f.email} onChange={(e) => set('email', e.target.value)} required /></div>
          <div className="field"><label>كلمة المرور * (6 أحرف فأكثر)</label>
            <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} required minLength={6} /></div>
          <div className="field"><label>اسم الفرع الرئيسي *</label>
            <input value={f.branch_name} onChange={(e) => set('branch_name', e.target.value)} required /></div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={busy}>
          <CheckCircle2 size={17} /> {busy ? 'جاري الإنشاء...' : 'إنشاء الحساب والبدء بالعمل'}
        </button>
        <div className="login-hint">
          هذا هو الإعداد الأولي للتشغيل الفعلي. بعدها ستضيف الفروع والكاشيرات من شاشة «المستخدمون»، ولن تظهر أي بيانات تجريبية.
        </div>
      </form>
    </div>
  );
}
