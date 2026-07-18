import React, { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, ArrowUp, ArrowDown, Clock, Link as LinkIcon, X, Dumbbell, ChevronRight, ChevronDown, ChevronUp, Copy, Sparkles, FolderOpen, Trash2, CheckCircle2, Calendar, Edit2, ArrowLeftRight, Share2, Check, Brain } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatTarget } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from '../components/SwipeInput';
import AlternativeExerciseModal from '../components/AlternativeExerciseModal';
import CreatePostModal from '../components/CreatePostModal';
import useDialog from '../hooks/useDialog';
import { getPlanBgConfig } from '../utils/planBg';
import GymAIChat from '../components/GymAIChat';

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
                  <input type="number" min="0" value={ex.sets === 0 ? '' : ex.sets} onChange={(e) => handleUpdateExercise(routineId, ex.id, 'sets', parseInt(e.target.value) || 0)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none text-center" />
                </div>
              </div>
              {isTime ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${t.textMuted} uppercase`}>Min</span>
                  <div className={`w-12 h-8 rounded-xl ${t.inputBg} ${t.textMain} font-bold text-base focus-within:ring-2 focus-within:${t.ringAccent} transition-all overflow-hidden`}>
                    <input type="number" min="0" value={ex.duration === 0 ? '' : ex.duration} onChange={(e) => handleUpdateExercise(routineId, ex.id, 'duration', parseInt(e.target.value) || 0)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none text-center" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold ${t.textMuted} uppercase`}>Reps</span>
                  <div className={`w-12 h-8 rounded-xl ${t.inputBg} ${t.textMain} font-bold text-base focus-within:ring-2 focus-within:${t.ringAccent} transition-all overflow-hidden`}>
                    <input type="number" min="0" value={ex.reps === 0 ? '' : ex.reps} onChange={(e) => handleUpdateExercise(routineId, ex.id, 'reps', parseInt(e.target.value) || 0)} placeholder="0" className="w-full h-full bg-transparent outline-none border-none text-center" />
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

const ProgramTab = ({
  t, lang, programs, setPrograms, user, exerciseLibrary, soundEnabled,
  setActiveAddModalTarget, saveStateToHistory, openQuestionnaire,
  activePlanIds, setActivePlanIds, gymProfiles,
  focusRoutineId, setFocusRoutineId, setConfirmModal, activityTargets,
  userApiKeys, userProfile, history,
  keyStatuses, setKeyStatuses, setShowSettings,
  setHighlightPostId, setShowProfileModal, setProfileForceTab, onPostCreated
}) => {
  
  const isDark = t.bgCard !== 'bg-white';
  const { dialog, showAlert } = useDialog(isDark);
  const [expandedRoutineId, setExpandedRoutineId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  // showAiChat now managed by parent App.jsx (hoisted for global floating button)

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
  const [pendingShareProgram, setPendingShareProgram] = useState(null);

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
        // null, bukan undefined — undefined bikin Firestore nolak seluruh dokumen saat auto-save
        planName: targetPlanName ?? null
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
      message: `Yakin ingin menghapus rutinitas "${routineName}"? Daftar latihannya akan hilang, tapi riwayat sesi yang sudah pernah kamu selesaikan tetap aman tersimpan di Kalender.`,
      onConfirm: () => {
        setPrograms(prevPrograms => prevPrograms.filter(p => p.id !== routineId));
        if (expandedRoutineId === routineId) setExpandedRoutineId(null);
      }
    });
  };

  const handleDeletePlan = (planId, planName) => {
    playSoundEffect('click', soundEnabled);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Seluruh Program',
      message: `Yakin ingin menghapus seluruh program "${planName}" beserta semua rutinitas di dalamnya? Tindakan ini tidak bisa dibatalkan — tapi tenang, riwayat sesi latihan yang sudah pernah kamu selesaikan tetap aman tersimpan di Kalender.`,
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
      exercises: routine.exercises.map(ex => ({ 
        ...ex,
        id: 'ex-' + Date.now() + Math.random().toString(36).substr(2, 5) 
      })),
      warmupVideoUrls: [...(routine.warmupVideoUrls || [])]
    };
    setPrograms([...programs, dupe]);
    setExpandedRoutineId(dupe.id);
  };

  const handleRenameRoutine = (routineId, newName) => {
    setPrograms(prevPrograms => prevPrograms.map(p => p.id === routineId ? { ...p, name: newName } : p));
  };

  const restPresets = [60, 90, 120, 180];
  const handleRestTimeChange = (routineId, val) => {
    setPrograms(prevPrograms => prevPrograms.map(p => p.id === routineId ? { ...p, restTime: Number(val) } : p));
  };

  const handleToggleAssignedDay = (routineId, day) => {
    setPrograms(prevPrograms => prevPrograms.map(p => {
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
    setPrograms(prevPrograms => prevPrograms.map(p => {
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
      if (!acc[key]) acc[key] = { planId: key, planName: prog.planName || 'Program Default', planLevel: prog.planLevel, planGoal: prog.planGoal || 'maintenance', routines: [], assignedDays: prog.assignedDays || [], isAI: false };
      if (prog.source === 'ai' || key.startsWith('plan_ai_')) acc[key].isAI = true;
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
      setEditingPlanId(newPlanId);
      
      setTimeout(() => {
        const layout = window.innerWidth < 640 ? 'mobile' : 'desktop';
        const el = document.getElementById(`plan-${layout}-${newPlanId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    const handleRenamePlan = (planId, newName) => {
      let baseName = newName.trim() || 'Program Tanpa Nama';
      let uniqueName = baseName;
      let counter = 2;
      
      // Pastikan nama baru belum dipakai oleh program/plan LAIN
      while (programs.some(p => (p.planId || 'custom') !== planId && (p.planName || 'Program Default') === uniqueName)) {
        uniqueName = `${baseName} (${counter})`;
        counter++;
      }

      const updated = programs.map(p => {
        const pId = p.planId || 'custom';
        if (pId === planId) {
          return { ...p, planName: uniqueName };
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
            {(!routine.assignedDays || routine.assignedDays.length === 0) && (
                <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">Wajib Diisi</span>
            )}
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
              <button onClick={() => handleAddExercise(routine.id)} className={`flex items-center px-4 py-2 rounded-full text-white font-bold text-xs ${t.bgAccent} shadow-md hover:opacity-90 transition-all active:scale-95`}><Plus size={14} className="mr-1" /> Tambah Latihan</button>
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
              <button onClick={() => handleAddExercise(routine.id)} className={`flex-1 py-3 border-2 border-dashed ${t.borderAccentSoft} hover:${t.borderAccent} hover:${t.bgAccentSoft} rounded-full ${t.textAccent} font-bold text-sm flex justify-center items-center transition-all duration-200 active:scale-[0.98]`}>
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

  const closeEditAndScrollToPlan = (pId) => {
      const el = document.getElementById(`plan-mobile-${pId}`);
      if (el) {
          const endY = el.getBoundingClientRect().top + window.scrollY - 80;
          const startY = window.scrollY;
          const distance = endY - startY;
          const duration = 500; // Match CSS duration exactly
          const startTime = performance.now();
          
          const easeInOutQuad = (t, b, c, d) => {
            let time = t / (d / 2);
            if (time < 1) return c / 2 * time * time + b;
            time--;
            return -c / 2 * (time * (time - 2) - 1) + b;
          };

          const animation = (currentTime) => {
            const elapsed = currentTime - startTime;
            if (elapsed < duration) {
              window.scrollTo(0, easeInOutQuad(elapsed, startY, distance, duration));
              requestAnimationFrame(animation);
            } else {
              window.scrollTo(0, endY);
            }
          };
          requestAnimationFrame(animation);
      }
      setTimeout(() => {
          setEditingPlanId(null);
          // Prevent double layout calculation lag by resetting inner accordion after outer closes
          setTimeout(() => {
              setExpandedRoutineId(null);
          }, 550);
      }, 0); // start immediately, but in next tick so requestAnimationFrame registers first
  };

  const renderPlanCard = (planId, group, isActive, layout = 'mobile') => {
    const bgConfig = group.isAI 
        ? { url: '/bg-calendar.webp', position: 'center', bgSize: 'cover' } 
        : getPlanBgConfig(group.planName);

    return (      <div id={`plan-${layout}-${planId}`} key={planId} className={`scroll-mt-24 rounded-[2rem] border ${isActive ? t.borderAccent : 'border-white/10'} shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all flex flex-col relative min-h-[350px] group/card ${t.bgCard}`}>
              
        {/* Split Header (Left empty, Right glassmorphism) */}
        <div className="flex-none flex flex-row relative z-10 w-full min-h-[350px]">
          
          {/* HEADER BACKGROUND IMAGE (Restricted to header) */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* Base Layer for Glassmorphism */}
            <div 
              className={`absolute inset-0 transition-all duration-700 ${group.isAI ? 'opacity-20 blur-2xl scale-110' : 'opacity-60'}`}
              style={{
                backgroundImage: `url('${bgConfig.url}')`,
                backgroundSize: bgConfig.bgSize || 'cover',
                backgroundPosition: bgConfig.position || 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            {/* Focal Layer for Left Panel */}
            <div 
              className={`absolute top-0 -bottom-12 left-0 w-[55%] transition-all duration-700 opacity-100`}
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                maskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
              }}
            >
              <div 
                className="absolute inset-0 transition-all duration-700"
                style={{
                  backgroundImage: `url('${bgConfig.url}')`,
                  backgroundSize: bgConfig.bgSize || 'cover',
                  backgroundPosition: bgConfig.position || 'center',
                  backgroundRepeat: 'no-repeat',
                  transform: bgConfig.scale ? `scale(${bgConfig.scale})` : 'none',
                  transformOrigin: bgConfig.position || 'center'
                }}
              />
            </div>
          </div>

          {/* Left Side: Empty space so image shows */}
          <div className="w-[45%] relative">
             <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-transparent via-transparent to-[#05070d]/70' : 'from-transparent via-transparent to-black/30'} z-10`} />
          </div>
          
          {/* Right Side: Content */}
          <div className={`w-[55%] flex flex-col p-4 sm:p-5 border-l ${isDark ? 'bg-black/60 backdrop-blur-xl border-white/5' : 'bg-black/30 backdrop-blur-xl border-white/10'} shadow-[-10px_0_30px_rgba(0,0,0,0.3)]`}>
            
            {/* PLAN HEADER */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 w-full">
                  {editingPlanId === planId ? (
                    <div className={`relative group inline-block w-full flex-1`}>
                      <PlanNameInput
                        initialValue={group.planName}
                        onSave={(newName) => handleRenamePlan(planId, newName)}
                        className={`w-full bg-transparent font-black text-lg text-white outline-none border-b-2 border-transparent focus:border-white/50 transition-colors pr-2`}
                        placeholder="Nama Program..."
                      />
                    </div>
                  ) : (
                    <h2 className={`font-black text-xl flex-1 flex items-center gap-2 text-white drop-shadow-md leading-tight`}>
                      {group.planName}
                    </h2>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center mt-1">
                  {activityTargets?.nutritionGoal && activityTargets.nutritionGoal !== 'custom' && group.planGoal && group.planGoal !== 'maintenance' && group.planGoal !== activityTargets.nutritionGoal && (
                    <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-200 border border-rose-500/30 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide backdrop-blur-md">
                      ⚠️ {group.planGoal.replace('_', ' ')}
                    </div>
                  )}
                  {group.planLevel && (
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-sm`}>
                      {group.planLevel === 'beginner' ? 'Pemula' : group.planLevel === 'intermediate' ? 'Menengah' : group.planLevel === 'advanced' ? 'Mahir' : group.planLevel}
                    </span>
                  )}
                  {planId.startsWith('custom') && (
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-sm`}>
                      Custom
                    </span>
                  )}
                  {group.isAI && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-blue-500/30 text-blue-100 backdrop-blur-md border border-blue-400/40 shadow-sm shadow-blue-500/20`}>
                      <Brain size={10} /> Coach Raiga
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {editingPlanId === planId ? (
                  <>
                    <button 
                      onClick={() => handleDeletePlan(planId, group.planName)}
                      className={`p-1.5 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 transition-colors`}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingPlanId(planId);
                      if (!expandedRoutineId && group.routines.length > 0) {
                        setExpandedRoutineId(group.routines[0].id);
                      }
                      setTimeout(() => {
                        const el = document.getElementById(`plan-${layout}-${planId}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 150);
                    }}
                    className={`p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors`}
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* SIMPLE SCHEDULE LIST */}
            <div className="flex-1 overflow-y-auto mb-3 border-t border-white/10 pt-3">
                 <div className="flex flex-col gap-2">
                     {group.routines.map(r => (
                         <div key={r.id} className="flex items-start gap-2">
                             <div className={`w-1.5 h-1.5 shrink-0 rounded-full mt-1.5 ${t.bgAccent}`} />
                             <span className="text-[11px] font-bold text-white/90 drop-shadow-sm leading-tight line-clamp-2">{r.name}</span>
                         </div>
                     ))}
                 </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-auto flex gap-2 relative z-10 w-full pt-1">
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
                  className={`flex-1 py-3.5 rounded-full font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isActive ? `${t.bgAccent} text-white shadow-lg border border-transparent` : `bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-sm`}`}
                >
                  {isActive ? 'Aktif' : 'Aktifkan'}
                </button>
                {true && (
                  <button 
                    onClick={async () => {
                      playSoundEffect('click', soundEnabled);
                      if (user) {
                        setPendingShareProgram(group);
                      } else {
                        await showAlert('Kamu harus login untuk membagikan program.', { type: 'info' });
                      }
                    }}
                    className={`w-[48px] h-[48px] p-0 rounded-full transition-all flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-sm shrink-0`}
                    title="Bagikan ke Komunitas"
                  >
                    <Share2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ACCORDION CONTENT */}
          <div className={`grid relative z-10 transition-all duration-500 ease-in-out w-full ${editingPlanId === planId ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
              <div className="overflow-hidden">
                  <div className={`flex flex-col mt-3 rounded-[2rem] overflow-hidden border ${isDark ? 'border-white/5 bg-black/20' : 'border-black/5 bg-black/5'} shadow-inner`}>
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
                            <p className={`text-xs ${t.textMuted} mt-1`}>
                              {routine.assignedDays && routine.assignedDays.length > 0 && (
                                <span className={`font-bold ${t.textAccent} uppercase`}>{routine.assignedDays.join(', ')} &bull; </span>
                              )}
                              {routine.exercises.length} Latihan &bull; {routine.restTime}s Istirahat &bull; ~{estDuration} mnt
                            </p>
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

                {/* Add Custom Routine Button */}
                {true && (
                  <div className={`px-5 py-4 border-t ${t.border}`}>
                    {editingPlanId === planId ? (
                        <div className="flex flex-col gap-3">
                            <button 
                              onClick={() => handleCreateRoutine(planId, group.planName)}
                              className={`w-full py-3 rounded-full font-bold text-sm border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} hover:${t.bgAccentSoft} transition-all active:scale-95 flex items-center justify-center gap-2`}
                            >
                              <Plus size={16} /> Rutinitas Baru
                            </button>
                            <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                      playSoundEffect('click', soundEnabled);
                                      closeEditAndScrollToPlan(planId);
                                  }}
                                  className={`flex-[0.4] py-3 rounded-full font-bold text-sm ${t.inputBg} ${t.textMain} hover:opacity-80 transition-all active:scale-95`}
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => {
                                      const invalidRoutine = group.routines.find(r => !r.assignedDays || r.assignedDays.length === 0);
                                      if (invalidRoutine) {
                                          showAlert(`Rutinitas "${invalidRoutine.name}" belum memiliki jadwal hari. Silakan pilih minimal 1 hari.`, { type: 'error' });
                                          setExpandedRoutineId(invalidRoutine.id);
                                      } else {
                                          playSoundEffect('success', soundEnabled);
                                          closeEditAndScrollToPlan(planId);
                                      }
                                  }}
                                  className={`flex-1 py-3 rounded-full font-black text-white ${t.bgAccent} hover:opacity-90 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2`}
                                >
                                  Simpan Program
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                          onClick={() => { playSoundEffect('click', soundEnabled); setEditingPlanId(planId); }}
                          className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} hover:${t.bgAccentSoft} transition-all active:scale-95 flex items-center justify-center gap-2`}
                        >
                          <Edit2 size={16} /> Edit Program
                        </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>  
      </div>
    );
  };
  return (
    <div className="flex flex-col animate-in fade-in duration-300 pb-6 max-w-4xl mx-auto w-full space-y-3 sm:space-y-4">
  
      {/* AI Generator Banner - REDESIGNED */}
      <div 
        className={`w-full rounded-[2rem] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all flex flex-col relative min-h-[300px] sm:min-h-[360px]`}
      >
        {/* --- Background Image Layer --- */}
        <div 
          className={`absolute inset-0 z-0 pointer-events-none transition-all duration-700 opacity-100`}
          style={{
            backgroundImage: `url('/bg-program.webp')`,
            backgroundSize: '130%',
            backgroundPosition: 'center 10%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className={`absolute inset-0 z-0 bg-gradient-to-t ${isDark ? 'from-[#05070d]/90 via-[#05070d]/50 to-transparent' : 'from-black/80 via-black/40 to-transparent'} pointer-events-none`} />
        {/* ------------------------------ */}
        
        <div className="mt-auto relative z-10 w-full flex flex-col">
          {/* TEXT HEADER (NO BLUR) */}
          <div className="w-full sm:w-3/4 p-5 pb-4 sm:p-6 sm:pb-5">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`font-black text-3xl text-white drop-shadow-lg`}>Program Latihan</h3>
            </div>
            <p className={`text-sm font-medium text-white/90 drop-shadow-md leading-relaxed`}>
              Jawab beberapa pertanyaan untuk mendapatkan program latihan terbaik yang dipersonalisasi untuk Anda.
            </p>
          </div>

          {/* GLASSMORPHISM BUTTONS OVERLAY */}
          <div className={`w-full ${isDark ? 'bg-black/10 backdrop-blur-sm border-t border-white/10' : 'bg-black/5 backdrop-blur-sm border-t border-white/20'} p-5 pt-4 sm:p-6 sm:pt-4 transition-all duration-300`}>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { playSoundEffect('click', soundEnabled); openQuestionnaire(); }}
                className={`w-full py-3.5 rounded-[14px] font-black text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 transition-all flex items-center justify-center text-sm`}
              >
                Coach Raiga
              </button>
              <button 
                onClick={() => { 
                  handleCreateCustomPlan(); 
                }}
                className={`w-full py-3.5 rounded-[14px] font-bold text-white transition-all active:scale-95 flex items-center justify-center text-sm bg-white/10 hover:bg-white/20 border border-white/20 shadow-sm`}
              >
                Program Custom
              </button>
            </div>
          </div>
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
        onClose={() => { setShowAlternativeModal(false); setDetailExercise(null); }}
        originalEx={detailExercise}
        exerciseLibrary={exerciseLibrary}
        onSelectAlternative={handleSelectAlternative}
        t={t} lang={lang} soundEnabled={soundEnabled}
      />

      {pendingShareProgram && (
        <CreatePostModal
          user={user}
          theme={t.bgCard !== 'bg-white' ? 'dark' : 'light'}
          postDataOverrides={{
            type: 'template',
            programName: pendingShareProgram.name || pendingShareProgram.planName || 'Custom Program',
            programData: {
              name: pendingShareProgram.name || pendingShareProgram.planName || 'Custom Program',
              planName: pendingShareProgram.planName || 'Custom',
              routines: (pendingShareProgram.routines || []).map(r => ({
                name: r.name,
                exercises: (r.exercises || []).map(e => ({ name: e.name })),
              })),
              exercises: pendingShareProgram.routines
                ? pendingShareProgram.routines.flatMap(r => (r.exercises || []).map(e => ({ name: e.name })))
                : (pendingShareProgram.exercises || []).map(e => ({ name: e.name })),
              restTime: pendingShareProgram.restTime || 90,
              userName: user?.name || user?.email?.split('@')[0] || 'Anonim',
            }
          }}
          onClose={async (success, newPostId) => {
            setPendingShareProgram(null);
            if (success) {
              if (onPostCreated) onPostCreated(newPostId);
            }
          }}
        />
      )}
      
      {/* Floating Coach Raiga button moved to App.jsx for global visibility */}

      {/* GymAIChat is now rendered globally in App.jsx; onAcceptProgram is passed down via prop */}
      
      {dialog}
    </div>
  );
};

export default ProgramTab;
