import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function PwaInstallPrompt({ 
  appName = 'Logym', 
  appLogo = '/icon-512.webp',
  fallbackLogo = '/logo-dark.webp',
  description = 'Install aplikasi Logym di perangkatmu untuk catat workout, tracking latihan, dan akses offline yang lancar.',
  storageKey = '__LOGYM_PWA_PROMPT_DISMISSED',
  accentColor = 'bg-primary-500 hover:bg-primary-400 text-black'
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [imgSrc, setImgSrc] = useState(appLogo);

  useEffect(() => {
    // Jangan muncul jika sudah mode standalone (sudah terinstal) atau di dalam navigator standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const hasDismissed = localStorage.getItem(storageKey);
      if (!hasDismissed) {
        setShow(true);
      }
    };

    const handleAppInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!show || !deferredPrompt) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [show, deferredPrompt]);

  if (!show || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain touch-none no-swipe">
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300 bg-[#0d1410] border border-white/10 text-white">
        <div className="w-16 h-16 rounded-2xl mb-4 shadow-xl border border-white/10 bg-black/40 p-2 flex items-center justify-center overflow-hidden">
          <img 
            src={imgSrc} 
            onError={() => {
              if (imgSrc !== fallbackLogo) setImgSrc(fallbackLogo);
            }}
            className="w-full h-full object-contain rounded-xl" 
            alt={`${appName} Logo`} 
          />
        </div>
        <h3 className="text-lg font-black mb-2 text-white">Install {appName} App</h3>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">{description}</p>
        <div className="flex flex-col w-full gap-2.5">
          <button 
            className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform ${accentColor}`}
            onClick={handleInstall}
          >
            <Download size={18} /> Instal Sekarang
          </button>
          <button 
            className="w-full py-2.5 rounded-2xl font-bold text-gray-400 hover:text-white bg-transparent border border-transparent transition-colors text-xs"
            onClick={handleDismiss}
            data-close-modal="true"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
