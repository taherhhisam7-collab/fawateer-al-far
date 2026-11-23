import React, { useEffect, useState } from 'react';
import { Smartphone, Share2, CheckCircle2, Download } from 'lucide-react';

const DONE = 'fawateer_install_done';

export default function InstallGate() {
  const [deferred, setDeferred] = useState(null);
  const [done, setDone] = useState(() => localStorage.getItem(DONE) === '1');
  const [isIOS, setIsIOS] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.navigator.standalone);
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => finish();
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const finish = () => { localStorage.setItem(DONE, '1'); setDone(true); setDeferred(null); };

  const install = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch { /* المتصفح قد يرفض الإجبار — نفتح التطبيق على أي حال */ }
      finish();
    } else {
      setSteps(true);
    }
  };

  if (done || window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <div className="install-gate">
      <div className="install-card">
        <img src="/logo.png" alt="شعار فواتير الفرع" className="gate-logo" />
        <h2>ثبّت تطبيق «فواتير الفرع»</h2>
        <p>التثبيت إلزامي قبل الدخول — ستجد الشعار على الشاشة الرئيسية وتعمل كل الميزات بشكل كامل.</p>

        {steps || isIOS ? (
          <>
            <div className="install-steps">
              <div><Share2 size={18} /> اضغط زر <b>المشاركة</b> في المتصفح</div>
              <div><CheckCircle2 size={18} /> اختر <b>إضافة إلى الشاشة الرئيسية</b></div>
              <div><Smartphone size={18} /> اضغط <b>إضافة</b> — سيظهر الشعار عندك</div>
            </div>
            <button className="btn btn-primary install-btn" onClick={finish}>
              <CheckCircle2 size={18} /> تم التثبيت، فتح التطبيق
            </button>
          </>
        ) : (
          <button className="btn btn-primary install-btn" onClick={install}>
            <Download size={19} /> تثبيت التطبيق الآن
          </button>
        )}
        {!steps && !isIOS && <p className="install-note">ستظهر نافذة المتصفح — اختر «تثبيت» أو «إضافة».</p>}
        <a className="install-help" href="/install.html">تعليمات التثبيت على الجوال</a>
      </div>
    </div>
  );
}
