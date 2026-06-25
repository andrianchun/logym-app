import React from 'react';
import { Moon, Plus, X } from 'lucide-react';

const EmptyWorkoutState = ({
  t,
  showProgramSelect,
  setShowProgramSelect,
  playSoundEffect,
  soundEnabled,
  setActiveTab,
  handleAddAdhocSession,
  programs,
  handleAddProgramToToday,
  activePlanIds
}) => {
  return (
    <div className={`p-8 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed ${t.border} text-center mt-6 relative overflow-hidden`}>
      {/* --- Background Image Layer --- */}
      <div 
        className="absolute inset-0 z-0 opacity-70 dark:opacity-40 pointer-events-none"
        style={{
          backgroundImage: "url('/bg-empty.png')",
          backgroundSize: '160%',
          backgroundPosition: '50% 10%',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
        }}
      />
      {/* ------------------------------ */}
      
      <div className="relative z-10">
        <Moon size={48} className={`mx-auto mb-6 opacity-40 ${t.textAccent}`} />
      
      {(!activePlanIds || activePlanIds.length === 0) ? (
        <>
          <h2 className="h2 mb-4">Tidak Ada Program Aktif</h2>
          <p className={`body-md mb-6 ${t.textMuted}`}>Silakan pilih atau buat program latihan terlebih dahulu di tab Program.</p>
          <button 
            onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('program'); }} 
            className={`w-full py-3 rounded-xl body-lg font-bold ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80 transition-opacity`}
          >
            Buka Tab Program
          </button>
        </>
      ) : (
        <>
          <h2 className="h2 mb-6">Belum Ada Jadwal</h2>
          {!showProgramSelect ? (
            <div className="space-y-3">
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('calendar'); }} 
                className={`w-full py-3 rounded-xl body-lg font-bold bg-black/5 dark:bg-white/5 border ${t.border} hover:bg-black/10 transition-colors`}
              >
                Atur di Kalender
              </button>
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); setShowProgramSelect(true); }} 
                className={`w-full py-3 rounded-xl body-lg font-bold ${t.bgAccentSoft} ${t.textAccent} border ${t.borderAccentSoft} hover:opacity-80 transition-opacity`}
              >
                Pilih Program
              </button>
              <button 
                onClick={handleAddAdhocSession} 
                className={`w-full py-3 rounded-xl body-lg font-bold bg-black/5 dark:bg-white/5 border ${t.border} hover:bg-black/10 transition-colors`}
              >
                Pilih Latihan Ekstra
              </button>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl bg-black/5 dark:bg-white/5 border ${t.border} animate-in fade-in text-left`}>
              <div className="flex justify-between items-center mb-3">
                <span className="body-lg font-bold">Pilih Program Latihan:</span>
                <button 
                  onClick={() => setShowProgramSelect(false)} 
                  className="p-1 hover:bg-white/10 rounded-lg"
                >
                  <X size={16}/>
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {programs.filter(p => activePlanIds.includes(p.planId || 'custom')).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handleAddProgramToToday(p)}
                    className={`w-full p-3 rounded-xl border ${t.border} text-left body-lg font-bold hover:${t.bgAccentSoft} hover:${t.textAccent} transition-colors flex justify-between items-center`}
                  >
                    {p.name}
                    <Plus size={16} className="opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default EmptyWorkoutState;
