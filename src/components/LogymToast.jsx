import React from 'react';

const VARIANT_CLASSES = {
  info: 'bg-[#0B1528]/95 text-white border-sky-400/35 shadow-[0_12px_40px_-8px_rgba(59,130,246,0.55)]',
  accent: 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white border-sky-300/40 shadow-[0_12px_40px_-8px_rgba(59,130,246,0.65)]',
  success: 'bg-[#06281E]/95 text-emerald-50 border-emerald-400/40 shadow-[0_12px_36px_-8px_rgba(16,185,129,0.5)]',
  error: 'bg-[#2B0B14]/95 text-rose-50 border-rose-400/40 shadow-[0_12px_36px_-8px_rgba(244,63,94,0.5)]',
};

/**
 * Standar tunggal (SSOT) untuk seluruh pill notifikasi / toast di Logym:
 * - Selalu presisi di tengah layar (dead-center) dengan teks rata tengah.
 * - Gaya glassmorphism khas Logym (navy/blue glow), font minimal text-sm (14px).
 */
const LogymToast = ({ open, message, variant = 'info', containerPosition = 'fixed' }) => {
  if (!open || !message) return null;
  const style = VARIANT_CLASSES[variant] || VARIANT_CLASSES.info;
  const posClass = containerPosition === 'absolute' ? 'absolute inset-0' : 'fixed inset-0';

  return (
    <div className={`${posClass} z-[9999] pointer-events-none flex items-center justify-center px-6`}>
      <div
        className={`px-6 py-3 rounded-full border backdrop-blur-md text-sm font-bold text-center leading-snug max-w-[85vw] animate-in fade-in zoom-in-95 duration-200 ${style}`}
      >
        {message}
      </div>
    </div>
  );
};

export default React.memo(LogymToast);
