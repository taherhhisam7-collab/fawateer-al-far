import React, { useState } from 'react';
import { FileSpreadsheet, Lock, Mail, LogIn, ShieldCheck, Store } from 'lucide-react';
import { api } from '../api';

export default function Login({ onLogin, notify }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { onLogin(await api('/auth/login', { method: 'POST', body: { email, password } })); }
    catch (err) { notify(err.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><FileSpreadsheet size={32} /></div>
        <h1>تفاصيل فواتير الخرج</h1>
        <p className="sub">تسجيل الدخول — محاسب / كاشير</p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>البريد الإلكتروني</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', right: 11, top: 12, color: '#94a3b8' }} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" required
              placeholder="name@company.com" style={{ paddingRight: 34, textAlign: 'right' }} />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', right: 11, top: 12, color: '#94a3b8' }} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
              placeholder="••••••" style={{ paddingRight: 34 }} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          <LogIn size={17} /> {busy ? 'جاري الدخول...' : 'دخول'}
        </button>
        <div className="login-hint">
          <ShieldCheck size={15} /> الحسابات تُنشأ من قِبل المحاسب فقط.<br />
          <Store size={15} /> الكاشير يرى فرعه فقط ولا يدخل إلا فواتيره.
        </div>
      </form>
    </div>
  );
}
