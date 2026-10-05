import React, { useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Filter, Dumbbell, Heart, ChevronDown, Clock } from 'lucide-react';
import { formatTarget, getVideoId, muscleOptions, equipmentOptions, normalizeMuscleKey, filterByGymEquipment, exerciseAliasMap, cleanExerciseNameForMatching, canonicalizeExercise } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { fetchExercisesFromApi } from '../utils/exerciseDbApi';
import { prepareSearchableExercise, scoreExerciseMatch, computeOwnExerciseUsage, exerciseSlug } from '../utils/exerciseSearch';
import { buildExLookupByName } from '../utils/workoutCalc';
import EquipmentIcon from './EquipmentIcon';
import FilterChips from './FilterChips';

const MUSCLE_ANATOMICAL_ORDER = {
  'chest_upper': 10,
  'chest_mid': 11,
  'chest_lower': 12,
  'back_upper': 20,
  'lats': 21,
  'trapezius': 22,
  'deltoid_front': 30,
  'deltoid_lateral': 31,
  'deltoid_rear': 32,
  'biceps': 40,
  'triceps': 41,
  'forearm': 42,
  'quadriceps': 50,
  'hamstring': 51,
  'glutes': 52,
  'calves': 53,
  'adductors': 54,
  'abductors': 55,
  'core': 60,
  'cardio': 70,
  'full_body': 80,
  'neck': 90
};

