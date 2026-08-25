import React, { useState, useEffect, useRef } from 'react';
import { DownloadCloud, X, Loader2 } from 'lucide-react';

// Bar progres unduhan. Bundle OTA puluhan MB, diinterpolasi halus 60fps dengan active crawler
// agar progres selalu bergerak dinamis (tidak mandek di 0%), dan memberi status transparan
// saat fase ekstraksi/pemasangan ke disk berlangsung.
function DownloadProgress({ progress, t }) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const targetRef = useRef(0);
  const isDoneRef = useRef(false);

  useEffect(() => {
    if (typeof progress === 'number') {
      targetRef.current = Math.max(targetRef.current, progress);
      if (progress >= 100) {
        isDoneRef.current = true;
      }
    }
  }, [progress]);

  useEffect(() => {
    if (typeof progress !== 'number') return;

    // Timer 1: Active progress crawler saat native progress belum terdistribusi / terbendung.
    // Berjalan mulus dari 1% naik ke ~92% secara asimtotik agar layar selalu hidup.
    const crawlerInterval = setInterval(() => {
      if (isDoneRef.current) return;
      targetRef.current = Math.min(92, targetRef.current + (targetRef.current < 25 ? 1.8 : targetRef.current < 60 ? 1.0 : 0.4));
    }, 200);

    // Timer 2: Render frame 30ms (60fps fluid) untuk transisi angka dan lebar bar yang sangat mulus
    const renderInterval = setInterval(() => {
      setDisplayProgress(prev => {
        const target = isDoneRef.current ? 100 : targetRef.current;
        if (prev >= target) return prev;
        const diff = target - prev;
        const step = diff > 20 ? 1.8 : diff > 5 ? 0.9 : 0.35;
        const next = prev + step;
        return next >= target ? target : next;
      });
    }, 30);

    return () => {
      clearInterval(crawlerInterval);
      clearInterval(renderInterval);
    };
  }, [progress !== null]);

  if (progress === 'apk') {
    return (
      <div className="w-full flex flex-col items-center justify-center p-4">
        <Loader2 className={`animate-spin ${t.textAccent} mb-3`} size={32} />
        <span className={`text-sm font-bold ${t.textMain}`}>Mempersiapkan Unduhan...</span>
        <p className={`text-[10px] ${t.textMuted} mt-2 leading-tight text-center`}>
          Tunggu sebentar, file APK sedang diproses oleh browser.
        </p>
      </div>
    );
  }

  const rounded = Math.round(displayProgress);
  const isExtracting = rounded >= 100;

  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${t.textMuted}`}>
          {isExtracting ? 'Mengekstrak & memasang…' : 'Mengunduh pembaruan…'}
        </span>
        <span className={`text-xs font-bold ${t.textMain} tabular-nums`}>
          {rounded}%
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden relative">
        <div
          className={`${t.bgAccent} h-full rounded-full transition-all duration-75 ease-out`}
          style={{ width: `${Math.min(100, Math.max(rounded, 3))}%` }}
        />
        {isExtracting && (
          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
        )}
      </div>
      <p className={`text-[10px] ${t.textMuted} mt-2 leading-tight`}>
        {isExtracting
          ? 'Memasang berkas baru ke aplikasi. LOGYM akan segera dimuat ulang…'
          : 'Jangan tutup aplikasi. LOGYM akan otomatis dimuat ulang setelah selesai.'}
      </p>
    </div>
  );
}

export default function UpdaterAlert({
  open, force, onUpdate, onClose, releaseNotes, theme,
  currentVersion, newVersion, progress,
}) {
  const downloading = progress !== null && progress !== undefined;

  // Kunci scroll background saat dialog update wajib terbuka
  useEffect(() => {
    if (!open || !force) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [open, force]);

  if (!open) return null;

  const t = theme;
  const versionLine = currentVersion && newVersion
    ? `v${currentVersion} → v${newVersion}`
    : newVersion ? `v${newVersion}` : null;

  if (force) {
    // Scrim sengaja TIDAK ikut di-fade: elemen ber-backdrop-filter yang animasi opacity-nya
    // sendiri bikin blur baru menyala setelah animasi selesai (kedipan layer).
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md overscroll-contain touch-none select-none">
        <div className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl ${t.bgCardSolid} border ${t.border} ${t.textMain} flex flex-col items-center text-center animate-in zoom-in-95 duration-500 overscroll-contain`}>
          <div className="pt-8 pb-4">
            <img src="/icon-512.webp" alt="LOGYM Logo" className="w-24 h-24 mx-auto rounded-2xl shadow-lg mb-4 bg-white/5 border border-white/10 p-2" />
            <h2 className={`text-2xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-br ${t.gradientText}`}>Update Penting!</h2>
            <p className={`text-sm font-medium ${t.textMuted} px-6`}>
              Versi terbaru LOGYM telah tersedia. Kamu harus mengunduh pembaruan ini untuk melanjutkan.
            </p>
            {versionLine && (
              <p className={`text-xs font-bold ${t.textAccent} mt-2 tabular-nums`}>{versionLine}</p>
            )}
          </div>

          {releaseNotes && (
            <div className={`w-full ${t.bgSunken} px-6 py-4 text-left border-y ${t.border}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textAccent}`}>Yang Baru:</span>
              <p className={`text-sm mt-1 ${t.textMain} whitespace-pre-wrap`}>{releaseNotes}</p>
            </div>
          )}

          <div className="w-full p-6 mt-2 text-center">
            {downloading ? (
              <DownloadProgress progress={progress} t={t} />
            ) : (
              <button
                onClick={onUpdate}
                className={`w-full py-4 ${t.bgAccent} rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform`}
              >
                <DownloadCloud size={24} />
                Update Sekarang
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Update opsional — kartu di dasbor, bisa ditutup
  return (
    <div className="fixed bottom-24 inset-x-4 z-[100] flex justify-center pointer-events-none animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className={`pointer-events-auto ${t.bgCardSolid} ${t.textMain} rounded-2xl p-4 shadow-2xl w-full max-w-sm border ${t.border} flex flex-col gap-3 relative overflow-hidden`}>
        {/* Tombol tutup disembunyikan saat mengunduh supaya kartu (dan progresnya) tidak hilang di tengah jalan */}
        {!downloading && (
          <div className="absolute top-0 right-0 p-2">
            <button onClick={onClose} className={`p-1 rounded-full ${t.textMuted} hover:${t.textMain} transition-colors`}>
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex gap-4 items-center pr-6">
          <div className={`bg-black/20 border ${t.border} p-1.5 rounded-xl shrink-0`}>
            <img src="/icon-512.webp" alt="LOGYM" className="w-10 h-10 rounded-lg" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Update Tersedia</h3>
            <p className={`text-xs ${t.textMuted} mt-0.5 tabular-nums`}>
              {versionLine || 'Ada versi LOGYM yang lebih baru.'}
            </p>
          </div>
        </div>

        {releaseNotes && !downloading && (
          <p className={`text-xs ${t.textMuted} leading-snug whitespace-pre-wrap`}>{releaseNotes}</p>
        )}

        {downloading ? (
          <DownloadProgress progress={progress} t={t} />
        ) : (
          <button
            onClick={onUpdate}
            className={`w-full py-2.5 ${t.bgAccent} rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2`}
          >
            <DownloadCloud size={18} />
            Update Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
