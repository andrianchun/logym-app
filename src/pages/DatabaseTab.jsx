import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Filter, Edit2, Plus, Dumbbell, Loader2, RefreshCw, Link as LinkIcon, X, Check, AlertCircle, ChevronDown, Database, Globe, Heart } from 'lucide-react';
import { formatTarget, normalizeMuscleKey, muscleOptions, equipmentOptions, getVideoId, levelOptions } from '../data/constants';
import EquipmentIcon from '../components/EquipmentIcon';
import { fetchExercisesFromApi, clearExerciseDbCache, getCachedExercises } from '../utils/exerciseDbApi';
import { playSoundEffect } from '../utils/audio';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import UnifiedExerciseCard from '../components/UnifiedExerciseCard';
import FilterChips from '../components/FilterChips';
import SwipeInput from '../components/SwipeInput';
import GymManagerModal from '../components/GymManagerModal';

// ─── Blank exercise template ───────────────────────────────────────
const blankExercise = () => ({
  id: Date.now(),
  name: '',
  target: [],
  instructions: ['1. '],
  type: 'weight',
  equipment: 'Lainnya',
  level: 'beginner',
  defaultWeight: 0,
  ytVideo: '',
  gifUrl: '',
  source: 'custom',
});

const exerciseTypeLabels = {
  weight: 'Beban & Repetisi',
  reps: 'Repetisi',
  time: 'Durasi',
};

const levelLabels = {
  beginner: 'Pemula',
  intermediate: 'Menengah',
  advanced: 'Mahir',
};

