import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SkipForward, Video, CheckCircle, Play, Square, Info, ArrowLeftRight, X, Dumbbell, ClipboardEdit, Flame, Brain, Plus } from 'lucide-react';
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
    <div className={`mb-6 mx-0 sm:mx-4 ${ex.supersetId ? 'rounded-l-3xl rounded-r-none sm:rounded-[2.5rem]' : 'rounded-3xl sm:rounded-[2.5rem]'} bg-white/70 backdrop-blur-2xl dark:bg-black/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border-y sm:border border-white/40 dark:border-white/10 overflow-hidden transition-all duration-300 ${isSkip ? 'opacity-50 grayscale scale-95' : 'opacity-100'}`}>
      
      {/* HEADER IMAGE / GIF FULL WIDTH */}
      <div className="relative w-full h-[220px] sm:h-[260px] bg-zinc-100 dark:bg-zinc-800">
         {(() => {
            const apiExercises = getCachedExercises();
            const apiMatch = (!ex.gifUrl && !isCustom) ? apiExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase()) : null;
            const finalGifUrl = ex.gifUrl || apiMatch?.gifUrl;
            const ytId = getVideoId(ex.ytVideo);
            
            if (finalGifUrl) {
                return <img src={finalGifUrl} alt={ex.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />;
            } else if (ytId) {
                return <img 
                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                  onError={(e) => {
                    if (e.target.src.includes('maxresdefault')) {
                      e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                    }
                  }}
                  alt={ex.name} 
                  loading="lazy" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />;
            } else {
                return <div className="absolute inset-0 flex items-center justify-center opacity-10"><EquipmentIcon equipment={ex.equipment} size={120} /></div>;
            }
         })()}
         
         {/* GLASSMORPHISM CHIPS OVERLAY */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-5">
            <div className="flex justify-between items-start">
               <div className="flex gap-1.5 flex-wrap max-w-[65%]">
                 <span className="px-2.5 py-1 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                   {ex.equipment || 'Lainnya'}
                 </span>

                 {isCustom && (
                   <span className="px-2.5 py-1 rounded-xl bg-emerald-500/80 backdrop-blur-md border border-emerald-400/50 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                     CUSTOM
                   </span>
                 )}
               </div>
               
               {/* Right Side Buttons (Floating) */}
               <div className="flex flex-col gap-1.5 shrink-0">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(ex); }} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm">
                    <Info size={18} />
                 </button>
                 {!isExtra && onReplaceClick && (
                    <button onClick={() => { playSoundEffect('click', soundEnabled); onReplaceClick(ex.id); }} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm">
                        <ArrowLeftRight size={18} />
                    </button>
                 )}
                 {isExtra && (
                    <button onClick={() => onRemoveExtra(ex.id)} className="w-10 h-10 rounded-full bg-rose-500/80 backdrop-blur-md border border-rose-500/50 text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-sm">
                        <X size={18} />
                    </button>
                 )}
               </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
               {/* MUSCLE TARGETS */}
               <div className="flex gap-1.5 flex-wrap">
                  {Array.isArray(ex.target) ? ex.target.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-[9px] font-bold tracking-wider">{formatTarget(m, lang?.id)}</span>
                  )) : ex.target && (
                    <span className="px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-[9px] font-bold tracking-wider">{formatTarget(ex.target, lang?.id)}</span>
                  )}
                  {ex.supersetId && (
                     <span className={`px-2 py-0.5 rounded-lg ${t.bgAccent} border border-white/20 text-white shadow-lg text-[9px] font-black tracking-widest`}>SUPERSET</span>
                  )}
               </div>
               <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.1] drop-shadow-md pr-4 mt-2">
                  {idx + 1}. {ex.name}
               </h3>
            </div>
         </div>
         
         {!isSkip && (
             <div className="absolute left-0 bottom-0 w-full h-1.5 bg-black/20 z-20">
                 <div className={`h-full ${t.bgAccent} transition-all duration-500 ease-out`} style={{width: `${progressPercent}%`}}></div>
             </div>
         )}
      </div>

      {/* BODY CONTENT (SETS) */}
      <div className={`p-4 sm:p-6 pt-5 bg-white/40 dark:bg-[#121a2f]/40`}>
         {/* Top actions toolbar (Coach, Skip, Add Warmup) */}
         <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
             {/* Kiri: Skip Button & Badge */}
             <div className="flex items-center gap-2">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSkip(ex.id); }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSkip ? 'bg-rose-500 text-white shadow-md' : 'bg-black/5 dark:bg-white/5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500'}`} title={isSkip ? 'Batal Skip' : 'Skip'}>
                     <SkipForward size={18} className={isSkip ? "text-white" : ""} />
                 </button>
                 {isSkip && (
                     <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                         SKIPPED
                     </span>
                 )}
             </div>
             
             {/* Kanan: Warmup & Coach Buttons */}
             <div className="flex items-center gap-2">
                 {onAddWarmupSets && exType === 'weight' && !isSkip && (
                      <button onClick={() => { playSoundEffect('click', soundEnabled); onAddWarmupSets(ex.id); }} className={`w-10 h-10 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors flex items-center justify-center`} title="Buat Set Pemanasan Otomatis">
                          <Flame size={18} />
                      </button>
                 )}
                 {exType === 'weight' && !isSkip && (
                    <div className="relative">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHint(true); }} className={`w-10 h-10 rounded-full ${t.bgAccent} text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center`} title="Coach">
                          <Brain size={18} className="animate-pulse" />
                      </button>
                      {showHint && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowHint(false)} />
                          <div className={`relative overflow-hidden w-[90%] max-w-[340px] min-h-[480px] p-6 flex flex-col justify-between rounded-[32px] ${t.bgCard} shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-10 text-center leading-snug animate-in fade-in zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
                            <div 
                              className="absolute inset-0 z-0 pointer-events-none"
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
                                    <span className={`font-black text-[11px] tracking-widest uppercase ${t.textMain}`}>Coach Raiga</span>
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
             </div>
         </div>

         {/* DAFTAR SET LATIHAN */}
         <div className={`relative z-10 ${isSkip ? 'hidden' : ''}`}>
             <div className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-2 mb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center items-center`}>
               <div>Set</div>
                 {exType === 'weight' && (
                   <div>{isImp ? 'LBS' : 'KG'}</div>
                 )}
               {exType === 'time' && <div>Menit</div>}
               {exType !== 'time' && <div>Reps</div>}
               <div></div>
               <div></div>
             </div>

             <div className="space-y-3">
             {sets.map((s, setIdx) => (
                 <div key={setIdx} className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-2 items-center text-center transition-all ${s.skipped ? 'opacity-50' : s.done ? 'opacity-60' : ''}`}>
                   
                   <div className="flex justify-center">
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
                       className={`w-11 h-11 rounded-full flex items-center justify-center transition-all font-black text-sm ${deletingSetIdx === setIdx ? 'bg-rose-500 text-white shadow-lg scale-110' : (s.type === 'warmup' ? 'bg-orange-500/10 text-orange-500' : 'bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400')}`}
                     >
                       {deletingSetIdx === setIdx ? <X size={16}/> : (s.type === 'warmup' ? <Flame size={16} className="opacity-80"/> : getWorkingSetNumber(setIdx))}
                     </button>
                   </div>

                   {s.skipped ? (
                     <div className={`${exType === 'weight' ? 'col-span-2' : 'col-span-1'} flex items-center justify-center font-bold text-rose-500 bg-rose-500/10 rounded-2xl h-12 border border-rose-500/20 tracking-wider text-xs sm:text-sm`}>
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
                                 className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} 
                               />
                             );
                           })()}
                         </div>
                       )}
                       
                       {/* KHUSUS TIMER DURASI */}
                        {exType === 'time' && (
                         <div className="flex space-x-1 items-center justify-center">
                            {activeTimer.idx === setIdx ? (
                               <div className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl flex items-center justify-center font-black ${t.textAccent} text-lg ring-2 ${t.ringAccent}`}>
                                  {formatTime(activeTimer.timeLeft)}
                               </div>
                            ) : (
                               <SwipeInput language={lang?.id || 'ID'} value={s.d} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'd', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} />
                            )}
                            {!s.done && (
                              <button onClick={() => toggleTimer(setIdx, s.d)} className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500 shadow-md' : t.bgAccent + ' hover:opacity-80'}`}>
                                 {activeTimer.idx === setIdx ? <Square size={18}/> : <Play size={18} className="ml-1"/>}
                              </button>
                            )}
                         </div>
                       )}

                       {(exType === 'weight' || exType === 'reps') && (
                         <div><SwipeInput language={lang?.id || 'ID'} value={s.r} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'r', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} /></div>
                       )}
                     </>
                   )}

                   <div className="flex justify-center">
                     <button 
                       onClick={() => { playSoundEffect('click', soundEnabled); setActiveSetDetail({ setIdx, rir: s.rir !== undefined && s.rir !== '' ? s.rir : 3, rpe: s.rpe !== undefined && s.rpe !== '' ? s.rpe : 7, notes: s.notes || '' }); }}
                       className={`w-11 h-11 flex justify-center items-center rounded-full transition-all ${(s.notes || s.rir || s.rpe) ? `${t.bgAccent} text-white shadow-md` : `text-zinc-400 bg-black/5 dark:bg-white/5 hover:${t.textAccent} hover:bg-black/10 dark:hover:bg-white/10`}`}
                     >
                       <ClipboardEdit size={16} />
                     </button>
                   </div>

                   <div className="flex justify-center">
                     <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSet(ex.id, setIdx); }} disabled={activeTimer.idx === setIdx} className={`w-11 h-11 rounded-full flex justify-center items-center font-bold transition-all ${s.skipped ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30' : s.done ? t.bgAccent + ' text-white shadow-lg scale-105' : 'bg-transparent border-2 ' + t.borderAccentSoft + ' ' + t.textAccent + ' hover:bg-black/5 dark:hover:bg-white/5'} ${activeTimer.idx === setIdx ? 'opacity-30 cursor-not-allowed' : ''}`}>
                       {s.skipped ? <X size={18} /> : <CheckCircle size={18} />}
                     </button>
                   </div>

                 </div>
               ))}
               </div>
               
               <div className="mt-5">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); onAddSet(ex.id); }} className={`w-full py-4 rounded-2xl text-xs font-black tracking-widest uppercase border-2 border-dashed ${t.border} ${t.textMuted} hover:${t.textAccent} hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2`}>
                   <Plus size={16} /> {lang.addSet || 'Tambah Set'}
                 </button>
               </div>
           </div>
        </div>

        {/* SET DETAILS MODAL (UNCHANGED EXTERNALLY, JUST CLASSES) */}
        {activeSetDetail !== null && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95" onClick={() => setActiveSetDetail(null)}>
            <div className={`w-full max-w-sm p-6 rounded-[2.5rem] bg-white dark:bg-[#121a2f] shadow-2xl border border-black/5 dark:border-white/5`} onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-black mb-5 text-center">Catatan Set {sets[activeSetDetail.setIdx]?.type === 'warmup' ? 'Pemanasan' : getWorkingSetNumber(activeSetDetail.setIdx)}</h3>
              
              <div className="mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-3xl border border-black/5 dark:border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-black tracking-wider uppercase text-zinc-500">Intensitas Set</label>
                    <button onClick={(e) => { e.stopPropagation(); setShowIntensityInfo(!showIntensityInfo); }} className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${t.textMuted} hover:${t.textAccent} transition-colors`}>
                      <Info size={16} />
                    </button>
                  </div>
                  <div className={`text-sm font-black px-4 py-1.5 rounded-full ${t.bgAccent} text-white shadow-md`}>
                    RPE {activeSetDetail.rpe !== '' ? activeSetDetail.rpe : 7} / RIR {activeSetDetail.rir !== '' ? activeSetDetail.rir : 3}
                  </div>
                </div>
                
                {showIntensityInfo && (
                  <div className="p-4 mb-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 animate-in slide-in-from-top-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-3">
                      <p>
                        <strong>RPE (Perceived Exertion):</strong> Skala 1-10 seberapa berat usaha latihan dengan beban tersebut.
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong>RPE 7-8:</strong> Ideal untuk sebagian besar latihan (sisa tenaga 2-3 repetisi).</li>
                        <li><strong>RPE 9:</strong> Sangat berat, sisa tenaga 1 repetisi. Biasanya dipakai di set terakhir suatu gerakan.</li>
                        <li><strong>RPE 10:</strong> Maksimal, gagal angkat (<i>failure</i>). Gunakan dengan bijak.</li>
                      </ul>
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
                  className="w-full cursor-pointer mt-3 mb-2"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm font-black tracking-wider uppercase text-zinc-500 mb-3 block">Kondisi / Rasa</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Terlalu Ringan", "Cukup Menantang", "Berat Banget", "Gagal Angkat", "Form Rusak"].map(tag => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.preventDefault();
                        playSoundEffect('click', soundEnabled);
                        const currentNotes = activeSetDetail.notes ? activeSetDetail.notes + (activeSetDetail.notes.endsWith(' ') ? '' : ', ') : '';
                        const rpeAdjust = {
                          'Terlalu Ringan': { rpe: 4, rir: 6 },
                          'Cukup Menantang': { rpe: 7, rir: 3 },
                          'Berat Banget': { rpe: 9, rir: 1 },
                          'Gagal Angkat': { rpe: 10, rir: 0 },
                        }[tag];
                        setActiveSetDetail({
                          ...activeSetDetail,
                          notes: currentNotes.includes(tag) ? activeSetDetail.notes : currentNotes + tag,
                          ...(rpeAdjust || {})
                        });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea rows="3" placeholder="Tulis catatan tambahan..." value={activeSetDetail.notes} onChange={e => setActiveSetDetail({...activeSetDetail, notes: e.target.value})} className={`w-full p-4 pr-10 rounded-2xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base resize-none outline-none focus:ring-2 focus:${t.ringAccent}`}></textarea>
                  {activeSetDetail.notes && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); playSoundEffect('click', soundEnabled); setActiveSetDetail({...activeSetDetail, notes: ''}); }}
                      className={`absolute top-3 right-3 p-1.5 rounded-full bg-black/10 dark:bg-white/10 ${t.textMuted} hover:text-rose-500 hover:bg-rose-500/10 transition-colors`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setActiveSetDetail(null)} className={`flex-1 py-4 rounded-full border border-black/10 dark:border-white/10 font-bold text-base hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>Batal</button>
                <button onClick={() => handleSaveSetDetail(ex.id, activeSetDetail.setIdx, activeSetDetail)} className={`flex-[2] py-4 rounded-full ${t.bgAccent} text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform`}>Simpan</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ExerciseCard;
