import React, { useEffect } from 'react';
import { Zap, Activity, ShieldAlert, X, Check } from 'lucide-react';
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

  const activeOption = currentWellness || 'prima';

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
          {[
            {
              id: 'prima',
              label: 'Prima',
              desc: 'Target beban 100% & progresi normal',
              icon: Zap
            },
            {
              id: 'doms',
              label: 'Pegal',
              desc: 'Fokus teknik form & kontrol repetisi',
              icon: Activity
            },
            {
              id: 'deload',
              label: 'Nyeri',
              desc: 'Pangkas beban 15–20% untuk cegah cedera',
              icon: ShieldAlert
            }
          ].map((opt) => {
            const isSelected = activeOption === opt.id;
            const IconComp = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleChoose(opt.id)}
                className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center gap-3.5 active:scale-[0.98] group ${
                  isSelected
                    ? `${t?.borderAccent || 'border-sky-400'} ${t?.bgAccentSoft || 'bg-sky-500/15'} ring-1 ${t?.ringAccent ? `${t.ringAccent}/40` : 'ring-sky-400/40'}`
                    : `${t?.border || 'border-white/10'} ${t?.inputBg || 'bg-white/5'} hover:bg-white/10`
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                  isSelected 
                    ? `${t?.bgAccentSoft || 'bg-sky-500/20'} ${t?.textAccent || 'text-sky-400'}` 
                    : `bg-white/5 ${t?.textMuted || 'text-slate-400'} group-hover:${t?.textMain || 'text-white'}`
                }`}>
                  <IconComp size={20} className="group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm leading-tight transition-colors ${
                    isSelected ? (t?.textAccent || 'text-sky-400') : (t?.textMain || 'text-white')
                  }`}>
                    {opt.label}
                  </h4>
                  <p className={`text-xs mt-0.5 leading-snug ${t?.textMuted || 'text-slate-400'}`}>
                    {opt.desc}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                  isSelected 
                    ? `${t?.bgAccent || 'bg-blue-600'} border-transparent shadow-sm` 
                    : 'border-slate-500/30'
                }`}>
                  {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WellnessCheckModal;
