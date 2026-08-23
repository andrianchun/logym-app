import React from 'react';
import { Zap, Activity, ShieldAlert, X } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';

const WellnessCheckModal = ({ isOpen, onSelect, onClose, t, soundEnabled }) => {
  if (!isOpen) return null;

  const handleChoose = (option) => {
    playSoundEffect('click', soundEnabled);
    onSelect(option);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col overflow-hidden border ${t.border} p-6 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 text-zinc-400 hover:text-white transition"
          title="Tutup"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-5 pt-1">
          <h3 className={`h2 font-bold ${t.textMain}`}>Kondisi Tubuh Hari Ini</h3>
          <p className={`text-xs ${t.textMuted} mt-1`}>
            Sesuaikan intensitas dan target beban latihanmu.
          </p>
        </div>

        {/* 3 Opsi Efisien & Bersih */}
        <div className="space-y-2.5">
          {/* Option 1: Prima */}
          <button
            onClick={() => handleChoose('prima')}
            className="w-full p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] transition-all text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Zap size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-400">Prima</h4>
                <p className="text-xs text-zinc-400">Target 100% & progresi normal</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400/70 group-hover:text-emerald-400">Normal</span>
          </button>

          {/* Option 2: DOMS / Pegal */}
          <button
            onClick={() => handleChoose('doms')}
            className="w-full p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] transition-all text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Activity size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-400">Pegal / Lelah</h4>
                <p className="text-xs text-zinc-400">Fokus form & kontrol repetisi</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400/70 group-hover:text-amber-400">Fokus Form</span>
          </button>

          {/* Option 3: Deload / Nyeri Sendi */}
          <button
            onClick={() => handleChoose('deload')}
            className="w-full p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] transition-all text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-400">Nyeri / Butuh Deload</h4>
                <p className="text-xs text-zinc-400">Pangkas beban 15-20%</p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-400/70 group-hover:text-rose-400">-20% Beban</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[10px] text-center text-zinc-500 mt-4">
          Kamu bisa mengubah status ini kapan saja di sesi latihan.
        </p>
      </div>
    </div>
  );
};

export default WellnessCheckModal;
