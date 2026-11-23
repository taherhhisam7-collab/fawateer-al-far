import React, { useEffect, useState } from 'react';

export default function Splash() {
  const [show, setShow] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches && !sessionStorage.getItem('fawateer_splash'));

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem('fawateer_splash', '1');
    const t = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return <div className="splash"><img src="/logo.png" alt="فواتير الفرع" /><b>فواتير الفرع</b></div>;
}
