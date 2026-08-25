import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SkipForward, Video, CheckCircle, Play, Square, Info, ArrowLeftRight, X, Dumbbell, ClipboardEdit, Flame, Brain, Plus, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import EquipmentIcon from './EquipmentIcon';
import SwipeInput from './SwipeInput';
import { formatTarget, exerciseTypeLabels, getVideoId, defaultMasterExercises, findMatchingMasterExercise, canonicalizeExercise } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { resolveExerciseKind, getEquipmentConfig, calculateActualWeight, getSetActualWeight } from '../utils/workoutCalc';
import { getCachedExercises } from '../utils/exerciseDbApi';

const ExerciseCard = ({
  ex, idx, isExtra = false,
  t, lang, soundEnabled, units,
  isSkip, onToggleSkip, onRemoveExtra, onOpenVideo, onReplaceClick,
  sets, onUpdateSet, onToggleSet, onSkipSet, onAddSet, onAddWarmupSets, onRemoveSet,
  gymProfiles, activeGymId, overloadHint,
  canDeleteCompleted = false, onRemoveProgramExercise,
  isWorkoutActive, onStartWorkout
}) => {
  const isImp = units?.weight === 'lbs';
  const exType = resolveExerciseKind(ex);
  const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
  const doneCount = sets.filter(s => s.done).length;
  const totalSets = sets.length;
  const isAllDone = doneCount === totalSets && totalSets > 0;
  const progressPercent = totalSets > 0 ? (doneCount / totalSets) * 100 : 0;
  const [showHint, setShowHint] = useState(false);
  const [canCloseHint, setCanCloseHint] = useState(false);
  const [showWeightInfo, setShowWeightInfo] = useState(false);
  const eqConfig = getEquipmentConfig(gymProfiles, activeGymId, ex);
  const playedRecordSound = React.useRef(false);

  useEffect(() => {
    if (!ex) return;
    const hint = overloadHint;
    if (hint?.isNewRecord) {
      if (!window.logymShownRecords) window.logymShownRecords = new Set();
      
      if (!playedRecordSound.current && !window.logymShownRecords.has(ex.id)) {
        if (soundEnabled) {
          const audio = new Audio('/success.wav');
          audio.volume = 1.0;
          audio.play().catch(() => {});
        }
        playedRecordSound.current = true;
        window.logymShownRecords.add(ex.id);
        setShowHint(true); // Auto-show the gamified popup
        setTimeout(() => setCanCloseHint(true), 2500); // Wait 2.5s before allowing close
      }
    }
  }, [ex, overloadHint, soundEnabled]);

  const getWorkingSetNumber = (idx) => {
    return sets.slice(0, idx).filter(s => s.type !== 'warmup').length + 1;
  };

  // ==========================================
  // LOGIKA COUNTDOWN TIMER UNTUK DURASI
  // ==========================================
  // window.logymActiveTimer dipakai bareng ImmersiveWorkout buat oper timer yang lagi jalan saat
  // pindah tampilan. Formatnya WAJIB pakai jam dinding (targetTime/startTime) — punya Immersive —
  // karena itu satu-satunya yang tetap akurat kalau app di-background. Kartu ini internalnya
  // menghitung mundur pakai `timeLeft` (detik), jadi konversi di dua titik pertukaran ini.
  const [activeTimer, setActiveTimer] = useState(() => {
     const shared = window.logymActiveTimer?.exId === ex?.id ? window.logymActiveTimer.timer : null;
     if (shared && shared.idx !== null && shared.idx !== undefined) {
        const timeLeft = shared.mode === 'down'
          ? Math.max(0, Math.ceil((shared.targetTime - Date.now()) / 1000))
          : Math.max(0, Math.floor((Date.now() - shared.startTime) / 1000));
        if (Number.isFinite(timeLeft)) return { idx: shared.idx, timeLeft, mode: shared.mode };
     }
     return { idx: null, timeLeft: 0, mode: 'down' };
  });
  const [deletingSetIdx, setDeletingSetIdx] = useState(null);
  const [showCardioExtras, setShowCardioExtras] = useState({});
  const [isTreadmillMode, setIsTreadmillMode] = useState(() => (ex.name || '').toLowerCase().includes('treadmill'));

  const handleCardioChange = (setIdx, field, val) => {
      onUpdateSet(ex.id, setIdx, field, val);
      const s = sets[setIdx];
      let dist = field === 'distance' ? Number(val || 0) : Number(s.distance || 0);
      let dur = field === 'duration' ? Number(val || 0) : Number(s.duration || 0);
      let spd = field === 'speed' ? Number(val || 0) : Number(s.speed || 0);

      if (field === 'speed' && dur > 0) {
         const newDist = (val * (dur / 60)).toFixed(2);
         onUpdateSet(ex.id, setIdx, 'distance', Number(newDist));
      }
      else if (field === 'distance' && dur > 0) {
         const newSpd = (val / (dur / 60)).toFixed(1);
         onUpdateSet(ex.id, setIdx, 'speed', Number(newSpd));
      }
      else if (field === 'duration') {
         if (isTreadmillMode && spd > 0) {
            const newDist = (spd * (val / 60)).toFixed(2);
            onUpdateSet(ex.id, setIdx, 'distance', Number(newDist));
         } else if (!isTreadmillMode && dist > 0) {
            const newSpd = (dist / (val / 60)).toFixed(1);
            onUpdateSet(ex.id, setIdx, 'speed', Number(newSpd));
         } else if (dist > 0 && spd === 0) {
            const newSpd = (dist / (val / 60)).toFixed(1);
            onUpdateSet(ex.id, setIdx, 'speed', Number(newSpd));
         }
      }
  };
  const [activeSetDetail, setActiveSetDetail] = useState(null);
  const [showIntensityInfo, setShowIntensityInfo] = useState(false);
  const [rpeMode, setRpeMode] = useState(() => {
    return localStorage.getItem('logym_rpe_mode') !== 'false';
  });

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

  // Cermin `activeTimer` untuk dibaca dari dalam interval.
  //
  // SEMUA efek samping detik-terakhir (bunyi, getar, mencentang set) HARUS di luar fungsi
  // updater `setActiveTimer`. React memanggil updater di fase render — dan `onToggleSet` memanggil
  // setState milik App, jadi hasilnya: "Cannot update a component (App) while rendering a
  // different component (ExerciseCard)". Di React 18 warning; di mode Strict updater dipanggil
  // dua kali, artinya bunyi dobel dan set bisa tercentang lalu batal lagi.
  const timerRef = useRef(activeTimer);
  useEffect(() => { timerRef.current = activeTimer; }, [activeTimer]);

  useEffect(() => {
    if (activeTimer.idx === null) return;
    const terapkan = (next) => { timerRef.current = next; setActiveTimer(next); };
    const interval = setInterval(() => {
      const cur = timerRef.current;
      if (cur.idx === null) return;
      if (cur.mode !== 'down') { terapkan({ ...cur, timeLeft: cur.timeLeft + 1 }); return; }
      if (cur.timeLeft > 1) { terapkan({ ...cur, timeLeft: cur.timeLeft - 1 }); return; }

      // Timer set HABIS — nadanya sama lantangnya dengan timer istirahat, apa pun jenis
      // latihannya (kardio, plank, hold). Dulu di sini 'click': bunyi "plup" pelan yang tidak
      // kedengaran dari treadmill, dan cuma dibunyikan kalau setnya kebetulan belum tercentang.
      clearInterval(interval);
      terapkan({ idx: null, timeLeft: 0, mode: 'down' });
      playSoundEffect('timerEnd', soundEnabled);
      if (soundEnabled && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
      if (!sets[cur.idx]?.done) onToggleSet(ex.id, cur.idx);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer.idx, ex?.id, sets, onToggleSet, soundEnabled]);

  useEffect(() => {
    if (activeTimer.idx !== null) {
       // Ekspor dalam format jam dinding yang dimengerti ImmersiveWorkout dan FloatingTimer
       window.logymActiveTimer = {
         exId: ex?.id,
         exName: ex?.name,
         setIdx: activeTimer.idx,
         timer: activeTimer.mode === 'down'
           ? { idx: activeTimer.idx, mode: 'down', targetTime: Date.now() + activeTimer.timeLeft * 1000, startTime: null, timeLeft: activeTimer.timeLeft }
           : { idx: activeTimer.idx, mode: 'up', startTime: Date.now() - activeTimer.timeLeft * 1000, targetTime: null, timeLeft: activeTimer.timeLeft }
       };
       window.dispatchEvent(new CustomEvent('logym_active_timer_change'));
    } else if (window.logymActiveTimer?.exId === ex?.id) {
       window.logymActiveTimer = null;
       window.dispatchEvent(new CustomEvent('logym_active_timer_change'));
    }
  }, [activeTimer, ex?.id, ex?.name]);

  const toggleTimer = (setIdx, durationMins) => {
    playSoundEffect('click', soundEnabled);
    if (activeTimer.idx === setIdx) {
        // Matikan timer
        if (activeTimer.mode === 'up') {
           // Satuannya beda: set kardio menyimpan MENIT, set 'time' (plank dsb) menyimpan DETIK
           // — sama seperti yang dibaca input & kalkulator kalori.
           if (exType === 'cardio') {
               handleCardioChange(setIdx, 'duration', Number((activeTimer.timeLeft / 60).toFixed(2)));
           } else {
               onUpdateSet(ex.id, setIdx, 'd', Math.round(activeTimer.timeLeft));
           }
        }
        setActiveTimer({ idx: null, timeLeft: 0, mode: 'down' });
    } else {
        // Mulai timer -> Otomatis mulai sesi latihan jika belum dimulai!
        if (!isWorkoutActive && onStartWorkout) {
          onStartWorkout();
        }
        const d = Number(durationMins || 0);
        if (d > 0) {
           const timeInSeconds = exType === 'cardio' ? Math.round(d * 60) : Math.round(d);
           setActiveTimer({ idx: setIdx, timeLeft: timeInSeconds, mode: 'down' }); // Hitung mundur
        } else {
           setActiveTimer({ idx: setIdx, timeLeft: 0, mode: 'up' }); // Hitung maju
        }
    }
  };

  const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${isNegative ? '-' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`mb-6 mx-0 sm:mx-4 ${ex.supersetId ? 'rounded-l-3xl rounded-r-none sm:rounded-[2.5rem]' : 'rounded-3xl sm:rounded-[2.5rem]'} bg-white/90 dark:bg-black/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border-y sm:border border-white/40 dark:border-white/10 overflow-hidden transition-all duration-300 ${isSkip ? 'opacity-50 grayscale scale-95' : 'opacity-100'}`}>
      
      {/* HEADER IMAGE / GIF FULL WIDTH */}
      <div className="relative w-full h-[280px] sm:h-[320px] bg-zinc-100 dark:bg-zinc-800">
         {(() => {
            const canonical = canonicalizeExercise(ex);
            const masterMatch = findMatchingMasterExercise(canonical, defaultMasterExercises);
            const apiExercises = getCachedExercises();
            const apiMatch = (!canonical.gifUrl && !canonical.thumbnailUrl && !isCustom) ? findMatchingMasterExercise(canonical, apiExercises) : null;
            const finalImgUrl = masterMatch?.thumbnailUrl || canonical.thumbnailUrl || masterMatch?.gifUrl || canonical.gifUrl || apiMatch?.thumbnailUrl || apiMatch?.gifUrl;
            const ytId = getVideoId(masterMatch?.ytVideo || canonical.ytVideo || apiMatch?.ytVideo);
            
            if (finalImgUrl) {
                return (
                  <img 
                    src={finalImgUrl} 
                    alt={canonical.name || ex.name} 
                    loading="lazy" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    onError={(e) => {
                      if (e.target.src.endsWith('.webp')) {
                        e.target.src = e.target.src.replace('.webp', '.png');
                      } else if (ytId) {
                        e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                      }
                    }}
                  />
                );
            } else if (ytId) {
                return <img 
                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                  onError={(e) => {
                    if (e.target.src.includes('maxresdefault')) {
                      e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                    }
                  }}
                  alt={canonical.name || ex.name} 
                  loading="lazy" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />;
            } else {
                return <div className="absolute inset-0 flex items-center justify-center opacity-10"><EquipmentIcon equipment={canonical.equipment || ex.equipment} size={120} /></div>;
            }
         })()}
         
         {/* GLASSMORPHISM CHIPS OVERLAY */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
            {/* Top Container */}
            <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-10">
               <div className="flex gap-1.5 flex-wrap max-w-[65%]">
                 <span className="px-2.5 py-1 rounded-xl bg-white/20 border border-white/30 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                   {ex.equipment || 'Lainnya'}
                 </span>

                 {isCustom && (
                   <span className="px-2.5 py-1 rounded-xl bg-emerald-500/80 border border-emerald-400/50 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                     CUSTOM
                   </span>
                 )}

                 {exType !== 'weight' && isSkip && (
                     <span className="px-2.5 py-1 rounded-xl bg-rose-500/90 border border-rose-500/50 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                         SKIPPED
                     </span>
                 )}
               </div>
               
               {/* Right Side Buttons (Floating) */}
               <div className="flex flex-col gap-1.5 shrink-0 pointer-events-auto">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); onOpenVideo(ex); }} className="w-10 h-10 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm">
                    <Info size={18} />
                 </button>
                 {exType !== 'weight' && (
                     <button onClick={() => { playSoundEffect('click', soundEnabled); onToggleSkip(ex.id); }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSkip ? 'bg-rose-500 text-white shadow-sm' : 'bg-white/20 border border-white/30 text-white hover:bg-white/40 shadow-sm'}`} title={isSkip ? 'Batal Skip' : 'Skip'}>
                         <SkipForward size={18} className={isSkip ? "text-white" : ""} />
                     </button>
                 )}
                 {!isExtra && onReplaceClick && (
                    <button onClick={() => { playSoundEffect('click', soundEnabled); onReplaceClick(ex.id); }} className="w-10 h-10 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors shadow-sm">
                        <ArrowLeftRight size={18} />
                    </button>
                 )}
                 {isExtra && (
                    <button onClick={() => onRemoveExtra(ex.id)} className="w-10 h-10 rounded-full bg-rose-500/80 border border-rose-500/50 text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-sm">
                        <X size={18} />
                    </button>
                 )}
                 {/* Exercise dari program cuma bisa dihapus permanen saat ngedit sesi yang SUDAH SELESAI
                     (koreksi riwayat lewat Kalender) — bukan saat mengubah rutinitas yang masih aktif. */}
                 {!isExtra && canDeleteCompleted && (
                    <button onClick={() => onRemoveProgramExercise(ex)} className="w-10 h-10 rounded-full bg-rose-500/80 border border-rose-500/50 text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-sm">
                        <X size={18} />
                    </button>
                 )}
               </div>
            </div>
            
            {/* Bottom Container */}
            <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-1.5 z-10">
               {/* MUSCLE TARGETS */}
               <div className="flex gap-1.5 flex-wrap">
                  {Array.isArray(ex.target) ? ex.target.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-white/90 text-[9px] font-bold tracking-wider">{formatTarget(m, lang?.id)}</span>
                  )) : ex.target && (
                    <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-white/90 text-[9px] font-bold tracking-wider">{formatTarget(ex.target, lang?.id)}</span>
                  )}
                  {ex.supersetId && (
                     <span className={`px-2 py-0.5 rounded-lg ${t.bgAccent} border border-white/20 text-white shadow-lg text-[9px] font-black tracking-widest`}>SUPERSET</span>
                  )}
               </div>
               <h3 className="text-2xl sm:text-3xl font-black text-white leading-[1.1] drop-shadow-md pr-4 mt-2">
                  {idx + 1}. {canonicalizeExercise(ex)?.name || ex.name}
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
         {exType === 'weight' && (
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
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { if (canCloseHint || !overloadHint?.isNewRecord) setShowHint(false); }}>
                          <div 
                            className="relative w-full max-w-[340px] mt-28 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Glassmorphism Card */}
                            <div className={`relative w-full rounded-[32px] ${overloadHint?.isNewRecord ? 'bg-[#0c1427]/90 border border-sky-400/40 shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'bg-[#0c1427]/90 border border-white/15'} backdrop-blur-2xl shadow-2xl shadow-black/90 overflow-visible text-center`}>
                              
                              {/* Coach Popout Avatar (Atas keluar kotak, Bawah terpotong pas di rounded bottom kotak) */}
                              <div className="absolute -top-44 inset-x-0 bottom-0 pointer-events-none z-10 overflow-hidden rounded-b-[32px] flex items-start justify-center">
                                <img 
                                  src={overloadHint?.mode === 'praise' ? '/coach-praise.webp' : '/coach-push.webp'} 
                                  alt="Coach"
                                  className="w-[230%] max-w-none h-auto -translate-y-6 drop-shadow-[0_16px_32px_rgba(0,0,0,0.95)] opacity-85"
                                  style={{
                                    maskImage: 'linear-gradient(to bottom, black 40%, rgba(0,0,0,0.7) 65%, transparent 95%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, rgba(0,0,0,0.7) 65%, transparent 95%)'
                                  }}
                                />
                              </div>

                              {/* Content Container (Z-Index di DEPAN Coach, tanpa kotak di dalam kotak) */}
                              <div className="relative z-20 w-full pt-32 pb-6 px-6 flex flex-col items-center">
                                {overloadHint ? (
                                  <>
                                    <h3 className={`font-black ${overloadHint.isNewRecord ? 'text-xl text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-pulse' : 'text-lg text-white'} tracking-wider uppercase mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]`}>
                                      {overloadHint.title}
                                    </h3>
                                    <p className="text-zinc-100 text-sm font-semibold whitespace-pre-wrap leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                                      {overloadHint.text}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <h3 className="font-black text-lg text-white tracking-wider uppercase mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                                      TARGET HARI INI
                                    </h3>
                                    <p className="text-zinc-100 text-sm font-semibold whitespace-pre-wrap leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                                      Belum ada rekor 10RM.{"\n\n"}Gunakan beban yang menantang tapi sanggup diangkat 10x dengan benar (RPE 8).
                                    </p>
                                  </>
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
         )}

         {/* DAFTAR SET LATIHAN */}
         <div className={`relative z-10 ${isSkip ? 'hidden' : ''}`}>
             {exType === 'cardio' ? (
                 <>
                     {/* HEADER KOLOM KARDIO */}
                     <div className={`grid grid-cols-[40px_1fr_2.1fr_1fr_44px] gap-1 mb-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center items-center`}>
                        <div></div>
                        <div>Jarak <br /><span className="normal-case text-[8px] tracking-normal font-bold">(km)</span></div>
                        <div>Waktu <br /><span className="normal-case text-[8px] tracking-normal font-bold">(mnt)</span></div>
                        <div className="flex items-center justify-center">
                           <div className="text-center">{isTreadmillMode ? 'Kec.' : 'Pace'} <br /><span className="normal-case text-[8px] tracking-normal font-bold">({isTreadmillMode ? 'km/j' : 'mnt/km'})</span></div>
                        </div>
                        <div className="flex justify-center items-center">
                           <button onClick={() => setIsTreadmillMode(!isTreadmillMode)} className={`p-1 flex items-center justify-center rounded-full text-zinc-400 hover:${t.textAccent} hover:bg-black/10 dark:hover:bg-white/10`} title="Ganti Mode (Treadmill / Lari)">
                              <ArrowLeftRight size={14} />
                           </button>
                        </div>
                     </div>

                     <div className="space-y-1">
                         {sets.map((s, setIdx) => {
                             const d = Number(s.distance || 0);
                             const tMin = Number(s.duration || 0);
                             let paceStr = '-:--';
                             if (d > 0 && tMin > 0) {
                                 const paceTotalSeconds = (tMin * 60) / d;
                                 const pm = Math.floor(paceTotalSeconds / 60);
                                 const ps = Math.floor(paceTotalSeconds % 60);
                                 paceStr = `${pm}:${ps < 10 ? '0' : ''}${ps}`;
                             }

                             return (
                                 <div key={setIdx} className={`flex flex-col gap-0.5 transition-all ${s.skipped ? 'opacity-50' : s.done ? 'opacity-60' : ''}`}>
                                    <div className="grid grid-cols-[40px_1fr_2.1fr_1fr_44px] gap-1 items-center text-center">
                                       
                                       {/* Set Number & Delete Button */}
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
                                           className={`w-10 h-10 rounded-full flex items-center justify-center transition-all font-black text-sm ${deletingSetIdx === setIdx ? 'bg-rose-500 text-white shadow-lg scale-110' : (s.type === 'warmup' ? 'bg-orange-500/10 text-orange-500' : 'bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400')}`}
                                         >
                                           {deletingSetIdx === setIdx ? <X size={16}/> : (s.type === 'warmup' ? <Flame size={16} className="opacity-80"/> : getWorkingSetNumber(setIdx))}
                                         </button>
                                       </div>

                                       {/* Jarak */}
                                       {s.skipped ? (
                                         <div className="col-span-3 flex items-center justify-center font-bold text-rose-500 bg-rose-500/10 rounded-2xl h-10 border border-rose-500/20 tracking-wider text-xs">
                                           SKIPPED
                                         </div>
                                       ) : (
                                         <>
                                           <div>
                                              <SwipeInput language={lang?.id || 'ID'} value={s.distance || ''} onChange={(val)=>handleCardioChange(setIdx, 'distance', val)} disabled={s.done} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-10 rounded-xl text-center font-black ${t.textMain} no-spinners transition-colors text-sm sm:text-base focus:bg-black/10 dark:focus:bg-white/10`} />
                                           </div>

                                           {/* Waktu (Timer) */}
                                           <div className="flex items-center justify-center relative">
                                              {activeTimer.idx === setIdx ? (
                                                 <div className={`w-full bg-black/5 dark:bg-white/5 h-10 ${s.done ? 'rounded-xl' : 'rounded-l-xl'} flex items-center justify-center font-black ${t.textAccent} text-sm ring-2 ring-inset ${t.ringAccent}`}>
                                                    {formatTime(activeTimer.timeLeft)}
                                                 </div>
                                              ) : (
                                                 <SwipeInput language={lang?.id || 'ID'} value={s.duration || ''} onChange={(val)=>handleCardioChange(setIdx, 'duration', val)} disabled={s.done} step={1} min={0} soundEnabled={soundEnabled} isTimeFormat={true} className={`w-full bg-black/5 dark:bg-white/5 h-10 ${s.done ? 'rounded-xl' : 'rounded-l-xl'} text-center font-black ${t.textMain} no-spinners transition-colors text-sm sm:text-base focus:bg-black/10 dark:focus:bg-white/10`} />
                                              )}
                                              {!s.done && (
                                                <button onClick={() => toggleTimer(setIdx, s.duration)} className={`h-10 w-11 shrink-0 rounded-r-xl flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500 shadow-md' : t.bgAccent + ' hover:opacity-80'}`}>
                                                   {activeTimer.idx === setIdx ? <Square size={16}/> : <Play size={16} className="ml-[2px]"/>}
                                                </button>
                                              )}
                                           </div>

                                           {/* Kecepatan / Pace */}
                                           <div className="relative w-full">
                                              <SwipeInput language={lang?.id || 'ID'} value={s.speed || ''} onChange={(val)=>handleCardioChange(setIdx, 'speed', val)} disabled={s.done} step={0.1} min={0} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-10 rounded-xl text-center font-black ${t.textMain} no-spinners transition-colors text-sm sm:text-base focus:bg-black/10 dark:focus:bg-white/10 ${!isTreadmillMode ? 'opacity-0 absolute inset-0 z-10' : ''}`} />
                                              {!isTreadmillMode && (
                                                <div className={`w-full bg-black/5 dark:bg-white/5 h-10 rounded-xl flex items-center justify-center font-black ${t.textMain} text-sm sm:text-base pointer-events-none`}>{paceStr}</div>
                                              )}
                                           </div>
                                         </>
                                       )}

                                       {/* Checkmark Button */}
                                       <div className="flex justify-center">
                                         <button onClick={() => { playSoundEffect(s.done ? 'click' : 'done_set', soundEnabled); onToggleSet(ex.id, setIdx); }} disabled={activeTimer.idx === setIdx} className={`w-11 h-11 rounded-full flex justify-center items-center font-bold transition-all ${s.skipped ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30' : s.done ? t.bgAccent + ' text-white shadow-lg scale-105' : 'bg-transparent border-2 ' + t.borderAccentSoft + ' ' + t.textAccent + ' hover:bg-black/5 dark:hover:bg-white/5'} ${activeTimer.idx === setIdx ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                           {s.skipped ? <X size={18} /> : <CheckCircle size={18} />}
                                         </button>
                                       </div>
                                       
                                    </div>

                                    {/* Extras Button Dipindah ke Bawah (di luar grid row 1) */}
                                    {!s.skipped && (
                                        <div className="flex justify-center mt-0 mb-0 relative z-10">
                                          <button 
                                            onClick={() => { playSoundEffect('click', soundEnabled); setShowCardioExtras(prev => ({...prev, [setIdx]: !prev[setIdx]})); }}
                                            className={`px-4 py-0.5 flex justify-center items-center rounded-full transition-all text-xs gap-1 ${(s.heartRate || s.elevation || s.incline) ? `${t.bgAccent} text-white shadow-md` : `text-zinc-400 bg-black/5 dark:bg-white/5 hover:${t.textAccent} hover:bg-black/10 dark:hover:bg-white/10`}`}
                                            title="Detak Jantung & Elevasi"
                                          >
                                            {showCardioExtras[setIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                          </button>
                                        </div>
                                    )}
                                    
                                    {/* Extra Cardio Inputs (Baris 2) */}
                                    {showCardioExtras[setIdx] && !s.skipped && (
                                        <div className="flex gap-2 pl-[44px] pr-[48px] pt-1 pb-2 animate-in slide-in-from-top-2 fade-in duration-200 items-end">
                                            {/* HR */}
                                            <div className="relative flex-1">
                                               <div className={`absolute -top-3 inset-x-0 text-[8px] font-black uppercase tracking-widest text-center ${t.textMuted}`}>HR (BPM)</div>
                                               <SwipeInput language={lang?.id || 'ID'} value={s.heartRate || ''} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'heartRate', val)} disabled={s.done} step={1} min={0} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-10 rounded-xl text-center font-black ${t.textMain} no-spinners transition-colors text-sm focus:bg-black/10 dark:focus:bg-white/10`} />
                                            </div>
                                            {/* Elevasi / Incline */}
                                            <div className="relative flex-1">
                                               <div className={`absolute -top-3 inset-x-0 text-[8px] font-black uppercase tracking-widest text-center ${t.textMuted}`}>{isTreadmillMode ? 'Incline (%)' : 'Elev (m)'}</div>
                                               <SwipeInput language={lang?.id || 'ID'} value={isTreadmillMode ? s.incline || '' : s.elevation || ''} onChange={(val)=>onUpdateSet(ex.id, setIdx, isTreadmillMode ? 'incline' : 'elevation', val)} disabled={s.done} step={isTreadmillMode ? 0.5 : 1} min={0} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-10 rounded-xl text-center font-black ${t.textMain} no-spinners transition-colors text-sm focus:bg-black/10 dark:focus:bg-white/10`} />
                                            </div>
                                        </div>
                                    )}
                                 </div>
                             );
                         })}
                     </div>
                 </>
             ) : (
                 <>
                     <div className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-2 mb-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center items-center`}>
                        <div>Set</div>
                          {exType === 'weight' && (
                            <div className="flex items-center justify-center gap-1 relative z-20">
                              <span>{isImp ? 'LBS' : 'KG'}</span>
                              <div className="relative inline-flex items-center">
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setShowWeightInfo(prev => !prev); }}
                                  className={`p-0.5 rounded-full transition-all ${showWeightInfo ? 'text-sky-400 scale-110' : 'text-zinc-400 hover:text-sky-400'}`}
                                  title="Info Aturan Input & Total Beban Aktual"
                                >
                                  <Info size={13} strokeWidth={2.2} />
                                </button>

                                {/* Tooltip Popover (Menempel langsung di bawah ikon Info, Glassmorphism, dismiss klik luar) */}
                                {showWeightInfo && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-20 bg-transparent" 
                                      onClick={(e) => { e.stopPropagation(); setShowWeightInfo(false); }} 
                                    />
                                    <div 
                                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[240px] px-3.5 py-2 rounded-2xl bg-[#0c1427]/90 border border-white/15 backdrop-blur-2xl text-left shadow-2xl shadow-black/80 z-30 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto normal-case tracking-normal font-normal"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="font-bold text-xs text-sky-400 whitespace-nowrap">
                                        {eqConfig.inputRule === 'plates_total' ? 'Input Total Plat 2 Sisi' :
                                         eqConfig.inputRule === 'plate_per_side' ? 'Input Plat 1 Sisi' :
                                         eqConfig.inputRule === 'pin' ? 'Input Pin Beban' :
                                         eqConfig.inputRule === 'dumbbell_single' ? 'Input 1 Dumbbell' :
                                         eqConfig.inputRule === 'bodyweight_plus' ? 'Input Tambahan Beban' :
                                         `Input ${eqConfig.label}`}
                                      </div>
                                      {(eqConfig.baseWeight > 0 || eqConfig.ratio !== 1) && (
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-300 font-medium">
                                          {eqConfig.baseWeight > 0 && <span>Bar {eqConfig.baseWeight} kg</span>}
                                          {eqConfig.ratio !== 1 && <span>Katrol {eqConfig.ratio}:1</span>}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        {/* Detik, bukan menit: kolom ini mengisi set.d yang disimpan dalam detik
                            (lihat isSecondsFormat di bawah). ImmersiveWorkout memberi label sama. */}
                        {exType === 'time' && <div>Detik</div>}
                        {exType !== 'time' && <div>Reps</div>}
                        <div></div>
                        <div></div>
                      </div>

             <div className="space-y-3">
              {sets.map((s, setIdx) => {
                const actW = getSetActualWeight(s, eqConfig);
                const inputW = Number(s.input_w !== undefined ? s.input_w : s.w) || 0;
                const hasWeightDiff = exType === 'weight' && (eqConfig.baseWeight > 0 || eqConfig.ratio !== 1) && actW !== inputW && actW > 0;

                return (
                  <div key={setIdx} className={`grid ${exType==='weight' ? 'grid-cols-[1fr_2fr_2fr_1fr_1fr]' : 'grid-cols-[1fr_3fr_1fr_1fr]'} gap-2 ${hasWeightDiff ? 'items-start' : 'items-center'} text-center transition-all ${s.skipped ? 'opacity-50' : s.done ? 'opacity-60' : ''}`}>
                    
                    <div className="flex flex-col items-center justify-center">
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
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all font-black text-sm ${deletingSetIdx === setIdx ? 'bg-rose-500 text-white shadow-lg scale-110' : (s.type === 'warmup' ? 'bg-orange-500/10 text-orange-500' : 'bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400')}`}
                      >
                        {deletingSetIdx === setIdx ? <X size={16}/> : (s.type === 'warmup' ? <Flame size={16} className="opacity-80"/> : getWorkingSetNumber(setIdx))}
                      </button>
                      {hasWeightDiff && <div className="h-3.5 mt-1"></div>}
                    </div>

                    {s.skipped ? (
                      <div className={`${exType === 'weight' ? 'col-span-2' : 'col-span-1'} flex items-center justify-center font-bold text-rose-500 bg-rose-500/10 rounded-2xl h-11 border border-rose-500/20 tracking-wider text-xs sm:text-sm`}>
                        SKIPPED
                      </div>
                    ) : (
                      <>
                        {exType === 'weight' && (
                          <div className="flex flex-col items-center w-full">
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
                                <>
                                  <SwipeInput language={lang?.id || 'ID'} 
                                    value={isImp ? Math.round(Number(s.w || 0) * 2.20462 * 10)/10 : s.w} 
                                    onChange={(val)=>onUpdateSet(ex.id, setIdx, 'w', isImp ? Number((val / 2.20462).toFixed(2)) : val)} 
                                    disabled={s.done} 
                                    step={customStep} 
                                    min={customMin} 
                                    soundEnabled={soundEnabled} 
                                    className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} 
                                  />
                                  {hasWeightDiff && (
                                    <div className="h-3.5 mt-1 flex items-center justify-center">
                                      <span className="text-[9px] text-sky-400 font-bold tracking-tight whitespace-nowrap">
                                        Aktual: {isImp ? Number((actW * 2.20462).toFixed(1)) + ' lbs' : actW + ' kg'}
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* KHUSUS TIMER DURASI */}
                         {exType === 'time' && (
                          <div className="flex items-center justify-center relative">
                             {activeTimer.idx === setIdx ? (
                                <div className={`w-full bg-black/5 dark:bg-white/5 h-11 ${s.done ? 'rounded-2xl' : 'rounded-l-2xl'} flex items-center justify-center font-black ${t.textAccent} text-lg ring-2 ring-inset ${t.ringAccent}`}>
                                   {formatTime(activeTimer.timeLeft)}
                                </div>
                             ) : (
                                <SwipeInput language={lang?.id || 'ID'} value={s.d || ''} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'd', val)} disabled={s.done} step={1} min={0} soundEnabled={soundEnabled} isTimeFormat={true} isSecondsFormat={true} className={`w-full bg-black/5 dark:bg-white/5 h-11 ${s.done ? 'rounded-2xl' : 'rounded-l-2xl'} text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} />
                             )}
                             {!s.done && (
                               <button onClick={() => toggleTimer(setIdx, s.d)} className={`h-11 w-12 shrink-0 rounded-r-2xl flex items-center justify-center text-white transition-all ${activeTimer.idx === setIdx ? 'bg-rose-500 shadow-md' : t.bgAccent + ' hover:opacity-80'}`}>
                                  {activeTimer.idx === setIdx ? <Square size={18}/> : <Play size={18} className="ml-[2px]"/>}
                               </button>
                             )}
                          </div>
                        )}

                        {(exType === 'weight' || exType === 'reps') && (
                          <div className="flex flex-col items-center w-full">
                            <SwipeInput language={lang?.id || 'ID'} value={s.r} onChange={(val)=>onUpdateSet(ex.id, setIdx, 'r', val)} disabled={s.done} step={1} soundEnabled={soundEnabled} className={`w-full bg-black/5 dark:bg-white/5 h-11 rounded-2xl text-center font-black ${t.textMain} no-spinners transition-colors text-lg focus:bg-black/10 dark:focus:bg-white/10`} />
                            {hasWeightDiff && <div className="h-3.5 mt-1"></div>}
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex flex-col items-center justify-center">
                      <button 
                        onClick={() => { playSoundEffect('click', soundEnabled); setActiveSetDetail({ setIdx, rir: s.rir !== undefined ? s.rir : '', rpe: s.rpe !== undefined ? s.rpe : '', notes: s.notes || '' }); }}
                        className={`w-11 h-11 flex justify-center items-center rounded-2xl transition-all ${(s.notes || s.rir || s.rpe) ? `${t.bgAccent} text-white shadow-md` : `text-zinc-400 bg-black/5 dark:bg-white/5 hover:${t.textAccent} hover:bg-black/10 dark:hover:bg-white/10`}`}
                      >
                        <ClipboardEdit size={16} />
                      </button>
                      {hasWeightDiff && <div className="h-3.5 mt-1"></div>}
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      {/* Sama seperti set beban di atas: mencentang berbunyi 'done_set', membatalkan
                          berbunyi 'click'. Dulu set durasi selalu 'click' — menyelesaikan plank
                          terdengar sama saja dengan menekan tombol biasa. */}
                      <button onClick={() => { playSoundEffect(s.done ? 'click' : 'done_set', soundEnabled); onToggleSet(ex.id, setIdx); }} disabled={activeTimer.idx === setIdx} className={`w-11 h-11 rounded-2xl flex justify-center items-center font-bold transition-all ${s.skipped ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30' : s.done ? t.bgAccent + ' text-white shadow-lg scale-105' : 'bg-transparent border-2 ' + t.borderAccentSoft + ' ' + t.textAccent + ' hover:bg-black/5 dark:hover:bg-white/5'} ${activeTimer.idx === setIdx ? 'opacity-30 cursor-not-allowed' : ''}`}>
                        {s.skipped ? <X size={18} /> : <CheckCircle size={18} />}
                      </button>
                      {hasWeightDiff && <div className="h-3.5 mt-1"></div>}
                    </div>

                  </div>
                );
              })}
              </div>
               </>
             )}
               
               <div className="mt-5">
                 <button onClick={() => { playSoundEffect('click', soundEnabled); onAddSet(ex.id); }} className={`w-full py-4 rounded-2xl text-xs font-black tracking-widest uppercase border-2 border-dashed ${t.border} ${t.textMuted} hover:${t.textAccent} hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2`}>
                   <Plus size={16} /> {lang.addSet || 'Tambah Set'}
                 </button>
               </div>
           </div>
        </div>

        {/* SET DETAILS MODAL (BOTTOM SHEET) */}
        {activeSetDetail !== null && createPortal(
          <div className="fixed inset-0 z-[999] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => { setActiveSetDetail(null); setShowIntensityInfo(false); }}>
            <div className={`w-full max-w-lg mx-auto bg-white/70 dark:bg-[#121a2f]/70 backdrop-blur-2xl border-t border-white/30 dark:border-white/10 shadow-2xl rounded-t-[2.5rem] p-6 pb-12 sm:pb-8 animate-in slide-in-from-bottom-1/2 duration-300`} onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-black">Catatan Set {sets[activeSetDetail.setIdx]?.type === 'warmup' ? 'Pemanasan' : getWorkingSetNumber(activeSetDetail.setIdx)}</h3>
                <button onClick={() => setActiveSetDetail(null)} className={`p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors`}>
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-4">
                {/* KIRI: Textarea & Tags */}
                <div className="flex-1 flex flex-col gap-4">
                  
                  <div className="relative">
                    <textarea 
                      rows="3" 
                      placeholder="Tulis catatan set ini (opsional)..." 
                      value={activeSetDetail.notes} 
                      onChange={e => setActiveSetDetail({...activeSetDetail, notes: e.target.value})} 
                      className={`w-full p-4 pr-10 rounded-3xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base resize-none outline-none focus:ring-2 focus:${t.ringAccent}`}
                    />
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

                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Terlalu Ringan', rpe: 4, rir: 6, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                        { label: 'Cukup Menantang', rpe: 7, rir: 3, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
                        { label: 'Berat Banget', rpe: 9, rir: 1, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
                        { label: 'Gagal Angkat (Failure)', rpe: 10, rir: 0, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
                      ].map(tag => (
                        <button
                          key={tag.label}
                          onClick={(e) => {
                            e.preventDefault();
                            playSoundEffect('click', soundEnabled);
                            setActiveSetDetail({
                              ...activeSetDetail,
                              notes: tag.label, // REPLACE text
                              rpe: tag.rpe,
                              rir: tag.rir
                            });
                          }}
                          className={`px-4 py-3 rounded-2xl text-sm font-bold border ${activeSetDetail.notes === tag.label ? tag.color + ' ring-2 ring-current' : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10'} text-left transition-all flex items-center justify-between`}
                        >
                          <span>{tag.label}</span>
                          <span className="text-[10px] uppercase tracking-widest opacity-60">{rpeMode ? 'RPE ' + tag.rpe : 'RIR ' + tag.rir}</span>
                        </button>
                      ))}
                    </div>
                </div>

                {/* KANAN: RPE Vertical Select */}
                <div className="w-14 shrink-0 flex flex-col relative">
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <button onClick={() => {
                      const newMode = !rpeMode;
                      setRpeMode(newMode);
                      localStorage.setItem('logym_rpe_mode', newMode);
                    }} className="text-[10px] font-black tracking-widest uppercase text-zinc-500 hover:text-blue-500 flex items-center gap-0.5 transition-colors">
                      {rpeMode ? 'RPE' : 'RIR'} <ArrowLeftRight size={10} />
                    </button>
                    <button onClick={() => setShowIntensityInfo(!showIntensityInfo)} className="text-zinc-400 hover:text-blue-500 transition-colors"><Info size={12} /></button>
                  </div>
                  
                  {/* POPUP INFO */}
                  {showIntensityInfo && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowIntensityInfo(false); }} />
                      <div className="absolute bottom-full right-0 mb-4 w-64 p-4 rounded-3xl bg-white/95 dark:bg-[#121a2f]/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 animate-in slide-in-from-bottom-2 z-50 pointer-events-none">
                        <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
                          {rpeMode ? (
                            <>
                              <p><strong>RPE (Perceived Exertion):</strong> Skala 1-10 seberapa berat usaha latihan.</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li><strong>RPE 7-8:</strong> Ideal (sisa tenaga 2-3 rep).</li>
                                <li><strong>RPE 9:</strong> Sangat berat (sisa tenaga 1 rep).</li>
                                <li><strong>RPE 10:</strong> Maksimal / gagal angkat.</li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <p><strong>RIR (Reps in Reserve):</strong> Estimasi sisa tenaga / sisa repetisi sebelum gagal angkat.</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li><strong>RIR 2-3:</strong> Ideal (setara RPE 7-8).</li>
                                <li><strong>RIR 1:</strong> Sangat berat (setara RPE 9).</li>
                                <li><strong>RIR 0:</strong> Maksimal / gagal angkat.</li>
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex-1 bg-black/10 dark:bg-white/10 rounded-[2rem] p-1 flex flex-col justify-between shadow-inner">
                     {(rpeMode ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map((val) => {
                        const isSelected = rpeMode ? activeSetDetail.rpe === val : activeSetDetail.rir === val;
                        return (
                          <button 
                            key={val}
                            onClick={() => {
                              playSoundEffect('click', soundEnabled);
                              const rpe = rpeMode ? val : 10 - val;
                              const rir = rpeMode ? 10 - val : val;
                              
                              let notes = activeSetDetail.notes;
                              const allTemplates = ['Terlalu Ringan', 'Cukup Menantang', 'Berat Banget', 'Gagal Angkat (Failure)'];
                              if (!notes || allTemplates.includes(notes)) {
                                if (rpe <= 4) notes = 'Terlalu Ringan';
                                else if (rpe <= 7) notes = 'Cukup Menantang';
                                else if (rpe <= 9) notes = 'Berat Banget';
                                else notes = 'Gagal Angkat (Failure)';
                              }

                              setActiveSetDetail({...activeSetDetail, rpe, rir, notes});
                            }}
                            className={`flex-1 min-h-[26px] flex items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected ? t.bgAccent + ' text-white shadow-md scale-110' : 'text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10'} `}
                          >
                            {val}
                          </button>
                        )
                     })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                     playSoundEffect('click', soundEnabled);
                     const emptyDetail = { setIdx: activeSetDetail.setIdx, notes: '', rpe: '', rir: '' };
                     handleSaveSetDetail(ex.id, activeSetDetail.setIdx, emptyDetail);
                  }} 
                  className={`flex-1 py-4 rounded-2xl border-2 border-rose-500/20 text-rose-500 font-bold text-base hover:bg-rose-500/10 transition-colors bg-rose-500/5`}
                >
                  Hapus Data
                </button>
                <button 
                  onClick={() => handleSaveSetDetail(ex.id, activeSetDetail.setIdx, activeSetDetail)} 
                  className={`flex-[1.5] py-4 rounded-2xl ${t.bgAccent} text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform`}
                >
                  Simpan
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ExerciseCard;
