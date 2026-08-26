import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ confirmModal, setConfirmModal, t, lang, soundEnabled, playSoundEffect }) => {
  useEffect(() => {
    if (!confirmModal?.isOpen) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [confirmModal?.isOpen]);

  if (!confirmModal.isOpen) return null;

  const isDelete = confirmModal.isDestructive || confirmModal.title?.toLowerCase().includes('hapus') || confirmModal.message?.toLowerCase().includes('hapus') || confirmModal.message?.toLowerCase().includes('remove') || confirmModal.title?.toLowerCase().includes('batal');

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe ${t?.textMain} font-sans`} 
      onClick={() => { if (confirmModal.onCancel) confirmModal.onCancel(); setConfirmModal({isOpen:false}); }}
    >
      <div 
        className={`w-full max-w-sm mx-auto ${t?.bgCard || 'bg-slate-900'} rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border ${t?.border || 'border-white/10'} p-6 text-center`} 
        onClick={(e) => e.stopPropagation()}
      >
         <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3.5 ${isDelete ? 'bg-rose-500/15 text-rose-500' : (t?.bgAccentSoft || 'bg-sky-500/15') + ' ' + (t?.textAccent || 'text-sky-500')}`}>
            <AlertTriangle size={28} strokeWidth={2.5} />
         </div>
         <h3 className={`text-lg font-black ${t?.textMain} mb-2`}>{confirmModal.title}</h3>
         <p className={`text-xs ${t?.textMuted} mb-6 leading-relaxed whitespace-pre-line`}>{confirmModal.message}</p>
         <div className={confirmModal.onDiscard ? "flex flex-col gap-2.5" : "flex gap-2.5"}>
            {confirmModal.onConfirm && (
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); const cb = confirmModal.onConfirm; setConfirmModal({isOpen:false}); setTimeout(() => cb(), 0); }} 
                className={`w-full py-3 rounded-2xl font-black text-sm text-white shadow-lg active:scale-[0.98] transition-all ${isDelete ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-600' : (t?.bgAccent || 'bg-sky-500') + ' shadow-black/20 hover:opacity-90'}`}
              >
                {confirmModal.confirmText || (isDelete ? 'Ya, Hapus' : 'Ya, Lanjutkan')}
              </button>
            )}
            {confirmModal.onDiscard && (
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); const cb = confirmModal.onDiscard; setConfirmModal({isOpen:false}); setTimeout(() => cb(), 0); }} 
                className={`w-full py-3 rounded-2xl font-bold text-sm text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] transition-all`}
              >
                {confirmModal.discardText || 'Buang'}
              </button>
            )}
            <button 
              onClick={() => { if (confirmModal.onCancel) confirmModal.onCancel(); setConfirmModal({isOpen:false}); }} 
              className={`w-full py-3 rounded-2xl font-bold text-sm ${t?.textMuted} ${t?.btnBg || 'bg-white/10'} active:scale-[0.98] transition-all`}
              data-close-modal="true"
            >
              {lang?.cancel || 'Batal'}
            </button>
         </div>
      </div>
    </div>
  );
};

export default ConfirmModal;