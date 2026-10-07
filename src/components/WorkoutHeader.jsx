import React from 'react';
import { Flame } from 'lucide-react';

const WorkoutHeader = ({
  t,
  language,
  selectedDate,
  soundEnabled,
  playSoundEffect,
  warmupVideos,
  onOpenWarmup,
  wellnessConfig,
  onOpenWellness
}) => {
  const dateObj = new Date(selectedDate.includes('T') ? selectedDate : selectedDate + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { weekday: 'long' });
  // Tahun dihilangkan agar tampilan lebih ringkas dan tombol aksi bisa sejajar berdampingan
  const dateName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long' });

  return (
    <div className="mb-3 mt-1 sm:mt-2">
      <div className="px-1 flex items-center justify-between gap-3">
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white capitalize">
            {dayName}
          </h1>
          <h2 className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${t.textAccent}`}>
            {dateName}
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {warmupVideos && (
            <button
              type="button"
              onClick={() => { playSoundEffect('click', soundEnabled); onOpenWarmup(); }}
              className="flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/25 text-orange-500 dark:text-orange-400 shadow-sm shadow-orange-950/10"
              title="Pemanasan (Warmup)"
            >
              <Flame size={20} strokeWidth={2.2} />
            </button>
          )}
          {wellnessConfig && (
            <button
              type="button"
              onClick={() => {
                playSoundEffect('click', soundEnabled);
                onOpenWellness?.();
              }}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all active:scale-95 border shadow-sm ${wellnessConfig.btnStyle || 'bg-white/5 border-white/10 text-white'}`}
              title={`Kondisi Tubuh: ${wellnessConfig.label} (Ketuk untuk detail / ubah)`}
            >
              {wellnessConfig.icon}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutHeader;
