import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Wind, Play, CalendarDays, X, CheckCircle, ChevronDown, ChevronUp, Dumbbell, Share2, Flame, Brain } from 'lucide-react';
import { fetchExercisesFromApi } from '../utils/exerciseDbApi';
import { shareWorkoutToFeed } from '../utils/communityApi';
import { normalizeMuscleKey, resolveProjectedProgramId, getDayWorkouts } from '../data/constants';
import { estimate10RM, defaultSetWeight, gymStepFor } from '../utils/workoutCalc';

// Import Komponen Pecahan
import WorkoutHeader from '../components/WorkoutHeader';
import ExerciseCard from '../components/ExerciseCard';
import ImmersiveWorkout from '../components/ImmersiveWorkout';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';
import EmptyWorkoutState from '../components/EmptyWorkoutState';
import useDialog from '../hooks/useDialog';

let notified10RM_Date = null;
const notified10RM_Ids = new Set();

const WorkoutTab = ({
  // Dikirim App.jsx tapi dulu tidak pernah di-destructure — padahal dipakai di
  // `if (setConfirmModal)` saat user memulai latihan lain sementara satu sesi masih jalan.
  // Identifier yang tidak dideklarasikan MELEMPAR ReferenceError, bukan bernilai undefined,
  // jadi penjaga itu justru yang menjatuhkan layarnya.
  setConfirmModal,
  t, lang, language, programs,
  selectedDate, setSelectedDate,
  history, setHistory, setActiveTab,
  activeProgramId, setActiveProgramId,
  soundEnabled, playSoundEffect, 
  warmupVideos, cooldownVideos,
  
  // --- PROPS DARI APP.JSX ---
  exerciseLibrary, setExerciseLibrary,
  exerciseLogs, skippedExercises, extraExercises,
  onSetChange, onToggleSet, onSkipSet, onAddSet, onAddWarmupSets, onRemoveSet,
  onToggleSkip, onRemoveExtra, onRemoveProgramExercise,
  isCurrentlyCompleted, onSaveWorkout, onCancelWorkout,
  onAddExtraClick, onAddExtraExercise,
  gymProfiles, activeGymId,
  
  // Global Timer Props
  isWorkoutActive, setIsWorkoutActive,
  workoutStartTime, setWorkoutStartTime,
  restTargetTime, setRestTargetTime,

  focusWorkoutId, setFocusWorkoutId,
  activeExerciseId, setActiveExerciseId,

  // Library
  isImmersiveMode, setIsImmersiveMode,

  sessionToRun, setSessionToRun, onSessionExercises,
  resumeDurationSecs, setResumeDurationSecs,
  units, userProfile, activePlanIds = [], showSupersetToast, tabSlideDir = 'right',
  expandedSessions, setExpandedSessions
}) => {
  
  const [detailExercise, setDetailExercise] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [showProgramSelect, setShowProgramSelect] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationSession, setCelebrationSession] = useState(null);
  const isDark = t?.bgCard !== 'bg-white';
  const { dialog, showAlert } = useDialog(isDark);

  const getLocalYMD = (d) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
  };

  const todayStr = getLocalYMD(new Date());

  let sourceWorkouts = getDayWorkouts(history, programs, activePlanIds, selectedDate);

  // FORCE INJECT ACTIVE WORKOUT (If it's running but not found in sourceWorkouts, e.g. started from past date)
  if (isWorkoutActive && sessionToRun) {
    const isAlreadyInSource = sourceWorkouts.some(w => w.id === sessionToRun || w.programId === sessionToRun);
    if (!isAlreadyInSource) {
      let progId = sessionToRun;
      if (sessionToRun.startsWith('projected_')) {
         progId = resolveProjectedProgramId(sessionToRun);
      }
      
      if (progId === 'extra') {
         sourceWorkouts.push({
            id: 'extra',
            programId: 'adhoc',
            programName: 'Latihan Ekstra',
            status: 'planned',
            isProjected: true,
            log: {}
         });
      } else {
         const prog = programs.find(p => p.id === progId);
         if (prog) {
           sourceWorkouts.push({
             id: sessionToRun,
             programId: progId,
             programName: prog.name,
             status: 'planned',
             isProjected: true,
             log: {}
           });
         }
      }
    }
  }

  // Pengaman render: buang entri dengan id kembar (mis. sisa program duplikat di `programs`
  // yang belum sempat ke-upload bersih) — apa pun sumber duplikatnya, daftar yang di-render
  // dijamin gak pernah punya key ganda.
  {
    const seenIds = new Set();
    sourceWorkouts = sourceWorkouts.filter(w => {
       if (seenIds.has(w.id)) return false;
       seenIds.add(w.id);
       return true;
    });
  }

  const activeProgramsList = sourceWorkouts
    .map(w => {
      if (w.programId === 'adhoc') {
         return { 
           id: 'adhoc', 
           name: w.programName || 'Ekstra', 
           workoutId: w.id, 
           status: w.status, 
           log: w.log,
           exercises: (w.exercises || []).map(ex => ({
              ...ex,
              originalId: ex.originalId || ex.id,
              id: `${ex.id}-${w.id}`,
              workoutId: w.id
           }))
         };
      }
      let p = programs.find(p => p.id === w.programId);
      
      // Fallback untuk program yang sudah dihapus tapi ada di history
      if (!p && w.status === 'completed') {
        p = {
          id: w.programId,
          name: w.programName || 'Sesi Terdahulu',
          exercises: w.overriddenExercises || w.exercises || []
        };
      }

      return p ? { 
          ...p, 
          workoutId: w.id, 
          status: w.status, 
          log: w.log,
          exercises: p.exercises ? (w.overriddenExercises || p.exercises).map(ex => ({
              ...ex,
              originalId: ex.id,
              id: `${ex.id}-${w.id}`,
              workoutId: w.id
          })) : []
      } : null;
    })
    .filter(Boolean);

  // Isi sesi yang lagi dijalankan. Dipakai ImmersiveWorkout, dan dilaporkan ke App supaya
  // FloatingTimer (pill saat di-minimize) menghitung kalori dari sesi yang SAMA — bukan dari
  // seluruh log hari itu. Satu turunan, satu angka.
  const sessionPrograms = sessionToRun === 'extra' ? [] : activeProgramsList.filter(p => p.workoutId === sessionToRun || p.id === sessionToRun);
  const sessionExtras = sessionToRun === 'extra' ? extraExercises : [];
  const sessionExercises = [...sessionPrograms.flatMap(p => p.exercises || []), ...sessionExtras]
    .filter(ex => !skippedExercises[ex.id]);

  // activeProgramsList dirakit ulang tiap render, jadi kunci efeknya pakai daftar id (stabil)
  // supaya tidak setState tanpa henti.
  const sessionExerciseIds = sessionExercises.map(ex => ex.id).join(',');
  React.useEffect(() => {
    onSessionExercises?.(sessionExercises);
  }, [sessionExerciseIds, onSessionExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAutoExpanded = React.useRef(expandedSessions && Object.keys(expandedSessions || {}).length > 0);

  const [scrolledTargets, setScrolledTargets] = React.useState({});

  const [isClosingImmersive, setIsClosingImmersive] = React.useState(false);

  // POSISI GULIR SAAT KEMBALI DARI OVERLAY (immersive / detail latihan).
  //
  // Aturannya: kembali dari overlay = kembali ke tempat yang SAMA. Bukan ke latihan aktif, bukan
  // ke atas sesi. Autoscroll ke latihan aktif memang disengaja untuk "buka tab Latihan", tapi
  // begitu dipakai juga saat menutup overlay, user kehilangan tempatnya tiap kali cuma mengintip
  // detail satu gerakan.
  const scrollBeforeOverlay = React.useRef(null);
  const blockAutoScrollUntil = React.useRef(0);
  const overlayOpen = isImmersiveMode || isClosingImmersive || !!detailExercise;
  React.useEffect(() => {
    if (overlayOpen) {
      if (scrollBeforeOverlay.current === null) scrollBeforeOverlay.current = window.scrollY;
      return;
    }
    const y = scrollBeforeOverlay.current;
    scrollBeforeOverlay.current = null;
    if (y === null) return;
    // Efek tutup immersive berjalan 300 ms dan daftarnya baru terlihat lagi sesudah itu, jadi
    // posisinya dipulihkan dua kali: sekarang, dan sekali lagi setelah animasinya selesai.
    blockAutoScrollUntil.current = Date.now() + 700;
    const pulihkan = () => window.scrollTo({ top: y, behavior: 'auto' });
    requestAnimationFrame(pulihkan);
    const timer = setTimeout(pulihkan, 350);
    return () => clearTimeout(timer);
  }, [overlayOpen]);

  const smartScrollTo = (el, offset = 100, force = false, instant = false) => {
    if (!el) return;
    if (Date.now() < blockAutoScrollUntil.current) return; // baru menutup overlay — jangan pindah
    const rect = el.getBoundingClientRect();
    const isTopVisible = rect.top >= 80 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) - 120;
    if (!isTopVisible || force) {
      const y = rect.top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: instant ? 'auto' : 'smooth' });
    }
  };

  const scrollToFirstIncompleteExercise = (wId, ignoreExId = null, instant = false) => {
    let targetExId = null;
    let forceScroll = false;
    let list = wId === 'extra' ? extraExercises : activeProgramsList.find(p => p.workoutId === wId || p.id === wId)?.exercises;
    if (list) {
      let startIndex = 0;
      if (ignoreExId) {
         startIndex = list.findIndex(e => e.id === ignoreExId);
         if (startIndex !== -1) startIndex += 1;
         else startIndex = 0;
         forceScroll = true; // force scroll when advancing to next exercise
      } else if (activeExerciseId) {
         // Buka tab: gulirkan ke latihan yang sedang dikerjakan, bukan ke yang pertama.
         const lastExIdx = list.findIndex(e => e.id === activeExerciseId);
         if (lastExIdx !== -1) {
            targetExId = activeExerciseId;
         }
      }
      
      if (!targetExId) {
          for (let i = startIndex; i < list.length; i++) {
             const ex = list[i];
             if (!skippedExercises[ex.id] && ex.id !== ignoreExId) {
                const logs = exerciseLogs[ex.id];
                if (!logs || logs.some(s => !s.done)) {
                   targetExId = ex.id;
                   break;
                }
             }
          }
      }
    }
    if (targetExId) {
      const el = document.getElementById(`exercise-card-${targetExId}`);
      if (el) {
         smartScrollTo(el, 100, forceScroll, instant);
         return;
      }
    }
    // fallback to session ONLY IF not triggered from a set completion
    if (!ignoreExId) {
      const sel = document.getElementById(`session-${wId}`);
      if (sel) {
        smartScrollTo(sel, 80, false, instant);
      }
    }
  };
  // Dipanggil setelah user mencentang satu set: kalau set itu MENYELESAIKAN latihannya, maju ke
  // latihan berikutnya yang belum selesai. Kalau sudah latihan terakhir, tidak melakukan apa pun —
  // scrollToFirstIncompleteExercise dengan ignoreExId tidak punya fallback ke atas sesi.
  //
  // `exerciseLogs` dibaca lewat ref, bukan langsung: nilai di dalam handler ini adalah snapshot
  // SEBELUM centang diproses, jadi kode lama harus membalik logikanya (`!logs[setIdx].done`) dan
  // ikut salah begitu centangnya beruntun cepat.
  const exerciseLogsRef = React.useRef(exerciseLogs);
  React.useEffect(() => { exerciseLogsRef.current = exerciseLogs; }, [exerciseLogs]);

  const advanceIfExerciseFinished = (wId, exId, setIdx) => {
    setTimeout(() => {
      const logs = exerciseLogsRef.current?.[exId];
      if (!logs || !logs[setIdx]?.done) return;      // dibatalkan, bukan diselesaikan
      if (logs.some(s => !s.done && !s.skipped)) return; // masih ada set tersisa
      scrollToFirstIncompleteExercise(wId, exId);
    }, 80);
  };

  const prevExtraLen = React.useRef(extraExercises.length);
  React.useEffect(() => {
    if (extraExercises.length > prevExtraLen.current) {
      setExpandedSessions({ 'extra': true });
      setTimeout(() => {
        const el = document.getElementById('session-extra');
        smartScrollTo(el, 80);
      }, 150);
    }
    prevExtraLen.current = extraExercises.length;
  }, [extraExercises.length]);

  React.useEffect(() => {
    if (focusWorkoutId && !scrolledTargets[focusWorkoutId]) {
      let targetWorkoutId = focusWorkoutId;
      if (focusWorkoutId !== 'extra') {
         const found = activeProgramsList.find(p => p.id === focusWorkoutId || p.workoutId === focusWorkoutId);
         if (found) targetWorkoutId = found.workoutId;
      }
      setExpandedSessions({ [targetWorkoutId]: true });
      setTimeout(() => {
        scrollToFirstIncompleteExercise(targetWorkoutId);
      }, 150);
      setScrolledTargets(prev => ({ ...prev, [focusWorkoutId]: true }));
      hasAutoExpanded.current = true;
    } else if (activeProgramsList.length > 0 && Object.keys(expandedSessions || {}).length === 0 && !hasAutoExpanded.current) {
      setExpandedSessions({ [activeProgramsList[0].workoutId]: true });
      hasAutoExpanded.current = true;
    }
  }, [activeProgramsList, expandedSessions, focusWorkoutId, scrolledTargets, exerciseLogs, extraExercises, skippedExercises]);

  const toggleSession = (id) => {
    const isNowExpanded = !(expandedSessions || {})[id];
    setExpandedSessions(prev => (prev || {})[id] ? {} : { [id]: true });
    if (isNowExpanded) {
      setTimeout(() => {
        const el = document.getElementById(`session-${id}`);
        if (el && typeof smartScrollTo === 'function') {
           smartScrollTo(el, 80);
        } else if (el) {
           const y = el.getBoundingClientRect().top + window.scrollY - 80;
           window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  const groupExercises = (exercisesList) => {
    const grouped = [];
    (exercisesList || []).forEach((ex, idx) => {
      if (ex.supersetId) {
        const lastGroup = grouped[grouped.length - 1];
        if (lastGroup && lastGroup.isSuperset && lastGroup.supersetId === ex.supersetId) {
          lastGroup.items.push({ ex, idx });
        } else {
          grouped.push({ isSuperset: true, supersetId: ex.supersetId, items: [{ ex, idx }] });
        }
      } else {
        grouped.push({ isSuperset: false, items: [{ ex, idx }] });
      }
    });
    return grouped;
  };

  const isProgramCompleted = (prog) => {
    const hasExercises = prog.exercises && prog.exercises.length > 0;
    const activeExs = hasExercises ? prog.exercises.filter(ex => !skippedExercises[ex.id]) : [];
    if (!hasExercises || activeExs.length === 0) return false;
    return activeExs.every(ex => {
       const logs = getSetLogs(ex);
       return logs.length > 0 && logs.every(s => s.done && !s.skipped);
    });
  };

  const activeProgram = activeProgramsList[0] || programs[0];
  
  const handleOpenDetail = async (ex) => {
     playSoundEffect('click', soundEnabled);
     // Ambil data dari library lokal
     let fullEx = exerciseLibrary?.find(e => String(e.id) === String(ex.id));
     if (!fullEx) {
         fullEx = exerciseLibrary?.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
     }

     // Ambil instruksi & gif dari database lengkap jika belum ada
     if (!fullEx || !fullEx.instructions || fullEx.instructions.length === 0) {
         try {
             const onlineDb = await fetchExercisesFromApi();
             const onlineMatch = onlineDb.find(e => e.name.toLowerCase() === (fullEx?.name || ex.name).toLowerCase());
             if (onlineMatch) {
                 // Gabungkan dan utamakan instruksi/gif/equipment dari onlineDb
                 fullEx = { ...onlineMatch, ...fullEx, instructions: onlineMatch.instructions, equipment: onlineMatch.equipment || fullEx?.equipment };
             }
         } catch (err) {}
     }

     let mergedEx = { ...(fullEx || {}), ...ex };
     if (fullEx) {
         if (!mergedEx.instructions || mergedEx.instructions.length === 0) mergedEx.instructions = fullEx.instructions;
         if (!mergedEx.ytVideo) mergedEx.ytVideo = fullEx.ytVideo;
         if (!mergedEx.gifUrl) mergedEx.gifUrl = fullEx.gifUrl;
         if (!mergedEx.equipment) mergedEx.equipment = fullEx.equipment;
     }

     setDetailExercise(mergedEx);
  };

  const handleSelectAlternative = (newEx) => {
     if (!detailExercise) return;
     const workoutId = detailExercise.workoutId;
     const originalExId = detailExercise.originalId;

     if (workoutId) {
       setHistory(prev => {
          const dayData = prev[selectedDate];
          if (!dayData) return prev;

          let wIdx = (dayData.workouts || []).findIndex(w => w.id === workoutId);
          let w;
          
          if (wIdx === -1) {
             const pWorkout = activeProgramsList.find(p => p.workoutId === workoutId);
             if (!pWorkout) return prev;
             wIdx = dayData.workouts ? dayData.workouts.length : 0;
             w = {
               id: workoutId,
               programId: pWorkout.id === 'adhoc' ? 'adhoc' : pWorkout.id,
               programName: pWorkout.name,
               status: 'planned',
               log: {}
             };
          } else {
             w = dayData.workouts[wIdx];
          }

          // Update secara immutable — jangan mutasi objek di dalam state React
          const replacement = { ...newEx, sets: detailExercise.sets || 3, reps: detailExercise.reps || 10, duration: detailExercise.duration || 10, id: newEx.id };
          let newW = w;

          if (w.programId === 'adhoc') {
             const exIdx = (w.exercises || []).findIndex(e => e.id === originalExId);
             if (exIdx > -1) {
                const newExercises = [...w.exercises];
                newExercises[exIdx] = replacement;
                newW = { ...w, exercises: newExercises };
             }
          } else {
             const p = programs.find(p => p.id === w.programId);
             if (p) {
                const overridden = w.overriddenExercises ? [...w.overriddenExercises] : JSON.parse(JSON.stringify(p.exercises));
                const exIdx = overridden.findIndex(e => e.id === originalExId);
                if (exIdx > -1) {
                   overridden[exIdx] = replacement;
                }
                newW = { ...w, overriddenExercises: overridden };
             }
          }

          if (newW === w) return prev;
          const newWorkouts = [...dayData.workouts];
          newWorkouts[wIdx] = newW;
          return { ...prev, [selectedDate]: { ...dayData, workouts: newWorkouts } };
       });
     }
     
     setShowAlternativeModal(false);
     setDetailExercise(null);
  };

  // Fungsi untuk memanggil log per set dari App.jsx
  const getSetLogs = (ex) => {
    // 1. Check live in-memory session logs first
    if (exerciseLogs[ex.id]) return exerciseLogs[ex.id];

    // 2. For completed workouts, fall back to the saved log in history
    if (ex.workoutId) {
      const dayData = history[selectedDate];
      if (dayData?.workouts) {
        const workoutEntry = dayData.workouts.find(w => w.id === ex.workoutId);
        if (workoutEntry?.log) {
          // Saved log can be keyed by composite ID or original ID
          const savedLog = workoutEntry.log[ex.id] || workoutEntry.log[ex.originalId];
          if (savedLog) return savedLog;
        }
      }
    }

    // 3. Default: empty template
    const libMatch = exerciseLibrary?.find(e => e.id === ex?.originalId || e.id === ex?.id || e.name?.toLowerCase() === ex?.name?.toLowerCase());
    const suggestedWeight = defaultSetWeight(libMatch, ex,
      gymStepFor(gymProfiles, activeGymId, ex?.equipment, units?.weight === 'lbs'));

    return Array.from({length: ex.sets || 3}).map(() => ({
        w: suggestedWeight,
        r: ex.reps || 10,
        d: ex.duration || 10,
        done: false,
        skipped: false
    }));
  };

    // Kelompok otot besar (compound lift: dada/punggung/paha) bisa toleransi lompatan
    // beban lebih besar; otot kecil/isolasi (lengan, bahu isolasi, betis, core) lebih
    // sensitif ke perubahan beban jadi lompatannya lebih halus — pola umum yang dipakai
    // banyak program strength training (linear progression compound vs isolasi).
    const LARGE_MUSCLE_GROUPS = new Set(['chest', 'upper-back', 'lower-back', 'quadriceps', 'hamstring', 'gluteal']);
    const getSuggestedIncrement = (exItem, lastWeight, isImp) => {
        const targets = Array.isArray(exItem?.target) ? exItem.target : [exItem?.target];
        const isLarge = targets.some(t => LARGE_MUSCLE_GROUPS.has(normalizeMuscleKey(t)));
        const flatStep = isImp ? (isLarge ? 5 : 2.5) : (isLarge ? 2.5 : 1.25);
        const roundTo = flatStep;
        const pctStep = lastWeight > 0 ? Math.round((lastWeight * 0.025) / roundTo) * roundTo : 0;
        return Math.max(flatStep, pctStep);
    };

    const historicalStatsRef = React.useRef({});
    
    React.useEffect(() => {
      historicalStatsRef.current = {};
    }, [history]);

    const getOverloadHint = (exItem) => {
      if (!exItem || !exerciseLibrary || exItem.type === 'time' || exItem.type === 'cardio' || exItem.target?.includes('Cardio')) return null;
      
      if (!historicalStatsRef.current[exItem.id]) {
        let historyMax10RM = 0;
        let lastSessionWeight = 0;
        let lastSessionReps = 0;
        let mostRecentDateMs = 0;
        
        Object.keys(history || {}).forEach(dateStr => {
          const day = history[dateStr];
          const dateMs = new Date(dateStr).getTime();
          
          if (day.workouts) {
            day.workouts.forEach(w => {
              const baseId = exItem.originalId || (typeof exItem.id === 'string' && exItem.id.includes('-') ? exItem.id.split('-')[0] : exItem.id);
              const targetLog = w.log && (w.log[`${baseId}-${w.id}`] || w.log[baseId] || w.log[exItem.id]);
  
              if (w.status === 'completed' && targetLog) {
                let bestWeightInSession = 0;
                let bestRepsAtWeight = 0;
                
                targetLog.forEach(s => {
                  if (!s.skipped && s.w > 0 && s.r > 0) {
                    const c10RM = estimate10RM(s.w, s.r);
                    if (c10RM > historyMax10RM) historyMax10RM = c10RM;

                    if (Number(s.w) > bestWeightInSession) {
                      bestWeightInSession = Number(s.w);
                      bestRepsAtWeight = Number(s.r);
                    } else if (Number(s.w) === bestWeightInSession && Number(s.r) > bestRepsAtWeight) {
                      bestRepsAtWeight = Number(s.r);
                    }
                  }
                });
                
                if (bestWeightInSession > 0 && dateMs > mostRecentDateMs) {
                  mostRecentDateMs = dateMs;
                  lastSessionWeight = bestWeightInSession;
                  lastSessionReps = bestRepsAtWeight;
                }
              }
            });
          }
        });
        
        historicalStatsRef.current[exItem.id] = { historyMax10RM, lastSessionWeight, lastSessionReps };
      }
      
      let { historyMax10RM, lastSessionWeight, lastSessionReps } = historicalStatsRef.current[exItem.id];


      // 2. Scan current session
      let currentMax10RM = 0;
      const currentLogs = exerciseLogs[exItem.id] || getSetLogs(exItem);
      currentLogs.forEach(s => {
        if (s.done && !s.skipped && s.w > 0 && s.r > 0) {
          const c10RM = estimate10RM(s.w, s.r);
          if (c10RM > currentMax10RM) currentMax10RM = c10RM;
        }
      });

      // rm10 dibaca dari PUSTAKA, bukan dari exItem. exItem adalah salinan beku yang dibuat saat
      // latihan ditambahkan ke program — dengan id UUID baru — dan tidak ada satu pun kode yang
      // pernah menulis rm10 ke sana. Jadi exItem.rm10 praktis selalu 0, dan 10RM yang disimpan
      // manual lewat ExerciseDetailModal tidak pernah sampai ke tombol otak biru.
      const libEx = exerciseLibrary?.find(e => e.id === exItem.originalId || e.id === exItem.id
        || e.name?.toLowerCase() === exItem.name?.toLowerCase());
      const stored10RM = Number(libEx?.rm10 ?? exItem.rm10) || 0;
      const base10RM = Math.max(historyMax10RM, stored10RM);
      
      const true10RM = Math.max(base10RM, currentMax10RM);
      const isNewRecord = currentMax10RM > base10RM && base10RM > 0;
      
      if (isNewRecord) {
        return {
          title: "REKOR BARU DIPECAHKAN!",
          text: `Mantap! Kamu baru saja buat rekor 10RM baru: ${currentMax10RM} ${units?.weight === 'lbs' ? 'lbs' : 'kg'}!\n\nLanjutkan kerja kerasnya!`,
          mode: 'praise',
          isNewRecord: true
        };
      }
      
      const hasLastSession = lastSessionWeight > 0;
      const isImp = units?.weight === 'lbs';
      const uStr = isImp ? 'lbs' : 'kg';

      if (hasLastSession) {
        const targetReps = exItem.reps || 10;
        const reachedTarget = lastSessionReps >= targetReps;
        const step = getSuggestedIncrement(exItem, lastSessionWeight, isImp);
        const microStep = Math.round((step / 2) * 100) / 100;

        let missionText = "";
        const goal = userProfile?.goal || 'muscle_gain';
        const exp = userProfile?.experience || 'beginner';
        
        if (goal === 'fat_loss') {
           missionText = `Beban sesi minggu lalu:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nJika sedang defisit kalori, jaga massa otot. Usahakan angkat beban yang sama, jangan paksakan naik jika tidak fit.`;
        } else if (goal === 'strength') {
           if (reachedTarget) {
             missionText = `Kekuatan optimal di sesi sebelumnya:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nTarget hari ini: NAIK BEBAN! Ayo, semangat!`;
           } else {
             missionText = `Beban sesi minggu lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps\n\nFokus pada kekuatan! Usahakan NAIK BEBAN hari ini, tidak apa jika reps sedikit turun.`;
           }
        } else if (goal === 'general') {
           if (reachedTarget) {
             missionText = `Stamina bagus di sesi sebelumnya:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nKamu boleh coba naikkan beban pelan-pelan (+${step} ${uStr}) kalau merasa sanggup.`;
           } else {
             missionText = `Beban sesi minggu lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps\n\nJika ini sudah nyaman, ulangi beban ini. Nikmati prosesnya!`;
           }
        } else {
           // muscle_gain / Default
           if (reachedTarget) {
             if (exp === 'beginner') {
               missionText = `Target reps sesi sebelumnya tercapai:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nSebagai pemula, ototmu gampang berkembang, sikat NAIK BEBAN (+${step} ${uStr}) hari ini!`;
             } else if (exp === 'advanced') {
               missionText = `Target reps sesi sebelumnya tercapai:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nCoba microload (+${microStep} ${uStr}) atau perbaiki tempo hari ini sebelum benar-benar lompat beban.`;
             } else {
               missionText = `Sesi sebelumnya kamu berhasil menembus target:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nSaatnya NAIK BEBAN (+${step} ${uStr}) hari ini, reps boleh turun sedikit.`;
             }
           } else {
             missionText = `Beban sesi minggu lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps (Target: ${targetReps} Reps)\n\nHari ini fokus TAMBAH REPETISI dengan beban yang sama, sampai tembus target!`;
           }
        }
        
        return {
          title: "TARGET HARI INI",
          text: `${missionText}\n\n10RM terakhir: ${true10RM} ${uStr}`,
          mode: 'push'
        };
      } else {
        return {
          title: "TARGET HARI INI",
          text: `Atur beban yang cukup menantang untuk diangkat 10 repetisi dengan form benar.\n\n10RM terakhir: ${true10RM > 0 ? true10RM + ' ' + uStr : '-'}`,
          mode: 'push'
        };
      }
    };

  React.useEffect(() => {
     if (!isWorkoutActive) return;
     const sessionExs = sessionExercises.length > 0 ? sessionExercises : Object.keys(exerciseLogs).map(id => exerciseLibrary.find(e => e.id === id)).filter(Boolean);
     
     sessionExs.forEach(ex => {
        if (!ex) return;
        const hint = getOverloadHint(ex);
        if (hint && hint.isNewRecord) {
           const cacheKey = `${selectedDate}_${ex.id}`;
           
           // Gunakan localStorage agar tidak me-reset saat aplikasi ditutup (force close)
           let notifiedIds = [];
           try {
             notifiedIds = JSON.parse(localStorage.getItem(`lyfit_notified_10rm_${selectedDate}`) || '[]');
           } catch(e) {}

           if (!notifiedIds.includes(cacheKey)) {
              notifiedIds.push(cacheKey);
              try {
                 localStorage.setItem(`lyfit_notified_10rm_${selectedDate}`, JSON.stringify(notifiedIds));
              } catch(e) {}
              
              const recordTitle = `REKOR 10RM BARU!`;
              let cleanDesc = hint.text;
              if (cleanDesc.includes('Mantap! Kamu baru saja buat rekor 10RM baru:')) {
                  cleanDesc = cleanDesc.replace('Mantap! Kamu baru saja buat rekor 10RM baru:', 'Rekor baru:');
              }
              
              window.dispatchEvent(new CustomEvent('show-achievement', {
                 detail: {
                    id: `10rm_${cacheKey}_${Date.now()}`,
                    title: recordTitle,
                    description: cleanDesc,
                    color: 'text-amber-500', 
                    bg: 'bg-amber-500/10', 
                    borderColor: 'border-amber-500/30',
                    imageUrl: '/badges/badge_volume.webp',
                 }
              }));
           }
        }
     });
  }, [exerciseLogs, sessionExercises, isWorkoutActive, selectedDate]);

  const handleStartWorkout = (progId) => {
    const doStart = () => {
      playSoundEffect('success', soundEnabled);
      setSessionToRun(progId);
      setIsImmersiveMode(true);
      setIsWorkoutActive(true);
      if (!workoutStartTime || sessionToRun !== progId) {
        let prevSecsToUse = resumeDurationSecs || 0;
        if (!prevSecsToUse) {
          // Coba cari durasi sebelumnya dari history hari ini (berjaga-jaga jika resumeDurationSecs ter-reset atau user buka tab manual)
          const todayData = history[selectedDate];
          if (todayData && todayData.workouts) {
             const wInHistory = todayData.workouts.find(w => w.programId === progId || w.id === progId || (progId === 'extra' && w.programId === 'adhoc'));
             if (wInHistory && wInHistory.duration) {
                if (typeof wInHistory.duration === 'number') prevSecsToUse = wInHistory.duration * 60;
                else if (typeof wInHistory.duration === 'string') {
                   const parts = wInHistory.duration.split(':').map(Number);
                   if (parts.length === 3) prevSecsToUse = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                   else if (parts.length === 2) prevSecsToUse = (parts[0] || 0) * 60 + (parts[1] || 0);
                }
             }
          }
        }

        if (prevSecsToUse > 0) {
          setWorkoutStartTime(Date.now() - (prevSecsToUse * 1000));
          if (setResumeDurationSecs) setResumeDurationSecs(0); // Reset after using
        } else {
          setWorkoutStartTime(Date.now());
        }
      }
    };

    if (isWorkoutActive && sessionToRun && sessionToRun !== progId) {
      if (setConfirmModal) {
        setConfirmModal({
          isOpen: true,
          title: 'Sesi Latihan Berjalan',
          message: 'Kamu sedang memiliki sesi latihan yang aktif berjalan. Apakah kamu ingin menyimpan sesi yang berjalan saat ini, atau langsung membuangnya dan memulai latihan yang baru?',
          onConfirm: async () => {
             if (sessionToRun && onSaveWorkout) {
               if (soundEnabled) {
                 const audio = new Audio('/cheer.wav');
                 audio.volume = 1.0;
                 audio.play().catch(() => {});
               }
               setCelebrationSession(sessionToRun);
               setShowCelebration(true);
               await onSaveWorkout(sessionToRun);
               setTimeout(() => {
                 setShowCelebration(false);
                 doStart();
               }, 2000);
             } else {
               setTimeout(doStart, 100);
             }
          },
          confirmText: 'Simpan Perubahan',
          onDiscard: () => {
             // Langsung buang tanpa memanggil onCancelWorkout yang men-trigger modal tambahan
             setIsImmersiveMode(false);
             setIsWorkoutActive(false);
             setWorkoutStartTime(null);
             if (setRestTargetTime) setRestTargetTime(null);

             setTimeout(doStart, 100);
          },
          discardText: 'Buang Perubahan'
        });
      } else {
        doStart();
      }
    } else {
      doStart();
    }
  };

  const handleAddProgramToToday = (p) => {
    playSoundEffect('click', soundEnabled); 
    setHistory(prev => {
      const h = { ...prev };
      const d = h[selectedDate] || { workouts: [] };
      h[selectedDate] = {
        ...d,
        workouts: [
          ...(d.workouts||[]),
          { 
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            programId: p.id, 
            programName: p.name, 
            status: 'planned', 
            log: {} 
          }
        ]
      };
      return h;
    });
    setShowProgramSelect(false);
  };

  const handleAddAdhocSession = () => {
     playSoundEffect('click', soundEnabled);
     // Langsung buka modal tambah latihan tanpa membuat sesi dummy dulu
     onAddExtraClick();
  };

  const isCompletelyEmpty = (activeProgramsList.length === 0 || activeProgramsList.every(p => !p.exercises || p.exercises.length === 0)) && extraExercises.length === 0;

  // Dipakai untuk kasih jarak ekstra di bawah supaya "Tambah Latihan Ekstra"/"Pendinginan"
  // tidak ketutup tombol floating "Mulai Sesi Latihan" saat sebuah sesi sedang diexpand.
  const hasExpandedSessionWithExercises = (() => {
    const activeExpandedId = Object.keys(expandedSessions || {}).find(k => (expandedSessions || {})[k]);
    if (!activeExpandedId) return false;
    if (activeExpandedId === 'extra') return extraExercises.length > 0;
    const sessionData = activeProgramsList.find(p => p.workoutId === activeExpandedId);
    return !!(sessionData?.exercises?.length > 0);
  })();
  const showsFloatingStartButton = hasExpandedSessionWithExercises && !isImmersiveMode && !isWorkoutActive;

  // Fungsi untuk mendapatkan background lokal (harus sinkron dengan ProgramTab)
  const getBackgroundForProgram = (prog) => {
    if (!prog) return '/bg-activity.webp';
    const lowerName = (prog.planName || prog.name || '').toLowerCase();
    
    if (lowerName.includes('full body')) return '/bg-full-body.webp';
    if (lowerName.includes('ppl basic')) return '/bg-ppl-basic.webp';
    if (lowerName.includes('up-low')) return '/bg-up-low.webp';
    if (lowerName.includes('bro split')) return '/bg-bro-split.webp';
    if (lowerName.includes('ppl advanced')) return '/bg-ppl-advanced.webp';
    if (lowerName.includes('beast mode')) return '/bg-beast-mode.webp';
    
    return '/bg-custom.webp';
  };

  // Tentukan program mana yang menjadi acuan background
  let bgSourceProgram = activeProgram;
  const activeExpandedId = Object.keys(expandedSessions || {}).find(k => (expandedSessions || {})[k]);
  
  if (activeExpandedId === 'extra') {
    bgSourceProgram = { planId: 'custom', name: 'Latihan Ekstra' };
  } else if (activeExpandedId) {
    const expandedProg = activeProgramsList.find(p => p.workoutId === activeExpandedId);
    if (expandedProg) bgSourceProgram = expandedProg;
  }

  const bgImageSrc = getBackgroundForProgram(bgSourceProgram);

  return (
    <>
      {/* BACKGROUND IMAGE UNTUK GLASSMORPHISM */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-all duration-700">
         <img 
            key={bgImageSrc}
            src={bgImageSrc} 
            className="w-full h-full object-cover opacity-80 dark:opacity-60 animate-in fade-in duration-700" 
            alt="Workout Background" 
         />
         <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/60 to-white/90 dark:from-black/60 dark:via-black/60 dark:to-black/90"></div>
      </div>
      
      {(isImmersiveMode || isClosingImmersive) && (
        <ImmersiveWorkout 
          isClosing={isClosingImmersive}
          t={t}
          units={units}
          programs={programs}
          activeProgramId={activeProgramId}
          activeProgramsList={sessionPrograms}
          extraExercises={sessionExtras}
          skippedExercises={skippedExercises}
          exerciseLogs={exerciseLogs}
          exerciseLibrary={exerciseLibrary}
          onSetChange={onSetChange}
          activeExerciseId={activeExerciseId}
          onToggleSet={(exId, setIdx, siblingIds) => {
            setActiveExerciseId(exId);
            onToggleSet(exId, setIdx, siblingIds);
          }}
          onSkipSet={(exId, setIdx) => {
            setActiveExerciseId(exId);
            onSkipSet(exId, setIdx);
          }}
          userProfile={userProfile}
          onClose={() => {
            playSoundEffect('click', soundEnabled);
            setIsClosingImmersive(true);
            setTimeout(() => {
              setIsClosingImmersive(false);
              setIsImmersiveMode(false);
            }, 300);
          }}
          onSaveWorkout={() => {
            setIsImmersiveMode(false);
            if (soundEnabled) {
              const audio = new Audio('/cheer.wav');
              audio.volume = 1.0;
              audio.play().catch(() => {});
            }
            setCelebrationSession(sessionToRun);
            setShowCelebration(true);
            setTimeout(() => {
              setShowCelebration(false);
              onSaveWorkout(sessionToRun);
            }, 2000);
          }}
          onCancelWorkout={() => {
            onCancelWorkout(sessionToRun);
          }}
          gymProfiles={gymProfiles}
          activeGymId={activeGymId}
          soundEnabled={soundEnabled}
          onOpenDetail={handleOpenDetail}
          workoutStartTime={workoutStartTime}
          restTargetTime={restTargetTime} 
          setRestTargetTime={setRestTargetTime}
          showSupersetToast={showSupersetToast}
          getOverloadHint={getOverloadHint}
        />
      )}

      {/* KONTEN UTAMA WORKOUT TAB */}
      <div className="relative z-10">
      {detailExercise && !showAlternativeModal && (
        <ExerciseDetailModal 
            ex={detailExercise} 
            onClose={() => setDetailExercise(null)} 
            t={t} lang={lang} soundEnabled={soundEnabled} 
            fullHistory={history}
            onReplace={(ex) => setShowAlternativeModal(true)}
            units={units}
            exerciseLibrary={exerciseLibrary}
            setExerciseLibrary={setExerciseLibrary}
            programs={programs}
          />
      )}

      <AlternativeExerciseModal
        isOpen={showAlternativeModal}
        onClose={() => { setShowAlternativeModal(false); setDetailExercise(null); }}
        originalEx={detailExercise}
        exerciseLibrary={exerciseLibrary}
        onSelectAlternative={handleSelectAlternative}
        t={t} lang={lang} soundEnabled={soundEnabled}
        gymProfiles={gymProfiles} activeGymId={activeGymId}
      />

      {/* `invisible`, BUKAN `hidden`. `hidden` itu display:none, sehingga tinggi dokumen runtuh
          jadi ~0 saat mode immersive terbuka dan browser menjepit scrollY ke 0 — begitu immersive
          ditutup, daftar muncul kembali di posisi paling atas dan user kehilangan tempatnya.
          `invisible` menyembunyikan daftar tapi mempertahankan tinggi, jadi posisi gulir kembali
          apa adanya tanpa perlu menyimpan/memulihkan apa pun. pointer-events-none supaya kartu di
          belakang overlay tidak bisa tersentuh. */}
      <div
        className={`space-y-4 animate-in fade-in ${isImmersiveMode ? 'invisible pointer-events-none' : ''}`}
        aria-hidden={isImmersiveMode || undefined}
        style={{ paddingBottom: showsFloatingStartButton ? 'calc(9.5rem + env(safe-area-inset-bottom, 20px))' : '2rem' }}
      >
        
        {isCompletelyEmpty ? (
          createPortal(
            <EmptyWorkoutState 
              t={t}
              showProgramSelect={showProgramSelect}
              setShowProgramSelect={setShowProgramSelect}
              playSoundEffect={playSoundEffect}
              soundEnabled={soundEnabled}
              setActiveTab={setActiveTab}
              handleAddAdhocSession={handleAddAdhocSession}
              programs={programs}
              handleAddProgramToToday={handleAddProgramToToday}
              activePlanIds={activePlanIds}
              tabSlideDir={tabSlideDir}
            />,
            document.body
          )
        ) : (
          <>
            <WorkoutHeader
              t={t} language={language}
              selectedDate={selectedDate}
              soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              warmupVideos={activeProgram?.warmupVideoUrls?.length > 0 ? activeProgram.warmupVideoUrls.join(' ') : warmupVideos}
              onOpenWarmup={() => setDetailExercise({ name: 'Pemanasan', ytVideo: activeProgram?.warmupVideoUrls?.length > 0 ? activeProgram.warmupVideoUrls.join(' ') : warmupVideos, type: 'warmup' })}
            />

            <div className="space-y-4 mt-4">
              {/* LATIHAN DARI PROGRAM ASLI */}
              {activeProgramsList.map((prog, pIdx) => {
                const isExpanded = !!(expandedSessions || {})[prog.workoutId];
                return (
                  <div id={`session-${prog.workoutId}`} key={prog.workoutId} className={`mb-6 rounded-[2rem] border ${prog.status === 'completed' ? 'border-emerald-500/30' : 'border-white/20 dark:border-white/10'} bg-white/60 dark:bg-black/50 backdrop-blur-xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.4)] overflow-hidden transition-all`}>
                    <div
                      className={`w-full p-5 sm:p-6 flex items-start justify-between font-black text-left transition-colors`}
                    >
                      <div
                        onClick={() => { playSoundEffect('click', soundEnabled); toggleSession(prog.workoutId); }}
                        className="flex flex-col items-start gap-0.5 flex-1 min-w-0 pr-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isProgramCompleted(prog) && <CheckCircle size={20} className={`${t.textAccent} shrink-0`} />}
                          <span className="text-xl sm:text-2xl uppercase tracking-widest break-words leading-tight flex-1">Sesi {pIdx + 1}: {prog.name}</span>
                        </div>
                        {prog.planName && (
                          <span className={`text-xs ${t.textMuted} font-medium`}>Program: {prog.planName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <div
                          onClick={() => { playSoundEffect('click', soundEnabled); toggleSession(prog.workoutId); }}
                          className="caption opacity-60 font-bold cursor-pointer flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </div>
                      </div>
                    </div>
                    
                    {/* no-swipe di bawah: pada lebar tablet daftar latihan ini men-scroll
                        horizontal, dan tanpa kelas itu gerakan yang sama juga dibaca App.jsx
                        sebagai perintah pindah tab (lihat handleGlobalTouchStart). */}
                    {isExpanded && (
                      <div className="no-swipe pb-4 sm:p-6 sm:pt-0 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-6 hide-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
                        {groupExercises(prog.exercises).map((group, gIdx) => {
                          return (
                          <div key={`${prog.id}-group-${gIdx}`} className={`sm:w-[340px] sm:shrink-0 sm:snap-center sm:bg-black/5 sm:dark:bg-white/5 sm:rounded-3xl sm:border sm:border-black/5 sm:dark:border-white/5 sm:overflow-hidden relative flex flex-col mb-4 sm:mb-0 last:mb-0 ${group.isSuperset ? 'pr-0' : ''}`}>
                            {group.isSuperset && <div className={`absolute top-0 bottom-0 right-0 w-[6px] rounded-l-md z-20 ${t.bgAccent}`}></div>}
                            {group.items.map(({ex, idx}) => (
                              <div id={`exercise-card-${ex.id}`} key={`${prog.id}-${ex.id}-${idx}`}>
                              <ExerciseCard 
                                ex={ex} idx={idx} isExtra={false}
                                t={t} lang={lang} soundEnabled={soundEnabled}
                                units={units}
                                isSkip={!!skippedExercises[ex.id]}
                                onToggleSkip={() => onToggleSkip(ex.id)}
                                onRemoveExtra={onRemoveExtra}
                                canDeleteCompleted={prog.status === 'completed'}
                                onRemoveProgramExercise={onRemoveProgramExercise}
                                onOpenVideo={() => handleOpenDetail(ex)}
                                onReplaceClick={() => { setDetailExercise(ex); setShowAlternativeModal(true); }}
                                sets={getSetLogs(ex)}
                                overloadHint={getOverloadHint(ex)}
                                onUpdateSet={(exId, setIdx, field, val) => {
                                  setSessionToRun(prog.workoutId);
                                  onSetChange(exId, setIdx, field, val);
                                }} 
                                onToggleSet={(exId, setIdx) => {
                                  setActiveExerciseId(exId);
                                  setSessionToRun(prog.workoutId);
                                  let siblingIds = null;
                                  if (ex.supersetId) {
                                    siblingIds = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  }
                                  onToggleSet(exId, setIdx, siblingIds);
                                  // Set terakhir selesai -> maju ke latihan berikutnya. Kartu program
                                  // dulu tidak melakukan ini sama sekali (cuma latihan ekstra yang
                                  // punya), jadi user harus mencari sendiri latihan selanjutnya.
                                  // scrollToFirstIncompleteExercise dengan ignoreExId sengaja TIDAK
                                  // punya fallback ke atas sesi — kalau ini latihan terakhir, layar
                                  // diam di tempat, tidak melompat ke atas.
                                  advanceIfExerciseFinished(prog.workoutId, exId, setIdx);
                                }}
                                onAddSet={(exId) => {
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddSet(siblings);
                                  } else {
                                    onAddSet(exId);
                                  }
                                }} 
                                onAddWarmupSets={(exId) => {
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddWarmupSets(siblings);
                                  } else {
                                    onAddWarmupSets(exId);
                                  }
                                }}
                                onRemoveSet={(exId, setIdx) => {
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onRemoveSet(siblings, setIdx);
                                  } else {
                                    onRemoveSet(exId, setIdx);
                                  }
                                }}
                                onReplaceExercise={() => { setDetailExercise(ex); setShowAlternativeModal(true); }}
                              />
                            </div>
                            ))}
                          </div>
                        );})}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LATIHAN TAMBAHAN (EKSTRA) */}
              {extraExercises.length > 0 && (
                <div className={`mb-6 rounded-[2rem] border border-dashed border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md overflow-hidden transition-all`}>
                  <button 
                    onClick={() => { playSoundEffect('click', soundEnabled); toggleSession('extra'); }}
                    className={`w-full p-5 sm:p-6 flex items-center justify-between font-black text-left transition-colors`}
                  >
                    <span className="text-xl sm:text-2xl uppercase tracking-widest">Ekstra</span>
                    <div className="flex items-center gap-1 text-sm opacity-60 font-bold bg-black/10 dark:bg-white/10 px-3 py-1.5 rounded-full"><span>{extraExercises.length} Latihan</span>{(expandedSessions || {})['extra'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                  </button>
                  
                  {(expandedSessions || {})['extra'] && (
                    <div className="no-swipe p-2 sm:p-6 pt-0 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-6 hide-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
                        {groupExercises(extraExercises).map((group, gIdx) => {
                          return (
                          <div key={`extra-group-${gIdx}`} className={`sm:w-[340px] sm:shrink-0 sm:snap-center sm:bg-black/5 sm:dark:bg-white/5 sm:rounded-3xl sm:border sm:border-black/5 sm:dark:border-white/5 sm:overflow-hidden relative flex flex-col mb-4 sm:mb-0 last:mb-0 ${group.isSuperset ? 'pr-3' : ''}`}>
                            {group.isSuperset && <div className={`absolute top-0 bottom-0 right-0 w-[6px] rounded-l-md z-20 ${t.bgAccent}`}></div>}
                            {group.items.map(({ex, idx}) => (
                            <div id={`exercise-card-${ex.id}`} key={`extra-${ex.id}-${idx}`}>
                              <ExerciseCard 
                                ex={ex} idx={activeProgram?.exercises?.length ? activeProgram.exercises.length + idx : idx} isExtra={true}
                                t={t} lang={lang} soundEnabled={soundEnabled}
                                units={units}
                                isSkip={!!skippedExercises[ex.id]} 
                                onToggleSkip={() => onToggleSkip(ex.id)} 
                                onRemoveExtra={onRemoveExtra} 
                                onOpenVideo={() => handleOpenDetail(ex)}
                                sets={getSetLogs(ex)}
                                onUpdateSet={(exId, setIdx, field, val) => {
                                  setSessionToRun('extra');
                                  onSetChange(exId, setIdx, field, val);
                                }} 
                                onToggleSet={(exId, setIdx) => {
                                  setActiveExerciseId(exId);
                                  setSessionToRun('extra');
                                  let siblingIds = null;
                                  if (ex.supersetId) {
                                    siblingIds = extraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  }
                                  onToggleSet(exId, setIdx, siblingIds);
                                  advanceIfExerciseFinished('extra', exId, setIdx);
                                }}
                              onAddSet={(exId) => {
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = extraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onAddSet(siblings);
                                } else {
                                  onAddSet(exId);
                                }
                              }} 
                              onAddWarmupSets={(exId) => {
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = extraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onAddWarmupSets(siblings);
                                } else {
                                  onAddWarmupSets(exId);
                                }
                              }}
                              onRemoveSet={(exId, setIdx) => {
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = extraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onRemoveSet(siblings, setIdx);
                                } else {
                                  onRemoveSet(exId, setIdx);
                                }
                              }}
                              onReplaceExercise={() => { setDetailExercise(ex); setShowAlternativeModal(true); }}
                              />
                            </div>
                          ))}
                        </div>
                      );})}
                    </div>
                  )}
                </div>
              )}

              {/* TOMBOL TAMBAH LATIHAN EKSTRA + PENDINGINAN (global, sejajar) */}
              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => { playSoundEffect('click', soundEnabled); onAddExtraClick(); }}
                  className={`flex-1 py-5 rounded-[2rem] border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} font-black hover:${t.bgAccentSoft} transition-colors flex items-center justify-center gap-2`}
                >
                  <Plus size={24} /> <span className="text-sm tracking-widest uppercase">{lang.addExtra || 'Tambah Latihan Ekstra'}</span>
                </button>
                {cooldownVideos && (
                  <button
                    onClick={() => { playSoundEffect('click', soundEnabled); setDetailExercise({ name: 'Pendinginan', ytVideo: cooldownVideos, type: 'cooldown' }); }}
                    className={`shrink-0 flex items-center justify-center w-16 h-16 rounded-[2rem] transition-all active:scale-95 ${t.btnBg} ${t.textMuted} hover:${t.textAccent}`}
                    title="Pendinginan"
                  >
                    <Wind size={24} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* FLOATING START WORKOUT BUTTON */}
      {(() => {
        const activeExpandedId = Object.keys(expandedSessions || {}).find(k => (expandedSessions || {})[k]);
        if (!activeExpandedId || isImmersiveMode || isWorkoutActive) return null;
        
        let sessionData = null;
        let isExtra = false;
        if (activeExpandedId === 'extra') {
           sessionData = { exercises: extraExercises, workoutId: 'extra' };
           isExtra = true;
        } else {
           sessionData = activeProgramsList.find(p => p.workoutId === activeExpandedId);
        }

        if (!sessionData) return null;

        const hasExercises = sessionData.exercises && sessionData.exercises.length > 0;
        if (!hasExercises) return null;
        
        const activeExercises = hasExercises ? sessionData.exercises.filter(ex => !skippedExercises[ex.id]) : [];
        const allSkipped = hasExercises && activeExercises.length === 0;

        let isAllSetsDone = false;
        if (hasExercises && !allSkipped) {
          isAllSetsDone = activeExercises.every(ex => {
            const logs = getSetLogs(ex);
            return logs.length > 0 && logs.every(s => s.done && !s.skipped);
          });
        }

        const isCompleted = isAllSetsDone;

        // Cek history hari ini
        const todayData = history[selectedDate];
        const wInHistory = todayData?.workouts?.find(w => w.programId === sessionData.workoutId || w.id === sessionData.workoutId || (sessionData.workoutId === 'extra' && w.programId === 'adhoc'));
        const hasHistoryDuration = wInHistory && wInHistory.duration;

        const isDisabled = !hasExercises || allSkipped;

        let btnText = isExtra ? "MULAI EKSTRA" : "MULAI LATIHAN";
        let btnIcon = <Play size={24} className="ml-1" />;
        let btnClass = `${t.bgAccent} shadow-[0_8px_30px_rgb(0,0,0,0.15)] disabled:opacity-50 text-white`;

        if (hasHistoryDuration || isCurrentlyCompleted) {
          btnText = "LANJUTKAN LATIHAN";
          btnIcon = <Play size={24} className="ml-1" />;
        } else if (isCompleted) {
          btnText = "SESI SELESAI";
          btnIcon = <CheckCircle size={24} />;
          btnClass = `${t.bgAccent} text-white shadow-lg opacity-80`;
        } else if (!hasExercises) {
          btnText = "SESI KOSONG";
          btnIcon = <X size={24} />;
          btnClass = "bg-zinc-800 text-white shadow-none";
        } else if (allSkipped) {
          btnText = "SEMUA DISKIP";
          btnIcon = <X size={24} />;
          btnClass = "bg-zinc-800 text-white shadow-none";
        }

        return (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,20px))] left-0 right-0 px-4 z-40 pointer-events-none flex justify-center animate-in slide-in-from-bottom-8 fade-in duration-300">
            <button 
              onClick={() => handleStartWorkout(sessionData.workoutId)}
              disabled={isDisabled}
              className={`pointer-events-auto w-full max-w-2xl mx-auto py-5 rounded-full text-xl font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 ${btnClass}`}
            >
              {btnIcon} {btnText}
            </button>
          </div>
        );
      })()}
      {dialog}
      {/* CELEBRATION MODAL */}
      {/* CELEBRATION MODAL */}
      {showCelebration && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.2)_0%,transparent_50%)] animate-spin-slow pointer-events-none"></div>
           <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 fade-in slide-in-from-bottom-10 duration-500">
             <div className={`w-32 h-32 rounded-full ${t.bgAccent} shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center justify-center mb-6`}>
                <Flame size={64} className="text-white animate-pulse" />
             </div>
             <h1 className="text-4xl font-black text-white tracking-widest text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] uppercase">Latihan Selesai!</h1>
             <p className="text-white/80 mt-2 font-bold text-lg">Kerja Bagus Hari Ini! 💪</p>
           </div>
        </div>,
        document.body
      )}
      
      {/* FOOTER PADDING */}
      <div className="h-24"></div>
      
      </div> {/* END OF KONTEN UTAMA WORKOUT TAB */}
    </>
  );
};

export default WorkoutTab;