// ─── Sub-component: ExerciseForm ───────────────────────────────────
const ExerciseForm = ({ t, lang, formData, setFormData, originalData, onSave, onCancel, isEditing }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = React.useRef(null);
  
  React.useEffect(() => {
      const handleClickOutside = (e) => {
          if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
              setOpenDropdown(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMuscle = (m) => {
    setFormData(prev => ({
      ...prev,
      target: prev.target.includes(m) ? prev.target.filter(x => x !== m) : [...prev.target, m],
    }));
  };

  const hasChanges = originalData ? (
    formData.name !== originalData.name ||
    formData.type !== originalData.type ||
    formData.equipment !== originalData.equipment ||
    formData.level !== originalData.level ||
    formData.defaultWeight !== originalData.defaultWeight ||
    formData.ytVideo !== originalData.ytVideo ||
    JSON.stringify(formData.target) !== JSON.stringify(originalData.target) ||
    JSON.stringify(formData.instructions) !== JSON.stringify(originalData.instructions)
  ) : true;

  const canSave = formData.name.trim().length > 0 && formData.target.length > 0 && hasChanges;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={onCancel}>
      <div 
        className={`w-full max-w-md sm:max-w-3xl mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border ${t.border} p-6`}
        onClick={e => e.stopPropagation()}
      >
      <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-8 space-y-5 sm:space-y-0">
        
        {/* Kolom Kiri */}
        <div className="space-y-5">
      {/* Name */}
      <div>
        <label className={`body-md ${t.textMuted} mb-1 block`}>{lang?.exerciseName || 'Nama Latihan'}</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Contoh: Bench Press"
          className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent} transition-all placeholder:opacity-30 dark:placeholder:opacity-40`}
        />
      </div>

      {/* Target Muscles */}
      <div className="w-full overflow-hidden">
        <label className={`body-md ${t.textMuted} mb-2 block`}>{lang?.targetMuscles || 'Target Otot'}</label>
        <div 
          className="relative -mx-6"
          style={{ WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)', maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)' }}
        >
          <div className="flex flex-col flex-wrap content-start gap-2 overflow-x-auto hide-scrollbar h-[96px] pb-2 px-6">
            {muscleOptions.map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl body-md transition-all ${
                  formData.target.includes(m) ? `${t.bgAccent} text-white font-bold` : `border border-dashed ${t.border} ${t.textMuted} hover:bg-white/5`
                }`}
              >
                {formatTarget(m, lang?.id)}
              </button>
            ))}
            {/* Spacer for proper right margin */}
            <div className="w-4 h-full pointer-events-none shrink-0"></div>
          </div>
        </div>
      </div>
      </div> {/* Akhir Kolom Kiri */}

      {/* Kolom Kanan */}
      <div className="space-y-5" ref={dropdownRef}>
      {/* Equipment and Type */}
      <div className="grid grid-cols-[4fr_5fr] gap-3">
        {/* Equipment */}
        <div className={openDropdown === 'equipment' ? 'relative z-[70]' : 'relative z-10'}>
          <label className={`body-md ${t.textMuted} mb-2 block`}>{lang?.equipment || 'Equipment'}</label>
          <div className="relative">
            <button 
                onClick={(e) => { e.preventDefault(); setOpenDropdown(openDropdown === 'equipment' ? null : 'equipment'); }}
                className={`relative z-[60] w-full body-lg font-bold p-3 px-4 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border border-transparent focus:ring-2 focus:${t.ringAccent} transition-colors`}
            >
                <span className="truncate flex-1 text-left min-w-0">{formData.equipment}</span>
                <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${openDropdown === 'equipment' ? 'rotate-180' : ''} ${t.textMuted}`} />
            </button>
            {openDropdown === 'equipment' && (
                <div className={`absolute top-full right-0 left-0 -mt-3 pt-4 pb-1 rounded-b-2xl border ${t.border} border-t-0 ${t.bgCard} shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[50] animate-in slide-in-from-top-2 origin-top`}>
                    {equipmentOptions.map(eq => (
                        <button
                            key={eq}
                            onClick={(e) => {
                                e.preventDefault();
                                setFormData(prev => ({ ...prev, equipment: eq }));
                                setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${formData.equipment === eq ? t.textAccent + ' bg-black/5 dark:bg-white/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            {eq}
                        </button>
                    ))}
                </div>
            )}
          </div>
        </div>

        {/* Type */}
        <div className={openDropdown === 'type' ? 'relative z-[70]' : 'relative z-10'}>
          <label className={`body-md ${t.textMuted} mb-2 block`}>{lang?.exerciseType || 'Tipe Latihan'}</label>
          <div className="relative">
            <button 
                onClick={(e) => { e.preventDefault(); setOpenDropdown(openDropdown === 'type' ? null : 'type'); }}
                className={`relative z-[60] w-full body-lg font-bold p-3 px-4 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border border-transparent focus:ring-2 focus:${t.ringAccent} transition-colors`}
            >
                <span className="truncate flex-1 text-left min-w-0">{exerciseTypeLabels[formData.type]}</span>
                <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${openDropdown === 'type' ? 'rotate-180' : ''} ${t.textMuted}`} />
            </button>
            {openDropdown === 'type' && (
                <div className={`absolute top-full right-0 left-0 -mt-3 pt-4 pb-1 rounded-b-2xl border ${t.border} border-t-0 ${t.bgCard} shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[50] animate-in slide-in-from-top-2 origin-top`}>
                    {Object.entries(exerciseTypeLabels).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={(e) => {
                                e.preventDefault();
                                setFormData(prev => ({ ...prev, type: val }));
                                setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${formData.type === val ? t.textAccent + ' bg-black/5 dark:bg-white/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
          </div>
        </div>
      </div>

        <div className="grid grid-cols-[4fr_5fr] gap-3">
          {/* Level */}
          <div className={`w-full ${openDropdown === 'level' ? 'relative z-[70]' : 'relative z-10'}`}>
            <label className={`body-md ${t.textMuted} mb-2 block`}>Level Latihan</label>
            <div className="relative">
              <button 
                  onClick={(e) => { e.preventDefault(); setOpenDropdown(openDropdown === 'level' ? null : 'level'); }}
                  className={`relative z-[50] w-full body-lg font-bold p-3 px-4 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border border-transparent focus:ring-2 focus:${t.ringAccent} transition-colors`}
              >
                  <span className="truncate flex-1 text-left min-w-0">{levelLabels[formData.level] || 'Pemula'}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${openDropdown === 'level' ? 'rotate-180' : ''} ${t.textMuted}`} />
              </button>
              {openDropdown === 'level' && (
                  <div className={`absolute top-full right-0 left-0 -mt-3 pt-4 pb-1 rounded-b-2xl border ${t.border} border-t-0 ${t.bgCard} shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[40] animate-in slide-in-from-top-2 origin-top`}>
                      {Object.entries(levelLabels).map(([val, label]) => (
                          <button
                              key={val}
                              onClick={(e) => {
                                  e.preventDefault();
                                  setFormData(prev => ({ ...prev, level: val }));
                                  setOpenDropdown(null);
                              }}
                              className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${formData.level === val ? t.textAccent + ' bg-black/5 dark:bg-white/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                          >
                              {label}
                          </button>
                      ))}
                  </div>
              )}
            </div>
          </div>
    
          {/* Video Link */}
          <div className="w-full">
            <label className={`body-md ${t.textMuted} mb-2 block`}>
              {lang?.videoLink || 'Link Video'}
            </label>
            <input
              type="url"
              value={formData.ytVideo || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, ytVideo: e.target.value }))}
              placeholder="https://youtu.be/..."
              className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent} placeholder:opacity-30 dark:placeholder:opacity-40`}
            />
          </div>
        </div>

      {/* Instructions */}
      <div>
        <label className={`body-md ${t.textMuted} mb-2 block`}>{lang?.howTo || 'Cara Melakukan (Opsional)'}</label>
        <textarea
          value={Array.isArray(formData.instructions) ? formData.instructions.join('\n') : (formData.instructions || '')}
          onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value.split('\n') }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const el = e.target;
              const val = el.value;
              const cursor = el.selectionStart;
              const textBefore = val.substring(0, cursor);
              const lines = textBefore.split('\n');
              const lastLine = lines[lines.length - 1];
              
              const match = lastLine.match(/^(\d+)([\.\)]\s+)(.*)$/);
              if (match) {
                e.preventDefault();
                const num = parseInt(match[1], 10);
                const separator = match[2];
                const content = match[3];
                
                if (content.trim() === '') {
                  const newTextBefore = lines.slice(0, -1).join('\n') + (lines.length > 1 ? '\n' : '');
                  const newText = newTextBefore + val.substring(el.selectionEnd);
                  const newCursor = newTextBefore.length;
                  
                  setFormData(prev => ({ ...prev, instructions: newText.split('\n') }));
                  setTimeout(() => { el.selectionStart = el.selectionEnd = newCursor; }, 0);
                  return;
                }
                
                const insertText = `\n${num + 1}${separator}`;
                const newText = textBefore + insertText + val.substring(el.selectionEnd);
                const newCursor = textBefore.length + insertText.length;
                
                setFormData(prev => ({ ...prev, instructions: newText.split('\n') }));
                setTimeout(() => { el.selectionStart = el.selectionEnd = newCursor; }, 0);
              }
            }
          }}
          placeholder="1. Posisikan tubuh...&#10;2. Angkat beban..."
          rows={6}
          className={`w-full p-4 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent} placeholder:opacity-30 dark:placeholder:opacity-40 custom-scrollbar resize-y min-h-[140px]`}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-4">
        <button 
          onClick={onCancel}
          className={`flex-1 flex items-center justify-center py-4 rounded-xl body-lg font-black transition-all bg-black/5 dark:bg-white/5 border ${t.border} ${t.textMain} hover:bg-black/10 dark:hover:bg-white/10 active:scale-95`}
        >
          <span className="whitespace-nowrap leading-none">{lang?.cancel || 'Batal'}</span>
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); onSave(); }}
          disabled={!canSave}
          className={`flex-[1.5] flex items-center justify-center py-4 rounded-xl text-white body-lg font-black transition-all ${
            canSave ? `${t.bgAccent} shadow-lg hover:opacity-90 active:scale-95` : 'bg-slate-600/50 text-white/50 cursor-not-allowed'
          }`}
        >
          <span className="whitespace-nowrap leading-none">{isEditing ? (lang?.save || 'Simpan Perubahan') : 'Simpan Custom'}</span>
        </button>
      </div>

      </div> {/* Akhir Kolom Kanan */}
      </div> {/* Akhir Grid */}

      <div className="pb-4 sm:pb-0"></div>
      </div>
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════════
// ─── Main Component: DatabaseTab ──────────────────────────────────
const DatabaseTab = ({ t, lang, exerciseLibrary, setExerciseLibrary, history, soundEnabled, warmupVideos, setWarmupVideos, cooldownVideos, setCooldownVideos, onOpenDetail, setConfirmModal, theme, gymProfiles, setGymProfiles, activeGymId, setActiveGymId }) => {
  // ── Tab State ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'custom'

  // --- Swipe Logic for Tab Switch ---
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && viewMode === 'all') {
      setViewMode('custom');
      playSoundEffect('swipe', soundEnabled);
      e.stopPropagation(); // Prevent global swipe
    } else if (isRightSwipe && viewMode === 'custom') {
      setViewMode('all');
      playSoundEffect('swipe', soundEnabled);
      e.stopPropagation(); // Prevent global swipe
    }
  };

  // 🟢 Form State 🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(blankExercise());
  const [originalData, setOriginalData] = useState(null);

  // ── Filter & Search State ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState([]);
  const [equipFilter, setEquipFilter] = useState([]);
  const [levelFilter, setLevelFilter] = useState([]);
  const [sortOrder, setSortOrder] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // ── Online API State ─────────────────────────────────────────────
  const [onlineExercises, setOnlineExercises] = useState(getCachedExercises());
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState(null);
  const [onlineFetched, setOnlineFetched] = useState(false);

  // ── Toggle filter helper ─────────────────────────────────────────
  const toggleFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  // ── Fetch online exercises automatically ─────────────────────────
  const handleFetchOnline = useCallback(async (force = false) => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const data = await fetchExercisesFromApi(force);
      setOnlineExercises(data || []);
      setOnlineFetched(true);
    } catch (err) {
      setOnlineError(err.message || 'Gagal memuat data dari ExerciseDB');
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!onlineFetched && !onlineLoading) {
      handleFetchOnline();
    }
  }, [onlineFetched, onlineLoading, handleFetchOnline]);

  const handleRefreshOnline = () => {
    playSoundEffect('click', soundEnabled);
    clearExerciseDbCache();
    setOnlineFetched(false);
    handleFetchOnline(true);
  };

  // ── Combine Local and Online Library ─────────────────────────────
  const combinedLibrary = useMemo(() => {
    const onlineMap = new Map();
    onlineExercises.forEach(ex => onlineMap.set(ex.name.trim().toLowerCase(), ex));

    const localMap = new Map();
    exerciseLibrary.forEach(localEx => {
      const key = localEx.name.trim().toLowerCase();
      
      let enrichedEx = { ...localEx };
      if (onlineMap.has(key)) {
        const onlineEx = onlineMap.get(key);
        enrichedEx.instructions = onlineEx.instructions || enrichedEx.instructions;
        enrichedEx.gifUrl = onlineEx.gifUrl || enrichedEx.gifUrl;
      }

      if (!localMap.has(key)) {
        localMap.set(key, enrichedEx);
      } else {
        const existing = localMap.get(key);
        // Jika latihan yang baru (localEx) adalah custom (id > 1000000 atau source === 'custom'),
        // maka timpa latihan master yang sudah ada di Map.
        if (localEx.id > 1000000 || localEx.source === 'custom') {
          if (!enrichedEx.ytVideo && existing.ytVideo) enrichedEx.ytVideo = existing.ytVideo;
          localMap.set(key, enrichedEx);
        } else {
          // Jika bukan custom (misal duplikat master), gabungkan saja ytVideo-nya
          if (!existing.ytVideo && localEx.ytVideo) {
             existing.ytVideo = localEx.ytVideo;
          }
        }
      }
    });

    const deduplicatedLocal = Array.from(localMap.values());
    const onlineToAdd = onlineExercises.filter(ex => !localMap.has(ex.name.trim().toLowerCase()));
    
    return [...deduplicatedLocal, ...onlineToAdd];
  }, [exerciseLibrary, onlineExercises]);

  // ── Calculate Popularity Scores ───────────────────────────────────
  const popularityScores = useMemo(() => {
    const scores = {};
    if (history) {
      Object.values(history).forEach(day => {
        if (day.workouts && Array.isArray(day.workouts)) {
          day.workouts.forEach(w => {
            if (w.exercises && Array.isArray(w.exercises)) {
              w.exercises.forEach(ex => {
                if (ex.name) {
                  const key = ex.name.toLowerCase();
                  scores[key] = (scores[key] || 0) + 1;
                }
              });
            }
          });
        }
      });
    }
    // Give massive boost to the 22 master exercises
    const specialExercises = [
      'smith machine incline bench press', 'seated cable rows', 'dumbbell bench press', 'cable seated lateral raise',
      'triceps pushdown', 'dumbbell alternate bicep curl', 'smith machine squat', 'barbell romanian deadlift',
      'barbell walking lunge', 'rocking standing calf raise', 'cable crunch', 'wide-grip lat pulldown',
      'dumbbell shoulder press', 'dumbbell shrug', 'smith machine bench press', 'cable rear delt fly',
      'cable rope overhead triceps extension', 'high cable curls', 'split squat with dumbbells',
      'pull through', 'seated calf raise', 'plank'
    ];
    specialExercises.forEach(name => {
      scores[name] = (scores[name] || 0) + 1000;
    });
    return scores;
  }, [history]);
  // ── Apply Gym Constraints First ──────────────────────────────────
  const gymFilteredLibrary = useMemo(() => {
    let list = [...combinedLibrary];
    const activeGym = gymProfiles.find(g => g.id === activeGymId) || gymProfiles[0];
    if (activeGym && activeGym.equipment !== 'all' && Array.isArray(activeGym.equipment)) {
      list = list.filter(ex => activeGym.equipment.includes(ex.equipment));
    }
    return list;
  }, [combinedLibrary, gymProfiles, activeGymId]);

  // ── Filter and Sort ──────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let list = [...gymFilteredLibrary];

    // Mode Filter (Custom Only)
    // ID custom biasanya hasil Date.now() yang > 1000000, ID default < 1000, source API='exercisedb'
    if (viewMode === 'custom') {
      list = list.filter(ex => ex.id > 1000000 && ex.source !== 'exercisedb');
    }

    // Favorites Filter
    if (showFavoritesOnly) {
      list = list.filter(ex => ex.isFavorite);
    }

    // Search (Smart: matches any order of words)
    if (searchQuery.trim()) {
      const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const lowSearch = searchQuery.toLowerCase().trim();
      list = list.filter(ex => {
        const nameStr = ex.name.toLowerCase();
        const targetStr = formatTarget(ex.target, lang?.id).toLowerCase();
        
        return nameStr.includes(lowSearch) || targetStr.includes(lowSearch);
      });
    }

    // Muscle filter
    if (muscleFilter.length > 0) {
      list = list.filter(ex => {
        const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
        return exTargets.some(m => muscleFilter.includes(normalizeMuscleKey(m)));
      });
    }

    // Equipment filter (Manual Chips)
    if (equipFilter.length > 0) {
      list = list.filter(ex => equipFilter.includes(ex.equipment));
    }

    // Level filter
    if (levelFilter.length > 0) {
      list = list.filter(ex => levelFilter.includes(ex.level || 'beginner'));
    }

    // (Active Gym Equipment Filter moved to gymFilteredLibrary)

    // Sort
    if (sortOrder === 'popular') {
      list.sort((a, b) => {
        const scoreA = popularityScores[a.name.toLowerCase()] || 0;
        const scoreB = popularityScores[b.name.toLowerCase()] || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        // fallback to alphabetical if scores are equal
        return a.name.localeCompare(b.name);
      });
    } else if (sortOrder === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'za') list.sort((a, b) => b.name.localeCompare(a.name));
    else {
      // newest: reverse combined list so user custom ones (end of local array) appear at top
      list.reverse();
    }

    return list;
  }, [gymFilteredLibrary, viewMode, showFavoritesOnly, searchQuery, muscleFilter, equipFilter, levelFilter, sortOrder, popularityScores]);

  // Pagination for performance (Render top 100 max)
  const displayedList = filteredList.slice(0, 100);

  // Dynamic Equip Options for Filter Panel
  const allEquipOptions = useMemo(() => {
    const set = new Set(gymFilteredLibrary.map(ex => ex.equipment).filter(Boolean));
    return [...set].sort();
  }, [gymFilteredLibrary]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleToggleFavorite = (ex) => {
    playSoundEffect('click', soundEnabled);
    
    const existsInLocal = exerciseLibrary.some(e => e.name.toLowerCase() === ex.name.toLowerCase());
    
    if (existsInLocal) {
      // Toggle favorite di local
      setExerciseLibrary(prev => prev.map(e => 
        e.name.toLowerCase() === ex.name.toLowerCase() 
          ? { ...e, isFavorite: !e.isFavorite } 
          : e
      ));
    } else {
      // Latihan online yg blm ada di lokal: tambahkan ke lokal dan jadikan favorit
      const newEx = {
        ...ex,
        id: Date.now() + Math.floor(Math.random() * 1000), 
        source: 'exercisedb',
        isFavorite: true
      };
      setExerciseLibrary(prev => [...prev, newEx]);
    }
  };

  const handleStartEdit = (ex) => {
    playSoundEffect('click', soundEnabled);
    
    const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
    
    if (isCustom) {
      setIsAdding(false);
      setEditingId(ex.id);
      // Normalisasi target menjadi key (misal 'Dada Tengah' jadi 'chest_mid')
      const normalizedTargets = (ex.target || []).map(m => {
        const key = normalizeMuscleKey(m);
        return key === 'full_body' ? m : key; // Fallback jika tidak dikenali
      });
      const finalInstructions = Array.isArray(ex.instructions) && ex.instructions.length > 0 ? ex.instructions : ['1. '];
      const newData = { ...ex, target: normalizedTargets, instructions: finalInstructions };
      setFormData(newData);
      setOriginalData(newData);
    } else {
      setIsAdding(true);
      setEditingId(null);
      const normalizedTarget = Array.isArray(ex.target) ? ex.target.map(normalizeMuscleKey) : [normalizeMuscleKey(ex.target || 'Lainnya')];
      const finalInstructions = Array.isArray(ex.instructions) && ex.instructions.length > 0 ? ex.instructions : ['1. '];
      const newData = { 
        ...ex, 
        id: Date.now(), 
        source: 'custom',
        isFavorite: false,
        name: `${ex.name}`,
        target: normalizedTarget,
        instructions: finalInstructions
      };
      setFormData(newData);
      setOriginalData(newData);
    }
  };

  const handleStartAdd = () => {
    playSoundEffect('click', soundEnabled);
    setEditingId(null);
    setIsAdding(true);
    setFormData(blankExercise());
    setOriginalData(null);
  };

  const handleSave = () => {
    playSoundEffect('click', soundEnabled);
    if (!formData.name.trim() || formData.target.length === 0) return;

    if (editingId !== null) {
      setExerciseLibrary(prev => {
        const exists = prev.some(ex => ex.id === editingId);
        if (exists) {
          return prev.map(ex => ex.id === editingId ? { ...formData, id: editingId } : ex);
        } else {
          return [...prev, { ...formData, id: Date.now() }];
        }
      });
      setEditingId(null);
    } else {
      setExerciseLibrary(prev => [...prev, { ...formData, id: Date.now() }]);
      setIsAdding(false);
    }
    setFormData(blankExercise());
    setOriginalData(null);
    setViewMode('custom');
  };

  const handleCancel = () => {
    playSoundEffect('click', soundEnabled);
    setEditingId(null);
    setIsAdding(false);
    setFormData(blankExercise());
    setOriginalData(null);
  };

  const handleDelete = (ex) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Latihan?',
      message: `Yakin hapus "${ex.name}" secara permanen dari database master?`,
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        setExerciseLibrary(prev => prev.filter(e => e.id !== ex.id));
      }
    });
  };

    const [showGymManager, setShowGymManager] = useState(false);
    const [showGymSelector, setShowGymSelector] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <div className={`animate-in fade-in duration-300`}>
        
        <div className={`sticky top-0 z-30 ${t.bgApp} pt-4 pb-3 -mx-4 px-4 space-y-4 border-b ${t.border}`}>
        
        {/* ── Gym Selector ───────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div 
              onClick={() => setShowGymSelector(!showGymSelector)}
              className={`w-full flex items-center bg-transparent border ${t.border} rounded-2xl px-3 py-2.5 cursor-pointer`}
            >
              <Dumbbell className={`${t.textAccent} mr-2`} size={18} />
              <div className={`flex-1 ${t.text} body-sm font-semibold truncate`}>
                {gymProfiles.find(g => g.id === activeGymId)?.name || 'Pilih Gym'}
              </div>
              <ChevronDown className={`${t.textMuted} transition-transform ${showGymSelector ? 'rotate-180' : ''}`} size={16} />
            </div>

            {/* Dropdown Menu */}
            {showGymSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGymSelector(false)}></div>
                <div className={`absolute top-full left-0 right-0 mt-2 z-50 ${t.bgCard} border ${t.border} rounded-2xl shadow-xl overflow-hidden py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2`}>
                  {gymProfiles.map(g => (
                    <div 
                      key={g.id} 
                      onClick={() => {
                        setActiveGymId(g.id);
                        setShowGymSelector(false);
                        playSoundEffect('click', soundEnabled);
                      }}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:${t.bgAccentSoft} transition-colors ${activeGymId === g.id ? `${t.bgAccentSoft}` : ''}`}
                    >
                      <span className={`font-semibold ${activeGymId === g.id ? t.textAccent : t.text}`}>{g.name}</span>
                      {activeGymId === g.id && <Check size={16} className={t.textAccent} />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <button 
            onClick={() => setShowGymManager(true)}
            className={`p-2.5 rounded-2xl border ${t.border} ${t.btnBg} hover:opacity-80 transition-opacity`}
          >
            <Edit2 size={18} className={t.textAccent} />
          </button>
        </div>

        {/* ── Tab Switcher (All vs Custom) ───────────────────────── */}
        <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg} no-swipe`}>
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: viewMode === 'all' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
            
            <button
                onClick={() => { setViewMode('all'); playSoundEffect('click', soundEnabled); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full body-md font-black relative z-10 transition-colors duration-300 ${
                  viewMode === 'all' ? 'text-white' : t.textMuted
                }`}
            >
                Semua
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                  viewMode === 'all' ? 'bg-white/20' : `${t.bgCard}`
                }`}>
                  {gymFilteredLibrary.length}
                </span>
            </button>
            <button
                onClick={() => { setViewMode('custom'); playSoundEffect('click', soundEnabled); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full body-md font-black relative z-10 transition-colors duration-300 ${
                  viewMode === 'custom' ? 'text-white' : t.textMuted
                }`}
            >
                Custom
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                  viewMode === 'custom' ? 'bg-white/20' : `${t.bgCard}`
                }`}>
                  {gymFilteredLibrary.filter(ex => ex.id > 1000000 && ex.source !== 'exercisedb').length}
                </span>
            </button>
        </div>

        <div key={viewMode} className={`space-y-4 animate-in fade-in duration-300 ${viewMode === 'all' ? 'slide-in-from-left-12' : 'slide-in-from-right-12'}`}>
          {/* Unified Search Bar */}
          <div className="flex gap-2 items-center">
            <div className={`flex-1 flex items-center gap-2 px-3 py-3 rounded-xl ${t.inputBg}`}>
              <Search size={16} className={t.textMuted} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari latihan..."
                className={`flex-1 bg-transparent body-lg ${t.textMain} outline-none placeholder:${t.textMuted}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`${t.textMuted} hover:opacity-70`}>
                  <X size={14} />
                </button>
              )}
            </div>
            
            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); playSoundEffect('click', soundEnabled); }}
              className={`p-3 rounded-xl transition-all ${
                showFavoritesOnly
                  ? `bg-rose-500 text-white shadow-sm`
                  : `${t.inputBg} ${t.textMuted}`
              }`}
              title="Filter Favorit"
            >
              <Heart size={18} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => { setShowFilters(!showFilters); playSoundEffect('click', soundEnabled); }}
              className={`p-3 rounded-xl transition-all ${
                showFilters || muscleFilter.length > 0 || equipFilter.length > 0 || levelFilter.length > 0
                  ? `${t.bgAccent} text-white shadow-sm`
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className={`p-3 rounded-xl border ${t.border} ${t.bgCard} space-y-2 animate-in fade-in duration-200`}>
              <FilterChips
                t={t}
                label={lang?.muscleGroup || 'Grup Otot'}
                options={muscleOptions}
                selected={muscleFilter}
                onToggle={(v) => toggleFilter(muscleFilter, setMuscleFilter, v)}
                formatOption={(opt) => formatTarget(opt, lang?.id)}
              />
              <FilterChips
                t={t}
                label="Equipment"
                options={allEquipOptions.length > 0 ? allEquipOptions : equipmentOptions}
                selected={equipFilter}
                onToggle={(v) => toggleFilter(equipFilter, setEquipFilter, v)}
              />
              <FilterChips
                t={t}
                label="Level"
                options={levelOptions}
                selected={levelFilter}
                onToggle={(v) => toggleFilter(levelFilter, setLevelFilter, v)}
                formatOption={(opt) => levelLabels[opt] || opt.charAt(0).toUpperCase() + opt.slice(1)}
              />

              {/* Sort + Clear */}
              <div className={`flex items-center justify-between pt-3 mt-1 border-t ${t.border}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted}`}>
                    {lang?.sortBy || 'Urutkan'}
                  </span>
                  <div className="relative">
                    <select 
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg ${t.inputBg} ${t.textMain} body-md outline-none appearance-none cursor-pointer pr-7`}
                    >
                      <option value="popular">Terpopuler</option>
                      <option value="newest">{lang?.newest || 'Terbaru'}</option>
                      <option value="az">A - Z</option>
                      <option value="za">Z - A</option>
                    </select>
                    <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
                  </div>
                </div>
                
                {(muscleFilter.length > 0 || equipFilter.length > 0 || levelFilter.length > 0) && (
                  <button
                    onClick={() => { setMuscleFilter([]); setEquipFilter([]); setLevelFilter([]); }}
                    className="text-[10px] font-black text-rose-500 hover:opacity-80 whitespace-nowrap ml-2"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error State for API */}
          {onlineError && viewMode === 'all' && (
            <div className={`flex items-center justify-between p-3 rounded-xl border border-rose-500/30 bg-rose-500/5`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                <p className={`text-[10px] font-bold ${t.textMain}`}>Database online gagal dimuat. Menampilkan library offline.</p>
              </div>
              <button onClick={() => handleFetchOnline(true)} className="text-[10px] font-black text-rose-500">Coba Lagi</button>
            </div>
          )}


        </div>
        </div>
        
        {/* Exercise List */}
        <div 
          key={viewMode}
          className={`-mx-4 px-4 pt-4 pb-6 animate-in fade-in duration-300 ${viewMode === 'all' ? 'slide-in-from-left-12' : 'slide-in-from-right-12'}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {displayedList.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed ${t.border}`}>
              {onlineLoading ? (
                <Loader2 size={40} className={`${t.textAccent} animate-spin mb-3 opacity-80`} />
              ) : (
                <Dumbbell size={40} className={`${t.textMuted} mb-3 opacity-40`} />
              )}
              <p className={`body-lg font-black ${t.textMuted}`}>
                {onlineLoading ? 'Memuat data...' : 'Tidak ada hasil'}
              </p>
              <p className={`body-md ${t.textMuted} mt-1 opacity-70`}>
                {onlineLoading ? 'Membuka database ExerciseDB API...' : 'Coba ubah kata kunci atau tambah latihan baru.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 space-y-3 sm:space-y-0 pb-8">
              {displayedList.map((ex, idx) => {
                const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
                return (
                  <UnifiedExerciseCard
                    key={ex.id || `${ex.name}-${idx}`}
                    t={t}
                    lang={lang}
                    ex={ex}
                    index={idx}
                    isCustom={isCustom}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={() => handleStartEdit(ex)}
                    onDelete={() => handleDelete(ex)}
                    onOpenDetail={() => onOpenDetail(ex)}
                  />
                );
              })}
            </div>
          )}

          {/* Add Button (Always available at the bottom of the list) */}
          {viewMode === 'custom' && (
            <>
              <button
                onClick={handleStartAdd}
                className={`w-full py-4 border-2 border-dashed ${t.borderAccentSoft} rounded-xl font-black body-lg ${t.textAccent} hover:${t.bgAccentSoft} active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-2`}
              >
                <Plus size={16} /> Tambah Latihan Custom
              </button>

              {/* ── Global Video Settings Moved to Bottom ───────────────── */}
              <div className="pt-8 pb-4">
                 <div className="flex items-center gap-3 mb-4">
                    <div className={`flex-1 h-px bg-black/10 dark:bg-white/10`}></div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted} opacity-50`}>PENGATURAN TAMBAHAN</div>
                    <div className={`flex-1 h-px bg-black/10 dark:bg-white/10`}></div>
                 </div>

                 <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3 shadow-sm`}>
                   <div className="mb-3">
                     <div className="flex items-center gap-2 mb-1">
                       <Globe size={18} className={t.textAccent} />
                       <h3 className={`body-lg font-black ${t.textMain}`}>Video Instruksi Umum</h3>
                     </div>
                     <p className={`text-[10px] font-bold ${t.textMuted}`}>Pisahkan URL video dengan spasi jika lebih dari satu.</p>
                   </div>
                   
                   <div>
                     <label className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider mb-1 block`}>Pemanasan</label>
                     <input
                       type="text"
                       value={warmupVideos}
                       onChange={(e) => setWarmupVideos(e.target.value)}
                       placeholder="https://youtu.be/... https://youtu.be/..."
                       className={`w-full px-3 py-2 rounded-xl ${t.inputBg} ${t.textMain} body-md outline-none focus:ring-1 ${t.ringAccent} transition-all`}
                     />
                   </div>

                   <div>
                     <label className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider mb-1 block`}>Pendinginan</label>
                     <input
                       type="text"
                       value={cooldownVideos}
                       onChange={(e) => setCooldownVideos(e.target.value)}
                       placeholder="https://youtu.be/... https://youtu.be/..."
                       className={`w-full px-3 py-2 rounded-xl ${t.inputBg} ${t.textMain} body-md outline-none focus:ring-1 ${t.ringAccent} transition-all`}
                     />
                   </div>
                 </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <ExerciseForm t={t} lang={lang} formData={formData} setFormData={setFormData} originalData={originalData} onSave={handleSave} onCancel={handleCancel} isEditing={false} />
      )}

      {editingId !== null && (
        <ExerciseForm
          t={t}
          lang={lang}
          formData={formData}
          setFormData={setFormData}
          originalData={originalData}
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={true}
        />
      )}

      {showGymManager && (
        <GymManagerModal language={lang?.id || 'ID'} 
          gymProfiles={gymProfiles} 
          setGymProfiles={setGymProfiles} 
          activeGymId={activeGymId} 
          setActiveGymId={setActiveGymId} 
          onClose={() => setShowGymManager(false)} 
          t={t} 
          soundEnabled={soundEnabled}
          setConfirmModal={setConfirmModal}
        />
      )}

    </>
  );
};

export default DatabaseTab;
