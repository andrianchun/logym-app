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
    <div className="fixed inset-0 z-[5] flex flex-col justify-end overflow-hidden bg-black touch-none">
      {/* --- Background Image Layer --- */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/bg-empty.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)'
        }}
      />
      {/* ------------------------------ */}
      
      {/* Bottom Sheet Card */}
      <div className={`relative z-10 w-full px-6 pt-8 pb-[calc(100px+env(safe-area-inset-bottom))] rounded-t-[2.5rem] ${t.bgBox} border-t ${t.border} shadow-[0_-10px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl`}>
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-6"></div>
        
        {(!activePlanIds || activePlanIds.length === 0) ? (
          <>
            <h2 className={`text-3xl font-black ${t.textMain} mb-2 leading-tight tracking-tight`}>Belum Ada<br/>Program</h2>
            <p className={`body-md mb-8 ${t.textMuted} leading-relaxed`}>Silakan pilih atau buat program latihan terlebih dahulu di tab Program untuk mulai.</p>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('program'); }} 
                className={`flex-1 py-4 rounded-full body-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-between px-6`}
              >
                <span>Buka Program</span>
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={`text-3xl font-black ${t.textMain} mb-2 leading-tight tracking-tight`}>Selamat<br/>Beristirahat.</h2>
            <p className={`body-md mb-8 ${t.textMuted} leading-relaxed`}>Atau pilih menu di bawah ini jika ini bukan jadwal Rest Day-mu!</p>
            
            <div className="flex items-center space-x-3 mb-3">
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('calendar'); }} 
                className={`flex-1 py-4 rounded-full body-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-between px-6`}
              >
                <span>Atur di Kalender</span>
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); setActiveTab('program'); }} 
                className={`py-3.5 rounded-full body-base font-bold bg-zinc-200/50 dark:bg-zinc-800/50 ${t.textMain} border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors`}
              >
                Pilih Program
              </button>
              <button 
                onClick={handleAddAdhocSession} 
                className={`py-3.5 rounded-full body-base font-bold bg-zinc-200/50 dark:bg-zinc-800/50 ${t.textMain} border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors`}
              >
                Latihan Ekstra
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmptyWorkoutState;
