import React from 'react';
import { Flame } from 'lucide-react';

const WorkoutHeader = ({ t, language, selectedDate, soundEnabled, playSoundEffect, warmupVideos, onOpenWarmup }) => {
  const dateObj = new Date(selectedDate);
  const dayName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { weekday: 'long' });
  const dateName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mb-6 mt-2">
      {/* JUDUL KEREN — pemanasan bersifat global (bukan per program), jadi cukup satu tombol di sini */}
      <div className="px-2 mb-4 flex items-center justify-between gap-3">
        <h1 className={`h2 ${t.textAccent} uppercase tracking-widest`}>
          {dayName}, {dateName}
        </h1>
        {warmupVideos && (
          <button
            onClick={() => { playSoundEffect('click', soundEnabled); onOpenWarmup(); }}
            className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${t.btnBg} ${t.textMuted} hover:${t.textAccent}`}
            title="Pemanasan"
          >
            <Flame size={20} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkoutHeader;
