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
  const dateObj = new Date(selectedDate);
  const dayName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { weekday: 'long' });
  const dateName = dateObj.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mb-8 mt-6">
      <div className="px-3 flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-zinc-900 dark:text-white capitalize mb-1">
            {dayName}
          </h1>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight leading-none ${t.textAccent}`}>
            {dateName}
          </h2>
        </div>
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          {warmupVideos && (
            <button
              onClick={() => { playSoundEffect('click', soundEnabled); onOpenWarmup(); }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${t.btnBg} ${t.textMuted} hover:${t.textAccent} border border-black/5 dark:border-white/5 shadow-sm`}
              title="Pemanasan"
            >
              <Flame size={20} strokeWidth={2} />
            </button>
          )}
          {wellnessConfig && (
            <button
              type="button"
              onClick={() => {
                playSoundEffect('click', soundEnabled);
                onOpenWellness?.();
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${t.btnBg} ${t.textMuted} hover:${t.textAccent} border border-black/5 dark:border-white/5 shadow-sm`}
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
