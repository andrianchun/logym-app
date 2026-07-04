import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SkipForward, Video, CheckCircle, Play, Square, Info, ArrowLeftRight, X, Dumbbell, ClipboardEdit, Flame, Brain } from 'lucide-react';
import EquipmentIcon from './EquipmentIcon';
import SwipeInput from './SwipeInput';
import { formatTarget, exerciseTypeLabels, getVideoId } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { getCachedExercises } from '../utils/exerciseDbApi';

const ExerciseCard = ({
  ex, idx, isExtra = false,
  t, lang, soundEnabled, units,
  isSkip, onToggleSkip, onRemoveExtra, onOpenVideo, onReplaceClick,
  sets, onUpdateSet, onToggleSet, onSkipSet, onAddSet, onAddWarmupSets, onRemoveSet,
  gymProfiles, activeGymId, overloadHint
}) => {
  const isImp = units?.weight === 'lbs';
  const exType = ex.type || 'weight';
  const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
  const doneCount = sets.filter(s => s.done).length;
  const totalSets = sets.length;
  const isAllDone = doneCount === totalSets && totalSets > 0;
  const progressPercent = totalSets > 0 ? (doneCount / totalSets) * 100 : 0;
  const [showHint, setShowHint] = useState(false);

  const getWorkingSetNumber = (idx) => {
    return sets.slice(0, idx).filter(s => s.type !== 'warmup').length + 1;
  };

  // ==========================================
  // LOGIKA COUNTDOWN TIMER UNTUK DURASI
  // ==========================================
  const [activeTimer, setActiveTimer] = useState({ idx: null, timeLeft: 0 });
  const [deletingSetIdx, setDeletingSetIdx] = useState(null);
  const [activeSetDetail, setActiveSetDetail] = useState(null);
  const [showIntensityInfo, setShowIntensityInfo] = useState(false);

  useEffect(() => {
    if (activeSetDetail !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeSetDetail]);

  const handleSaveSetDetail = (exId, setIdx, details) => {
    if(onUpdateSet) {
       onUpdateSet(exId, setIdx, 'notes', details.notes);
       onUpdateSet(exId, setIdx, 'rir', details.rir);
       onUpdateSet(exId, setIdx, 'rpe', details.rpe);
    }
    setActiveSetDetail(null);
  };

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
    <div className={`py-5 px-1 sm:px-2 border-b border-black/5 dark:border-white/5 last:border-b-0 ${isAllDone ? 'bg-emerald-500/5' : ''} relative overflow-hidden transition-all`}>
      
      {/* WATERMARK BACKGROUND (TETAP ADA SEBAGAI CADANGAN SELURUH KARTU) */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.02] dark:opacity-[0.03] pointer-events-none transform -rotate-12 z-0">
          <EquipmentIcon equipment={ex.equipment} size={160} />
      </div>

      {/* HEADER KARTU */}
      <div className={`mb-3 pb-3 relative ${showHint ? 'z-[100]' : 'z-10'}`}>
         {/* BACKGROUND IMAGE / THUMBNAIL KHUSUS HEADER */}
         <div className="absolute -top-5 -right-2 bottom-0 w-[65%] pointer-events-none opacity-20 dark:opacity-30 z-0" style={{ maskImage: 'linear-gradient(to right, transparent, black 80%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 80%)' }}>
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
                 <span className={`h2 font-black ${isSkip ? 'opacity-50' : t.textAccent}`}>
                     {isExtra ? '+' : `${idx + 1}.`}
                 </span>
                 <div className="min-w-0 flex-1">
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
                     <div className="flex flex-wrap items-center gap-1.5 mt-1.5 shrink-0 self-start -ml-1">
                         {isExtra && (
                             <button onClick={() => onRemoveExtra(ex.id)} className={`p-2 ${t.inputBg} border ${t.border} text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-xl transition-colors`}>
                                 <X size={16} />
                             </button>
                         )}
                         <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSkip(ex.id); }} className={`${t.textMuted} p-2 ${isSkip ? 'bg-rose-500 text-white border-rose-500' : `${t.inputBg} border ${t.border} hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30`} rounded-xl transition-colors`}>
                             <SkipForward size={16} className={isSkip ? "text-white" : ""} />
                         </button>
                         {!isExtra && onReplaceClick && (
                             <button onClick={() => { playSoundEffect('click', soundEnabled); onReplaceClick(ex.id); }} className={`${t.textMuted} p-2 ${t.inputBg} border ${t.border} rounded-xl hover:text-amber-500 hover:border-amber-500/50 transition-colors`}>
                                 <ArrowLeftRight size={16} />
                             </button>
                         )}
                         <button onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(ex); }} className={`${t.textMuted} p-2 ${t.inputBg} border ${t.border} rounded-xl hover:${t.textAccent} hover:${t.borderAccentSoft} transition-colors`}>
                             <Info size={16} />
                         </button>
                         {/* COACH BUTTON */}
                         {exType === 'weight' && !isSkip && (
                             <div className="relative">
                               <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHint(true); }} className={`p-2 ${t.bgAccent} border border-transparent text-white rounded-xl shadow-lg hover:scale-105 transition-all flex items-center justify-center`}>
                                   <Brain size={16} className="animate-pulse" />
                               </button>
                               {showHint && createPortal(
                                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                   <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowHint(false); }} />
                                   <div className={`relative overflow-hidden w-[90%] max-w-[340px] min-h-[480px] p-6 flex flex-col justify-between rounded-[32px] ${t.bgCard} shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-10 text-center leading-snug animate-in fade-in zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
                                     <div 
                                       className="absolute inset-0 z-0 opacity-80 dark:opacity-60 pointer-events-none mix-blend-multiply dark:mix-blend-normal"
                                       style={{ 
                                          backgroundImage: `url('${overloadHint?.mode === 'praise' ? '/coach-praise.webp' : overloadHint?.mode === 'push' ? '/coach-push.webp' : '/bg-dashboard.webp'}')`,
                                          backgroundSize: '180%',
                                          backgroundPosition: 'center 40px',
                                          backgroundRepeat: 'no-repeat',
                                          maskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)',
                                          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)'
                                       }}
                                     />
                                     <div className="relative z-10 flex flex-col h-full flex-1">
                                         <div className="flex justify-center w-full">
                                           <div className="flex items-center gap-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 pl-2.5 pr-4 py-2 rounded-full shadow-inner mt-2">
                                             <div className={`w-8 h-8 rounded-full ${t.bgAccent} flex items-center justify-center shadow-lg`}>
                                               <Brain size={16} className={t.textWhite} />
                                             </div>
                                             <span className={`font-black text-[11px] tracking-widest uppercase ${t.textMain}`}>Lyfit Coach</span>
                                           </div>
                                         </div>
                                         <div className="flex flex-col items-center mt-auto pt-32 pb-2">
                                           {overloadHint ? (
                                              <>
                                                <span className={`font-black text-lg tracking-widest uppercase block mb-3 ${t.textMain}`}>{overloadHint.title}</span>
                                                <span className={`${t.textMuted} text-sm block whitespace-pre-wrap font-medium leading-relaxed`}>{overloadHint.text}</span>
                                              </>
                                           ) : (
                                              <span className={`${t.textMuted} text-sm font-medium whitespace-pre-wrap leading-relaxed`}>Belum ada rekor 10RM.\n\nGunakan beban yang menantang tapi sanggup diangkat 10x dengan benar (RPE 8).</span>
                                           )}
                                         </div>
                                     </div>
                                   </div>
                                 </div>,
                                 document.body
                               )}
                             </div>
                         )}
                         {isSkip && (
                             <div className="ml-1 px-2.5 py-1.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center">
                               SKIPPED
                             </div>
                         )}
                          {ex.supersetId && (
                               <div className={`ml-0.5 px-2.5 py-1 ${t.bgAccent} text-white shadow-[0_0_12px_rgba(255,255,255,0.3)] border border-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center`}>
                                  SUPERSET
                               </div>
                           )}
                     </div>
                 </div>
             </div>
         </div>

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
          <div className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-1 mb-1 h3 ${t.textMuted} text-center items-center`}>
            <div>{lang.set}</div>
              {exType === 'weight' && (
                <div className="flex justify-center items-center gap-1 relative z-20">
                  {isImp ? 'LBS' : 'KG'}
                </div>
              )}
            {exType === 'time' && <div>Menit</div>}
            {exType !== 'time' && <div>Reps</div>}
            {onAddWarmupSets && exType === 'weight' ? (
              <div className="col-span-2 flex justify-center w-full pr-1">
                <button onClick={() => { playSoundEffect('click', soundEnabled); onAddWarmupSets(ex.id); }} className={`w-full max-w-[76px] py-1 caption border ${t.borderAccentSoft} bg-black/5 dark:bg-white/5 rounded-lg ${t.textAccent} hover:${t.bgAccentSoft} transition-colors flex items-center justify-center font-bold whitespace-nowrap`} title="Buat Set Pemanasan Otomatis">
                  Pemanasan
                </button>
              </div>
            ) : (
              <>
                <div></div>
                <div></div>
              </>
            )}
          </div>

            {sets.map((s, setIdx) => (
              <div key={setIdx} className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-1 mb-1 items-center text-center transition-all ${s.skipped ? 'opacity-75' : s.done ? 'opacity-50' : ''}`}>
                
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
                    className={`body-md rounded w-full max-w-[40px] h-8 flex items-center justify-center transition-all ${deletingSetIdx === setIdx ? 'bg-rose-500 text-white shadow-lg scale-110' : (s.type === 'warmup' ? t.btnBg + ' border ' + t.borderAccentSoft + ' ' + t.textAccent : t.btnBg)}`}
                  >
                    {deletingSetIdx === setIdx ? <X size={14}/> : (s.type === 'warmup' ? <Flame size={14} className="opacity-80"/> : getWorkingSetNumber(setIdx))}
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
                            <div className={`w-full ${t.inputBg} h-8 rounded flex items-center justify-center font-black ${t.textAccent} body-lg ring-1 ${t.ringAccent}`}>
                               {formatTime(activeTimer.timeLeft)}
                            </div>
                         ) : (
                            <SwipeInput language={lang?.id || 'ID'} value={s.d} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'd', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full ${t.inputBg} h-8 rounded text-center font-black ${t.textMain} no-spinners transition-colors body-lg`} />
                         )}
                         {!s.done && (
                           <button onClick={() => toggleTimer(setIdx, s.d)} className={`h-8 w-8 shrink-0 rounded flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500' : t.bgAccent + ' hover:opacity-80'}`}>
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
                  <button 
                    onClick={() => { playSoundEffect('click', soundEnabled); setActiveSetDetail({ setIdx, rir: s.rir !== undefined && s.rir !== '' ? s.rir : 3, rpe: s.rpe !== undefined && s.rpe !== '' ? s.rpe : 7, notes: s.notes || '' }); }}
                    className={`w-8 h-8 flex justify-center items-center rounded-lg transition-all ${(s.notes || s.rir || s.rpe) ? `${t.bgAccent} text-white` : t.textMuted + ` hover:${t.textAccent} hover:bg-black/5 dark:hover:bg-white/5`}`}
                  >
                    <ClipboardEdit size={14} />
                  </button>
                </div>

                <div className="flex justify-center">
                  <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSet(ex.id, setIdx); }} disabled={activeTimer.idx === setIdx} className={`w-full max-w-[40px] h-8 rounded-lg flex justify-center items-center font-bold transition-all ${s.skipped ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30' : s.done ? t.bgAccent + ' border border-transparent text-white' : 'bg-transparent border ' + t.borderAccentSoft + ' ' + t.textAccent + ' hover:bg-black/5 dark:hover:bg-white/5'} ${activeTimer.idx === setIdx ? 'opacity-30 cursor-not-allowed' : ''}`}>
                    {s.skipped ? <X size={16} /> : <CheckCircle size={16} />}
                  </button>
                </div>

              </div>
            ))}
              <div className="mt-2">
                <button onClick={() => { playSoundEffect('click', soundEnabled); onAddSet(ex.id); }} className={`w-full py-2 caption border-2 border-dashed ${t.border} rounded-lg ${t.textMuted} hover:${t.textAccent} transition-colors`}>
                  + {lang.addSet || 'Tambah Set'}
                </button>
              </div>
          </div>
        </div>

        {/* SET DETAILS MODAL */}
        {activeSetDetail !== null && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95" onClick={() => setActiveSetDetail(null)}>
            <div className={`w-full max-w-sm p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-2xl`} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-4">Catatan Set {sets[activeSetDetail.setIdx]?.type === 'warmup' ? 'Pemanasan' : getWorkingSetNumber(activeSetDetail.setIdx)}</h3>
              
              <div className="mb-5 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-bold">Intensitas Set</label>
                    <button onClick={(e) => { e.stopPropagation(); setShowIntensityInfo(!showIntensityInfo); }} className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${t.textMuted} hover:${t.textAccent} transition-colors`}>
                      <Info size={14} />
                    </button>
                  </div>
                  <div className={`text-sm font-black px-3 py-1 rounded-md ${t.bgAccent} text-white`}>
                    RPE {activeSetDetail.rpe !== '' ? activeSetDetail.rpe : 7} / RIR {activeSetDetail.rir !== '' ? activeSetDetail.rir : 3}
                  </div>
                </div>
                
                {showIntensityInfo && (
                  <div className="p-3 mb-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 animate-in slide-in-from-top-1">
                    <div className="text-xs sm:text-sm text-gray-500 space-y-2">
                      <p>
                        <strong>RPE (Perceived Exertion):</strong> Skala 1-10 seberapa berat usaha latihan dengan beban tersebut.
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>RPE 7-8:</strong> Ideal untuk sebagian besar latihan (sisa tenaga 2-3 repetisi).</li>
                        <li><strong>RPE 9:</strong> Sangat berat, sisa tenaga 1 repetisi. Biasanya dipakai di set terakhir suatu gerakan.</li>
                        <li><strong>RPE 10:</strong> Maksimal, gagal angkat (<i>failure</i>). Gunakan dengan bijak, biasanya hanya di repetisi paling terakhir dari sesi latihan.</li>
                      </ul>
                      <p className="opacity-80 italic mt-1">
                        *Berbanding terbalik dengan RIR (Reps in Reserve) atau sisa repetisi sebelum gagal angkat. RIR 2 sama dengan RPE 8.
                      </p>
                    </div>
                  </div>
                )}

                <input 
                  type="range" 
                  min="1" max="10" step="0.5"
                  value={activeSetDetail.rpe !== '' ? activeSetDetail.rpe : 7} 
                  onChange={e => {
                    const rpe = Number(e.target.value);
                    const rir = 10 - rpe;
                    setActiveSetDetail({...activeSetDetail, rir, rpe});
                  }}
                  className="w-full cursor-pointer mt-2 mb-2"
                />
              </div>

              <div className="mb-5">
                <label className="text-sm font-bold mb-2 block">Catatan Tambahan</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Terlalu Ringan", "Cukup Menantang", "Berat Banget", "Gagal Angkat", "Form Rusak"].map(tag => (
                    <button 
                      key={tag} 
                      onClick={(e) => {
                        e.preventDefault();
                        playSoundEffect('click', soundEnabled);
                        const currentNotes = activeSetDetail.notes ? activeSetDetail.notes + (activeSetDetail.notes.endsWith(' ') ? '' : ', ') : '';
                        if(!currentNotes.includes(tag)) {
                          setActiveSetDetail({...activeSetDetail, notes: currentNotes + tag});
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea rows="3" placeholder="Bagaimana rasanya set ini?" value={activeSetDetail.notes} onChange={e => setActiveSetDetail({...activeSetDetail, notes: e.target.value})} className={`w-full p-3 rounded-xl ${t.inputBg} ${t.textMain} placeholder-black/30 dark:placeholder-white/30 body-lg resize-none outline-none focus:ring-1 focus:${t.ringAccent}`}></textarea>
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={() => setActiveSetDetail(null)} className={`flex-1 py-3 rounded-xl border border-dashed ${t.border} font-bold text-base hover:opacity-80`}>Batal</button>
                <button onClick={() => handleSaveSetDetail(ex.id, activeSetDetail.setIdx, activeSetDetail)} className={`flex-[2] py-3 rounded-xl ${t.bgAccent} text-white font-black text-lg shadow-xl hover:opacity-90`}>Simpan</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ExerciseCard;
