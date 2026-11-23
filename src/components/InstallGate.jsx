import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share2, CheckCircle2, X } from 'lucide-react';

const DONE = 'fawateer_install_done';

export default function InstallGate() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DONE) === '1');
  const [isIOS, setIsIOS] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua) && !window.navigator.standalone);
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => close();
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const close = () => { localStorage.setItem(DONE, '1'); setDismissed(true); setDeferred(null); };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      close(); // سواء وافق أو ألغى، لا نحجب التطبيق
    } else if (isIOS) {
      setShowSteps(true);
    } else {
      setShowSteps(true);
    }
  };

  if (dismissed || window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="تثبيت التطبيق">
      <div className="install-banner-icon"><Smartphone size={22} /></div>
      <div className="install-banner-text">
        <b>ثبّت «فواتير الخرج» على جهازك</b>
        <span>اضغط زر التثبيت ثم اختر «إضافة / تثبيت» من نافذة المتصفح.</span>
        {showSteps && isIOS && (
          <span className="install-inline-steps">
            <Share2 size={14} /> زر المشاركة في سفاري ← «إضافة إلى الشاشة الرئيسية» ← «إضافة»
          </span>
        )}
        {showSteps && !isIOS && (
          <span className="install-inline-steps">إذا لم تظهر النافذة، استخدم قائمة المتصفح ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span>
        )}
      </div>
      <button className="btn btn-primary btn-sm" onClick={install}>
        <Download size={15} /> تثبيت
      </button>
      <button className="icon-btn" title="إغلاق والمتابعة" onClick={close}><X size={18} /></button>
    </div>
  );
}
