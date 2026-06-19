import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Dumbbell, Loader2, RefreshCw, Link as LinkIcon, X, Check, AlertCircle, ChevronDown, Database, Globe, Heart } from 'lucide-react';
import { formatTarget, normalizeMuscleKey, muscleOptions, equipmentOptions, getVideoId } from '../data/constants';
import EquipmentIcon from '../components/EquipmentIcon';
import { fetchExercisesFromApi, clearExerciseDbCache, getCachedExercises } from '../utils/exerciseDbApi';
import { playSoundEffect } from '../utils/audio';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import UnifiedExerciseCard from '../components/UnifiedExerciseCard';
import FilterChips from '../components/FilterChips';

// ─── Blank exercise template ───────────────────────────────────────
const blankExercise = () => ({
  id: Date.now(),
  name: '',
  target: [],
  type: 'weight',
  equipment: 'Dumbbell',
  defaultWeight: 0,
  ytVideo: '',
  gifUrl: '',
});

const exerciseTypeLabels = {
  weight: 'Beban & Reps',
  reps: 'Hanya Repetisi',
  time: 'Hanya Durasi',
};

// ─── Sub-component: ExerciseForm ───────────────────────────────────
const ExerciseForm = ({ t, lang, formData, setFormData, onSave, onCancel, isEditing }) => {
  const toggleMuscle = (m) => {
    setFormData(prev => ({
      ...prev,
      target: prev.target.includes(m) ? prev.target.filter(x => x !== m) : [...prev.target, m],
    }));
  };

  const canSave = formData.name.trim().length > 0 && formData.target.length > 0;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={onCancel}>
      <div 
        className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 border ${t.border} p-6 space-y-5`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-2">
          <h3 className={`h2 ${t.textAccent}`}>
            {isEditing ? (lang?.editExercise || 'Edit Latihan') : (lang?.addExercise || 'Tambah Latihan Baru')}
          </h3>
          <button onClick={onCancel} className={`p-2 rounded-full ${t.inputBg} hover:opacity-80`}><X size={20}/></button>
        </div>

      {/* Name */}
      <div>
        <label className={`body-md ${t.textMuted} mb-1 block`}>{lang?.exerciseName || 'Nama Latihan'}</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Contoh: Bench Press"
          className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent} transition-all`}
        />
      </div>

      {/* Target Muscles */}
      <div>
        <label className={`body-md ${t.textMuted} mb-2 block`}>{lang?.targetMuscles || 'Target Otot'}</label>
        <div className="flex flex-wrap gap-1.5">
          {muscleOptions.map(m => (
            <button
              key={m}
              onClick={() => toggleMuscle(m)}
              className={`px-3 py-1.5 rounded-xl body-md transition-all ${
                formData.target.includes(m) ? `${t.bgAccent} text-white` : `border border-dashed ${t.border} ${t.textMuted}`
              }`}
            >
              {formatTarget(m, lang?.id)}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment + Type Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`body-md ${t.textMuted} mb-1 block`}>{lang?.equipment || 'Equipment'}</label>
          <div className="relative">
            <select
              value={formData.equipment}
              onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
              className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none appearance-none cursor-pointer focus:ring-2 ${t.ringAccent}`}
            >
              {equipmentOptions.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
          </div>
        </div>
        <div>
          <label className={`body-md ${t.textMuted} mb-1 block`}>{lang?.exerciseType || 'Tipe Latihan'}</label>
          <div className="relative">
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none appearance-none cursor-pointer focus:ring-2 ${t.ringAccent}`}
            >
              {Object.entries(exerciseTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
          </div>
        </div>
      </div>

      {/* Default Weight + YouTube Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`body-md ${t.textMuted} mb-1 block`}>{lang?.defaultWeight || 'Beban Default (kg)'}</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={formData.defaultWeight || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, defaultWeight: e.target.value === '' ? 0 : Number(e.target.value) }))}
            placeholder="0"
            className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent}`}
          />
        </div>
        <div>
          <label className={`body-md ${t.textMuted} mb-1 block flex items-center`}>
            <LinkIcon size={12} className="mr-1" /> YouTube URL
          </label>
          <input
            type="url"
            value={formData.ytVideo || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, ytVideo: e.target.value }))}
            placeholder="https://youtu.be/..."
            className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-lg outline-none focus:ring-2 ${t.ringAccent}`}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white body-lg font-black transition-all ${
            canSave ? `${t.bgAccent} shadow-xl hover:opacity-90 active:scale-95` : 'bg-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          <Check size={18} /> {lang?.save || 'Simpan Latihan'}
        </button>
      </div>
      <div className="pb-8"></div>
      </div>
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════════
// ─── Main Component: DatabaseTab ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const DatabaseTab = ({ t, lang, exerciseLibrary, setExerciseLibrary, history, soundEnabled, warmupVideos, setWarmupVideos, cooldownVideos, setCooldownVideos, onOpenDetail }) => {
  // ── Tab State ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'custom'

  // ── Form State ───────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(blankExercise());

  // ── Filter & Search State ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState([]);
  const [equipFilter, setEquipFilter] = useState([]);
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
      if (!localMap.has(key)) {
        let enrichedEx = { ...localEx };
        if (onlineMap.has(key)) {
          const onlineEx = onlineMap.get(key);
          enrichedEx.instructions = onlineEx.instructions || enrichedEx.instructions;
          enrichedEx.gifUrl = onlineEx.gifUrl || enrichedEx.gifUrl;
        }
        localMap.set(key, enrichedEx);
      } else {
        const existing = localMap.get(key);
        if (!existing.ytVideo && localEx.ytVideo) {
           existing.ytVideo = localEx.ytVideo;
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

  // ── Filter and Sort ──────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let list = [...combinedLibrary];

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

    // Equipment filter
    if (equipFilter.length > 0) {
      list = list.filter(ex => equipFilter.includes(ex.equipment));
    }

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
  }, [combinedLibrary, viewMode, showFavoritesOnly, searchQuery, muscleFilter, equipFilter, sortOrder, popularityScores]);

  // Pagination for performance (Render top 100 max)
  const displayedList = filteredList.slice(0, 100);

  // Dynamic Equip Options for Filter Panel
  const allEquipOptions = useMemo(() => {
    const set = new Set(combinedLibrary.map(ex => ex.equipment).filter(Boolean));
    return [...set].sort();
  }, [combinedLibrary]);

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
      const normalizedTarget = Array.isArray(ex.target) ? ex.target.map(normalizeMuscleKey) : [normalizeMuscleKey(ex.target || 'Lainnya')];
      setFormData({ ...ex, target: normalizedTarget });
    } else {
      setIsAdding(true);
      setEditingId(null);
      const normalizedTarget = Array.isArray(ex.target) ? ex.target.map(normalizeMuscleKey) : [normalizeMuscleKey(ex.target || 'Lainnya')];
      setFormData({ 
        ...ex, 
        id: Date.now(), 
        source: 'custom',
        isFavorite: false,
        name: `${ex.name}`
      });
      setViewMode('custom');
    }
  };

  const handleStartAdd = () => {
    playSoundEffect('click', soundEnabled);
    setEditingId(null);
    setIsAdding(true);
    setFormData(blankExercise());
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
  };

  const handleCancel = () => {
    playSoundEffect('click', soundEnabled);
    setEditingId(null);
    setIsAdding(false);
    setFormData(blankExercise());
  };

  const handleDelete = (ex) => {
    playSoundEffect('click', soundEnabled);
    if (window.confirm(`Hapus "${ex.name}" secara permanen?`)) {
      setExerciseLibrary(prev => prev.filter(e => e.id !== ex.id));
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ─── RENDER ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <div className={`animate-in fade-in duration-300 flex-1 flex flex-col min-h-0`}>
        
        <div className={`flex-shrink-0 z-10 ${t.bg} pt-4 pb-3 -mx-4 px-4 space-y-4 border-b ${t.border}`}>
        {/* ── Tab Switcher (All vs Custom) ───────────────────────── */}
        <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg}`}>
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
                  {combinedLibrary.length}
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
                  {combinedLibrary.filter(ex => ex.id > 1000000 && ex.source !== 'exercisedb').length}
                </span>
            </button>
        </div>

        <div className="space-y-4 animate-in fade-in duration-200">
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
                showFilters || muscleFilter.length > 0 || equipFilter.length > 0
                  ? `${t.bgAccent} text-white shadow-sm`
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3 animate-in fade-in duration-200`}>
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
                
                <div className="flex items-center gap-3">
                  {(muscleFilter.length > 0 || equipFilter.length > 0) && (
                    <button
                      onClick={() => { setMuscleFilter([]); setEquipFilter([]); }}
                      className="text-[10px] font-black text-rose-500 hover:opacity-80"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
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
        <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 pt-4 pb-6 hide-scrollbar">
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
            <div className="space-y-3 pb-8">
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
      {(isAdding || editingId !== null) && (
        <ExerciseForm
          t={t}
          lang={lang}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={editingId !== null}
        />
      )}
    </>
  );
};

export default DatabaseTab;
