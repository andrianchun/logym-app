import React, { useState, useEffect } from 'react';
import { SkipForward, Video, CheckCircle, Play, Square, Info, ArrowLeftRight, X, Dumbbell } from 'lucide-react';
import EquipmentIcon from './EquipmentIcon';
import SwipeInput from './SwipeInput';
import { formatTarget, exerciseTypeLabels, getVideoId, getSupersetColorStyle } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { getCachedExercises } from '../utils/exerciseDbApi';

const ExerciseCard = ({
  ex, idx, isExtra = false,
  t, lang, soundEnabled, unitSystem,
  isSkip, onToggleSkip, onRemoveExtra, onOpenVideo, onReplaceClick,
  sets, onUpdateSet, onToggleSet, onAddSet, onRemoveSet,
  gymProfiles, activeGymId
}) => {
  const isImp = unitSystem === 'imperial';
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

  const supersetStyle = getSupersetColorStyle(ex.supersetId);

  return (
    <div className={`py-5 px-1 sm:px-2 border-b border-black/5 dark:border-white/5 last:border-b-0 ${isAllDone ? 'bg-emerald-500/5' : ''} relative overflow-hidden transition-all`}>
      
      {/* WATERMARK BACKGROUND (TETAP ADA SEBAGAI CADANGAN SELURUH KARTU) */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.02] dark:opacity-[0.03] pointer-events-none transform -rotate-12 z-0">
          <EquipmentIcon equipment={ex.equipment} size={160} />
      </div>

      {/* HEADER KARTU */}
      <div className="mb-3 pb-3 relative z-10">
         {/* BACKGROUND IMAGE / THUMBNAIL KHUSUS HEADER */}
         <div className="absolute -top-5 -right-2 bottom-0 w-[65%] pointer-events-none opacity-50 z-0" style={{ maskImage: 'linear-gradient(to right, transparent, black 60%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)' }}>
             {(() => {
                const apiExercises = getCachedExercises();
                const apiMatch = (!ex.gifUrl && !isCustom) ? apiExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase()) : null;
                const finalGifUrl = ex.gifUrl || apiMatch?.gifUrl;
                const ytId = getVideoId(ex.ytVideo);
                
                if (finalGifUrl) {
                    return <img src={finalGifUrl} alt={ex.name} loading="lazy" className="w-full h-full object-cover object-[100%_25%]" />;
                } else if (ytId) {
                    return <img 
                      src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                      onError={(e) => {
                        if (e.target.src.includes('maxresdefault')) {
                          e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                          e.target.className = "absolute top-1/2 left-1/2 w-[240%] h-auto max-w-none -translate-x-1/2 -translate-y-[25%] object-cover";
                        }
                      }}
                      alt={ex.name} 
                      loading="lazy" 
                      className="absolute top-1/2 left-1/2 w-[320%] h-auto max-w-none -translate-x-1/2 -translate-y-[25%] object-cover" 
                    />;
                } else {
                    return null;
                }
             })()}
         </div>

         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10">
             
             {/* KIRI: NO & INFO LATIHAN */}
             <div className="flex gap-2">
                 <span className={`text-xl font-black ${isSkip ? 'opacity-50' : t.textAccent} pt-0.5`}>
                     {isExtra ? '+' : `${idx + 1}.`}
                 </span>
                 <div className="min-w-0">
                     <h3 className={`h2 truncate pr-2 flex items-center gap-1.5 flex-wrap ${isSkip ? 'opacity-50' : t.textMain}`}>
                        {ex.name}
                        {isCustom && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-black uppercase tracking-wider shadow-sm">CUSTOM</span>}
                     </h3>
                     <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex gap-1.5 flex-wrap items-center">
                           <span className={`text-[10px] font-black uppercase tracking-wider ${t.textAccent}`}>{ex.equipment || 'Lainnya'}</span>
                           <span className={`text-[10px] font-bold ${t.textMuted}`}>•</span>
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>{exerciseTypeLabels[exType] || exType}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap items-center -ml-1.5">{Array.isArray(ex.target) ? ex.target.map(m => (
                            <span key={m} className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(m, lang?.id)}</span>
                          )) : ex.target && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(ex.target, lang?.id)}</span>
                          )}</div>
                     </div>
                     {isSkip && (
                        <div className="mt-1.5 inline-block px-2 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded text-xs font-black tracking-wider uppercase shadow-sm">
                          SKIPPED
                        </div>
                     )}

                     {/* ACTIONS ROW */}
                     <div className="flex flex-wrap items-center gap-1.5 mt-1.5 shrink-0 self-start -ml-1">
                         {isExtra && (
                             <button onClick={() => onRemoveExtra(ex.id)} className={`p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors`}>
                                 <X size={16} />
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
                         <button onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(ex); }} className={`${t.textMuted} p-2 bg-black/5 dark:bg-white/5 rounded-xl hover:${t.textAccent} transition-colors`}>
                             <Info size={16} />
                         </button>
                         {ex.supersetId && (
                             <div className={`ml-1 px-2 py-1 ${supersetStyle.bg} ${supersetStyle.text} rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm`}>
                                 SUPERSET
                             </div>
                         )}
                     </div>
                 </div>
             </div>
         </div>

         {/* BARIS PROGRES (MENEMPEL DI BAWAH THUMBNAIL) */}
         {!isSkip && (
             <div className="absolute left-0 bottom-0 w-full h-1 bg-black/10 dark:bg-white/10 z-20">
                 <div className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`} style={{width: `${progressPercent}%`}}></div>
             </div>
         )}
      </div>
      
      {/* KONTEN SETS & PROGRESS (GRAYSCALED IF SKIPPED) */}
      <div className={isSkip ? 'opacity-50 grayscale pointer-events-none' : ''}>
      {/* DAFTAR SET LATIHAN */}
      <div className={`mt-2 relative z-10 ${isSkip ? 'hidden' : ''}`}>
          <div className={`grid ${exType==='weight' ? 'grid-cols-[1.5fr_2.5fr_2.5fr_1.5fr]' : 'grid-cols-[1.5fr_3.5fr_1.5fr]'} gap-1 mb-1 px-1 h3 ${t.textMuted} text-center items-center`}>
            <div>{lang.set}</div>
            {exType === 'weight' && <div>{isImp ? 'lbs' : 'kg'}</div>}
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
                      <div>
                        {(() => {
                          let customStep = isImp ? 5 : 2.5;
                          let customMin = 0;
                          if (gymProfiles && activeGymId) {
                            const activeGym = gymProfiles.find(g => g.id === activeGymId) || gymProfiles[0];
                            if (activeGym && ex.equipment && activeGym.config && activeGym.config[ex.equipment]) {
                              const conf = activeGym.config[ex.equipment];
                              if (conf.increment) customStep = conf.increment;
                              if (conf.barWeight) customMin = conf.barWeight;
                            }
                          }
                          return (
                            <SwipeInput language={lang?.id || 'ID'} 
                              value={isImp ? Math.round(Number(s.w || 0) * 2.20462 * 10)/10 : s.w} 
                              onChange={(val)=>onUpdateSet(ex.id, setIdx, 'w', isImp ? Number((val / 2.20462).toFixed(2)) : val)} 
                              disabled={s.done} 
                              step={customStep} 
                              min={customMin}
                              soundEnabled={soundEnabled} 
                              className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} 
                            />
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* KHUSUS TIMER DURASI */}
                     {exType === 'time' && (
                      <div className="flex space-x-1 items-center justify-center px-1">
                         {activeTimer.idx === setIdx ? (
                            <div className={`w-full ${t.inputBg} h-8 rounded flex items-center justify-center font-black text-emerald-500 body-lg ring-1 ring-emerald-500`}>
                               {formatTime(activeTimer.timeLeft)}
                            </div>
                         ) : (
                            <SwipeInput language={lang?.id || 'ID'} value={s.d} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'd', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} />
                         )}
                         {!s.done && (
                           <button onClick={() => toggleTimer(setIdx, s.d)} className={`h-8 w-8 shrink-0 rounded flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500' : 'bg-emerald-500 hover:opacity-80'}`}>
                              {activeTimer.idx === setIdx ? <Square size={14}/> : <Play size={14} className="ml-0.5"/>}
                           </button>
                         )}
                      </div>
                    )}

                    {(exType === 'weight' || exType === 'reps') && (
                      <div><SwipeInput language={lang?.id || 'ID'} value={s.r} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'r', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} /></div>
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
          </div>
        </div>
    </div>
  );
};

export default ExerciseCard;
