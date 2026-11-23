import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api, setToken, token } from './api';
import Setup from './components/Setup.jsx';
import Login from './components/Login.jsx';
import CashierApp from './components/CashierApp.jsx';
import FinanceApp from './components/FinanceApp.jsx';
import InstallGate from './components/InstallGate.jsx';
import Splash from './components/Splash.jsx';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [needSetup, setNeedSetup] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await api('/setup/status');
        setNeedSetup(s.needed);
        if (!s.needed && token()) {
          const d = await api('/auth/me');
          setUser(d.user);
        }
      } catch (e) { notify(e.message, 'error'); }
      finally { setChecking(false); }
    })();
  }, []);

  const onAuth = (d) => { setToken(d.token); setUser(d.user); setNeedSetup(false); };
  const logout = () => { setToken(null); setUser(null); };

  if (checking) return <div className="empty">جاري التحميل...</div>;
  if (needSetup) return <Setup onDone={onAuth} notify={notify} />;
  if (!user) return <Login onLogin={onAuth} notify={notify} />;

  return (
    <div className="app-shell screen-only">
      <Splash />
      <InstallGate />
      {user.role === 'cashier'
        ? <CashierApp user={user} onLogout={logout} notify={notify} />
        : <FinanceApp user={user} onLogout={logout} notify={notify} />}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
