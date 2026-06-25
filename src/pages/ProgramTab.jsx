import React, { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, ArrowUp, ArrowDown, Clock, Link as LinkIcon, X, Dumbbell, ChevronRight, ChevronDown, ChevronUp, Copy, Sparkles, FolderOpen, Trash2, CheckCircle2, Calendar, Edit2, ArrowLeftRight } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatTarget } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from '../components/SwipeInput';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';

const PlanNameInput = ({ initialValue, onSave, className, placeholder }) => {
  const [val, setVal] = useState(initialValue);
  useEffect(() => setVal(initialValue), [initialValue]);
  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onSave(val)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      className={className}
      placeholder={placeholder}
    />
  );
};

const SortableExerciseItem = ({ ex, prevEx, idx, routineId, t, lang, soundEnabled, handleUpdateExercise, handleRemoveExercise, handleToggleSupersetInline, onReplaceClick, getEquipmentColor }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative',
  };

  const isTime = ex.type === 'time';
  const isSuperset = !!ex.supersetId;
  const isNewSupersetGroup = isSuperset && prevEx && prevEx.supersetId && prevEx.supersetId !== ex.supersetId;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative pl-5 pr-5 py-5 border-b last:border-b-0 ${t.border} transition-colors duration-300 ${isDragging ? 'shadow-2xl ring-2 ' + t.ringAccent + ' scale-[1.02] opacity-100 ' + t.bgCard : 'hover:bg-black/5 dark:hover:bg-white/5'} ${isNewSupersetGroup ? 'mt-4' : ''}`}
    >
      {isSuperset && <div className={`absolute top-0 bottom-0 right-0 w-[6px] ${t.bgAccent}`}></div>}
      <div className="flex items-start justify-between gap-1">
        
        {/* Left Column: Title and Sets/Reps */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5">
            <span className={`text-base font-bold ${t.textAccent}`}>{idx + 1}.</span>
            <div className="flex-1 min-w-0 flex flex-col items-start mt-0.5">
              <p className={`text-base font-bold ${t.textMain} truncate w-full leading-tight mb-1`}>{ex.name}</p>
              <p className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider truncate w-full leading-snug`}>
                {ex.equipment || 'BODYWEIGHT'} &bull; {formatTarget(ex.target, lang?.id)}
              </p>
            </div>
          </div>

          {/* Sets Reps */}
          <div className="flex items-center gap-1.5 pl-[22px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold ${t.textMuted} uppercase`}>Sets</span>
                <div className={`w-12 h-8 rounded-xl ${t.inputBg} ${t.textMain} font-bold text-base focus-within:ring-2 focus-within:${t.ringAccent} transition-all overflow-hidden`}>
                  <SwipeInput value={ex.sets === 0 ? '' : ex.sets} onChange={(val) => handleUpdateExercise(routineId, ex.id, 'sets', val)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none" language={lang?.id || 'ID'} />
                </div>
              </div>
              {isTime ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${t.textMuted} uppercase`}>Min</span>
                  <div className={`w-12 h-8 rounded-xl ${t.inputBg} ${t.textMain} font-bold text-base focus-within:ring-2 focus-within:${t.ringAccent} transition-all overflow-hidden`}>
                    <SwipeInput value={ex.duration === 0 ? '' : ex.duration} onChange={(val) => handleUpdateExercise(routineId, ex.id, 'duration', val)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none" language={lang?.id || 'ID'} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${t.textMuted} uppercase`}>Reps</span>
                  <div className={`w-12 h-8 rounded-xl ${t.inputBg} ${t.textMain} font-bold text-base focus-within:ring-2 focus-within:${t.ringAccent} transition-all overflow-hidden`}>
                    <SwipeInput value={ex.reps === 0 ? '' : ex.reps} onChange={(val) => handleUpdateExercise(routineId, ex.id, 'reps', val)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none" language={lang?.id || 'ID'} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 2x2 Buttons */}
        <div className="flex flex-col gap-1 flex-shrink-0 ml-1">
          <div className="flex gap-1 justify-end">
            <button onClick={() => handleRemoveExercise(routineId, ex.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"><X size={16} /></button>
            {idx > 0 && (
              <button onClick={() => handleToggleSupersetInline(routineId, idx)} className={`p-2 rounded-xl transition-colors ${isSuperset ? `${t.bgAccentSoft} ${t.textAccent} hover:opacity-80` : 'bg-black/5 dark:bg-white/5 text-gray-400 hover:text-white'}`} title="Gabung Superset dengan latihan di atasnya">
                <LinkIcon size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-1 justify-end">
            <div 
              {...attributes} 
              {...listeners}
              className={`cursor-grab active:cursor-grabbing p-2 rounded-xl bg-black/5 dark:bg-white/5 text-gray-400 hover:text-white transition-colors touch-none flex items-center justify-center`} 
              title="Tahan dan geser untuk mengurutkan"
            >
              <GripVertical size={16} />
            </div>
            <button onClick={() => onReplaceClick(ex, routineId)} className={`p-2 rounded-xl transition-colors bg-black/5 dark:bg-white/5 text-gray-400 hover:text-amber-500`} title="Ganti Latihan Alternatif">
              <ArrowLeftRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgramTab = ({ setConfirmModal, t, lang, programs, setPrograms, exerciseLibrary, soundEnabled, setActiveAddModalTarget, saveStateToHistory, openQuestionnaire, activePlanIds = [], setActivePlanIds, gymProfiles, focusRoutineId, setFocusRoutineId }) => {
  
  const isDark = t.bgCard !== 'bg-white';
  const [expandedRoutineId, setExpandedRoutineId] = useState(null);

  useEffect(() => {
    if (focusRoutineId) {
      setExpandedRoutineId(focusRoutineId);
      setTimeout(() => {
        const el = document.getElementById(`routine-${focusRoutineId}`);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
        if (setFocusRoutineId) setFocusRoutineId(null);
      }, 300); // Wait for expand animation
    }
  }, [focusRoutineId, setFocusRoutineId]);
  const [warmupUrlInput, setWarmupUrlInput] = useState('');
  const [reorderingId, setReorderingId] = useState(null); 
  const [draggedExId, setDraggedExId] = useState(null);
  const [dragOverExId, setDragOverExId] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [routineIdForAlt, setRoutineIdForAlt] = useState(null);

  const handleSelectAlternative = (newEx) => {
    playSoundEffect('success', soundEnabled);
    saveStateToHistory();
    const updatedPrograms = programs.map(p => {
      if (p.id !== routineIdForAlt) return p;
      return {
        ...p,
        exercises: p.exercises.map(e => {
          if (e.id === detailExercise.id) {
            return {
              ...e,
              ...newEx,
              id: 'ex-' + Date.now() + Math.random().toString(36).substr(2, 5),
              sets: e.sets,
              reps: e.reps,
              duration: e.duration,
              supersetId: e.supersetId
            };
          }
          return e;
        })
      };
    });
    setPrograms(updatedPrograms);
    setShowAlternativeModal(false);
      setDetailExercise(null);
      setRoutineIdForAlt(null);
    };
    const handleCreateRoutine = (targetPlanId, targetPlanName) => {
      playSoundEffect('click', soundEnabled);
      const newProg = {
        id: 'prog-' + Date.now(),
        name: 'Rutinitas Baru',
        restTime: 120,
        warmupVideoUrls: [],
        exercises: [],
        planId: targetPlanId === 'custom' ? null : targetPlanId,
        planName: targetPlanName
      };
      setPrograms([...programs, newProg]);
      setExpandedRoutineId(newProg.id);
    };

  const handleDeleteRoutine = (routineId, routineName) => {
    if (programs.length <= 1) return;
    playSoundEffect('click', soundEnabled);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Rutinitas',
      message: `Yakin ingin menghapus rutinitas "${routineName}"? Data latihan di dalamnya akan ikut terhapus.`,
      onConfirm: () => {
        const remaining = programs.filter(p => p.id !== routineId);
        setPrograms(remaining);
        if (expandedRoutineId === routineId) setExpandedRoutineId(null);
      }
    });
  };

  const handleDeletePlan = (planId, planName) => {
    playSoundEffect('click', soundEnabled);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seluruh Program',
      message: `PERINGATAN KERAS: Yakin ingin menghapus seluruh program "${planName}" beserta semua rutinitas di dalamnya? Tindakan ini tidak bisa dibatalkan!`,
      onConfirm: () => {
        const remaining = programs.filter(p => (p.planId || 'custom') !== planId);
        setPrograms(remaining);
        if (activePlanIds.includes(planId)) {
          /* no fallback needed */
        }
      }
    });
  };

  const handleDuplicateRoutine = (routine) => {
    playSoundEffect('click', soundEnabled);
    const dupe = {
      ...routine,
      id: 'prog-' + Date.now(),
      name: routine.name + ' (Copy)',
      exercises: routine.exercises.map(ex => ({ ...ex })),
      warmupVideoUrls: [...(routine.warmupVideoUrls || [])]
    };
    setPrograms([...programs, dupe]);
    setExpandedRoutineId(dupe.id);
  };

  const handleRenameRoutine = (routineId, newName) => {
    setPrograms(programs.map(p => p.id === routineId ? { ...p, name: newName } : p));
  };

  const restPresets = [60, 90, 120, 180];
  const handleRestTimeChange = (routineId, val) => {
    setPrograms(programs.map(p => p.id === routineId ? { ...p, restTime: Number(val) } : p));
  };

  const handleToggleAssignedDay = (routineId, day) => {
    setPrograms(programs.map(p => {
      if (p.id !== routineId) return p;
      const currentDays = p.assignedDays || [];
      const newDays = currentDays.includes(day) 
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return { ...p, assignedDays: newDays };
    }));
  };

  const handleUpdateExercise = (routineId, exId, field, val) => {
    const numVal = val === '' ? '' : Number(val);
    setPrograms(programs.map(p => {
      if (p.id !== routineId) return p;
      const targetEx = p.exercises.find(e => e.id === exId);
      const isSupersetSync = field === 'sets' && targetEx && targetEx.supersetId;
      return {
        ...p,
        exercises: p.exercises.map(ex => {
          if (ex.id === exId) return { ...ex, [field]: numVal };
          if (isSupersetSync && ex.supersetId === targetEx.supersetId) return { ...ex, sets: numVal };
          return ex;
        })
      };
    }));
  };

  const handleRemoveExercise = (routineId, exId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Latihan?',
      message: 'Yakin ingin menghapus latihan ini dari rutinitas?',
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        setPrograms(programs.map(p => {
          if (p.id !== routineId) return p;
          
          const targetEx = p.exercises.find(e => e.id === exId);
          let newExercises = p.exercises.filter(ex => ex.id !== exId);
          
          if (targetEx && targetEx.supersetId) {
             const remainingWithSameId = newExercises.filter(ex => ex.supersetId === targetEx.supersetId);
             if (remainingWithSameId.length === 1) {
                newExercises = newExercises.map(ex => ex.supersetId === targetEx.supersetId ? { ...ex, supersetId: null } : ex);
             }
          }
          
          return { ...p, exercises: newExercises };
        }));
      }
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndDnd = (event, routineId) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      playSoundEffect('swipe', soundEnabled);
      setPrograms(prev => {
        const updated = prev.map(p => {
          if (p.id !== routineId) return p;
          const oldIndex = p.exercises.findIndex(ex => ex.id === active.id);
          const newIndex = p.exercises.findIndex(ex => ex.id === over.id);
          return {
            ...p,
            exercises: arrayMove(p.exercises, oldIndex, newIndex)
          };
        });
        saveStateToHistory(updated);
        return updated;
      });
    }
  };

  const handleToggleSupersetInline = (routineId, exIndex) => {
    playSoundEffect('click', soundEnabled);
    setPrograms(prev => {
      const updated = prev.map(p => {
        if (p.id !== routineId) return p;
        if (exIndex === 0) return p;
        
        let newExercises = [...p.exercises];
        const currentEx = newExercises[exIndex];
        const prevEx = newExercises[exIndex - 1];
        
        if (currentEx.supersetId && currentEx.supersetId === prevEx.supersetId) {
          const targetId = currentEx.supersetId;
          
          let groupItemsToSplit = [];
          for (let i = exIndex; i < newExercises.length; i++) {
             if (newExercises[i].supersetId === targetId) {
                 groupItemsToSplit.push(i);
             } else {
                 break;
             }
          }
          
          if (groupItemsToSplit.length > 1) {
            const existingIds = p.exercises.map(ex => ex.supersetId).filter(Boolean);
            let newId = 'A';
            for (let i = 0; i < 26; i++) {
               const char = String.fromCharCode(65 + i);
               if (!existingIds.includes(char)) {
                   newId = char;
                   break;
               }
            }
            groupItemsToSplit.forEach(i => {
                newExercises[i] = { ...newExercises[i], supersetId: newId };
            });
          } else {
            groupItemsToSplit.forEach(i => {
                newExercises[i] = { ...newExercises[i], supersetId: null };
            });
          }
          
          const countRemaining = newExercises.filter(ex => ex.supersetId === targetId).length;
          if (countRemaining === 1) {
             newExercises = newExercises.map(ex => ex.supersetId === targetId ? { ...ex, supersetId: null } : ex);
          }
        } else {
          let targetId = prevEx.supersetId;
          if (!targetId) {
            const existingIds = p.exercises.map(ex => ex.supersetId).filter(Boolean);
            targetId = 'A';
            for (let i = 0; i < 26; i++) {
               const char = String.fromCharCode(65 + i);
               if (!existingIds.includes(char)) {
                   targetId = char;
                   break;
               }
            }
            newExercises[exIndex - 1] = { ...prevEx, supersetId: targetId };
          }
          
          const currentId = currentEx.supersetId;
          if (currentId) {
             newExercises = newExercises.map(ex => ex.supersetId === currentId ? { ...ex, supersetId: targetId, sets: prevEx.sets } : ex);
          } else {
             newExercises[exIndex] = { ...currentEx, supersetId: targetId, sets: prevEx.sets };
          }
        }
        
        return { ...p, exercises: newExercises };
      });
      saveStateToHistory(updated);
      return updated;
    });
  };

  const handleAddExercise = (routineId) => {
    playSoundEffect('click', soundEnabled);
    setActiveAddModalTarget({ type: 'program', progId: routineId });
  };

  const getEquipmentColor = (eq) => {
    const colors = {
      'Dumbbell': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      'Barbell': 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      'Smith Machine': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
      'Cable/Machine': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      'Bodyweight': 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
    };
    return colors[eq] || 'bg-gray-500/15 text-gray-600 dark:text-gray-400';
  };

    const groupedPrograms = programs.reduce((acc, prog) => {
      const key = prog.planId || 'custom';
      if (!acc[key]) acc[key] = { planId: key, planName: prog.planName || 'Program Custom', planLevel: prog.planLevel, routines: [], assignedDays: prog.assignedDays || [] };
      acc[key].routines.push(prog);
      return acc;
    }, {});

    const handleCreateCustomPlan = () => {
      playSoundEffect('click', soundEnabled);
      const newPlanId = 'custom-' + Date.now();
      
      let baseName = 'Program Custom';
      let uniqueName = baseName;
      let counter = 2;
      while (programs.some(p => p.planName === uniqueName)) {
        uniqueName = `${baseName} (${counter})`;
        counter++;
      }

      const newProg = {
        id: 'prog-' + Date.now(),
        name: 'Rutinitas 1',
        restTime: 120,
        warmupVideoUrls: [],
        exercises: [],
        planId: newPlanId,
        planName: uniqueName
      };
      setPrograms([...programs, newProg]);
      if (setActivePlanIds) setActivePlanIds([...activePlanIds, newPlanId]);
      setExpandedRoutineId(newProg.id);
      
      setTimeout(() => {
        const layout = window.innerWidth < 640 ? 'mobile' : 'desktop';
        const el = document.getElementById(`plan-${layout}-${newPlanId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    const handleRenamePlan = (planId, newName) => {
      const updated = programs.map(p => {
        const pId = p.planId || 'custom';
        if (pId === planId) {
          return { ...p, planName: newName };
        }
        return p;
      });
      setPrograms(updated);
      saveStateToHistory(updated);
    };

  const renderRoutineEditor = (routine) => {
    return (
      <div className={`px-5 pt-3 pb-3 bg-black/5 dark:bg-white/5 border-t ${t.border} space-y-5 animate-in slide-in-from-top-2 fade-in duration-300`}>
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <h4 className={`font-bold text-sm ${t.textMain}`}>Jadwal Hari</h4>
          </div>
          <div className="flex justify-between w-full gap-1 sm:gap-2">
            {[
              { f: 'Sen', s: 'S' }, { f: 'Sel', s: 'S' }, { f: 'Rab', s: 'R' }, { f: 'Kam', s: 'K' }, 
              { f: 'Jum', s: 'J' }, { f: 'Sab', s: 'S' }, { f: 'Min', s: 'M' }
            ].map(dayObj => {
              const day = dayObj.f;
              const isSelected = (routine.assignedDays || []).includes(day);
              return (
                <button 
                  key={day}
                  onClick={() => { playSoundEffect('click', soundEnabled); handleToggleAssignedDay(routine.id, day); }}
                  className={`flex-1 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-150 ${isSelected ? `${t.bgAccent} text-white shadow-md scale-105` : `${t.inputBg} ${t.textMuted} hover:${t.textMain}`}`}
                >
                  {dayObj.s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className={`font-bold text-sm ${t.textMain}`}>Waktu Istirahat Antarset</h4>
            </div>
            <span className={`text-lg font-black ${t.textAccent}`}>{routine.restTime || 120}s</span>
          </div>
          
          <div className="px-1 mb-4">
            <input 
              type="range" 
              min="0" 
              max="300" 
              step="5" 
              value={routine.restTime || 120} 
              onChange={(e) => handleRestTimeChange(routine.id, parseInt(e.target.value))}
              className={`w-full h-2 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer ${t.textAccent.replace('text-', 'accent-')}`}
            />
            <div className={`flex justify-between mt-2 text-[10px] font-bold ${t.textMuted}`}>
              <span>0s</span>
              <span>150s</span>
              <span>300s</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {restPresets.map(preset => (
              <button key={preset} onClick={() => { playSoundEffect('click', soundEnabled); handleRestTimeChange(routine.id, preset); }} className={`py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${(routine.restTime || 120) === preset ? `${t.bgAccent} text-white shadow-md scale-105` : `${t.inputBg} ${t.textMuted} hover:${t.textMain}`}`}>{preset}s</button>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h4 className={`font-bold text-sm ${t.textMain}`}>Daftar Latihan ({routine.exercises.length})</h4>
          </div>

          {routine.exercises.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-6 rounded-2xl border-2 border-dashed ${t.borderAccentSoft}`}>
              <p className={`text-sm ${t.textMuted} mb-3`}>Belum ada latihan di rutinitas ini.</p>
              <button onClick={() => handleAddExercise(routine.id)} className={`flex items-center px-4 py-2 rounded-xl text-white font-bold text-xs ${t.bgAccent} shadow-md hover:opacity-90 transition-all active:scale-95`}><Plus size={14} className="mr-1" /> Tambah Latihan</button>
            </div>
          ) : (
            <div className="-mx-5 bg-black/5 dark:bg-white/5">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEndDnd(e, routine.id)}
              >
                <SortableContext items={routine.exercises.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
                  {routine.exercises.map((ex, idx) => (
                    <SortableExerciseItem
                      key={ex.id}
                      ex={ex}
                      prevEx={idx > 0 ? routine.exercises[idx - 1] : null}
                      idx={idx}
                      routineId={routine.id}
                      t={t}
                      lang={lang}
                      soundEnabled={soundEnabled}
                      handleUpdateExercise={handleUpdateExercise}
                      handleRemoveExercise={handleRemoveExercise}
                      handleToggleSupersetInline={handleToggleSupersetInline}
                      onReplaceClick={(ex, rId) => {
                        setDetailExercise(ex);
                        setRoutineIdForAlt(rId);
                        setShowAlternativeModal(true);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {routine.exercises.length > 0 && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleAddExercise(routine.id)} className={`flex-1 py-3 border-2 border-dashed ${t.borderAccentSoft} hover:${t.borderAccent} hover:${t.bgAccentSoft} rounded-xl ${t.textAccent} font-bold text-sm flex justify-center items-center transition-all duration-200 active:scale-[0.98]`}>
                <Plus size={16} className="mr-1.5" /> Latihan
              </button>
            </div>
          )}
        </div>

      </div>
    );
  };

  // ==========================================
  // RENDER MAIN
  // ==========================================

  const getPlanBgConfig = (planName) => {
    const defaultConfig = { url: '/bg-custom.png', position: 'right -140px top -50px' };
    if (!planName) return defaultConfig;
    const lowerName = planName.toLowerCase();
    if (lowerName.includes('full body')) return { url: '/bg-full-body.png', position: 'right -140px top -50px' };
    if (lowerName.includes('ppl basic')) return { url: '/bg-ppl-basic.png', position: 'right -140px top -20px' };
    if (lowerName.includes('up-low')) return { url: '/bg-up-low.png', position: 'right -140px top -50px' };
    if (lowerName.includes('bro split')) return { url: '/bg-bro-split.png', position: 'right -140px top -50px' };
    if (lowerName.includes('ppl advanced')) return { url: '/bg-ppl-advanced.png', position: 'right -140px top -110px' };
    if (lowerName.includes('beast mode')) return { url: '/bg-beast-mode.png', position: 'right -140px top -50px' };
    return defaultConfig;
  };

  const renderPlanCard = (planId, group, isActive, layout = 'mobile') => {
    return (
      <div id={`plan-${layout}-${planId}`} key={planId} className={`scroll-mt-24 rounded-3xl border-2 ${isActive ? t.borderAccent : t.border} ${t.bgCard} shadow-sm overflow-hidden transition-colors h-fit relative`}>
              
              {/* BACKGROUND IMAGE LAYER */}
              <div 
                className={`absolute inset-0 z-0 pointer-events-none transition-all duration-300 opacity-90 ${isDark ? 'mix-blend-screen' : 'mix-blend-multiply'}`}
                style={{
                  backgroundImage: `url('${getPlanBgConfig(group.planName).url}')`,
                  backgroundSize: 'auto 450px',
                  backgroundPosition: getPlanBgConfig(group.planName).position,
                  backgroundRepeat: 'no-repeat',
                  maskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,1) 100%)'
                }}
              />

              {/* PLAN HEADER */}
              <div className={`p-4 sm:p-5 relative z-10`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0 mt-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 w-full">
                      {planId.startsWith('custom') ? (
                        <div className={`relative group inline-block w-full flex-1`}>
                          <PlanNameInput
                            initialValue={group.planName}
                            onSave={(newName) => handleRenamePlan(planId, newName)}
                            className={`w-full bg-transparent font-black text-xl ${isActive ? t.textAccent : t.textMain} outline-none border-b-2 border-transparent focus:border-blue-500/50 dark:focus:border-blue-400/50 transition-colors pr-8`}
                            placeholder="Nama Program..."
                          />
                          <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textMuted} transition-opacity pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}>
                            <Edit2 size={16} />
                          </div>
                        </div>
                      ) : (
                        <h2 className={`font-black text-xl flex-1 flex items-center gap-2 ${isActive ? t.textAccent : t.textMain}`}>
                          {group.planName}
                        </h2>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center mt-2">
                      {group.planLevel && (
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${t.bgAccentSoft} ${t.textAccent}`}>
                          Level: {group.planLevel === 'beginner' ? 'Pemula' : group.planLevel === 'intermediate' ? 'Menengah' : group.planLevel === 'advanced' ? 'Mahir' : group.planLevel}
                        </span>
                      )}
                      {group.targetGym && group.targetGym !== 'global' && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${t.inputBg} ${t.textMuted}`}>
                          Gym: {gymProfiles?.find(g => g.id === group.targetGym)?.name || group.targetGym}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${t.inputBg} ${t.textMuted}`}>
                        {group.routines.length} Hari
                      </span>
                    </div>
                  </div>
                <button 
                  onClick={() => handleDeletePlan(planId, group.planName)}
                  className={`p-2 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors shrink-0`}
                >
                  <X size={18} />
                </button>
              </div>

              <button 
                onClick={() => { 
                  playSoundEffect('success', soundEnabled); 
                  if (isActive) {
                    setActivePlanIds(activePlanIds.filter(id => id !== planId));
                  } else {
                    setActivePlanIds([...activePlanIds, planId]); 
                    setTimeout(() => {
                      const el = document.getElementById(`plan-${layout}-${planId}`);
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 80;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }, 100);
                  }
                }}
                className={`w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10 ${isActive ? `${t.bgAccent} text-white shadow-md border border-transparent` : `backdrop-blur-md border ${isDark ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white/70 hover:text-white' : 'bg-white/60 hover:bg-white/80 border-white/50 shadow-sm text-gray-500 hover:text-gray-900'}`}`}
              >
                {isActive ? <><CheckCircle2 size={18} /> Program Aktif</> : 'Aktifkan'}
              </button>
            </div>

            {/* ACCORDION CONTENT */}
            <div className={`relative z-10 transition-all duration-300 ${isActive ? `pb-5 backdrop-blur-sm ${isDark ? 'bg-black/10' : 'bg-white/20'}` : 'h-0 overflow-hidden'}`}>
              <div className="flex flex-col">
                {group.routines.map((routine, idx) => {
                  const isExpanded = expandedRoutineId === routine.id;
                  const estDuration = Math.round(routine.exercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0) * (45 + (parseInt(routine.restTime) || 90)) / 60);
                  return (
                    <div id={`routine-${routine.id}`} key={routine.id} className={`border-t ${t.border}`}>
                      <div 
                        onClick={() => { if(!isExpanded) { playSoundEffect('swipe', soundEnabled); setExpandedRoutineId(routine.id); } }}
                        className={`w-full px-5 py-4 transition-colors ${isExpanded ? t.bgAccentSoft : `hover:${t.inputBg} cursor-pointer`}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                            {isExpanded ? (
                              <input
                                type="text"
                                value={routine.name}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleRenameRoutine(routine.id, e.target.value)}
                                style={{
                                  WebkitMaskImage: 'linear-gradient(to left, transparent 10px, black 40px)',
                                  maskImage: 'linear-gradient(to left, transparent 10px, black 40px)'
                                }}
                                className={`w-full bg-transparent font-black text-lg ${t.textMain} outline-none transition-all border-b-2 border-transparent focus:border-blue-500/50 dark:focus:border-blue-400/50 pb-0.5`}
                                placeholder="Nama Rutinitas..."
                              />
                            ) : (
                              <h4 className={`font-bold text-lg ${t.textMain} truncate`}>{routine.name}</h4>
                            )}
                            <p className={`text-xs ${t.textMuted} mt-1`}>{routine.exercises.length} Latihan • {routine.restTime}s Istirahat • ~{estDuration} mnt</p>
                          </div>
                          
                          <div className="flex items-center shrink-0 h-full mt-1">
                            {isExpanded && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleDuplicateRoutine(routine); }} className={`p-1.5 rounded-xl ${t.textMuted} hover:${t.inputBg} hover:${t.textAccent} transition-colors`}><Copy size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRoutine(routine.id, routine.name); }} disabled={programs.length <= 1} className={`p-1.5 rounded-xl text-rose-500/70 transition-colors ${programs.length <= 1 ? 'opacity-30 cursor-not-allowed' : `hover:${t.inputBg} hover:text-rose-500`}`}><Trash2 size={18} /></button>
                              </>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); playSoundEffect('swipe', soundEnabled); setExpandedRoutineId(isExpanded ? null : routine.id); }} className={`p-1.5 transition-colors rounded-xl ${isExpanded ? t.textAccent : t.textMuted} hover:${t.inputBg}`}>
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                        <div className="overflow-hidden">
                          {renderRoutineEditor(routine)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Custom Routine Button (only for custom plan) */}
                {planId.startsWith('custom') && (
                  <div className={`px-5 py-4 border-t ${t.border}`}>
                    <button 
                      onClick={() => handleCreateRoutine(planId, group.planName)}
                      className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} hover:${t.bgAccentSoft} transition-all active:scale-95 flex items-center justify-center gap-2`}
                    >
                      <Plus size={16} /> Rutinitas Baru
                    </button>
                  </div>
                )}
              </div>
            </div>  
                  </div>
    );
  };
  return (
    <div className="flex flex-col animate-in fade-in duration-300 pb-6 max-w-4xl mx-auto w-full space-y-3 sm:space-y-4">
  
      {/* AI Generator Banner - REDESIGNED */}
      <div 
        className={`w-full text-left px-5 py-8 sm:py-12 rounded-3xl ${t.bgAccentSoft} border ${t.borderAccentSoft} shadow-sm relative overflow-hidden transition-all`}
      >
        {/* --- Background Image Layer --- */}
        <div 
            className={`absolute inset-0 z-0 pointer-events-none transition-all duration-300 bg-coach ${isDark ? 'opacity-30 mix-blend-normal' : 'opacity-40 mix-blend-multiply'}`}
          />
        {/* ------------------------------ */}
          <div className="relative z-10 w-[70%] sm:w-3/4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`font-black text-lg ${t.textAccent}`}>Buat Program</h3>
            </div>
            <p className={`text-xs sm:text-sm font-medium mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Jawab beberapa pertanyaan untuk mendapatkan program latihan terbaik yang dipersonalisasi untuk Anda.
            </p>
          </div>
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <button 
            onClick={() => { playSoundEffect('click', soundEnabled); openQuestionnaire(); }}
            className={`w-full py-3 rounded-xl font-black text-white bg-gradient-to-r ${t.gradientBg} shadow-md active:scale-95 transition-all flex items-center justify-center text-sm`}
          >
            Lyfit Coach
          </button>
            <button 
              onClick={() => { 
                handleCreateCustomPlan(); 
              }}
              className={`w-full py-3 rounded-xl font-bold ${t.textAccent} transition-all active:scale-95 flex items-center justify-center text-sm backdrop-blur-md border ${isDark ? 'bg-white/10 hover:bg-white/20 border-transparent shadow-none' : 'bg-white/60 hover:bg-white/80 border-white/50 shadow-sm'}`}
            >
            Buat Custom
          </button>
        </div>
      </div>
  
      {/* Programs List */}
      <div className="w-full">
        {/* MOBILE VIEW: Flat List (Hidden on Tablet) */}
        <div className="flex flex-col gap-3 sm:hidden">
          {Object.entries(groupedPrograms).map(([planId, group]) => renderPlanCard(planId, group, activePlanIds.includes(planId), 'mobile'))}
        </div>

        {/* DESKTOP VIEW: Split Columns (Hidden on Mobile) */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4 w-full">
            {Object.entries(groupedPrograms).filter(([id]) => !activePlanIds.includes(id)).map(([planId, group]) => renderPlanCard(planId, group, false, 'desktop'))}
          </div>
          <div className="flex flex-col gap-4 w-full">
            {Object.entries(groupedPrograms).filter(([id]) => activePlanIds.includes(id)).map(([planId, group]) => renderPlanCard(planId, group, true, 'desktop'))}
          </div>
        </div>
      </div>

      <div className="h-10"></div>
      
      <AlternativeExerciseModal
        isOpen={showAlternativeModal}
        onClose={() => setShowAlternativeModal(false)}
        originalEx={detailExercise}
        exerciseLibrary={exerciseLibrary}
        onSelectAlternative={handleSelectAlternative}
        t={t} lang={lang} soundEnabled={soundEnabled}
      />
    </div>
  );
};

export default ProgramTab;
