import React from 'react';
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
          <div className="space-y-3">
            <button 
              onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('calendar'); }} 
              className={`w-full py-3 rounded-xl body-lg font-bold bg-black/5 dark:bg-white/5 border ${t.border} hover:bg-black/10 transition-colors`}
            >
              Atur di Kalender
            </button>
            <button 
              onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('program'); }} 
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
        </>
      )}
      </div>
    </div>
  );
};

export default EmptyWorkoutState;
