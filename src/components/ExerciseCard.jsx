import React, { useState, useEffect } from 'react';
import { Trash2, SkipForward, Video, CheckCircle, Play, Square, Info, ArrowLeftRight, X, Dumbbell } from 'lucide-react';
import EquipmentIcon from './EquipmentIcon';
import SwipeInput from './SwipeInput';
import { formatTarget } from '../data/constants';
import { playSoundEffect } from '../utils/audio';

const ExerciseCard = ({
  ex, idx, isExtra = false,
  t, lang, soundEnabled,
  isSkip, onToggleSkip, onRemoveExtra, onOpenVideo, onReplaceClick,
  sets, onUpdateSet, onToggleSet, onAddSet, onRemoveSet
}) => {
  const exType = ex.type || 'weight';
  const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
  const doneCount = sets.filter(s => s.done).length;
  const totalSets = sets.length;
  const isAllDone = doneCount === totalSets && totalSets > 0;
  const progressPercent = totalSets > 0 ? (doneCount / totalSets) * 100 : 0;

  // ==========================================
  // LOGIKA COUNTDOWN TIMER UNTUK DURASI
  // ==========================================
  const [activeTimer, setActiveTimer] = useState({ idx: null, timeLeft: 0 });
  const [deletingSetIdx, setDeletingSetIdx] = useState(null);

  useEffect(() => {
    let interval = null;
    if (activeTimer.idx !== null && activeTimer.timeLeft > 0) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(interval);
            // Waktu Habis! Otomatis centang set ini jika belum selesai
            if (!sets[prev.idx]?.done) {
                onToggleSet(ex.id, prev.idx);
                // Kamu bisa ganti efek suaranya khusus timer jika ada
                playSoundEffect('click', soundEnabled); 
            }
            return { idx: null, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, ex.id, onToggleSet, sets, soundEnabled]);

  const toggleTimer = (setIdx, durationMins) => {
    playSoundEffect('click', soundEnabled);
    if (activeTimer.idx === setIdx) {
        setActiveTimer({ idx: null, timeLeft: 0 }); // Matikan timer
    } else {
        setActiveTimer({ idx: setIdx, timeLeft: durationMins * 60 }); // Mulai (konversi menit ke detik)
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`py-5 px-1 sm:px-2 border-b border-black/5 dark:border-white/5 last:border-b-0 ${isAllDone ? 'bg-emerald-500/5' : ''} ${isSkip ? 'opacity-50 grayscale' : ''} relative overflow-hidden transition-all`}>
      
      {/* WATERMARK BACKGROUND */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-[0.04] pointer-events-none transform -rotate-12 z-0">
          <EquipmentIcon equipment={ex.equipment} size={160} />
      </div>

      {/* HEADER KARTU */}
      <div className="mb-3 relative z-10">
         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
             <div className="flex items-start gap-3 min-w-0">
                 <span className={`shrink-0 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-lg w-8 h-8 body-lg font-black ${t.textAccent} shadow-sm`}>
                    {isExtra ? '+' : idx + 1}
                 </span>
                 <div className="min-w-0">
                     <h3 className={`h2 truncate pr-2 flex items-center gap-1.5 ${isSkip ? 'line-through opacity-50' : t.textMain}`}>
                        {ex.name}
                        {isCustom && <span className="px-1 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black leading-none shadow-md border border-black/10 text-center uppercase">CUSTOM</span>}
                     </h3>
                     <p className={`caption uppercase tracking-wider opacity-60 truncate mt-1 ${t.textMuted}`}>
                        {formatTarget(ex.target, lang?.id)}   {ex.equipment || 'Lainnya'}
                     </p>
                 </div>
             </div>
             
             {/* ACTIONS ROW */}
             <div className="flex space-x-1.5 shrink-0 self-start">
               {isExtra && (
                   <button onClick={() => onRemoveExtra(ex.id)} className={`${t.textMuted} p-2 bg-black/5 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-colors`}>
                       <Trash2 size={16} />
                   </button>
               )}
               <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSkip(ex.id); }} className={`${t.textMuted} p-2 ${isSkip ? 'bg-rose-500 text-white' : 'bg-black/5 dark:bg-white/5 hover:text-rose-500 hover:bg-rose-500/10'} rounded-xl transition-colors`}>
                   <SkipForward size={16} className={isSkip ? "text-white" : ""} />
               </button>
               {!isExtra && onReplaceClick && (
                   <button onClick={() => { playSoundEffect('click', soundEnabled); onReplaceClick(ex.id); }} className={`${t.textMuted} p-2 bg-black/5 dark:bg-white/5 rounded-xl hover:text-amber-500 transition-colors`}>
                       <ArrowLeftRight size={16} />
                   </button>
               )}
               {ex.ytVideo && (
                   <button onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(ex); }} className={`${t.textMuted} p-2 bg-black/5 dark:bg-white/5 rounded-xl hover:${t.textAccent} transition-colors`}>
                       <Info size={16} />
                   </button>
               )}
             </div>
         </div>
      </div>
      
      {/* BARIS PROGRES */}
      <div className="mb-3 relative z-10">
         {!isSkip && (
             <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                 <div className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`} style={{width: `${progressPercent}%`}}></div>
             </div>
         )}
      </div>

      {/* DAFTAR SET LATIHAN */}
      <div className={`mt-3 relative z-10 ${isSkip ? 'hidden' : ''}`}>
          <div className={`grid ${exType==='weight' ? 'grid-cols-[1.5fr_2.5fr_2.5fr_1.5fr]' : 'grid-cols-[1.5fr_3.5fr_1.5fr]'} gap-1 mb-1 px-1 h3 ${t.textMuted} text-center items-center`}>
            <div>{lang.set}</div>
            {exType === 'weight' && <div>kg</div>}
            {exType === 'time' && <div>Menit / Timer</div>}
            {(exType === 'weight' || exType === 'reps') && <div>Reps</div>}
            <div>{lang.done}</div>
          </div>

          {sets.map((s, setIdx) => (
            <div key={setIdx} className={`grid ${exType==='weight' ? 'grid-cols-[1.5fr_2.5fr_2.5fr_1.5fr]' : 'grid-cols-[1.5fr_3.5fr_1.5fr]'} gap-1 mb-1 items-center text-center transition-all ${s.skipped ? 'opacity-75' : s.done ? 'opacity-50' : ''}`}>
              
              <div className="relative flex justify-center">
                <button 
                  onClick={() => {
                    if (deletingSetIdx === setIdx) {
                      playSoundEffect('click', soundEnabled);
                      onRemoveSet(ex.id, setIdx);
                      setDeletingSetIdx(null);
                    } else {
                      playSoundEffect('click', soundEnabled);
                      setDeletingSetIdx(setIdx);
                    }
                  }}
                  onBlur={() => setDeletingSetIdx(null)}
                  className={`body-md rounded w-full max-w-[40px] h-8 flex items-center justify-center transition-all ${deletingSetIdx === setIdx ? 'bg-rose-500 text-white shadow-lg scale-110' : t.btnBg}`}
                >
                  {deletingSetIdx === setIdx ? <X size={14}/> : (setIdx + 1)}
                </button>
              </div>

              {s.skipped ? (
                <div className={`${exType === 'weight' ? 'col-span-2' : 'col-span-1'} flex items-center justify-center font-bold text-rose-500 bg-rose-500/10 rounded h-8 border border-rose-500/20 tracking-wider text-xs sm:text-sm`}>
                  SKIPPED
                </div>
              ) : (
                <>
                  {exType === 'weight' && (
                    <div><SwipeInput value={s.w} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'w', val)} disabled={s.done} step={2.5} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} /></div>
                  )}
                  
                  {/* KHUSUS TIMER DURASI */}
                   {exType === 'time' && (
                    <div className="flex space-x-1 items-center justify-center px-1">
                       {activeTimer.idx === setIdx ? (
                          <div className={`w-full ${t.inputBg} h-8 rounded flex items-center justify-center font-black text-emerald-500 body-lg ring-1 ring-emerald-500`}>
                             {formatTime(activeTimer.timeLeft)}
                          </div>
                       ) : (
                          <SwipeInput value={s.d} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'd', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} />
                       )}
                       {!s.done && (
                         <button onClick={() => toggleTimer(setIdx, s.d)} className={`h-8 w-8 shrink-0 rounded flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500' : 'bg-emerald-500 hover:opacity-80'}`}>
                            {activeTimer.idx === setIdx ? <Square size={14}/> : <Play size={14} className="ml-0.5"/>}
                         </button>
                       )}
                    </div>
                  )}

                  {(exType === 'weight' || exType === 'reps') && (
                    <div><SwipeInput value={s.r} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'r', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} /></div>
                  )}
                </>
              )}

              <div className="flex justify-center">
                <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSet(ex.id, setIdx); }} disabled={activeTimer.idx === setIdx} className={`w-full max-w-[40px] h-8 rounded-lg flex justify-center items-center font-bold transition-all ${s.skipped ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30' : s.done ? t.bgAccent + ' border border-transparent text-white' : 'bg-transparent border ' + t.borderAccentSoft + ' ' + t.textAccent + ' hover:bg-black/5 dark:hover:bg-white/5'} ${activeTimer.idx === setIdx ? 'opacity-30 cursor-not-allowed' : ''}`}>
                  {s.skipped ? <X size={16} /> : <CheckCircle size={16} />}
                </button>
              </div>

            </div>
          ))}

          <button onClick={() => { playSoundEffect('click', soundEnabled); onAddSet(ex.id); }} className={`w-full mt-2 py-2 caption border-2 border-dashed ${t.border} rounded-lg ${t.textMuted} hover:${t.textAccent} transition-colors`}>
            + {lang.addSet || 'Tambah Set'}
          </button>
        </div>    </div>
  );
};

export default ExerciseCard;