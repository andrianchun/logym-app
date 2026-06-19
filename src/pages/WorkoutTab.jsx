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
  exerciseLogs, skippedExercises, extraExercises,
  onSetChange, onToggleSet, onAddSet, onRemoveSet,
  onToggleSkip, onRemoveExtra,
  isCurrentlyCompleted, onSaveWorkout, onCancelWorkout,
  onAddExtraClick, onAddExtraExercise,
  
  // Global Timer Props
  isWorkoutActive, setIsWorkoutActive,
  workoutStartTime, setWorkoutStartTime,
  restTargetTime, setRestTargetTime,

  focusWorkoutId, setFocusWorkoutId,

  // Library
  exerciseLibrary,
  isImmersiveMode, setIsImmersiveMode,
  restTimer, setRestTimer,
  sessionToRun, setSessionToRun,
  resumeDurationSecs, setResumeDurationSecs
}) => {
  
  const [detailExercise, setDetailExercise] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [showProgramSelect, setShowProgramSelect] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});

  const dayData = history ? history[selectedDate] : null;
  const activeProgramsList = (dayData?.workouts || [])
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
          exercises: p.exercises ? p.exercises.map(ex => ({
              ...ex,
              originalId: ex.id,
              id: `${ex.id}-${w.id}`
          })) : []
      } : null;
    })
    .filter(Boolean);

  const hasAutoExpanded = React.useRef(false);

  React.useEffect(() => {
    if (focusWorkoutId) {
      setExpandedSessions({ [focusWorkoutId]: true });
      setFocusWorkoutId(null);
    } else if (activeProgramsList.length > 0 && Object.keys(expandedSessions).length === 0 && !hasAutoExpanded.current) {
      setExpandedSessions({ [activeProgramsList[0].workoutId]: true });
      hasAutoExpanded.current = true;
    }
  }, [activeProgramsList, expandedSessions, focusWorkoutId, setFocusWorkoutId]);

  const toggleSession = (id) => {
    setExpandedSessions(prev => prev[id] ? {} : { [id]: true });
  };

  const isProgramCompleted = (prog) => {
    const hasExercises = prog.exercises && prog.exercises.length > 0;
    const activeExs = hasExercises ? prog.exercises.filter(ex => !skippedExercises[ex.id]) : [];
    if (!hasExercises || activeExs.length === 0) return false;
    return activeExs.every(ex => {
       const logs = getSetLogs(ex);
       return logs.length > 0 && logs.every(s => s.done);
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

     setDetailExercise({ ...(fullEx || {}), ...ex });
  };

  const handleSelectAlternative = (newEx) => {
     // Tambahkan sebagai extra exercise
     const adhocEx = { ...newEx, id: `${newEx.id}-${Date.now()}`, sets: detailExercise?.sets || 3, reps: detailExercise?.reps || 10, duration: detailExercise?.duration || 10 };
     onAddExtraExercise(adhocEx);
     
     // Logika penggantian: skip yang lama (detailExercise)
     if (detailExercise?.id) {
       onToggleSkip(detailExercise.id);
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
        done: false
    }));
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
          programs={programs}
          activeProgramId={activeProgramId}
          activeProgramsList={sessionToRun === 'extra' ? [] : activeProgramsList.filter(p => p.workoutId === sessionToRun || p.id === sessionToRun)}
          extraExercises={sessionToRun === 'extra' ? extraExercises : []}
          skippedExercises={skippedExercises}
          exerciseLogs={exerciseLogs}
          onSetChange={onSetChange}
          onToggleSet={onToggleSet}
          onClose={() => setIsImmersiveMode(false)}
          onSaveWorkout={() => {
            setIsImmersiveMode(false);
            onSaveWorkout(sessionToRun);
          }}
          onCancelWorkout={() => {
            onCancelWorkout(sessionToRun);
          }}
          soundEnabled={soundEnabled}
          onOpenDetail={handleOpenDetail}
          workoutStartTime={workoutStartTime}
          restTimer={restTimer}
          setRestTimer={setRestTimer}
        />
      )}

      {detailExercise && !showAlternativeModal && (
        <ExerciseDetailModal 
          ex={detailExercise} 
          onClose={() => setDetailExercise(null)} 
          t={t} lang={lang} soundEnabled={soundEnabled} 
          exerciseLogs={exerciseLogs}
          onReplace={(ex) => setShowAlternativeModal(true)}
        />
      )}

      <AlternativeExerciseModal
        isOpen={showAlternativeModal}
        onClose={() => setShowAlternativeModal(false)}
        originalEx={detailExercise}
        exerciseLibrary={exerciseLibrary}
        onSelectAlternative={handleSelectAlternative}
        t={t} lang={lang} soundEnabled={soundEnabled}
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
                      className={`w-full p-4 flex items-center justify-between font-black text-left ${isExpanded ? t.bgAccentSoft + ' ' + t.textAccent : ''} transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        {isProgramCompleted(prog) && <CheckCircle size={16} className="text-emerald-500" />}
                        <span className="body-lg uppercase tracking-widest">Sesi {pIdx + 1}: {prog.name}</span>
                      </div>
                      <div className="flex items-center gap-1 caption opacity-60 font-bold"><span>{prog.exercises?.length || 0} Latihan</span>{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        {prog.exercises?.map((ex, idx) => (
                          <ExerciseCard 
                            key={`${prog.id}-${ex.id}-${idx}`} ex={ex} idx={idx} isExtra={false}
                            t={t} lang={lang} soundEnabled={soundEnabled}
                            isSkip={!!skippedExercises[ex.id]} 
                            onToggleSkip={() => onToggleSkip(ex.id)} 
                            onReplaceClick={() => setActiveAddModalTarget({ type: 'replace', id: ex.id, muscle: ex.target?.[0] })}
                            onRemoveExtra={onRemoveExtra} 
                            onOpenVideo={() => handleOpenDetail(ex)}
                            sets={getSetLogs(ex)}
                            onUpdateSet={(exId, setIdx, field, val) => {
                              setSessionToRun(prog.workoutId);
                              onSetChange(exId, setIdx, field, val);
                            }} 
                            onToggleSet={(exId, setIdx) => {
                              setSessionToRun(prog.workoutId);
                              onToggleSet(exId, setIdx);
                            }} 
                            onAddSet={(exId) => {
                              setSessionToRun(prog.workoutId);
                              onAddSet(exId);
                            }} 
                            onRemoveSet={(exId, setIdx) => {
                              setSessionToRun(prog.workoutId);
                              onRemoveSet(exId, setIdx);
                            }}
                          />
                        ))}
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
                    <span className="body-lg uppercase tracking-widest">Sesi Ekstra (Ad-Hoc)</span>
                    <div className="flex items-center gap-1 caption opacity-60 font-bold"><span>{extraExercises.length} Latihan</span>{expandedSessions['extra'] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                  </button>
                  
                  {expandedSessions['extra'] && (
                    <div className="p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      {extraExercises.map((ex, idx) => (
                        <ExerciseCard 
                          key={ex.id} ex={ex} idx={activeProgram.exercises?.length + idx || idx} isExtra={true}
                          t={t} lang={lang} soundEnabled={soundEnabled}
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
                            onToggleSet(exId, setIdx);
                          }} 
                          onAddSet={(exId) => {
                            setSessionToRun('extra');
                            onAddSet(exId);
                          }} 
                          onRemoveSet={(exId, setIdx) => {
                            setSessionToRun('extra');
                            onRemoveSet(exId, setIdx);
                          }}
                        />
                      ))}
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
            return logs.length > 0 && logs.every(s => s.done);
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