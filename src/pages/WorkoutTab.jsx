import React, { useState } from 'react';
import { Plus, Moon, Play, CalendarDays, X, CheckCircle, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { fetchExercisesFromApi } from '../utils/exerciseDbApi';

// Import Komponen Pecahan
import WorkoutHeader from '../components/WorkoutHeader';
import ExerciseCard from '../components/ExerciseCard';
import WorkoutFooter from '../components/WorkoutFooter';
import ImmersiveWorkout from '../components/ImmersiveWorkout';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';
import EmptyWorkoutState from '../components/EmptyWorkoutState';

const WorkoutTab = ({ 
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
  onToggleSkip, onRemoveExtra,
  isCurrentlyCompleted, onSaveWorkout, onCancelWorkout,
  onAddExtraClick, onAddExtraExercise,
  gymProfiles, activeGymId,
  
  // Global Timer Props
  isWorkoutActive, setIsWorkoutActive,
  workoutStartTime, setWorkoutStartTime,
  restTargetTime, setRestTargetTime,

  focusWorkoutId, setFocusWorkoutId,

  // Library
  isImmersiveMode, setIsImmersiveMode,
  restTimer, setRestTimer,
  sessionToRun, setSessionToRun,
  resumeDurationSecs, setResumeDurationSecs,
  unitSystem, userProfile, activePlanIds = [], showSupersetToast
}) => {
  
  const [detailExercise, setDetailExercise] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [showProgramSelect, setShowProgramSelect] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});

  const DAY_MAP = { 0: 'Min', 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab' };
  const getLocalYMD = (d) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
  };

  const todayStr = getLocalYMD(new Date());

  let sourceWorkouts = (history[selectedDate]?.workouts || []).filter(w => {
    const p = programs.find(prog => prog.id === w.programId);
    const wPlanId = (p ? p.planId : null) || 'custom';
    
    if (w.programId !== 'adhoc') {
        if (!activePlanIds.includes(wPlanId)) return false;
    }
    return true;
  });
  
  if (sourceWorkouts.length === 0) {
    if (selectedDate >= todayStr && activePlanIds.length > 0) {
      const planRoutines = programs.filter(p => activePlanIds.includes(p.planId || 'custom'));
      if (planRoutines.length > 0) {
        const dateObj = new Date(selectedDate);
        const dayName = DAY_MAP[dateObj.getDay()];
        
        const projectedRoutines = planRoutines.filter(r => r.assignedDays && r.assignedDays.includes(dayName));
        if (projectedRoutines.length > 0) {
          sourceWorkouts = projectedRoutines.map(pr => ({
            id: `projected_${pr.id}_${selectedDate}`,
            programId: pr.id,
            programName: pr.name,
            status: 'planned',
            isProjected: true,
            log: {}
          }));
        }
      }
    }
  }

  const activeProgramsList = sourceWorkouts
    .map(w => {
      if (w.programId === 'adhoc') {
         return { id: 'adhoc', name: w.programName || 'Sesi Ekstra', exercises: w.exercises || [], workoutId: w.id, status: w.status, log: w.log };
      }
      const p = programs.find(p => p.id === w.programId);
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

  const hasAutoExpanded = React.useRef(false);

  React.useEffect(() => {
    if (focusWorkoutId) {
      let targetWorkoutId = focusWorkoutId;
      if (focusWorkoutId !== 'extra') {
         const found = activeProgramsList.find(p => p.id === focusWorkoutId || p.workoutId === focusWorkoutId);
         if (found) targetWorkoutId = found.workoutId;
      }
      setExpandedSessions({ [targetWorkoutId]: true });
      setFocusWorkoutId(null);
    } else if (activeProgramsList.length > 0 && Object.keys(expandedSessions).length === 0 && !hasAutoExpanded.current) {
      setExpandedSessions({ [activeProgramsList[0].workoutId]: true });
      hasAutoExpanded.current = true;
    }
  }, [activeProgramsList, expandedSessions, focusWorkoutId, setFocusWorkoutId]);

  const toggleSession = (id) => {
    setExpandedSessions(prev => prev[id] ? {} : { [id]: true });
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
          const h = { ...prev };
          const dayData = h[selectedDate];
          if (!dayData) return h;
          
          const wIdx = dayData.workouts.findIndex(w => w.id === workoutId);
          if (wIdx > -1) {
             const w = dayData.workouts[wIdx];
             if (w.programId === 'adhoc') {
                const exIdx = w.exercises.findIndex(e => e.id === originalExId);
                if (exIdx > -1) {
                   w.exercises[exIdx] = { ...newEx, sets: detailExercise.sets || 3, reps: detailExercise.reps || 10, duration: detailExercise.duration || 10, id: newEx.id };
                }
             } else {
                const p = programs.find(p => p.id === w.programId);
                if (p) {
                   if (!w.overriddenExercises) {
                      w.overriddenExercises = JSON.parse(JSON.stringify(p.exercises));
                   }
                   const exIdx = w.overriddenExercises.findIndex(e => e.id === originalExId);
                   if (exIdx > -1) {
                      w.overriddenExercises[exIdx] = { ...newEx, sets: detailExercise.sets || 3, reps: detailExercise.reps || 10, duration: detailExercise.duration || 10, id: newEx.id };
                   }
                }
             }
          }
          return h;
       });
     }
     
     setShowAlternativeModal(false);
     setDetailExercise(null);
  };

  // Fungsi untuk memanggil log per set dari App.jsx
  const getSetLogs = (ex) => {
    if (exerciseLogs[ex.id]) return exerciseLogs[ex.id];
    return Array.from({length: ex.sets || 3}).map(() => ({
        w: ex.defaultWeight || 0,
        r: ex.reps || 10,
        d: ex.duration || 10,
        done: false,
        skipped: false
    }));
  };

    const getOverloadHint = (exItem) => {
      if (!exItem || !exerciseLibrary || exItem.type === 'time') return null;
      
      let historyMax10RM = 0;
      let lastSessionWeight = 0;
      let lastSessionReps = 0;
      let mostRecentDateMs = 0;
      
      // 1. Scan history
      Object.keys(history || {}).forEach(dateStr => {
        const day = history[dateStr];
        const dateMs = new Date(dateStr).getTime();
        
        if (day.workouts) {
          day.workouts.forEach(w => {
            const exLogKey = `${exItem.id}-${w.id}`;
            const targetLog = w.log && (w.log[exLogKey] || w.log[exItem.id]);

            if (w.status === 'completed' && targetLog) {
              let bestWeightInSession = 0;
              let bestRepsAtWeight = 0;
              
              targetLog.forEach(s => {
                if (!s.skipped && s.type !== 'warmup' && s.w > 0 && s.r > 0) {
                  const c1RM = Number(s.w) * (1 + Number(s.r) / 30);
                  const c10RM = c1RM / 1.3333;
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

      // 2. Scan current session
      let currentMax10RM = 0;
      const currentLogs = exerciseLogs[exItem.id] || getSetLogs(exItem) || [];
      currentLogs.forEach(s => {
        if (s.done && !s.skipped && s.type !== 'warmup' && s.w > 0 && s.r > 0) {
          const c1RM = Number(s.w) * (1 + Number(s.r) / 30);
          const c10RM = c1RM / 1.3333;
          if (c10RM > currentMax10RM) currentMax10RM = c10RM;
        }
      });
      
      historyMax10RM = Math.round(historyMax10RM * 10) / 10;
      currentMax10RM = Math.round(currentMax10RM * 10) / 10;
      
      const true10RM = Math.max(historyMax10RM, currentMax10RM);
      const isNewRecord = currentMax10RM > historyMax10RM && historyMax10RM > 0;
      
      if (isNewRecord) {
        return {
          title: "🏆 REKOR BARU DIPECAHKAN!",
          text: `Mantap! Kamu baru saja buat rekor 10RM baru: ${currentMax10RM} ${unitSystem === 'imperial' ? 'lbs' : 'kg'}!\n\nLanjutkan kerja kerasnya! 💪`
        };
      }
      
      const hasLastSession = lastSessionWeight > 0;
      const uStr = unitSystem === 'imperial' ? 'lbs' : 'kg';
      
      if (hasLastSession) {
        const targetReps = exItem.reps || 10;
        const reachedTarget = lastSessionReps >= targetReps;
        
        let missionText = "";
        const goal = userProfile?.goal || 'muscle_gain';
        const exp = userProfile?.experience || 'beginner';
        
        if (goal === 'fat_loss') {
           missionText = `Pertahankan beban sesi lalu:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nJika sedang defisit kalori, fokus jaga massa otot, tidak perlu memaksakan naik beban jika tidak fit.`;
        } else if (goal === 'strength') {
           if (reachedTarget) {
             missionText = `Kekuatan optimal sesi lalu:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nHari ini wajib NAIK BEBAN! Ayo, semangat! 💪`;
           } else {
             missionText = `Sesi lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps\n\nFokus pada kekuatan! Usahakan NAIK BEBAN sedikit, walaupun reps sedikit turun.`;
           }
        } else if (goal === 'general') {
           if (reachedTarget) {
             missionText = `Stamina bagus di sesi lalu:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nKamu boleh coba naikkan beban pelan-pelan (2,5 ${uStr}) kalau masih sanggup.`;
           } else {
             missionText = `Sesi lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps\n\nJika ini sudah nyaman, lanjutkan latihan dengan beban ini. Nikmati prosesnya, agar tubuh tetap bugar.`;
           }
        } else {
           // muscle_gain / Default
           if (reachedTarget) {
             if (exp === 'beginner') {
               missionText = `Target reps sesi lalu tercapai:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nDi fase Newbie Gains, ototmu sangat gampang berkembang, sikat NAIK BEBAN (2.5 ${uStr}) sekarang!`;
             } else if (exp === 'advanced') {
               missionText = `Target reps sesi lalu tercapai:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nCoba microload (+1.25 ${uStr}) atau perbaiki tempo sebelum benar-benar naik beban berat. Aman, tidak perlu tergesa-gesa!`;
             } else {
               missionText = `Kamu menembus target reps sesi lalu:\n(${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps)\n\nSaatnya NAIK BEBAN (2.5 ${uStr}) hari ini, reps boleh turun sedikit.`;
             }
           } else {
             missionText = `Sesi lalu:\n${lastSessionWeight} ${uStr} x ${lastSessionReps} Reps (Target: ${targetReps} Reps)\n\nHari ini fokus TAMBAH REPETISI, sampai menembus target! Beban masih tetap.`;
           }
        }
        
        return {
          title: "🎯 TARGET HARI INI",
          text: `${missionText}\n\n🏆 All-Time 10RM: ${true10RM} ${uStr}`,
          mode: reachedTarget ? 'praise' : 'push'
        };
      } else {
        return {
          title: "🎯 TARGET HARI INI",
          text: `Atur beban yang cukup menantang untuk diangkat 10 repetisi dengan form benar.\n\n🏆 All-Time 10RM: ${true10RM > 0 ? true10RM + ' ' + uStr : '-'}`,
          mode: 'neutral'
        };
      }
    };

  const handleStartWorkout = (progId) => {
    playSoundEffect('success', soundEnabled);
    setSessionToRun(progId);
    setIsImmersiveMode(true);
    setIsWorkoutActive(true);
    if (!workoutStartTime) {
      if (resumeDurationSecs && resumeDurationSecs > 0) {
        setWorkoutStartTime(Date.now() - (resumeDurationSecs * 1000));
        if (setResumeDurationSecs) setResumeDurationSecs(0); // Reset after using
      } else {
        setWorkoutStartTime(Date.now());
      }
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
     // Tambahkan sesi ad-hoc kosong ke history
     setHistory(prev => {
        const h = { ...prev };
        const d = h[selectedDate] || { workouts: [] };
        h[selectedDate] = {
          ...d,
          workouts: [
            ...(d.workouts||[]),
            { 
              id: `adhoc_${Date.now()}`,
              programId: 'adhoc', 
              programName: 'Sesi Bebas', 
              status: 'planned', 
              log: {} 
            }
          ]
        };
        return h;
     });
     // Langsung buka modal tambah latihan
     onAddExtraClick();
  };

  const isCompletelyEmpty = activeProgramsList.length === 0 || (activeProgramsList.every(p => !p.exercises || p.exercises.length === 0) && extraExercises.length === 0);

  return (
    <>
      {isImmersiveMode && (
        <ImmersiveWorkout 
          t={t}
          unitSystem={unitSystem}
          programs={programs}
          activeProgramId={activeProgramId}
          activeProgramsList={sessionToRun === 'extra' ? [] : activeProgramsList.filter(p => p.workoutId === sessionToRun || p.id === sessionToRun)}
          extraExercises={sessionToRun === 'extra' ? extraExercises : []}
          skippedExercises={skippedExercises}
          exerciseLogs={exerciseLogs}
          onSetChange={onSetChange}
          onToggleSet={onToggleSet}
          onSkipSet={onSkipSet}
          onClose={() => setIsImmersiveMode(false)}
          onSaveWorkout={() => {
            setIsImmersiveMode(false);
            onSaveWorkout(sessionToRun);
          }}
          onCancelWorkout={() => {
            onCancelWorkout(sessionToRun);
          }}
          gymProfiles={gymProfiles}
          activeGymId={activeGymId}
          soundEnabled={soundEnabled}
          onOpenDetail={handleOpenDetail}
          workoutStartTime={workoutStartTime}
          restTimer={restTimer}
          setRestTimer={setRestTimer}
          setRestTargetTime={setRestTargetTime}
          showSupersetToast={showSupersetToast}
          exerciseLibrary={exerciseLibrary}
          getOverloadHint={getOverloadHint}
        />
      )}

      {detailExercise && !showAlternativeModal && (
        <ExerciseDetailModal 
            ex={detailExercise} 
            onClose={() => setDetailExercise(null)} 
            t={t} lang={lang} soundEnabled={soundEnabled} 
            fullHistory={history}
            onReplace={(ex) => setShowAlternativeModal(true)}
            unitSystem={unitSystem}
            exerciseLibrary={exerciseLibrary}
            setExerciseLibrary={setExerciseLibrary}
            programs={programs}
          />
      )}

      <AlternativeExerciseModal
        isOpen={showAlternativeModal}
        onClose={() => setShowAlternativeModal(false)}
        originalEx={detailExercise}
        exerciseLibrary={exerciseLibrary}
        onSelectAlternative={handleSelectAlternative}
        t={t} lang={lang} soundEnabled={soundEnabled}
        gymProfiles={gymProfiles} activeGymId={activeGymId}
      />

      <div className={`space-y-4 animate-in fade-in pb-8 ${isImmersiveMode ? 'hidden' : ''}`}>
        
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
          />
        ) : (
          <>
            <WorkoutHeader 
              t={t} lang={lang} language={language}
              selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              warmupVideos={warmupVideos} onOpenVideo={(url) => setDetailExercise({ name: 'Pemanasan', ytVideo: url, type: 'warmup' })}
              activeProgram={activeProgram}
            />

            <div className="space-y-4 mt-4">
              {/* LATIHAN DARI PROGRAM ASLI */}
              {activeProgramsList.map((prog, pIdx) => {
                const isExpanded = !!expandedSessions[prog.workoutId];
                return (
                  <div key={prog.workoutId} className={`mb-4 rounded-2xl border ${prog.status === 'completed' ? 'border-emerald-500/30' : t.border} bg-black/5 dark:bg-white/5 overflow-hidden transition-all`}>
                    <button 
                      onClick={() => { playSoundEffect('click', soundEnabled); toggleSession(prog.workoutId); }}
                      className={`w-full p-4 flex items-start justify-between font-black text-left ${isExpanded ? t.bgAccentSoft + ' ' + t.textAccent : ''} transition-colors`}
                    >
                      <div className="flex flex-col items-start gap-1 flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          {isProgramCompleted(prog) && <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                          <span className="body-lg uppercase tracking-widest break-words leading-tight">Sesi {pIdx + 1}: {prog.name}</span>
                        </div>
                        {prog.planName && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 opacity-70`}>{prog.planName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 caption opacity-60 font-bold shrink-0 mt-0.5"><span>{prog.exercises?.length || 0} Latihan</span>{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-4 sm:pb-6 hide-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
                        {groupExercises(prog.exercises).map((group, gIdx) => {
                          return (
                          <div key={`${prog.id}-group-${gIdx}`} className={`sm:w-[340px] sm:shrink-0 sm:snap-center sm:bg-black/5 sm:dark:bg-white/5 sm:rounded-3xl sm:border sm:border-black/5 sm:dark:border-white/5 sm:overflow-hidden relative flex flex-col mb-4 sm:mb-0 last:mb-0 ${group.isSuperset ? 'pr-3' : ''}`}>
                            {group.isSuperset && <div className={`absolute top-0 bottom-0 right-0 w-[6px] rounded-l-md z-20 ${t.bgAccent}`}></div>}
                            {group.items.map(({ex, idx}) => (
                              <ExerciseCard 
                                key={`${prog.id}-${ex.id}-${idx}`}
                                ex={ex} idx={idx} isExtra={false}
                                t={t} lang={lang} soundEnabled={soundEnabled}
                                unitSystem={unitSystem}
                                isSkip={!!skippedExercises[ex.id]} 
                                onToggleSkip={() => onToggleSkip(ex.id)} 
                                onRemoveExtra={onRemoveExtra} 
                                onOpenVideo={() => handleOpenDetail(ex)}
                                onReplaceClick={() => { setDetailExercise(ex); setShowAlternativeModal(true); }}
                                sets={getSetLogs(ex)}
                                overloadHint={getOverloadHint(ex)}
                                onUpdateSet={(exId, setIdx, field, val) => {
                                  setSessionToRun(prog.workoutId);
                                  onSetChange(exId, setIdx, field, val);
                                }} 
                                onToggleSet={(exId, setIdx) => {
                                  setSessionToRun(prog.workoutId);
                                  let siblingIds = null;
                                  if (ex.supersetId) {
                                    siblingIds = prog.exercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                  }
                                  onToggleSet(exId, setIdx, siblingIds);
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
                <div className={`mb-4 rounded-2xl border ${t.border} border-dashed bg-black/5 dark:bg-white/5 overflow-hidden transition-all`}>
                  <button 
                    onClick={() => { playSoundEffect('click', soundEnabled); toggleSession('extra'); }}
                    className={`w-full p-4 flex items-center justify-between font-black text-left ${expandedSessions['extra'] ? t.bgAccentSoft + ' ' + t.textAccent : ''} transition-colors`}
                  >
                    <span className="body-lg uppercase tracking-widest">Sesi Ekstra</span>
                    <div className="flex items-center gap-1 caption opacity-60 font-bold"><span>{extraExercises.length} Latihan</span>{expandedSessions['extra'] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                  </button>
                  
                  {expandedSessions['extra'] && (
                    <div className="p-4 space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:overflow-x-auto sm:snap-x sm:gap-4 sm:pb-6 hide-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
                        {groupExercises(extraExercises).map((group, gIdx) => {
                          return (
                          <div key={`extra-group-${gIdx}`} className={`sm:w-[340px] sm:shrink-0 sm:snap-center sm:bg-black/5 sm:dark:bg-white/5 sm:rounded-3xl sm:border sm:border-black/5 sm:dark:border-white/5 sm:overflow-hidden relative flex flex-col mb-4 sm:mb-0 last:mb-0 ${group.isSuperset ? 'pr-3' : ''}`}>
                            {group.isSuperset && <div className={`absolute top-0 bottom-0 right-0 w-[6px] rounded-l-md z-20 ${t.bgAccent}`}></div>}
                            {group.items.map(({ex, idx}) => (
                            <ExerciseCard 
                              key={ex.id}
                              ex={ex} idx={activeProgram.exercises?.length + idx || idx} isExtra={true}
                              t={t} lang={lang} soundEnabled={soundEnabled}
                              unitSystem={unitSystem}
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
                                setSessionToRun('extra');
                                let siblingIds = null;
                                if (ex.supersetId) {
                                  siblingIds = extraExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
                                }
                                onToggleSet(exId, setIdx, siblingIds);
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
                          ))}
                        </div>
                      );})}
                    </div>
                  )}
                </div>
              )}

              {/* TOMBOL TAMBAH LATIHAN EKSTRA */}
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); onAddExtraClick(); }}
                className={`w-full py-4 rounded-2xl border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} font-black hover:${t.bgAccentSoft} transition-colors flex items-center justify-center gap-2`}
              >
                <Plus size={20} /> {lang.addExtra || 'Tambah Latihan Ekstra'}
              </button>
            </div>

            <WorkoutFooter 
              t={t} lang={lang} soundEnabled={soundEnabled} playSoundEffect={playSoundEffect}
              cooldownVideos={cooldownVideos} onOpenVideo={(url) => setDetailExercise({ name: 'Pendinginan', ytVideo: url, type: 'cooldown' })}
              isCurrentlyCompleted={isCurrentlyCompleted} onSaveWorkout={onSaveWorkout}
            />
          </>
        )}
      </div>

      {/* FLOATING START WORKOUT BUTTON */}
      {(() => {
        const activeExpandedId = Object.keys(expandedSessions).find(k => expandedSessions[k]);
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
        const isDisabled = !hasExercises || allSkipped || isCompleted;

        let btnText = isExtra ? "MULAI SESI EKSTRA" : "MULAI SESI LATIHAN";
        let btnIcon = <Play size={20} />;
        let btnClass = t.bgAccent + " shadow-xl shadow-[color:var(--tw-shadow-color)] disabled:opacity-50 text-white border border-white/20";

        if (isCompleted) {
          btnText = "SESI SELESAI";
          btnIcon = <CheckCircle size={20} />;
          btnClass = "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20";
        } else if (!hasExercises) {
          btnText = "SESI KOSONG";
          btnIcon = <X size={20} />;
          btnClass = "bg-zinc-800 text-white shadow-none";
        } else if (allSkipped) {
          btnText = "SEMUA DISKIP";
          btnIcon = <X size={20} />;
          btnClass = "bg-zinc-800 text-white shadow-none";
        }

        return (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-40 pointer-events-none flex justify-center animate-in slide-in-from-bottom-8 fade-in duration-300">
            <button 
              onClick={() => handleStartWorkout(sessionData.workoutId)}
              disabled={isDisabled}
              className={`pointer-events-auto w-full max-w-2xl mx-auto py-4 rounded-2xl h2 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 ${btnClass}`}
              style={{ shadowColor: 'rgba(0,0,0,0.3)' }}
            >
              {btnIcon} {btnText}
            </button>
          </div>
        );
      })()}
    </>
  );
};

export default WorkoutTab;