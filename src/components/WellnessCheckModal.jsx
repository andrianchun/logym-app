import React, { useEffect } from 'react';
import { Zap, Activity, ShieldAlert, X } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';

const WellnessCheckModal = ({ isOpen, onSelect, onClose, t, soundEnabled, currentWellness = null }) => {
  useEffect(() => {
    if (!isOpen) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChoose = (option) => {
    playSoundEffect('click', soundEnabled);
    onSelect(option);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col overflow-hidden border ${t.border} p-6 relative animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`}
          data-close-modal="true"
          title="Tutup"
        >
          <X size={18} className={t.textMain} />
        </button>

        {/* Header - Bersih tanpa subteks */}
        <div className="text-center mb-4 pt-1">
          <h3 className={`text-lg font-black ${t.textMain}`}>Kondisi Tubuh Hari Ini</h3>
        </div>

        {/* 3 Opsi Langsung: Prima, Pegal, Nyeri */}
        <div className="space-y-2.5">
          {/* Option 1: Prima */}
          <button
            onClick={() => handleChoose('prima')}
            className={`w-full p-3.5 rounded-2xl border ${currentWellness === 'prima' ? 'border-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'} active:scale-[0.98] transition-all text-left flex items-center gap-3.5 group`}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Zap size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-emerald-400 leading-tight flex items-center gap-2">
                Prima {currentWellness === 'prima' && <span className="text-xs py-0.5 px-2.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold">Aktif</span>}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">Target beban 100% & progresi normal</p>
            </div>
          </button>

          {/* Option 2: Pegal */}
          <button
            onClick={() => handleChoose('doms')}
            className={`w-full p-3.5 rounded-2xl border ${currentWellness === 'doms' ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50' : 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'} active:scale-[0.98] transition-all text-left flex items-center gap-3.5 group`}
          >
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Activity size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-amber-400 leading-tight flex items-center gap-2">
                Pegal {currentWellness === 'doms' && <span className="text-xs py-0.5 px-2.5 rounded-full bg-amber-500/30 text-amber-300 font-bold">Aktif</span>}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">Fokus teknik form & kontrol repetisi</p>
            </div>
          </button>

          {/* Option 3: Nyeri */}
          <button
            onClick={() => handleChoose('deload')}
            className={`w-full p-3.5 rounded-2xl border ${currentWellness === 'deload' ? 'border-rose-400 bg-rose-500/20 ring-1 ring-rose-400/50' : 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20'} active:scale-[0.98] transition-all text-left flex items-center gap-3.5 group`}
          >
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-rose-400 leading-tight flex items-center gap-2">
                Nyeri {currentWellness === 'deload' && <span className="text-xs py-0.5 px-2.5 rounded-full bg-rose-500/30 text-rose-300 font-bold">Aktif</span>}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">Pangkas beban 15–20% untuk cegah cedera</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WellnessCheckModal;
