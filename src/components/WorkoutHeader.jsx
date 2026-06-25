import React from 'react';
import { CalendarDays, Flame } from 'lucide-react';

const WorkoutHeader = ({
  t, lang, language, selectedDate, setSelectedDate,
  soundEnabled, playSoundEffect, onOpenVideo, warmupVideos,
  activeProgram, hideWarmup
}) => {
  // Gunakan warmup per program jika tersedia, fallback ke global
  const programWarmup = activeProgram?.warmupVideoUrls?.length > 0 
    ? activeProgram.warmupVideoUrls.join(' ')
    : warmupVideos;

  const dateObj = new Date(selectedDate);
  const dayName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { weekday: 'long' });
  const dateName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mb-6 mt-2">
      {/* JUDUL KEREN */}
      <div className="px-2 mb-4">
        <h1 className={`h2 ${t.textAccent} uppercase tracking-widest`}>
          {dayName}, {dateName}
        </h1>
      </div>

      {/* TOMBOL PEMANASAN */}
      {!hideWarmup && (
        <div className="flex space-x-3">
          <button 
             onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(programWarmup);}} 
             className={`flex-1 ${t.bgAccentSoft} ${t.textAccent} py-3 px-2 rounded-2xl border ${t.borderAccentSoft} flex justify-center items-center hover:brightness-105 transition-all body-lg shadow-sm active:scale-95`}
          >
             <Flame size={16} className="mr-2"/> {lang.warmup || 'Pemanasan'}
             {activeProgram?.warmupVideoUrls?.length > 0 && (
               <span className={`ml-1.5 h3 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full`}>Kustom</span>
             )}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkoutHeader;