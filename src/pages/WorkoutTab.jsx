import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Snowflake, Play, CalendarDays, X, CheckCircle, ChevronDown, ChevronUp, Dumbbell, Share2, Flame, Brain, ShieldAlert, Activity, Zap } from 'lucide-react';
import { fetchExercisesFromApi } from '../utils/exerciseDbApi';
import { shareWorkoutToFeed } from '../utils/communityApi';
import { normalizeMuscleKey, resolveProjectedProgramId, getDayWorkouts, defaultMasterExercises, findMatchingMasterExercise, canonicalizeExercise } from '../data/constants';
import { estimate10RM, defaultSetWeight, gymStepFor, getEquipmentConfig, calculateActualWeight, calculateInputWeight, getSetActualWeight, rm10Series, buildExLookupByName, canonicalExId, calculateProgressiveOverloadTarget, resolveExerciseProgressiveTarget } from '../utils/workoutCalc';

// Import Komponen Pecahan
import WorkoutHeader from '../components/WorkoutHeader';
import ExerciseCard from '../components/ExerciseCard';
import ImmersiveWorkout from '../components/ImmersiveWorkout';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';
import EmptyWorkoutState from '../components/EmptyWorkoutState';
import WellnessCheckModal from '../components/WellnessCheckModal';
import { calculateReadiness, restingHrBaseline, readinessToWellness } from '../utils/readinessEngine';
import useDialog from '../hooks/useDialog';

const WorkoutTab = ({
  isActive = true,
  // Dikirim App.jsx tapi dulu tidak pernah di-destructure — padahal dipakai di
  // `if (setConfirmModal)` saat user memulai latihan lain sementara satu sesi masih jalan.
  // Identifier yang tidak dideklarasikan MELEMPAR ReferenceError, bukan bernilai undefined,
  // jadi penjaga itu justru yang menjatuhkan layarnya.
  setConfirmModal,
  t, theme, lang, language, programs,
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
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [pendingProgId, setPendingProgId] = useState(null);
  const isDark = theme === 'dark' || (t?.bgApp?.includes('dark') ?? true);
  const { dialog, showAlert } = useDialog(isDark);
  const isSwitchingSessionRef = React.useRef(false);

  const getLocalYMD = (d) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
  };

  const todayStr = getLocalYMD(new Date());

  const sourceWorkouts = useMemo(() => {
    let list = getDayWorkouts(history, programs, activePlanIds, selectedDate);

    // FORCE INJECT ACTIVE WORKOUT (If it's running but not found in sourceWorkouts, e.g. started from past date)
    if (isWorkoutActive && sessionToRun) {
      const isAlreadyInSource = list.some(w => w.id === sessionToRun || w.programId === sessionToRun);
      if (!isAlreadyInSource) {
        let progId = sessionToRun;
        if (sessionToRun.startsWith('projected_')) {
           progId = resolveProjectedProgramId(sessionToRun);
        }
        
        // Sesi Ekstra SENGAJA tidak disuntikkan ke sini. Dulu blok ini mendorong workout adhoc
        // tanpa exercises, jadi selama sesi ekstra berjalan tab Latihan menampilkan kartu
        // "Sesi N: Latihan Ekstra" yang kosong melompong tepat di atas kartu "Ekstra" yang berisi
        // latihannya — dua kartu untuk satu sesi. Extras punya kartunya sendiri di bawah, dan
        // sessionPrograms memang mengembalikan [] untuk sessionToRun === 'extra'.
        if (progId !== 'extra') {
           const prog = programs.find(p => p.id === progId);
           if (prog) {
             list.push({
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

    // Pengaman render: buang entri dengan id kembar
    const seenIds = new Set();
    return list.filter(w => {
       if (seenIds.has(w.id)) return false;
       seenIds.add(w.id);
       return true;
    });
  }, [history, programs, activePlanIds, selectedDate, isWorkoutActive, sessionToRun]);

  const activeProgramsList = useMemo(() => {
    return sourceWorkouts
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
  }, [sourceWorkouts, programs]);

  // Isi sesi yang lagi dijalankan. Dipakai ImmersiveWorkout, dan dilaporkan ke App supaya
  // FloatingTimer (pill saat di-minimize) menghitung kalori dari sesi yang SAMA — bukan dari
  // seluruh log hari itu. Satu turunan, satu angka.
  const sessionPrograms = useMemo(() => {
    return sessionToRun === 'extra' ? [] : activeProgramsList.filter(p => p.workoutId === sessionToRun || p.id === sessionToRun);
  }, [sessionToRun, activeProgramsList]);

  const activeProgramExIds = useMemo(() => {
    const set = new Set();
    activeProgramsList.forEach(p => {
      (p.exercises || []).forEach(e => {
        if (e.name) set.add(e.name.toLowerCase().trim());
        if (e.id) set.add(String(e.id).split('-')[0]);
        if (e.originalId) set.add(String(e.originalId).split('-')[0]);
      });
    });
    return set;
  }, [activeProgramsList]);

  const displayExtraExercises = useMemo(() => {
    return (extraExercises || []).filter(ex => {
      if (!ex) return false;
      const name = (ex.name || '').toLowerCase().trim();
      const baseId = String(ex.originalId || ex.id || '').split('-')[0];
      return !activeProgramExIds.has(name) && (!baseId || !activeProgramExIds.has(baseId));
    });
  }, [extraExercises, activeProgramExIds]);

  const sessionExtras = useMemo(() => {
    return sessionToRun === 'extra' ? displayExtraExercises : [];
  }, [sessionToRun, displayExtraExercises]);

  const sessionExercises = useMemo(() => {
    return [...sessionPrograms.flatMap(p => p.exercises || []), ...sessionExtras]
      .filter(ex => !skippedExercises[ex.id]);
  }, [sessionPrograms, sessionExtras, skippedExercises]);

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
    let list = wId === 'extra' ? displayExtraExercises : activeProgramsList.find(p => p.workoutId === wId || p.id === wId)?.exercises;
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
        scrollToFirstIncompleteExercise(targetWorkoutId, null, true);
      }, 50);
      setScrolledTargets(prev => ({ ...prev, [focusWorkoutId]: true }));
      hasAutoExpanded.current = true;
    } else if (activeProgramsList.length > 0 && Object.keys(expandedSessions || {}).length === 0 && !hasAutoExpanded.current) {
      const todayData = history[selectedDate];
      const firstUnfinishedProg = activeProgramsList.find(prog => {
        const activeExs = (prog.exercises || []).filter(ex => !skippedExercises[ex.id]);
        if (activeExs.length === 0) return false;
        const isDone = activeExs.every(ex => {
          const logs = getSetLogs(ex);
          return Array.isArray(logs) && logs.length > 0 && logs.every(s => s.done || s.skipped);
        });
        const wEntry = (todayData?.workouts || []).find(w => w.id === prog.workoutId);
        return !(isDone || (wEntry?.status === 'completed' && isDone));
      }) || activeProgramsList[0];

      setExpandedSessions({ [firstUnfinishedProg.workoutId]: true });
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

  const activeProgram = activeProgramsList[0] || programs[0];
  
  const handleOpenDetail = async (ex) => {
     playSoundEffect('click', soundEnabled);
     const canonical = canonicalizeExercise(ex);
     // Ambil data dari library lokal / master
     let fullEx = findMatchingMasterExercise(canonical, exerciseLibrary || defaultMasterExercises) || canonical;

     // Ambil instruksi & gif dari database lengkap jika belum ada
     if (!fullEx || !fullEx.instructions || fullEx.instructions.length === 0) {
         try {
             const onlineDb = await fetchExercisesFromApi();
             const onlineMatch = findMatchingMasterExercise(fullEx || canonical, onlineDb);
             if (onlineMatch) {
                 // Gabungkan dan utamakan instruksi/gif/equipment dari onlineDb
                 fullEx = { 
                     ...onlineMatch, 
                     ...fullEx, 
                     instructions: onlineMatch.instructions,
                     instructions_id: onlineMatch.instructions_id || onlineMatch.instructions,
                     instructions_en: onlineMatch.instructions_en || onlineMatch.instructions,
                     equipment: onlineMatch.equipment || fullEx?.equipment 
                 };
             }
         } catch (err) {}
     }

     let mergedEx = { ...(fullEx || {}), ...canonical };
     if (fullEx) {
         if (!mergedEx.instructions || mergedEx.instructions.length === 0) mergedEx.instructions = fullEx.instructions;
         if (!mergedEx.instructions_id || mergedEx.instructions_id.length === 0) mergedEx.instructions_id = fullEx.instructions_id || fullEx.instructions;
         if (!mergedEx.instructions_en || mergedEx.instructions_en.length === 0) mergedEx.instructions_en = fullEx.instructions_en || fullEx.instructions;
         if (fullEx.videoUrl !== undefined) mergedEx.videoUrl = fullEx.videoUrl;
         if (fullEx.ytVideo !== undefined) mergedEx.ytVideo = fullEx.ytVideo;
         if (fullEx.thumbnailUrl !== undefined) mergedEx.thumbnailUrl = fullEx.thumbnailUrl;
         if (fullEx.gifUrl !== undefined) mergedEx.gifUrl = fullEx.gifUrl;
         if (fullEx.equipment) mergedEx.equipment = fullEx.equipment;
     }

     setDetailExercise(mergedEx);
  };

  const handleSelectAlternative = (newEx) => {
     if (!detailExercise) return;
     const workoutId = detailExercise.workoutId;
     const originalExId = detailExercise.originalId || detailExercise.id;

     if (workoutId) {
       setHistory(prev => {
          const dayData = prev[selectedDate] || { workouts: [] };
          const currentWorkouts = Array.isArray(dayData.workouts) ? dayData.workouts : [];

          let wIdx = currentWorkouts.findIndex(w => w.id === workoutId);
          let w;
          
          if (wIdx === -1) {
             const pWorkout = activeProgramsList.find(p => p.workoutId === workoutId);
             if (!pWorkout) return prev;
             wIdx = currentWorkouts.length;
             w = {
               id: workoutId,
               programId: pWorkout.id === 'adhoc' ? 'adhoc' : pWorkout.id,
               programName: pWorkout.name,
               status: 'planned',
               log: {},
               exercises: pWorkout.exercises || []
             };
          } else {
             w = currentWorkouts[wIdx];
          }

          // Update secara immutable — jangan mutasi objek di dalam state React.
          //
          // supersetId WAJIB ikut. Tanpa itu latihan pengganti keluar dari supersetnya: siblingIds
          // dirakit dengan filter supersetId, jadi anggota yang diganti langsung memicu istirahat
          // di tengah ronde sementara sisa anggota mengira rondenya sudah selesai — dan
          // groupExercises (yang mengelompokkan berdasar kedekatan) memecah kartunya jadi dua.
          // Versi di ProgramTab.jsx sudah mempertahankannya sejak dulu.
          const replacement = {
            ...newEx,
            sets: detailExercise.sets || 3,
            reps: detailExercise.reps || 10,
            duration: detailExercise.duration || 10,
            id: newEx.id,
            ...(detailExercise.supersetId ? { supersetId: detailExercise.supersetId } : {})
          };
          let newW = w;

          const matchesTarget = (e) => {
            if (!e) return false;
            if (originalExId && (e.id === originalExId || String(e.id) === String(originalExId))) return true;
            if (detailExercise?.id && (e.id === detailExercise.id || String(e.id) === String(detailExercise.id))) return true;
            const eBase = String(e.id || '').split('-')[0];
            const origBase = String(originalExId || detailExercise?.id || '').split('-')[0];
            if (eBase && origBase && eBase === origBase) return true;
            return false;
          };

          if (w.programId === 'adhoc') {
             const exIdx = (w.exercises || []).findIndex(matchesTarget);
             if (exIdx > -1) {
                const newExercises = [...(w.exercises || [])];
                newExercises[exIdx] = replacement;
                newW = { ...w, exercises: newExercises };
             }
          } else {
             const resolvedProgId = resolveProjectedProgramId(w.programId);
             const p = programs.find(p => p.id === w.programId || p.id === resolvedProgId);
             const baseExercises = w.overriddenExercises 
               ? [...w.overriddenExercises] 
               : (p?.exercises ? JSON.parse(JSON.stringify(p.exercises)) : (w.exercises ? [...w.exercises] : []));
             const exIdx = baseExercises.findIndex(matchesTarget);
             if (exIdx > -1) {
                baseExercises[exIdx] = replacement;
             } else {
                baseExercises.push(replacement);
             }
             newW = { ...w, overriddenExercises: baseExercises };
          }

          if (newW === w) return prev;
          const newWorkouts = [...currentWorkouts];
          newWorkouts[wIdx] = newW;
          return { ...prev, [selectedDate]: { ...dayData, workouts: newWorkouts } };
       });
     }
     
     setShowAlternativeModal(false);
     setDetailExercise(null);
  };

  // Riwayat 10RM dicari lewat NAMA latihan, bukan id. Latihan yang sama punya id berbeda di
  // setiap program (dan UUID baru tiap kali ditambah/diganti), jadi pencocokan per-id hanya
  // menemukan sesi dari program yang sedang dibuka — sisanya tampil "10RM terakhir: -" padahal
  // riwayatnya ada. Modal detail sudah lama mencocokkan nama; ini menyamakannya.
  const rmLookup = React.useMemo(
    () => buildExLookupByName(history, exerciseLibrary, extraExercises, ...(programs || []).map(p => p.exercises)),
    [history, exerciseLibrary, extraExercises, programs]);

  // Fungsi untuk memanggil log per set dari App.jsx
  const getSetLogs = (ex) => {
    // 1. Check live in-memory session logs first
    if (exerciseLogs[ex.id]) return exerciseLogs[ex.id];
    const liveKey = Object.keys(exerciseLogs).find(k => 
      k === String(ex.id) || k.startsWith(`${ex.id}-`) || (ex.originalId && (k === String(ex.originalId) || k.startsWith(`${ex.originalId}-`)))
    );
    if (liveKey && exerciseLogs[liveKey]) return exerciseLogs[liveKey];

    // 2. For completed workouts, fall back to the saved log in history HANYA jika workoutId spesifik cocok
    const dayData = history[selectedDate];
    if (dayData && dayData.workouts && ex?.workoutId) {
      const targetWorkouts = dayData.workouts.filter(w => w.id === ex.workoutId);

      for (const workoutEntry of targetWorkouts) {
        if (workoutEntry && workoutEntry.log) {
          const candidateKeys = [
            ex?.id,
            ex?.originalId,
            ex?.workoutId ? `${ex.id}-${ex.workoutId}` : null,
            ex?.originalId && ex?.workoutId ? `${ex.originalId}-${ex.workoutId}` : null,
            workoutEntry.id ? `${ex.id}-${workoutEntry.id}` : null,
            ex?.originalId && workoutEntry.id ? `${ex.originalId}-${workoutEntry.id}` : null,
          ].filter(Boolean).map(String);

          for (const k of candidateKeys) {
            if (workoutEntry.log[k]) return workoutEntry.log[k];
          }

          const rawId = ex?.id;
          if (rawId) {
            const prefixMatch = Object.entries(workoutEntry.log).find(([k]) => 
              k === String(rawId) || k.startsWith(`${rawId}-`) || (ex?.originalId && (k === String(ex.originalId) || k.startsWith(`${ex.originalId}-`)))
            );
            if (prefixMatch) return prefixMatch[1];
          }
        }
      }
    }

    // 3. Default: empty template dari Single Source of Truth (SSOT Engine)
    const targetPlan = resolveExerciseProgressiveTarget({
      ex,
      history,
      exerciseLibrary,
      programs,
      extraExercises,
      gymProfiles,
      activeGymId,
      userProfile,
      isImperial: units?.weight === 'lbs',
      wellness: history?.[selectedDate]?.wellness,
      exLookup: rmLookup,
    });

    const suggestedWeight = targetPlan.inputWeight;
    const suggestedReps = targetPlan.targetReps;
    const eqConf = targetPlan.eqConf || getEquipmentConfig(gymProfiles, activeGymId, ex, userProfile);
    const total_w = targetPlan.totalWeight;

    return Array.from({length: ex.sets || 3}).map(() => ({
        w: suggestedWeight,
        input_w: suggestedWeight,
        base_w: eqConf.baseWeight,
        ratio: eqConf.ratio,
        total_w: total_w,
        r: suggestedReps,
        d: ex.duration || 10,
        done: false,
        skipped: false
    }));
  };

  const historicalStatsRef = React.useRef({});

  React.useEffect(() => {
    historicalStatsRef.current = {};
  }, [history]);

  const getOverloadHint = (exItem) => {
    if (!exItem || !exerciseLibrary || exItem.type === 'time' || exItem.type === 'cardio' || exItem.target?.includes('Cardio')) return null;

    const targetPlan = resolveExerciseProgressiveTarget({
      ex: exItem,
      history,
      exerciseLibrary,
      programs,
      extraExercises,
      gymProfiles,
      activeGymId,
      userProfile,
      isImperial: units?.weight === 'lbs',
      wellness: history?.[selectedDate]?.wellness,
      exLookup: rmLookup,
    });

    const { best10RM, last10RM, lastSessionWeight, lastSessionReps, eqConf: eqConfNow } = targetPlan;

    // 2. Scan current session — pakai beban AKTUAL. Abaikan set pemanasan (warmup)
    // agar tidak prematur memicu acuan 10RM pada beban ringan.
    let currentMax10RM = 0;
    let currentMaxWeight = 0;
    let currentMaxReps = 0;
    const currentLogs = getSetLogs(exItem) || exerciseLogs[exItem.id] || [];
    currentLogs.forEach(s => {
      if (s.done && !s.skipped && s.type !== 'warmup' && (Number(s.w) > 0 || Number(s.total_w) > 0) && s.r > 0) {
        const actW = getSetActualWeight(s, eqConfNow);
        const c10RM = estimate10RM(actW, s.r);
        if (c10RM > currentMax10RM) {
          currentMax10RM = c10RM;
          currentMaxWeight = actW;
          currentMaxReps = Number(s.r);
        }
      }
    });

    const record10RM = best10RM;
    const true10RM = targetPlan.true10RM;
    const isNewRecord = currentMax10RM > record10RM && record10RM > 0;
    const isFirstRecord = currentMax10RM > 0 && record10RM === 0;

    const isImp = units?.weight === 'lbs';
    const uStr = isImp ? 'lbs' : 'kg';

    const hasWeightDiff = Boolean(eqConfNow && (eqConfNow.baseWeight > 0 || (eqConfNow.ratio !== undefined && eqConfNow.ratio !== 1)));

    const inputLabel = eqConfNow?.isBodyweightPlus 
      ? 'Beban' 
      : (eqConfNow?.inputRule === 'pin' || (eqConfNow?.ratio !== 1 && (!eqConfNow?.baseWeight || eqConfNow?.baseWeight <= 0))
          ? 'Pin' 
          : 'Plat');

    const formatHeroTarget = (actWeight, reps) => {
      if (!actWeight || actWeight <= 0) return null;
      if (hasWeightDiff) {
        const inputW = calculateInputWeight(actWeight, eqConfNow);
        return `${inputLabel} ${inputW} ${uStr} × ${reps} reps`;
      }
      return `${actWeight} ${uStr} × ${reps} reps`;
    };

    const formatSubTotal = (actWeight) => {
      if (!hasWeightDiff || !actWeight || actWeight <= 0) return null;
      if (eqConfNow.baseWeight > 0) {
        const baseName = eqConfNow.isBodyweightPlus 
          ? 'BB' 
          : (eqConfNow.equipment?.includes('Sled') ? 'Sled' : 'Bar');
        return `Total Beban: ${actWeight} ${uStr} (${baseName} ${eqConfNow.baseWeight} ${uStr})`;
      } else if (eqConfNow.ratio !== 1) {
        return `Beban Efektif: ${actWeight} ${uStr} (Katrol ${eqConfNow.ratio}:1)`;
      }
      return `Total Beban: ${actWeight} ${uStr}`;
    };

    const formatRefWeight = (actWeight, reps = null) => {
      if (!actWeight || actWeight <= 0) return null;
      if (hasWeightDiff) {
        const inputW = calculateInputWeight(actWeight, eqConfNow);
        return reps ? `${inputLabel} ${inputW} ${uStr} × ${reps} reps` : `${inputLabel} ${inputW} ${uStr}`;
      }
      return reps ? `${actWeight} ${uStr} × ${reps} reps` : `${actWeight} ${uStr}`;
    };

    if (isNewRecord) {
      return {
        title: "Rekor Baru!",
        targetWeightNumber: hasWeightDiff ? calculateInputWeight(currentMaxWeight, eqConfNow) : currentMaxWeight,
        targetRepsNumber: currentMaxReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(currentMaxWeight, currentMaxReps),
        targetDetail: formatSubTotal(currentMaxWeight),
        lastSession: lastSessionWeight > 0 ? formatRefWeight(lastSessionWeight, lastSessionReps) : null,
        message: `Luar biasa! Kamu berhasil memecahkan rekor 10RM baru. Terus pertahankan progres luar biasa ini!`,
        rm10: `${currentMax10RM} ${uStr}`,
        rm10Number: currentMax10RM,
        rm10Detail: formatSubTotal(currentMax10RM),
        hasWeightDiff,
        mode: 'praise',
        isNewRecord: true,
        benchmark: formatHeroTarget(currentMaxWeight, currentMaxReps),
        benchmarkDetail: formatSubTotal(currentMaxWeight),
        text: `Mantap! Kamu baru saja buat rekor 10RM baru: ${currentMax10RM} ${uStr} (${currentMaxWeight} ${uStr} x ${currentMaxReps} Reps)!\n\nLanjutkan kerja kerasnya!`
      };
    }

    if (isFirstRecord) {
      const alreadyCelebrated = (typeof window !== 'undefined' && window.logymCelebrated10RM?.[exItem.id]) || 0;
      const isProgressRecord = alreadyCelebrated > 0 && currentMax10RM > alreadyCelebrated;
      const titleText = isProgressRecord ? "Rekor Baru!" : "10RM Pertama Tercatat";
      const messageText = isProgressRecord
        ? `Luar biasa! Kamu berhasil memecahkan rekor 10RM baru. Terus pertahankan progres luar biasa ini!`
        : `Keren! 10RM acuan pertamamu berhasil tercatat. Angka ini otomatis menjadi target acuan progresifmu untuk sesi latihan berikutnya.`;

      return {
        title: titleText,
        targetWeightNumber: hasWeightDiff ? calculateInputWeight(currentMaxWeight, eqConfNow) : currentMaxWeight,
        targetRepsNumber: currentMaxReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(currentMaxWeight, currentMaxReps),
        targetDetail: formatSubTotal(currentMaxWeight),
        lastSession: null,
        message: messageText,
        rm10: `${currentMax10RM} ${uStr}`,
        rm10Number: currentMax10RM,
        rm10Detail: formatSubTotal(currentMax10RM),
        hasWeightDiff,
        mode: 'praise',
        isNewRecord: true,
        benchmark: formatHeroTarget(currentMaxWeight, currentMaxReps),
        benchmarkDetail: formatSubTotal(currentMaxWeight),
        text: isProgressRecord
          ? `Mantap! Kamu baru saja buat rekor 10RM baru: ${currentMax10RM} ${uStr} (${currentMaxWeight} ${uStr} x ${currentMaxReps} Reps)!\n\nLanjutkan kerja kerasnya!`
          : `Keren! 10RM acuan pertamamu berhasil tercatat: ${currentMax10RM} ${uStr} (${currentMaxWeight} ${uStr} x ${currentMaxReps} Reps).\n\nAngka ini otomatis menjadi target acuan progresifmu untuk sesi latihan berikutnya!`
      };
    }

    const targetActualWeight = targetPlan.targetWeight;
    const targetInputWeight = targetPlan.inputWeight;
    const displayTargetReps = targetPlan.targetReps;

    if (targetPlan.isDeload && targetPlan.hasHistory) {
      return {
        title: "Mode Deload",
        targetWeightNumber: targetInputWeight,
        targetRepsNumber: displayTargetReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(targetActualWeight, displayTargetReps),
        targetDetail: formatSubTotal(targetActualWeight),
        lastSession: formatRefWeight(lastSessionWeight, lastSessionReps),
        message: targetPlan.message,
        rm10: true10RM > 0 ? `${true10RM} ${uStr}` : null,
        rm10Detail: formatSubTotal(true10RM),
        hasWeightDiff,
        mode: 'push',
        isDeload: true,
        benchmark: formatHeroTarget(targetActualWeight, displayTargetReps),
        benchmarkDetail: formatSubTotal(targetActualWeight),
        text: `Target beban dipangkas ~17.5% untuk pemulihan sendi & sistem saraf:\n(${targetActualWeight} ${uStr} x ${displayTargetReps} Reps)\n\nFokus pada kontrol gerakan dan tempo yang sempurna. Jangan memaksakan beban berat!`
      };
    }

    if (targetPlan.isDoms && targetPlan.hasHistory) {
      return {
        title: "Mode Pegal / Fokus Form",
        targetWeightNumber: targetInputWeight,
        targetRepsNumber: displayTargetReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(targetActualWeight, displayTargetReps),
        targetDetail: formatSubTotal(targetActualWeight),
        lastSession: formatRefWeight(lastSessionWeight, lastSessionReps),
        message: targetPlan.message,
        rm10: true10RM > 0 ? `${true10RM} ${uStr}` : null,
        rm10Detail: formatSubTotal(true10RM),
        hasWeightDiff,
        mode: 'push',
        benchmark: formatHeroTarget(targetActualWeight, displayTargetReps),
        benchmarkDetail: formatSubTotal(targetActualWeight),
        text: `Beban dipertahankan di sesi lalu (${targetActualWeight} ${uStr} x ${displayTargetReps} Reps).\n\nOtot sedang pegal/lelah, jangan memaksakan naik beban hari ini. Prioritaskan kontrol repetisi dan kesempurnaan form gerakan!`
      };
    }

    if (targetPlan.hasHistory) {
      return {
        title: targetPlan.title || "Target Hari Ini",
        targetWeightNumber: targetInputWeight,
        targetRepsNumber: displayTargetReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(targetActualWeight, displayTargetReps),
        targetDetail: formatSubTotal(targetActualWeight),
        lastSession: formatRefWeight(lastSessionWeight, lastSessionReps),
        message: targetPlan.message,
        rm10: true10RM > 0 ? `${true10RM} ${uStr}` : null,
        rm10Detail: formatSubTotal(true10RM),
        hasWeightDiff,
        mode: 'push',
        benchmark: formatHeroTarget(targetActualWeight, displayTargetReps),
        benchmarkDetail: formatSubTotal(targetActualWeight),
        text: `Target: ${targetActualWeight} ${uStr} x ${displayTargetReps} Reps (Sesi Lalu: ${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\n${targetPlan.message}\n\n10RM acuan: ${true10RM} ${uStr}`
      };
    } else if (currentMax10RM > 0) {
      return {
        title: "Target Hari Ini",
        targetWeightNumber: hasWeightDiff ? calculateInputWeight(currentMaxWeight, eqConfNow) : currentMaxWeight,
        targetRepsNumber: currentMaxReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(currentMaxWeight, currentMaxReps),
        targetDetail: formatSubTotal(currentMaxWeight),
        lastSession: null,
        message: `Fokus tuntaskan sisa set dengan form dan kontrol gerakan yang rapi!`,
        rm10: `${currentMax10RM} ${uStr}`,
        rm10Detail: formatSubTotal(currentMax10RM),
        hasWeightDiff,
        mode: 'push',
        benchmark: formatHeroTarget(currentMaxWeight, currentMaxReps),
        benchmarkDetail: formatSubTotal(currentMaxWeight),
        text: `Beban terbaik sesi ini:\n${currentMaxWeight} ${uStr} x ${currentMaxReps} Reps\n\n10RM acuan saat ini: ${currentMax10RM} ${uStr}.\nFokus tuntaskan sisa set dengan form dan kontrol yang rapi!`
      };
    } else {
      return {
        title: "Target Hari Ini",
        targetWeightNumber: targetInputWeight,
        targetRepsNumber: displayTargetReps,
        weightUnit: uStr,
        weightLabel: hasWeightDiff ? inputLabel : null,
        target: formatHeroTarget(targetActualWeight, displayTargetReps),
        targetDetail: formatSubTotal(targetActualWeight),
        lastSession: null,
        message: targetPlan.message,
        rm10: null,
        rm10Detail: null,
        hasWeightDiff,
        mode: 'push',
        benchmark: formatHeroTarget(targetActualWeight, displayTargetReps),
        benchmarkDetail: formatSubTotal(targetActualWeight),
        text: `Target: ${targetActualWeight} ${uStr} x ${displayTargetReps} Reps\n\n${targetPlan.message}`
      };
    }
  };

  // Rekor 10RM baru ditampilkan secara elegan lewat Coach Praise di kartu/immersive tanpa popup badge yang mengganggu.
  React.useEffect(() => {
     if (!isWorkoutActive) return;
  }, [exerciseLogs, sessionExercises, isWorkoutActive, selectedDate]);

  const handleStartWorkout = (progId) => {
    // Jika sesi ini sedang berjalan aktif, langsung lanjutkan tanpa tanya ulang
    if (isWorkoutActive && sessionToRun === progId) {
      proceedStartWorkout(progId);
      return;
    }

    // Setiap kali memulai sesi latihan baru (atau setelah batal/cancel),
    // selalu tanyakan kondisi tubuh agar intensitas latihan sesuai kondisi terkini
    setPendingProgId(progId);
    setShowWellnessModal(true);
  };

  const handleSelectWellness = (option) => {
    try { sessionStorage.setItem(`wellness_checked_${selectedDate}`, option); } catch (e) {}
    setShowWellnessModal(false);
    if (setHistory) {
      setHistory(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          wellness: option,
          isDeloadWeek: option === 'deload'
        }
      }));
    }
    const targetProg = pendingProgId;
    setPendingProgId(null);
    if (targetProg) {
      proceedStartWorkout(targetProg);
    }
  };

  const autoWellnessFromReadiness = useMemo(() => {
    const todayBio = history?.[selectedDate]?.bioData;
    if (!todayBio) return 'prima';
    const baseline = restingHrBaseline(history, selectedDate);
    const r = calculateReadiness(todayBio, baseline);
    return readinessToWellness(r);
  }, [history, selectedDate]);

  const currentWellness = history?.[selectedDate]?.wellness 
    || (history?.[selectedDate]?.isDeloadWeek ? 'deload' : autoWellnessFromReadiness);

  const wellnessConfig = useMemo(() => {
    const map = {
      prima: {
        label: 'Prima',
        icon: <Zap size={20} strokeWidth={2} className="text-emerald-400" />,
        btnStyle: 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 shadow-emerald-950/20'
      },
      doms: {
        label: 'Pegal',
        icon: <Activity size={20} strokeWidth={2} className="text-amber-400" />,
        btnStyle: 'bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25 text-amber-400 shadow-amber-950/20'
      },
      deload: {
        label: 'Nyeri (Deload)',
        icon: <ShieldAlert size={20} strokeWidth={2} className="text-rose-400" />,
        btnStyle: 'bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/25 text-rose-400 shadow-rose-950/20'
      }
    };
    return map[currentWellness] || map.prima;
  }, [currentWellness]);

  const requestSessionSwitch = (targetWorkoutId, onProceed) => {
    if (isSwitchingSessionRef.current) return true;
    if (isWorkoutActive && sessionToRun && sessionToRun !== targetWorkoutId) {
      const currentProg = activeProgramsList.find(p => p.workoutId === sessionToRun || p.id === sessionToRun);
      const currentSessionName = sessionToRun === 'extra' ? 'Sesi Ekstra' : (currentProg?.name ? `Sesi ${currentProg.name}` : 'sesi berjalan');
      const targetProg = activeProgramsList.find(p => p.workoutId === targetWorkoutId || p.id === targetWorkoutId);
      const targetSessionName = targetWorkoutId === 'extra' ? 'Sesi Ekstra' : (targetProg?.name ? `Sesi ${targetProg.name}` : 'sesi berikutnya');

      if (setConfirmModal) {
        setConfirmModal({
          isOpen: true,
          title: 'Pindah Sesi Latihan',
          message: `Kamu sedang memiliki ${currentSessionName} yang aktif berjalan. Selesaikan dan simpan ${currentSessionName} terlebih dahulu sebelum melanjutkan ke ${targetSessionName}?`,
          onConfirm: async () => {
            if (isSwitchingSessionRef.current) return;
            isSwitchingSessionRef.current = true;
            setConfirmModal(null);
            playSoundEffect('click', soundEnabled);
            try {
              if (sessionToRun && onSaveWorkout) {
                await onSaveWorkout(sessionToRun, { stayOnWorkoutTab: true, workoutId: sessionToRun });
              }
              setSessionToRun(targetWorkoutId);
              setFocusWorkoutId?.(targetWorkoutId);
              setIsWorkoutActive(true);
              setWorkoutStartTime(Date.now());
              if (typeof onProceed === 'function') onProceed();
            } finally {
              setTimeout(() => {
                isSwitchingSessionRef.current = false;
              }, 350);
            }
          },
          confirmText: 'Simpan & Lanjut',
          onDiscard: () => {
            if (isSwitchingSessionRef.current) return;
            isSwitchingSessionRef.current = true;
            setConfirmModal(null);
            playSoundEffect('click', soundEnabled);
            try {
              if (sessionToRun && onCancelWorkout) {
                onCancelWorkout(sessionToRun);
              }
              setIsImmersiveMode(false);
              setIsWorkoutActive(false);
              setWorkoutStartTime(null);
              if (setRestTargetTime) setRestTargetTime(null);

              setTimeout(() => {
                setSessionToRun(targetWorkoutId);
                setFocusWorkoutId?.(targetWorkoutId);
                setIsWorkoutActive(true);
                setWorkoutStartTime(Date.now());
                if (typeof onProceed === 'function') onProceed();
                setTimeout(() => {
                  isSwitchingSessionRef.current = false;
                }, 300);
              }, 50);
            } catch (err) {
              isSwitchingSessionRef.current = false;
            }
          },
          discardText: 'Buang Sesi Sebelumnya'
        });
      }
      return true;
    }
    return false;
  };

  const proceedStartWorkout = (progId) => {
    const doStart = () => {
      playSoundEffect('success', soundEnabled);
      setSessionToRun(progId);

      // Temukan latihan pertama yang belum selesai agar saat resume langsung ke latihan tersebut
      const currentProg = activeProgramsList.find(p => p.workoutId === progId || p.id === progId);
      const exList = progId === 'extra' ? displayExtraExercises : (currentProg?.exercises || []);
      const firstIncomplete = exList.find(ex => {
        if (skippedExercises[ex.id]) return false;
        const logs = getSetLogs(ex);
        return !logs || logs.length === 0 || logs.some(s => !s.done && !s.skipped);
      });
      if (firstIncomplete) {
        setActiveExerciseId(firstIncomplete.id);
      }

      setIsImmersiveMode(true);
      setIsWorkoutActive(true);
      if (!workoutStartTime || sessionToRun !== progId) {
        let prevSecsToUse = resumeDurationSecs || 0;
        if (!prevSecsToUse) {
          // Coba cari durasi sebelumnya dari history hari ini (berjaga-jaga jika resumeDurationSecs ter-reset atau user buka tab manual)
          const todayData = history[selectedDate];
          if (todayData && todayData.workouts) {
             const wInHistory = todayData.workouts.find(w => w.programId === progId || w.id === progId || (progId === 'extra' && w.programId === 'adhoc' && w.status !== 'completed'));
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

    if (requestSessionSwitch(progId, doStart)) {
      return;
    }
    doStart();
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

  const isCompletelyEmpty = (activeProgramsList.length === 0 || activeProgramsList.every(p => !p.exercises || p.exercises.length === 0)) && displayExtraExercises.length === 0;

  // Dipakai untuk kasih jarak ekstra di bawah supaya "Tambah Latihan Ekstra"/"Pendinginan"
  // tidak ketutup tombol floating "Mulai Sesi Latihan" saat sebuah sesi sedang diexpand.
  const hasExpandedSessionWithExercises = (() => {
    const activeExpandedId = Object.keys(expandedSessions || {}).find(k => (expandedSessions || {})[k]);
    if (!activeExpandedId) return false;
    if (activeExpandedId === 'extra') return displayExtraExercises.length > 0;
    const sessionData = activeProgramsList.find(p => p.workoutId === activeExpandedId);
    return !!(sessionData?.exercises?.length > 0);
  })();
  const showsFloatingStartButton = hasExpandedSessionWithExercises && !isImmersiveMode && !isWorkoutActive;

  return (
    <>
      
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
          onActiveExercise={setActiveExerciseId}
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
          getSetLogs={getSetLogs}
          history={history}
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
            onReplace={(ex) => { if (ex) setDetailExercise(ex); setShowAlternativeModal(true); }}
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
        history={history}
      />

      {/* `invisible`, BUKAN `hidden`. `hidden` itu display:none, sehingga tinggi dokumen runtuh
          jadi ~0 saat mode immersive terbuka dan browser menjepit scrollY ke 0 — begitu immersive
          ditutup, daftar muncul kembali di posisi paling atas dan user kehilangan tempatnya.
          `invisible` menyembunyikan daftar tapi mempertahankan tinggi, jadi posisi gulir kembali
          apa adanya tanpa perlu menyimpan/memulihkan apa pun. pointer-events-none supaya kartu di
          belakang overlay tidak bisa tersentuh. */}
      <div
        className={`space-y-4 ${isImmersiveMode ? 'invisible pointer-events-none' : ''}`}
        aria-hidden={isImmersiveMode || undefined}
        style={{ paddingBottom: showsFloatingStartButton ? 'calc(9.5rem + env(safe-area-inset-bottom, 20px))' : '2rem' }}
      >
        {isCompletelyEmpty ? (
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
          />
        ) : (
          <>
            <WorkoutHeader
              t={t} language={language}
              selectedDate={selectedDate}
              soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              warmupVideos={activeProgram?.warmupVideoUrls?.length > 0 ? activeProgram.warmupVideoUrls.join(' ') : warmupVideos}
              onOpenWarmup={() => setDetailExercise({ name: 'Pemanasan', ytVideo: activeProgram?.warmupVideoUrls?.length > 0 ? activeProgram.warmupVideoUrls.join(' ') : warmupVideos, type: 'warmup' })}
              wellnessConfig={wellnessConfig}
              onOpenWellness={() => setShowWellnessModal(true)}
            />

            <div className="space-y-4 mt-4">
                  {/* LATIHAN DARI PROGRAM ASLI */}
                  {activeProgramsList.map((prog, pIdx) => {
                    const isExpanded = !!(expandedSessions || {})[prog.workoutId];
                    return (
                      <div id={`session-${prog.workoutId}`} key={prog.workoutId} className={`mb-6 rounded-[2rem] border ${prog.status === 'completed' ? 'border-emerald-500/30' : 'border-black/5 dark:border-white/10'} bg-white dark:bg-[#0c1427]/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.4)] overflow-hidden transition-colors duration-150`}>
                        <div
                          className={`w-full p-5 sm:p-6 flex items-center justify-between font-black text-left transition-colors`}
                        >
                          <div
                            onClick={() => { playSoundEffect('click', soundEnabled); toggleSession(prog.workoutId); }}
                            className="flex flex-col items-start gap-0.5 flex-1 min-w-0 pr-4 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl sm:text-2xl uppercase tracking-widest break-words leading-tight flex-1">Sesi {pIdx + 1}: {prog.name}</span>
                            </div>
                            {prog.planName && (
                              <span className={`text-xs ${t.textMuted} font-medium`}>Program: {prog.planName}</span>
                            )}
                          </div>
                          
                          {/* Sisi Kanan: Chevron Toggle */}
                          <div
                            onClick={() => { playSoundEffect('click', soundEnabled); toggleSession(prog.workoutId); }}
                            className="caption opacity-60 hover:opacity-100 font-bold cursor-pointer flex items-center p-2 transition-opacity shrink-0"
                            title={isExpanded ? "Tutup Sesi" : "Buka Sesi"}
                          >
                            {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                          </div>
                        </div>
                    
                    {/* sm:no-swipe: pada lebar tablet daftar latihan men-scroll horizontal sehingga
                        swipe pindah tab dikunci khusus tablet. Di HP (tampilan vertikal), swipe kanan-kiri
                        tetap aktif untuk pindah tab. */}
                    {isExpanded && (
                      <div className="sm:no-swipe pb-4 sm:p-6 sm:pt-0 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-6 hide-scrollbar">
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
                                isWorkoutActive={isWorkoutActive}
                                onStartWorkout={() => handleStartWorkout(prog.workoutId || prog.id)}
                                onUpdateSet={(exId, setIdx, field, val) => {
                                  if (requestSessionSwitch(prog.workoutId, () => {
                                    onSetChange(exId, setIdx, field, val, ex);
                                  })) return;
                                  setSessionToRun(prog.workoutId);
                                  onSetChange(exId, setIdx, field, val, ex);
                                }} 
                                onToggleSet={(exId, setIdx) => {
                                  if (requestSessionSwitch(prog.workoutId, () => {
                                    setActiveExerciseId(exId);
                                    let siblingIds = null;
                                    if (ex.supersetId) {
                                      siblingIds = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    }
                                    onToggleSet(exId, setIdx, siblingIds, ex);
                                    advanceIfExerciseFinished(prog.workoutId, exId, setIdx);
                                  })) return;
                                  setActiveExerciseId(exId);
                                  setSessionToRun(prog.workoutId);
                                  let siblingIds = null;
                                  if (ex.supersetId) {
                                    siblingIds = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  }
                                  onToggleSet(exId, setIdx, siblingIds, ex);
                                  advanceIfExerciseFinished(prog.workoutId, exId, setIdx);
                                }}
                                onAddSet={(exId) => {
                                  if (requestSessionSwitch(prog.workoutId, () => {
                                    if (ex.supersetId) {
                                      const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                      onAddSet(siblings);
                                    } else {
                                      onAddSet(exId);
                                    }
                                  })) return;
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddSet(siblings);
                                  } else {
                                    onAddSet(exId);
                                  }
                                }} 
                                onAddWarmupSets={(exId) => {
                                  if (requestSessionSwitch(prog.workoutId, () => {
                                    if (ex.supersetId) {
                                      const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                      onAddWarmupSets(siblings);
                                    } else {
                                      onAddWarmupSets(exId);
                                    }
                                  })) return;
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddWarmupSets(siblings);
                                  } else {
                                    onAddWarmupSets(exId);
                                  }
                                }}
                                onRemoveSet={(exId, setIdx) => {
                                  if (requestSessionSwitch(prog.workoutId, () => {
                                    if (ex.supersetId) {
                                      const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                      onRemoveSet(siblings, setIdx);
                                    } else {
                                      onRemoveSet(exId, setIdx);
                                    }
                                  })) return;
                                  setSessionToRun(prog.workoutId);
                                  if (ex.supersetId) {
                                    const siblings = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onRemoveSet(siblings, setIdx);
                                  } else {
                                    onRemoveSet(exId, setIdx);
                                  }
                                }}
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
              {displayExtraExercises.length > 0 && (
                <div id="session-extra" className={`mb-6 rounded-[2rem] border border-black/5 dark:border-white/10 bg-white dark:bg-[#0c1427]/90 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.4)] overflow-hidden transition-colors duration-150`}>
                  <div 
                    className={`w-full p-5 sm:p-6 flex items-center justify-between font-black text-left transition-colors`}
                  >
                    <div 
                      onClick={() => { playSoundEffect('click', soundEnabled); toggleSession('extra'); }}
                      className="flex flex-col items-start gap-0.5 flex-1 min-w-0 pr-4 cursor-pointer"
                    >
                      <span className="text-xl sm:text-2xl uppercase tracking-widest break-words leading-tight">Sesi {activeProgramsList.length + 1}: Ekstra</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${t.textMuted} font-medium`}>{displayExtraExercises.length} latihan di luar program</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playSoundEffect('click', soundEnabled);
                            (displayExtraExercises || []).forEach(ex => onRemoveExtra(ex.id));
                          }}
                          className="text-xs text-rose-400 hover:text-rose-500 font-bold px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                          title="Bersihkan latihan ekstra"
                        >
                          Bersihkan
                        </button>
                      </div>
                    </div>

                    {/* Sisi Kanan: Chevron Toggle */}
                    <div 
                      onClick={() => { playSoundEffect('click', soundEnabled); toggleSession('extra'); }}
                      className="caption opacity-60 hover:opacity-100 font-bold cursor-pointer flex items-center p-2 transition-opacity shrink-0"
                      title={(expandedSessions || {})['extra'] ? "Tutup Sesi" : "Buka Sesi"}
                    >
                      {(expandedSessions || {})['extra'] ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </div>
                  </div>
                  
                  {(expandedSessions || {})['extra'] && (
                    <div className="sm:no-swipe p-2 sm:p-6 pt-0 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-6 hide-scrollbar">
                        {groupExercises(displayExtraExercises).map((group, gIdx) => {
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
                                isWorkoutActive={isWorkoutActive}
                                onStartWorkout={() => handleStartWorkout('extra')}
                                onUpdateSet={(exId, setIdx, field, val) => {
                                  if (requestSessionSwitch('extra', () => {
                                    onSetChange(exId, setIdx, field, val, ex);
                                  })) return;
                                  setSessionToRun('extra');
                                  onSetChange(exId, setIdx, field, val, ex);
                                }} 
                                onToggleSet={(exId, setIdx) => {
                                  if (requestSessionSwitch('extra', () => {
                                    setActiveExerciseId(exId);
                                    let siblingIds = null;
                                    if (ex.supersetId) {
                                      siblingIds = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    }
                                    onToggleSet(exId, setIdx, siblingIds, ex);
                                    advanceIfExerciseFinished('extra', exId, setIdx);
                                  })) return;
                                  setActiveExerciseId(exId);
                                  setSessionToRun('extra');
                                  let siblingIds = null;
                                  if (ex.supersetId) {
                                    siblingIds = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  }
                                  onToggleSet(exId, setIdx, siblingIds, ex);
                                  advanceIfExerciseFinished('extra', exId, setIdx);
                                }}
                              onAddSet={(exId) => {
                                if (requestSessionSwitch('extra', () => {
                                  if (ex.supersetId) {
                                    const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddSet(siblings);
                                  } else {
                                    onAddSet(exId);
                                  }
                                })) return;
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onAddSet(siblings);
                                } else {
                                  onAddSet(exId);
                                }
                              }} 
                              onAddWarmupSets={(exId) => {
                                if (requestSessionSwitch('extra', () => {
                                  if (ex.supersetId) {
                                    const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onAddWarmupSets(siblings);
                                  } else {
                                    onAddWarmupSets(exId);
                                  }
                                })) return;
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onAddWarmupSets(siblings);
                                } else {
                                  onAddWarmupSets(exId);
                                }
                              }}
                              onRemoveSet={(exId, setIdx) => {
                                if (requestSessionSwitch('extra', () => {
                                  if (ex.supersetId) {
                                    const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                    onRemoveSet(siblings, setIdx);
                                  } else {
                                    onRemoveSet(exId, setIdx);
                                  }
                                })) return;
                                setSessionToRun('extra');
                                if (ex.supersetId) {
                                  const siblings = displayExtraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  onRemoveSet(siblings, setIdx);
                                } else {
                                  onRemoveSet(exId, setIdx);
                                }
                              }}
                              onReplaceClick={() => { setDetailExercise(ex); setShowAlternativeModal(true); }}
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
                    <Snowflake size={24} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* FLOATING START / RESUME WORKOUT BUTTON */}
      {(() => {
        if (!isActive || isImmersiveMode || isWorkoutActive) return null;

        // 1. Kumpulkan seluruh sesi latihan hari ini (Program + Ekstra)
        const allSessionsList = [
          ...activeProgramsList.map(p => ({
            ...p,
            workoutId: p.workoutId,
            isExtra: false,
            exercises: p.exercises || []
          })),
          ...(displayExtraExercises.length > 0 ? [{
            workoutId: 'extra',
            name: 'Ekstra',
            isExtra: true,
            exercises: displayExtraExercises
          }] : [])
        ];

        if (allSessionsList.length === 0) return null;

        // 2. Evaluasi status tiap sesi
        const todayData = history[selectedDate];
        const evaluatedSessions = allSessionsList.map(session => {
          const exercises = session.exercises || [];
          const hasExercises = exercises.length > 0;
          const activeExercises = exercises.filter(ex => !skippedExercises[ex.id]);
          const allSkipped = hasExercises && activeExercises.length === 0;
          
          const wInHistory = (todayData?.workouts || []).find(w => 
            w.id === session.workoutId || 
            (session.workoutId === 'extra' && w.programId === 'adhoc' && w.status !== 'completed')
          );
          
          // Sesi dianggap selesai JIKA dan HANYA JIKA:
          // Seluruh set dari seluruh latihan yang tidak diskip di sesi ini sudah dicentang (done/skipped)
          const isAllSetsDone = hasExercises && !allSkipped && activeExercises.every(ex => {
            const logs = getSetLogs(ex);
            return Array.isArray(logs) && logs.length > 0 && logs.every(s => s.done || s.skipped);
          });
          
          const hasSomeSetsDone = hasExercises && activeExercises.some(ex => {
            const logs = getSetLogs(ex);
            return Array.isArray(logs) && logs.some(s => s.done || s.skipped);
          });

          const isFinished = hasExercises && (isAllSetsDone || (wInHistory?.status === 'completed' && isAllSetsDone));
          const hasHistoryDuration = !!(wInHistory && wInHistory.duration);

          return {
            ...session,
            hasExercises,
            allSkipped,
            isFinished,
            hasSomeSetsDone,
            hasHistoryDuration
          };
        });

        // 3. Tentukan sesi target yang akan dijalankan
        const activeExpandedId = Object.keys(expandedSessions || {}).find(k => (expandedSessions || {})[k]);
        const expandedSession = evaluatedSessions.find(s => s.workoutId === activeExpandedId);
        
        // Cari semua sesi yang BELUM selesai
        const unfinishedSessions = evaluatedSessions.filter(s => !s.isFinished && s.hasExercises && !s.allSkipped);

        // Jika sesi yang sedang dibuka belum selesai, utamakan itu. Jika sudah selesai, lanjutkan ke sesi pertama yang belum selesai!
        let targetSession = null;
        if (expandedSession && !expandedSession.isFinished && expandedSession.hasExercises && !expandedSession.allSkipped) {
          targetSession = expandedSession;
        } else if (unfinishedSessions.length > 0) {
          targetSession = unfinishedSessions[0];
        }

        const areAllSessionsFinished = evaluatedSessions.length > 0 && evaluatedSessions.every(s => s.isFinished || !s.hasExercises || s.allSkipped);

        if (areAllSessionsFinished) {
          return (
            <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom,20px))] left-0 right-0 px-4 z-40 pointer-events-none flex justify-center animate-in fade-in duration-200">
              <button 
                disabled={true}
                className={`pointer-events-auto w-full max-w-2xl mx-auto py-5 rounded-full text-xl font-black flex items-center justify-center gap-3 transition-all ${t.bgAccent} text-white shadow-lg opacity-85 cursor-default`}
              >
                <CheckCircle size={24} /> SESI SELESAI
              </button>
            </div>
          );
        }

        if (!targetSession) return null;

        const isResume = targetSession.hasSomeSetsDone || targetSession.hasHistoryDuration;
        const btnText = isResume ? "LANJUTKAN LATIHAN" : (targetSession.isExtra ? "MULAI EKSTRA" : "MULAI LATIHAN");
        const btnIcon = <Play size={24} className="ml-1" />;

        return (
          <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom,20px))] left-0 right-0 px-4 z-40 pointer-events-none flex justify-center animate-in fade-in duration-200">
            <button 
              onClick={() => {
                // Otomatis buka kartu latihan sesi target yang bersangkutan dan scroll ke kartu tersebut
                setExpandedSessions({ [targetSession.workoutId]: true });
                setTimeout(() => {
                  const targetEl = document.getElementById(targetSession.workoutId === 'extra' ? 'session-extra' : `session-${targetSession.workoutId}`);
                  if (targetEl && typeof smartScrollTo === 'function') {
                    smartScrollTo(targetEl, 80);
                  }
                }, 100);
                handleStartWorkout(targetSession.workoutId);
              }}
              className={`pointer-events-auto w-full max-w-2xl mx-auto py-5 rounded-full text-xl font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 ${t.bgAccent} shadow-[0_8px_30px_rgb(0,0,0,0.25)] text-white`}
            >
              {btnIcon} {btnText}
            </button>
          </div>
        );
      })()}
      {dialog}
      {/* CELEBRATION MODAL */}
      {/* CELEBRATION MODAL */}
      {isActive && showCelebration && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overscroll-contain touch-none no-swipe">
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
      
      {/* WELLNESS CHECK MODAL */}
      <WellnessCheckModal 
        isOpen={showWellnessModal} 
        currentWellness={history?.[selectedDate]?.wellness}
        onSelect={handleSelectWellness} 
        onClose={() => {
          setShowWellnessModal(false);
          setPendingProgId(null);
        }} 
        t={t} 
        soundEnabled={soundEnabled} 
      />
      
      {/* FOOTER PADDING */}
      <div className="h-24"></div>
      
      </div> {/* END OF KONTEN UTAMA WORKOUT TAB */}
    </>
  );
};

// Inactive tab is frozen completely to prevent background CPU/battery drain.
export default React.memo(WorkoutTab, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (!next.isActive) return true;
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (prev[k] !== next[k] && typeof next[k] !== 'function') return false;
  }
  return true;
});
