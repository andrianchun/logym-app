import React, { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, ArrowUp, ArrowDown, Clock, Flame, Link as LinkIcon, X, Dumbbell, ChevronRight, Copy } from 'lucide-react';
import { formatTarget } from '../data/constants';
import { playSoundEffect } from '../utils/audio';

const ProgramTab = ({ setConfirmModal, t, lang, programs, setPrograms, exerciseLibrary, soundEnabled, setActiveAddModalTarget, saveStateToHistory }) => {

  // ==========================================
  // STATE
  // ==========================================
  const [selectedProgramId, setSelectedProgramId] = useState(programs[0]?.id || null);
  const [warmupUrlInput, setWarmupUrlInput] = useState('');
  const [reorderingId, setReorderingId] = useState(null); // animation helper
  const pillScrollRef = useRef(null);

  // Derive active program
  const activeProgram = programs.find(p => p.id === selectedProgramId) || programs[0];
  const activeProgramId = activeProgram?.id;

  // Sync selectedProgramId if it becomes stale (e.g. after delete)
  useEffect(() => {
    if (!programs.find(p => p.id === selectedProgramId) && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  // ==========================================
  // PROGRAM-LEVEL HANDLERS
  // ==========================================
  const handleCreateProgram = () => {
    playSoundEffect('click', soundEnabled);
    const newProg = {
      id: 'prog-' + Date.now(),
      name: 'Program Baru',
      restTime: 120,
      warmupVideoUrls: [],
      exercises: []
    };
    setPrograms([...programs, newProg]);
    setSelectedProgramId(newProg.id);
    // Auto-scroll pill row to end
    setTimeout(() => {
      if (pillScrollRef.current) {
        pillScrollRef.current.scrollLeft = pillScrollRef.current.scrollWidth;
      }
    }, 100);
  };

  const handleDeleteProgram = () => {
    if (programs.length <= 1) return;
    playSoundEffect('click', soundEnabled);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Program',
      message: lang.confirmDeleteProgram || `Yakin ingin menghapus program "${activeProgram.name}"?`,
      onConfirm: () => {
        const remaining = programs.filter(p => p.id !== activeProgramId);
        setPrograms(remaining);
        setSelectedProgramId(remaining[0]?.id);
      }
    });
  };

  const handleDuplicateProgram = () => {
    playSoundEffect('click', soundEnabled);
    const dupe = {
      ...activeProgram,
      id: 'prog-' + Date.now(),
      name: activeProgram.name + ' (Copy)',
      exercises: activeProgram.exercises.map(ex => ({ ...ex })),
      warmupVideoUrls: [...(activeProgram.warmupVideoUrls || [])]
    };
    setPrograms([...programs, dupe]);
    setSelectedProgramId(dupe.id);
  };

  const handleRenameProgram = (newName) => {
    setPrograms(programs.map(p => p.id === activeProgramId ? { ...p, name: newName } : p));
  };

  // ==========================================
  // REST TIME HANDLERS
  // ==========================================
  const handleRestTimeChange = (val) => {
    setPrograms(programs.map(p => p.id === activeProgramId ? { ...p, restTime: Number(val) } : p));
  };

  // ==========================================
  // WARMUP VIDEO HANDLERS
  // ==========================================
  const handleAddWarmupUrl = () => {
    const url = warmupUrlInput.trim();
    if (!url) return;
    playSoundEffect('click', soundEnabled);
    setPrograms(programs.map(p => p.id === activeProgramId ? {
      ...p,
      warmupVideoUrls: [...(p.warmupVideoUrls || []), url]
    } : p));
    setWarmupUrlInput('');
  };

  const handleRemoveWarmupUrl = (idx) => {
    playSoundEffect('click', soundEnabled);
    setPrograms(programs.map(p => p.id === activeProgramId ? {
      ...p,
      warmupVideoUrls: (p.warmupVideoUrls || []).filter((_, i) => i !== idx)
    } : p));
  };

  // ==========================================
  // EXERCISE HANDLERS
  // ==========================================
  const handleUpdateExercise = (exId, field, val) => {
    const numVal = val === '' ? '' : Number(val);
    setPrograms(programs.map(p => p.id === activeProgramId ? {
      ...p,
      exercises: p.exercises.map(ex => ex.id === exId ? { ...ex, [field]: numVal } : ex)
    } : p));
  };

  const handleRemoveExercise = (exId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Latihan?',
      message: lang.confirmRemoveEx || 'Yakin ingin menghapus latihan ini dari program?',
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        setPrograms(programs.map(p => p.id === activeProgramId ? {
          ...p,
          exercises: p.exercises.filter(ex => ex.id !== exId)
        } : p));
      }
    });
  };

  const handleMoveExercise = (idx, direction) => {
    playSoundEffect('swipe', soundEnabled);
    const newIdx = idx + direction;
    const exList = [...activeProgram.exercises];
    if (newIdx < 0 || newIdx >= exList.length) return;

    // Set animation hint
    setReorderingId(exList[idx].id);
    setTimeout(() => setReorderingId(null), 350);

    // Swap
    [exList[idx], exList[newIdx]] = [exList[newIdx], exList[idx]];
    setPrograms(programs.map(p => p.id === activeProgramId ? { ...p, exercises: exList } : p));
  };

  const handleAddExercise = () => {
    playSoundEffect('click', soundEnabled);
    setActiveAddModalTarget({ type: 'program', progId: activeProgramId });
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const restPresets = [60, 90, 120, 180];

  const getEquipmentColor = (eq) => {
    const colors = {
      'Dumbbell': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      'Barbell': 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      'Smith Machine': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
      'Cable/Machine': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      'Bodyweight': 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
      'Cardio Machine': 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    };
    return colors[eq] || 'bg-gray-500/15 text-gray-600 dark:text-gray-400';
  };

  // ==========================================
  // RENDER: No programs fallback
  // ==========================================
  if (!programs || programs.length === 0) {
    return (
      <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-20">
        <Dumbbell size={48} className={`${t.textMuted} mb-4`} />
        <p className={`font-bold ${t.textMuted} mb-6`}>{lang.noPrograms || 'Belum ada program.'}</p>
        <button
          onClick={handleCreateProgram}
          className={`flex items-center px-6 py-3.5 rounded-xl text-white font-black body-lg ${t.bgAccent} shadow-lg hover:opacity-90 transition-all active:scale-95`}
        >
          <Plus size={18} className="mr-2" /> {lang.createProgram || 'Buat Program Pertama'}
        </button>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 animate-in fade-in duration-300 pb-10">

      {/* ===== SECTION 1: PROGRAM PILL TABS ===== */}
      <div className="relative w-full sm:w-[35%] sm:sticky sm:top-20 sm:pr-2">
        <div
          ref={pillScrollRef}
          className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible md:flex-wrap md:overflow-visible hide-scrollbar pb-1 sm:pb-4 -mx-1 sm:mx-0 px-1 sm:px-0"
        >
          {programs.map(prog => (
            <button
              key={prog.id}
              onClick={() => { playSoundEffect('click', soundEnabled); setSelectedProgramId(prog.id); }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold body-md whitespace-nowrap transition-all duration-200 active:scale-95
                ${prog.id === activeProgramId
                  ? `${t.bgAccent} text-white shadow-lg`
                  : `${t.bgCard} ${t.textMuted} border ${t.border} hover:${t.textMain}`
                }`}
            >
              {prog.name}
              <span className={`ml-1.5 sm:ml-auto sm:text-[11px] text-[10px] opacity-70`}>({prog.exercises.length})</span>
            </button>
          ))}

          {/* Create new program button */}
          <button
            onClick={handleCreateProgram}
            className={`flex-shrink-0 flex items-center justify-center px-4 py-2.5 rounded-xl font-bold body-md whitespace-nowrap border-2 border-dashed ${t.borderAccentSoft} ${t.textAccent} hover:${t.bgAccentSoft} transition-all duration-200 active:scale-95`}
          >
            <Plus size={14} className="mr-1" /> {lang.newProgram || 'Buat Baru'}
          </button>
        </div>
      </div>

      {/* ===== SECTION 2: PROGRAM DETAIL ===== */}
      {activeProgram && (
        <div className="space-y-5 w-full sm:w-[65%] mt-6 sm:mt-0">

          {/* --- 2a: PROGRAM HEADER --- */}
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={activeProgram.name}
                  onChange={(e) => handleRenameProgram(e.target.value)}
                  className={`w-full bg-transparent h1 ${t.textMain} outline-none border-b-2 border-transparent focus:${t.borderAccentSoft} transition-colors pb-1`}
                  placeholder="Nama Program..."
                />
                <p className={`body-md ${t.textMuted} mt-2`}>
                  {activeProgram.exercises.length} {lang.exercises || 'latihan'} · {activeProgram.restTime || 120}s {lang.rest || 'istirahat'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleDuplicateProgram}
                  className={`p-3 rounded-xl ${t.bgCard} border ${t.border} ${t.textMuted} hover:${t.textAccent} transition-colors`}
                  title={lang.duplicate || 'Duplikat'}
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={handleDeleteProgram}
                  disabled={programs.length <= 1}
                  className={`p-2 rounded-xl border transition-colors flex-shrink-0 flex items-center justify-center w-10 h-10 ${
                    programs.length <= 1
                      ? 'opacity-30 cursor-not-allowed border-gray-300 text-gray-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                  }`}
                  title={lang.delete || 'Hapus Program'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* --- 2b: REST TIME --- */}
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className={t.textAccent} />
              <h3 className={`font-black body-lg ${t.textMain}`}>⏱ {lang.restTime || 'Waktu Istirahat'}</h3>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="30"
                max="300"
                step="5"
                value={activeProgram.restTime || 120}
                onChange={(e) => handleRestTimeChange(e.target.value)}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-current"
                style={{
                  background: `linear-gradient(to right, var(--accent-color, #6366f1) ${((activeProgram.restTime - 30) / 270) * 100}%, rgba(128,128,128,0.2) ${((activeProgram.restTime - 30) / 270) * 100}%)`
                }}
              />
              <div className={`h1 ${t.textAccent} min-w-[80px] text-right`}>
                {activeProgram.restTime || 120}<span className="body-lg opacity-60 ml-0.5">s</span>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap">
              {restPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => { playSoundEffect('click', soundEnabled); handleRestTimeChange(preset); }}
                  className={`px-4 py-2 rounded-xl body-md transition-all duration-150 active:scale-95
                    ${(activeProgram.restTime || 120) === preset
                      ? `${t.bgAccent} text-white shadow-md`
                      : `${t.inputBg} ${t.textMuted} hover:${t.textMain}`
                    }`}
                >
                  {preset}s
                </button>
              ))}
            </div>
          </div>

          {/* --- 2c: WARMUP VIDEOS --- */}
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={18} className="text-orange-500" />
              <h3 className={`font-black body-lg ${t.textMain}`}>🔥 {lang.warmupVideos || 'Video Pemanasan Kustom'}</h3>
            </div>
            <p className={`body-md ${t.textMuted} mb-4`}>
              {lang.warmupDesc || 'Kosongkan untuk menggunakan pemanasan default.'}
            </p>

            {/* Existing URLs */}
            {(activeProgram.warmupVideoUrls || []).length > 0 && (
              <div className="space-y-2 mb-4">
                {activeProgram.warmupVideoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2.5 rounded-xl ${t.inputBg} group`}
                  >
                    <LinkIcon size={14} className={`${t.textMuted} flex-shrink-0`} />
                    <span className={`body-md ${t.textMain} truncate flex-1`}>{url}</span>
                    <button
                      onClick={() => handleRemoveWarmupUrl(idx)}
                      className="p-2 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add URL input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={warmupUrlInput}
                onChange={(e) => setWarmupUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWarmupUrl()}
                placeholder="https://youtu.be/..."
                className={`flex-1 px-3 py-2.5 rounded-xl body-md ${t.inputBg} ${t.textMain} outline-none placeholder:${t.textMuted} focus:ring-2 ${t.ringAccent} transition-all`}
              />
              <button
                onClick={handleAddWarmupUrl}
                disabled={!warmupUrlInput.trim()}
                className={`px-4 py-2.5 rounded-xl body-md font-black transition-all active:scale-95
                  ${warmupUrlInput.trim()
                    ? `${t.bgAccent} text-white shadow-md hover:opacity-90`
                    : `${t.inputBg} ${t.textMuted} opacity-50 cursor-not-allowed`
                  }`}
              >
                {lang.add || 'Tambah'}
              </button>
            </div>
          </div>

          {/* --- 2d: EXERCISE LIST --- */}
          <div className={`p-5 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell size={18} className={t.textAccent} />
                <h3 className={`font-black body-lg ${t.textMain}`}>
                  {lang.exerciseList || 'Daftar Latihan'}{' '}
                  <span className={`${t.textAccent}`}>({activeProgram.exercises.length} {lang.exerciseCount || 'latihan'})</span>
                </h3>
              </div>
            </div>

            {/* Exercise cards */}
            {activeProgram.exercises.length === 0 ? (
              /* Empty state */
              <div className={`flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed ${t.border}`}>
                <div className={`p-4 rounded-2xl ${t.bgAccentSoft} mb-4`}>
                  <Dumbbell size={32} className={t.textAccent} />
                </div>
                <p className={`body-lg ${t.textMuted} mb-1`}>
                  {lang.emptyExercise || 'Belum ada latihan'}
                </p>
                <p className={`body-md ${t.textMuted} mb-5`}>
                  {lang.emptyExerciseHint || 'Tambah dari database!'}
                </p>
                <button
                  onClick={handleAddExercise}
                  className={`flex items-center px-5 py-2.5 rounded-xl text-white font-black body-md ${t.bgAccent} shadow-lg hover:opacity-90 transition-all active:scale-95`}
                >
                  <Plus size={16} className="mr-1.5" /> {lang.addExercise || 'Tambah Latihan'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeProgram.exercises.map((ex, idx) => {
                  const isTime = ex.type === 'time';
                  const isReordering = reorderingId === ex.id;

                  return (
                    <div
                      key={ex.id}
                      className={`relative p-3.5 rounded-xl border ${t.border} transition-all duration-300
                        ${isReordering ? 'scale-[1.02] shadow-lg ring-2 ' + t.ringAccent : 'hover:shadow-md'}
                        bg-gradient-to-r from-transparent to-transparent hover:${t.bgAccentSoft}
                      `}
                      style={{ backgroundColor: isReordering ? undefined : 'rgba(128,128,128,0.03)' }}
                    >
                      {/* Top row: handle, index, name, arrows, delete */}
                      <div className="flex items-center gap-2 mb-3">
                        {/* Grip handle */}
                        <GripVertical size={16} className={`${t.textMuted} flex-shrink-0 opacity-40`} />

                        {/* Index badge */}
                        <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${t.bgAccent} text-white flex-shrink-0`}>
                          {idx + 1}
                        </span>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {/* GIF thumbnail */}
                            {ex.gifUrl && (
                              <img
                                src={ex.gifUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-black/10"
                              />
                            )}
                            <div className="min-w-0">
                              <p className={`body-lg ${t.textMain} truncate flex items-center gap-1.5`}>
                                {ex.name}
                                {(ex.id > 1000000 && ex.source !== 'exercisedb') && <span className="px-1 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black leading-none shadow-md border border-black/10 text-center uppercase">CUSTOM</span>}
                              </p>
                              <p className={`text-[10px] font-medium ${t.textAccent} truncate`}>
                                {formatTarget(ex.target, lang?.id)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Reorder arrows */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleMoveExercise(idx, -1)}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-lg transition-all ${
                              idx === 0 ? 'opacity-20 cursor-not-allowed' : `${t.textMuted} hover:${t.textAccent} hover:${t.bgAccentSoft} active:scale-90`
                            }`}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveExercise(idx, 1)}
                            disabled={idx === activeProgram.exercises.length - 1}
                            className={`p-1.5 rounded-lg transition-all ${
                              idx === activeProgram.exercises.length - 1 ? 'opacity-20 cursor-not-allowed' : `${t.textMuted} hover:${t.textAccent} hover:${t.bgAccentSoft} active:scale-90`
                            }`}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleRemoveExercise(ex.id)}
                          className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors flex-shrink-0 active:scale-90"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Bottom row: Equipment badge + Inline sets/reps */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Equipment badge */}
                        {ex.equipment && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getEquipmentColor(ex.equipment)}`}>
                            {ex.equipment}
                          </span>
                        )}

                        <div className="flex-1" />

                        {/* Sets input */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${t.textMuted} uppercase`}>Sets</span>
                          <input
                            type="number"
                            value={ex.sets === 0 ? '' : ex.sets}
                            onChange={(e) => handleUpdateExercise(ex.id, 'sets', e.target.value)}
                            placeholder="0"
                            min="0"
                            className={`w-12 px-1.5 py-1 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black body-md outline-none focus:ring-1 ${t.ringAccent} transition-all`}
                          />
                        </div>

                        {/* Reps or Duration input */}
                        {isTime ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold ${t.textMuted} uppercase`}>Min</span>
                            <input
                              type="number"
                              value={ex.duration === 0 ? '' : ex.duration}
                              onChange={(e) => handleUpdateExercise(ex.id, 'duration', e.target.value)}
                              placeholder="0"
                              min="0"
                              className={`w-12 px-1.5 py-1 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black body-md outline-none focus:ring-1 ${t.ringAccent} transition-all`}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold ${t.textMuted} uppercase`}>Reps</span>
                            <input
                              type="number"
                              value={ex.reps === 0 ? '' : ex.reps}
                              onChange={(e) => handleUpdateExercise(ex.id, 'reps', e.target.value)}
                              placeholder="0"
                              min="0"
                              className={`w-12 px-1.5 py-1 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black body-md outline-none focus:ring-1 ${t.ringAccent} transition-all`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* --- 2e: ADD EXERCISE BUTTON --- */}
            {activeProgram.exercises.length > 0 && (
              <button
                onClick={handleAddExercise}
                className={`w-full mt-4 py-4 border-2 border-dashed ${t.borderAccentSoft} hover:${t.borderAccent} hover:${t.bgAccentSoft} rounded-xl ${t.textAccent} font-black body-lg flex justify-center items-center transition-all duration-200 active:scale-[0.98]`}
              >
                <Plus size={16} className="mr-1.5" />
                {lang.addToProgram || 'Tambah Latihan ke'} {activeProgram.name}
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default ProgramTab;