const AlternativeExerciseModal = ({ 
  isOpen, 
  onClose, 
  originalEx, 
  exerciseLibrary, 
  onSelectAlternative,
  t, 
  lang,
  soundEnabled,
  gymProfiles,
  activeGymId,
  history
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('logym_alt_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState([]);
  const [equipFilter, setEquipFilter] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('recommendation');
  const [onlineExercises, setOnlineExercises] = useState([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const listRef = useRef(null);

  // Debounce search agar pengetikan 100% responsif tanpa frame drop di library 1300+ item
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setDebouncedSearch('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const saveRecentSearch = useCallback((term) => {
    const clean = (term || '').trim();
    if (!clean || clean.length < 2) return;
    try {
      const existing = JSON.parse(localStorage.getItem('logym_alt_recent_searches') || '[]');
      const updated = [clean, ...existing.filter(x => x.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      localStorage.setItem('logym_alt_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (err) {
      console.warn('Failed to save recent search:', err);
    }
  }, []);

  const clearRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem('logym_alt_recent_searches');
      setRecentSearches([]);
    } catch (err) {
      console.warn('Failed to clear recent searches:', err);
    }
  }, []);

  // Reset visible count ketika filter/search berubah
  React.useEffect(() => {
    setVisibleCount(30);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [debouncedSearch, muscleFilter, equipFilter, showFavoritesOnly, sortOrder]);

  // Infinite scroll handler
  const handleScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisibleCount(prev => prev + 30);
    }
  }, []);
  
  React.useEffect(() => {
    let mounted = true;
    // fetch async: data bisa belum ter-cache saat modal pertama kali dibuka
    fetchExercisesFromApi().then(data => { if (mounted) setOnlineExercises(data || []); });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, [isOpen]);

  const combinedLibrary = useMemo(() => {
    const onlineMap = new Map();
    onlineExercises.forEach(ex => {
      const canonicalOnline = canonicalizeExercise(ex);
      const cleanName = cleanExerciseNameForMatching(canonicalOnline.name);
      onlineMap.set(cleanName, canonicalOnline);
      if (ex.id) onlineMap.set(String(ex.id), canonicalOnline);
      if (ex.exerciseId) {
        onlineMap.set(String(ex.exerciseId), canonicalOnline);
        onlineMap.set(`edb-${ex.exerciseId}`, canonicalOnline);
      }
    });

    const localMap = new Map();
    exerciseLibrary.forEach(localEx => {
      const aliasTargetId = exerciseAliasMap?.[String(localEx.id)];
      const onlineExByAlias = aliasTargetId ? onlineMap.get(aliasTargetId) : null;
      const canonicalEx = canonicalizeExercise(localEx);
      const chosenName = onlineExByAlias ? onlineExByAlias.name : canonicalEx.name;
      const key = cleanExerciseNameForMatching(chosenName);
      if (!localMap.has(key)) {
        localMap.set(key, { ...canonicalEx, ...localEx, name: chosenName });
      }
    });

    const deduplicatedLocal = Array.from(localMap.values());
    const onlineToAdd = onlineExercises
      .map(ex => canonicalizeExercise(ex))
      .filter(ex => !localMap.has(cleanExerciseNameForMatching(ex.name)));
    let list = [...deduplicatedLocal, ...onlineToAdd];

    // Filter by Active Gym Equipment — aturannya di filterByGymEquipment (data/constants.js),
    // termasuk kekecualian Body Weight dan alat tak dikenal yang dulu bikin Plank dkk lenyap.
    if (gymProfiles && activeGymId) {
      list = filterByGymEquipment(list, gymProfiles.find(g => g.id === activeGymId) || gymProfiles[0]);
    }

    return list;
  }, [exerciseLibrary, onlineExercises, gymProfiles, activeGymId]);

  // Hitung frekuensi pemakaian latihan sendiri dari riwayat
  const exLookup = useMemo(() => {
    return buildExLookupByName(history, exerciseLibrary);
  }, [history, exerciseLibrary]);

  const ownScores = useMemo(() => {
    return computeOwnExerciseUsage(history, exLookup);
  }, [history, exLookup]);

  // Pre-index library untuk pencarian cepat & relevansi cerdas
  const indexedLibrary = useMemo(() => {
    return combinedLibrary.map(ex => prepareSearchableExercise(ex, lang?.id));
  }, [combinedLibrary, lang?.id]);

  const toggleFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const alternatives = useMemo(() => {
    if (!originalEx) return [];

    // Latihan asal TIDAK boleh muncul sebagai alternatif untuk dirinya sendiri,
    // baik dicocokkan via id, originalId, exerciseId, maupun nama/kanonikal.
    const isSameExercise = (a, b) => {
      if (!a || !b) return false;
      if (a.id !== undefined && b.id !== undefined && String(a.id) === String(b.id)) return true;
      if (a.originalId !== undefined && (String(a.originalId) === String(b.id) || String(a.originalId) === String(b.originalId))) return true;
      if (b.originalId !== undefined && (String(b.originalId) === String(a.id))) return true;
      if (a.exerciseId && b.exerciseId && String(a.exerciseId) === String(b.exerciseId)) return true;

      const normA = cleanExerciseNameForMatching(a.name);
      const normB = cleanExerciseNameForMatching(b.name);
      if (normA && normB && normA === normB) return true;

      const canonA = cleanExerciseNameForMatching(canonicalizeExercise(a)?.name);
      const canonB = cleanExerciseNameForMatching(canonicalizeExercise(b)?.name);
      if (canonA && canonB && canonA === canonB) return true;

      return false;
    };

    let filtered = indexedLibrary.filter(ex => !isSameExercise(ex, originalEx));

    // Filter by Muscle
    if (muscleFilter.length > 0) {
      filtered = filtered.filter(ex => {
        const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
        return exTargets.some(m => muscleFilter.includes(normalizeMuscleKey(m)));
      });
    }

    // Filter by Equipment
    if (equipFilter.length > 0) {
      filtered = filtered.filter(ex => equipFilter.includes(ex.equipment));
    }

    // Filter by Favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(ex => ex.isFavorite);
    }

    const isSearching = Boolean(debouncedSearch && debouncedSearch.trim());
    const origWords = (originalEx.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    filtered = filtered.map(ex => {
      let score = 0;
      const usage = ownScores[ex._slug || exerciseSlug(ex.name)] || ownScores[String(ex.id)] || (ex.exerciseId ? ownScores[exerciseSlug(ex.exerciseId)] : 0) || 0;

      // Jika ada kata pencarian: gunakan algoritma smart search & bobot riwayat user
      if (isSearching) {
        score = scoreExerciseMatch(ex, debouncedSearch, usage);
        return { ...ex, score };
      }

      // Smart recommendation scoring saat tidak sedang mencari:
      const nameLower = ex.name.toLowerCase();

      // 1. Exact target match bonus
      const hasSameTarget = ex.target?.some(t => originalEx.target?.includes(t));
      if (hasSameTarget) score += 50;

      // 2. Same body part bonus
      const hasSameBodyPart = ex.bodyParts?.some(b => originalEx.bodyParts?.includes(b));
      if (hasSameBodyPart) score += 20;

      // 3. Name match bonus (e.g. "Smith", "Incline")
      if (hasSameBodyPart || hasSameTarget) {
        origWords.forEach(w => {
          if (nameLower.includes(w)) score += 30;
        });
      }

      // 4. Riwayat latihan user: alternatif yang sering dilatih user otomatis naik ke atas
      if (usage > 0) {
        score += Math.min(usage * 100, 5000);
      }

      if (score === 0) score = 1; 
      return { ...ex, score };
    }).filter(ex => ex.score > -1);

    if (isSearching) {
      filtered.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });
    } else if (sortOrder === 'recommendation') {
      filtered.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const targetA = Array.isArray(a.target) && a.target.length > 0 ? a.target[0] : (a.target || '');
        const targetB = Array.isArray(b.target) && b.target.length > 0 ? b.target[0] : (b.target || '');
        const mKeyA = normalizeMuscleKey(targetA);
        const mKeyB = normalizeMuscleKey(targetB);
        const anatA = MUSCLE_ANATOMICAL_ORDER[mKeyA] ?? 99;
        const anatB = MUSCLE_ANATOMICAL_ORDER[mKeyB] ?? 99;
        if (anatA !== anatB) return anatA - anatB;
        return a.name.localeCompare(b.name);
      });
    } else if (sortOrder === 'az') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'za') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOrder === 'newest') {
      filtered.sort((a, b) => {
         const idA = typeof a.id === 'number' ? a.id : 0;
         const idB = typeof b.id === 'number' ? b.id : 0;
         return idB - idA;
      });
    }

    return filtered.slice(0, 500); // Capped at 500; infinite scroll menampilkan 30 per batch
  }, [indexedLibrary, originalEx, debouncedSearch, muscleFilter, equipFilter, showFavoritesOnly, sortOrder, lang, ownScores]);

  if (!isOpen || !originalEx) return null;

  // z-[110], bukan z-[60]. Editor program (ProgramTab) dan mode immersive dua-duanya overlay
  // z-[100] yang menutup layar penuh dan opak — dialog ini disisipkan sebagai saudara di pohon
  // yang sama, jadi dengan z-[60] dia tetap dirender tapi ADA DI BELAKANG editor: tombol "ganti
  // latihan alternatif" di editor terasa tidak melakukan apa-apa sama sekali.
  // `no-swipe` + role="dialog": App.jsx memasang penangkap sentuh global untuk geser-pindah-tab
  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe" onClick={onClose}>
      <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`p-4 border-b ${t.border} flex justify-between items-center shrink-0`}>
          <div>
            <h3 className={`font-black text-lg ${t.textMain}`}>Alternatif Latihan</h3>
            <p className={`text-xs ${t.textMuted}`}>Pengganti untuk {originalEx.name}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`} data-close-modal="true">
            <X size={18} className={t.textMain} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className={`p-4 border-b ${t.border} shrink-0 space-y-3`}>
          <div className="flex gap-2">
            <div className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl ${t.inputBg}`}>
              <Search size={16} className={`shrink-0 ${t.textMuted}`} />
              <input 
                type="text" 
                placeholder="Cari alternatif..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`w-full min-w-0 bg-transparent text-sm font-semibold ${t.textMain} outline-none placeholder:${t.textMuted}`}
              />
              {searchTerm && (
                <button 
                  type="button"
                  aria-label="Hapus teks pencarian"
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearch('');
                    playSoundEffect('click', soundEnabled);
                  }} 
                  className={`shrink-0 p-1.5 -mr-1 rounded-full text-slate-400 hover:text-white hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer`}
                  title="Hapus pencarian"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); playSoundEffect('click', soundEnabled); }}
              className={`shrink-0 p-3 rounded-xl transition-all ${
                showFavoritesOnly 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Heart size={18} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={() => { playSoundEffect('click', soundEnabled); setShowFilters(!showFilters); }}
              className={`shrink-0 p-3 rounded-xl transition-all flex items-center justify-center ${
                showFilters || muscleFilter.length > 0 || equipFilter.length > 0 || sortOrder !== 'recommendation'
                  ? `${t.bgAccent} text-white shadow-sm`
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Recent Searches Chips ("Terakhir Dicari") */}
          {!searchTerm && recentSearches.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar py-0.5">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0 mr-0.5">
                <Clock size={12} className="text-slate-400" />
                <span>Terakhir:</span>
              </div>
              {recentSearches.map((term, i) => (
                <button
                  key={`${term}-${i}`}
                  type="button"
                  onClick={() => {
                    setSearchTerm(term);
                    setDebouncedSearch(term);
                    playSoundEffect('click', soundEnabled);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${t.border} ${t.inputBg} ${t.textMain} hover:border-amber-500/50 hover:text-amber-400 active:scale-95`}
                >
                  {term}
                </button>
              ))}
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-400 px-1 py-0.5 whitespace-nowrap transition-colors"
                title="Hapus riwayat pencarian"
              >
                Hapus
              </button>
            </div>
          )}

          {/* Expanded Filters */}
          {showFilters && (
            <div className={`mt-3 p-4 rounded-2xl border ${t.border} ${t.bgCard} space-y-3 animate-in fade-in duration-200`}>
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
                options={equipmentOptions}
                selected={equipFilter}
                onToggle={(v) => toggleFilter(equipFilter, setEquipFilter, v)}
              />
              
              {/* Sort + Clear */}
              <div className={`flex items-center justify-between pt-3 mt-1 border-t ${t.border}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${t.textMuted}`}>
                    {lang?.sortBy || 'Urutkan'}
                  </span>
                  <div className="relative">
                    <select 
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg ${t.inputBg} ${t.textMain} body-md outline-none appearance-none cursor-pointer pr-7`}
                    >
                      <option value="recommendation" className="bg-slate-900 text-white dark:bg-slate-900 dark:text-white">Direkomendasikan</option>
                      <option value="newest" className="bg-slate-900 text-white dark:bg-slate-900 dark:text-white">{lang?.newest || 'Terbaru'}</option>
                      <option value="az" className="bg-slate-900 text-white dark:bg-slate-900 dark:text-white">A - Z</option>
                      <option value="za" className="bg-slate-900 text-white dark:bg-slate-900 dark:text-white">Z - A</option>
                    </select>
                    <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${t.textMuted}`} />
                  </div>
                </div>
                
                {(muscleFilter.length > 0 || equipFilter.length > 0 || sortOrder !== 'recommendation') && (
                  <button 
                    onClick={() => {
                      setMuscleFilter([]);
                      setEquipFilter([]);
                      setSortOrder('recommendation');
                      playSoundEffect('click', soundEnabled);
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-wider"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* List — Infinite scroll: render hanya visibleCount item, tambah 30 saat scroll mendekati bawah */}
        {/* overscroll-contain: gulirannya berhenti di daftar ini, tidak merembet menggulir
            halaman di belakang begitu sampai ujung. */}
        <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-2" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {alternatives.length === 0 ? (
            <div className={`text-center py-12 ${t.textMuted}`}>
              <p className="body-lg font-bold">Tidak ada latihan yang ditemukan.</p>
            </div>
          ) : (
            <>
              {alternatives.slice(0, visibleCount).map(ex => {
                const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
                return (
                <div 
                  key={ex.id}
                  onClick={() => {
                    playSoundEffect('click', soundEnabled);
                    if (debouncedSearch || searchTerm) {
                      saveRecentSearch(debouncedSearch || searchTerm);
                    }
                    const exToAdd = ex.source === 'exercisedb' ? { ...ex, id: Date.now() + Math.floor(Math.random() * 1000) } : ex;
                    onSelectAlternative(exToAdd);
                  }}
                  className={`p-3 rounded-2xl border ${t.border} ${t.bgCard} flex items-center justify-between gap-3 hover:${t.borderAccentSoft} cursor-pointer transition-all active:scale-95`}
                >
                  {/* Thumbnail */}
                  <div className="relative inline-block flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center overflow-hidden border border-black/5 relative">
                       {(() => {
                          const ytId = getVideoId(ex.ytVideo);
                          if (ex.gifUrl) {
                             return <img src={ex.gifUrl} alt={ex.name} loading="lazy" className="w-full h-full object-cover opacity-80" />;
                          } else if (ytId) {
                             return <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt={ex.name} loading="lazy" className="w-full h-full object-cover opacity-80" />;
                          } else {
                             return <EquipmentIcon equipment={ex.equipment} size={20} className={t.textMuted} />;
                          }
                       })()}
                       {isCustom && <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur text-emerald-400 text-xs font-black uppercase tracking-widest text-center py-0.5 leading-none">CUSTOM</div>}
                    </div>
                    {/* Recommendation Badge */}
                    {ex.score >= 50 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-[#0f172a] z-10"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black body-lg ${t.textMain} truncate flex items-center gap-1.5 flex-wrap`}>
                      {ex.name}
                    </h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex gap-1.5 flex-wrap items-center">
                         {ex.score >= 50 && <span className="text-xs font-black text-amber-500 uppercase tracking-wider mr-1">Disarankan</span>}
                         <span className={`text-xs font-black uppercase tracking-wider ${t.textAccent}`}>{ex.equipment || 'Lainnya'}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap items-center -ml-1.5">{ex.target?.map(m => (
                          <span key={m} className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(m, lang?.id)}</span>
                        ))}</div>
                    </div>
                  </div>
                </div>
              )})}
              {visibleCount < alternatives.length && (
                <div className={`text-center py-4 ${t.textMuted}`}>
                  <p className="text-xs font-bold">{alternatives.length - visibleCount} latihan lainnya · scroll ke bawah</p>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default AlternativeExerciseModal;
