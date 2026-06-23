import React, { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, ArrowUp, ArrowDown, Clock, Link as LinkIcon, X, Dumbbell, ChevronRight, ChevronDown, ChevronUp, Copy, Sparkles, FolderOpen, Trash2, CheckCircle2, Calendar, Edit2, ArrowLeftRight } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatTarget } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from '../components/SwipeInput';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';
import { getSupersetColorStyle } from '../data/constants';

const SortableExerciseItem = ({ ex, idx, routineId, t, lang, soundEnabled, handleUpdateExercise, handleRemoveExercise, handleToggleSupersetInline, onReplaceClick, getEquipmentColor }) => {
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
  const supersetStyle = getSupersetColorStyle(ex.supersetId);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative pl-5 py-5 border-b last:border-b-0 ${supersetStyle ? `border-r-4 ${supersetStyle.border} pr-[16px]` : 'pr-5'} ${t.border} transition-colors duration-300 ${isDragging ? 'shadow-2xl ring-2 ' + t.ringAccent + ' scale-[1.02] opacity-100 ' + t.bgCard : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
    >
      <div className="flex items-start justify-between gap-1">
        
        {/* Left Column: Title and Sets/Reps */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5">
            <span className={`text-base font-bold ${t.textAccent}`}>{idx + 1}.</span>
            <div className="flex-1 min-w-0 flex flex-col items-start mt-0.5">
              <p className={`text-base font-bold ${t.textMain} truncate w-full leading-none mb-1.5`}>{ex.name}</p>
              <p className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider truncate w-full leading-none`}>
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
              <button onClick={() => handleToggleSupersetInline(routineId, idx)} className={`p-2 rounded-xl transition-colors ${supersetStyle ? `${supersetStyle.bg} ${supersetStyle.text} ${supersetStyle.hoverBg}` : 'bg-black/5 dark:bg-white/5 text-gray-400 hover:text-white'}`} title="Gabung Superset dengan latihan di atasnya">
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

const ProgramTab = ({ setConfirmModal, t, lang, programs, setPrograms, exerciseLibrary, soundEnabled, setActiveAddModalTarget, saveStateToHistory, openQuestionnaire, activePlanId, setActivePlanId }) => {

  // ==========================================
  // STATE
  // ==========================================
  const [expandedRoutineId, setExpandedRoutineId] = useState(null);
  const [warmupUrlInput, setWarmupUrlInput] = useState('');
  const [reorderingId, setReorderingId] = useState(null); 
  const [draggedExId, setDraggedExId] = useState(null);
  const [dragOverExId, setDragOverExId] = useState(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [routineIdForAlt, setRoutineIdForAlt] = useState(null);

  // ==========================================
  // PROGRAM/PLAN HANDLERS
  // ==========================================
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
        if (activePlanId === planId) {
          setActivePlanId('custom');
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

  // ==========================================
  // REST TIME & WARMUP
  // ==========================================
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

  // ==========================================
  // EXERCISE HANDLERS
  // ==========================================
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
          
          // Cleanup orphaned superset items
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
        if (exIndex === 0) return p; // First item cannot link to previous
        
        let newExercises = [...p.exercises];
        const currentEx = newExercises[exIndex];
        const prevEx = newExercises[exIndex - 1];
        
        if (currentEx.supersetId && currentEx.supersetId === prevEx.supersetId) {
          // Unlink! Split the group starting from currentEx
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
          
          // Clean up if prevEx is orphaned (only 1 item left with this ID)
          const countRemaining = newExercises.filter(ex => ex.supersetId === targetId).length;
          if (countRemaining === 1) {
             newExercises = newExercises.map(ex => ex.supersetId === targetId ? { ...ex, supersetId: null } : ex);
          }
        } else {
          // Link!
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
             // Merge groups
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

  // ==========================================
  // HELPERS
  // ==========================================
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

    // Group programs by Plan (Umbrella)
    const groupedPrograms = programs.reduce((acc, prog) => {
      const key = prog.planId || 'custom';
      if (!acc[key]) acc[key] = { planId: key, planName: prog.planName || 'Program Custom', planLevel: prog.planLevel, routines: [], assignedDays: prog.assignedDays || [] };
      acc[key].routines.push(prog);
      return acc;
    }, {});

    const handleCreateCustomPlan = () => {
      playSoundEffect('click', soundEnabled);
      const newPlanId = 'custom-' + Date.now();
      const newProg = {
        id: 'prog-' + Date.now(),
        name: 'Rutinitas 1',
        restTime: 120,
        warmupVideoUrls: [],
        exercises: [],
        planId: newPlanId,
        planName: 'Program Custom Baru'
      };
      setPrograms([...programs, newProg]);
      if (setActivePlanId) setActivePlanId(newPlanId);
      setExpandedRoutineId(newProg.id);
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

  // ==========================================
  // RENDER ROUTINE EDITOR (Accordion Body)
  // ==========================================
  const renderRoutineEditor = (routine) => {
    return (
      <div className={`px-5 pt-5 pb-3 bg-black/5 dark:bg-white/5 border-t ${t.border} space-y-5 animate-in slide-in-from-top-2 fade-in duration-300`}>
        
        {/* Editor Header: Rename & Actions */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className={`flex-1 min-w-0 relative group h-11 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl border border-transparent focus-within:border-blue-500/50 dark:focus-within:border-blue-400/50 transition-all`}>
            <input
              type="text"
              value={routine.name}
              onChange={(e) => handleRenameRoutine(routine.id, e.target.value)}
              style={{
                WebkitMaskImage: 'linear-gradient(to left, transparent 40px, black 80px)',
                maskImage: 'linear-gradient(to left, transparent 40px, black 80px)'
              }}
              className={`w-full h-full bg-transparent pl-4 pr-11 font-bold text-lg ${t.textMain} outline-none transition-all`}
              placeholder="Nama Rutinitas..."
            />
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${t.textMuted} group-hover:text-blue-500 transition-colors pointer-events-none opacity-50 group-focus-within:opacity-100 group-focus-within:text-blue-500`}>
              <Edit2 size={16} />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handleDuplicateRoutine(routine)} className={`flex items-center justify-center w-11 h-11 rounded-xl ${t.bgCard} border ${t.border} ${t.textMuted} hover:${t.textAccent} transition-colors`}><Copy size={16} /></button>
            <button onClick={() => handleDeleteRoutine(routine.id, routine.name)} disabled={programs.length <= 1} className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-colors ${programs.length <= 1 ? 'opacity-30 cursor-not-allowed border-gray-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'}`}><Trash2 size={16} /></button>
          </div>
        </div>

        {/* Assigned Days Selector */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-3">
            <h4 className={`font-bold text-sm ${t.textMain}`}>Jadwal Hari</h4>
          </div>
          <div className="flex justify-between w-full gap-1 sm:gap-2">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => {
              const isSelected = (routine.assignedDays || []).includes(day);
              return (
                <button 
                  key={day}
                  onClick={() => { playSoundEffect('click', soundEnabled); handleToggleAssignedDay(routine.id, day); }}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-150 ${isSelected ? `${t.bgAccent} text-white shadow-md scale-105` : `${t.inputBg} ${t.textMuted} hover:${t.textMain}`}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rest Time */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h4 className={`font-bold text-sm ${t.textMain}`}>Waktu Istirahat (Set)</h4>
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
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${t.inputBg} outline-none`}
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
  return (
    <div className="flex flex-col animate-in fade-in duration-300 pb-20 max-w-2xl mx-auto w-full space-y-3">
  
      {/* AI Generator Banner - REDESIGNED */}
      <div 
        className={`w-full text-left p-4 rounded-3xl ${t.bgAccentSoft} border ${t.borderAccentSoft} shadow-sm relative overflow-hidden transition-all`}
      >
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <h3 className={`font-black text-lg ${t.textAccent}`}>Buat Program</h3>
        </div>
        <p className={`text-sm ${t.textMuted} mb-3 relative z-10`}>
          Jawab beberapa pertanyaan untuk mendapatkan program latihan terbaik yang dipersonalisasi untuk Anda.
        </p>
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
            className={`w-full py-3 rounded-xl font-bold ${t.textAccent} bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center text-sm`}
          >
            Buat Manual
          </button>
        </div>
      </div>
  
      {/* Programs List */}
      {Object.entries(groupedPrograms).map(([planId, group]) => {
        const isActive = activePlanId === planId;

        return (
          <div key={planId} className={`rounded-3xl border-2 ${isActive ? t.borderAccent : t.border} ${t.bgCard} shadow-sm overflow-hidden transition-colors`}>
            
            {/* PLAN HEADER */}
            <div className={`p-4 sm:p-5 ${isActive ? t.bgAccentSoft : ''}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0 mt-1">
                  {planId.startsWith('custom') ? (
                    <div className={`relative group inline-block w-full`}>
                      <input
                        type="text"
                        value={group.planName}
                        onChange={(e) => handleRenamePlan(planId, e.target.value)}
                        className={`w-full bg-transparent font-black text-xl ${isActive ? t.textAccent : t.textMain} outline-none border-b-2 border-transparent focus:border-blue-500/50 dark:focus:border-blue-400/50 transition-colors pr-8`}
                        placeholder="Nama Program..."
                      />
                      <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textMuted} transition-opacity pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}>
                        <Edit2 size={16} />
                      </div>
                    </div>
                  ) : (
                    <h2 className={`font-black text-xl flex items-center gap-2 ${isActive ? t.textAccent : t.textMain}`}>
                      {group.planName}
                    </h2>
                  )}
                  {group.planLevel && (
                    <p className={`text-[10px] font-black uppercase mt-1 px-2 py-0.5 inline-block rounded-md ${t.bgAccentSoft} ${t.textAccent}`}>
                      Level: {group.planLevel === 'beginner' ? 'Pemula' : group.planLevel === 'intermediate' ? 'Menengah' : group.planLevel === 'advanced' ? 'Mahir' : group.planLevel}
                    </p>
                  )}
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
                    setActivePlanId(null);
                  } else {
                    setActivePlanId(planId); 
                  }
                }}
                className={`w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isActive ? `${t.bgAccent} text-white shadow-md` : `${t.inputBg} ${t.textMuted} hover:${t.textMain}`}`}
              >
                {isActive ? <><CheckCircle2 size={18} /> Program Aktif</> : 'Jadikan Aktif'}
              </button>
            </div>

            {/* ACCORDION CONTENT */}
            <div className={`transition-all duration-300 ${isActive ? 'pb-5' : 'h-0 overflow-hidden'}`}>
              <div className="flex flex-col">
                {group.routines.map((routine, idx) => {
                  const isExpanded = expandedRoutineId === routine.id;
                  const estDuration = Math.round(routine.exercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0) * (45 + (parseInt(routine.restTime) || 90)) / 60);
                  return (
                    <div key={routine.id} className={`border-t ${t.border}`}>
                      <button 
                        onClick={() => { playSoundEffect('swipe', soundEnabled); setExpandedRoutineId(isExpanded ? null : routine.id); }}
                        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isExpanded ? t.bgCard : `hover:${t.inputBg}`}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <h4 className={`font-bold text-base ${t.textMain}`}>{routine.name}</h4>
                            <p className={`text-xs ${t.textMuted}`}>{routine.exercises.length} Latihan • {routine.restTime}s Istirahat • ~{estDuration} mnt</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className={t.textAccent} /> : <ChevronDown size={20} className={t.textMuted} />}
                      </button>
                      
                      {isExpanded && renderRoutineEditor(routine)}
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
      })}

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
