import React from 'react';
import { Wind, CheckCircle, RotateCcw } from 'lucide-react';

const WorkoutFooter = ({
  t, lang, soundEnabled, playSoundEffect,
  onOpenVideo, cooldownVideos,
  isCurrentlyCompleted, onSaveWorkout
}) => {
  return (
    <div className="mt-4 mb-8">
      {/* TOMBOL PENDINGINAN */}
      <div className="flex space-x-3 mb-6">
         <button 
            onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(cooldownVideos);}} 
            className={`flex-1 ${t.bgAccentSoft} ${t.textAccent} font-bold py-3 px-2 rounded-2xl border ${t.borderAccentSoft} flex justify-center items-center hover:opacity-80 transition-all body-lg shadow-sm active:scale-95`}
         >
            <Wind size={16} className="mr-2"/> {lang.cooldown || 'Pendinginan'}
         </button>
      </div>
      {/* TOMBOL SIMPAN / PERBARUI (Dihapus karena auto-save) */}
    </div>
  );
};

export default WorkoutFooter;