import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Dumbbell, Heart, ChevronDown } from 'lucide-react';
import { formatTarget, getVideoId, muscleOptions, equipmentOptions, normalizeMuscleKey } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { fetchExercisesFromApi } from '../utils/exerciseDbApi';
import EquipmentIcon from './EquipmentIcon';
import FilterChips from './FilterChips';

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
  activeGymId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState([]);
  const [equipFilter, setEquipFilter] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('recommendation');
  const [onlineExercises, setOnlineExercises] = useState([]);
  
  React.useEffect(() => {
    let mounted = true;
    // fetch async: data bisa belum ter-cache saat modal pertama kali dibuka
    fetchExercisesFromApi().then(data => { if (mounted) setOnlineExercises(data || []); });
    return () => { mounted = false; };
  }, []);

  const combinedLibrary = useMemo(() => {
    const localNames = new Set(exerciseLibrary.map(ex => ex.name.toLowerCase()));
    const onlineToAdd = onlineExercises.filter(ex => !localNames.has(ex.name.toLowerCase()));
    let list = [...exerciseLibrary, ...onlineToAdd];

    // Filter by Active Gym Equipment
    if (gymProfiles && activeGymId) {
      const activeGym = gymProfiles.find(g => g.id === activeGymId) || gymProfiles[0];
      if (activeGym && activeGym.equipment !== 'all' && Array.isArray(activeGym.equipment)) {
        list = list.filter(ex => activeGym.equipment.includes(ex.equipment));
      }
    }

    return list;
  }, [exerciseLibrary, onlineExercises, gymProfiles, activeGymId]);

  const toggleFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };

  const alternatives = useMemo(() => {
    if (!originalEx) return [];

    let filtered = combinedLibrary.filter(ex => ex.id !== originalEx.id);

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

    const queryWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const origWords = originalEx.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    // Filter by Favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(ex => ex.isFavorite);
    }

    filtered = filtered.map(ex => {
      let score = 0;
      
      // If there is a search term, strict matching is required
      if (queryWords.length > 0) {
        const nameStr = ex.name.toLowerCase();
        const targetStr = ex.target ? formatTarget(ex.target, lang?.id).toLowerCase() : '';
        const matches = queryWords.every(word => nameStr.includes(word) || targetStr.includes(word));
        if (!matches) return { ...ex, score: -1 }; // Hide if it doesn't match search
        score += 100; // Passed search
      }

      // Smart recommendation scoring (only matters if no strict search is hiding it)
      if (queryWords.length === 0) {
        const nameLower = ex.name.toLowerCase();
        // 1. Name match bonus (e.g. "Smith", "Incline")
        origWords.forEach(w => {
          if (nameLower.includes(w)) score += 50;
        });

        // 2. Exact target match bonus
        const hasSameTarget = ex.target?.some(t => originalEx.target?.includes(t));
        if (hasSameTarget) score += 30;

        // 3. Same body part bonus
        const hasSameBodyPart = ex.bodyParts?.some(b => originalEx.bodyParts?.includes(b));
        if (hasSameBodyPart) score += 10;
        
        // If completely unrelated, lower score but don't hide
        if (score === 0) score = 1; 
      }

      return { ...ex, score };
    }).filter(ex => ex.score > -1); // Remove items that failed strict search

    if (sortOrder === 'recommendation') {
      filtered.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });
    } else if (sortOrder === 'az') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'za') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOrder === 'newest') {
      // online exercise id's are usually timestamps if newly added, otherwise string
      filtered.sort((a, b) => {
         const idA = typeof a.id === 'number' ? a.id : 0;
         const idB = typeof b.id === 'number' ? b.id : 0;
         return idB - idA;
      });
    }

    return filtered.slice(0, 1500); // Limit raised to 1500 to show virtually the entire database
  }, [combinedLibrary, originalEx, searchTerm, muscleFilter, equipFilter, showFavoritesOnly, sortOrder, lang]);

  if (!isOpen || !originalEx) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={onClose}>
      <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`p-4 border-b ${t.border} flex justify-between items-center`}>
          <div>
            <h3 className={`font-black h2 ${t.textMain}`}>Alternatif Latihan</h3>
            <p className={`body-md ${t.textMuted}`}>Pengganti untuk {originalEx.name}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors ${t.textMain}`}>
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className={`p-4 border-b ${t.border} bg-black/5`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input 
                type="text"
                placeholder="Cari alternatif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 rounded-xl ${t.inputBg} ${t.textMain} body-md font-bold outline-none focus:ring-2 ${t.ringAccent} transition-all`}
              />
            </div>
            
            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); playSoundEffect('click', soundEnabled); }}
              className={`p-3 rounded-xl transition-all ${
                showFavoritesOnly 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Heart size={18} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => { playSoundEffect('click', soundEnabled); setShowFilters(!showFilters); }}
              className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                showFilters || muscleFilter.length > 0 || equipFilter.length > 0 || sortOrder !== 'recommendation'
                  ? `${t.bgAccent} text-white shadow-sm`
                  : `${t.inputBg} ${t.textMuted}`
              }`}
            >
              <Filter size={18} />
            </button>
          </div>

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
                  <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted}`}>
                    {lang?.sortBy || 'Urutkan'}
                  </span>
                  <div className="relative">
                    <select 
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg ${t.inputBg} ${t.textMain} body-md outline-none appearance-none cursor-pointer pr-7`}
                    >
                      <option value="recommendation">Direkomendasikan</option>
                      <option value="newest">{lang?.newest || 'Terbaru'}</option>
                      <option value="az">A - Z</option>
                      <option value="za">Z - A</option>
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
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-wider"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {alternatives.length === 0 ? (
            <div className={`text-center py-12 ${t.textMuted}`}>
              <p className="body-lg font-bold">Tidak ada latihan yang ditemukan.</p>
            </div>
          ) : (
            alternatives.map(ex => {
              const isCustom = ex.id > 1000000 && ex.source !== 'exercisedb';
              return (
              <div 
                key={ex.id}
                onClick={() => {
                  playSoundEffect('click', soundEnabled);
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
                           return <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover opacity-80" />;
                        } else if (ytId) {
                           return <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt={ex.name} className="w-full h-full object-cover opacity-80" />;
                        } else {
                           return <EquipmentIcon equipment={ex.equipment} size={20} className={t.textMuted} />;
                        }
                     })()}
                     {isCustom && <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur text-emerald-400 text-[6.5px] font-black uppercase tracking-widest text-center py-0.5 leading-none">CUSTOM</div>}
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
                       {ex.score >= 50 && <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider mr-1">Disarankan</span>}
                       <span className={`text-[10px] font-black uppercase tracking-wider ${t.textAccent}`}>{ex.equipment || 'Lainnya'}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap items-center -ml-1.5">{ex.target?.map(m => (
                        <span key={m} className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(m, lang?.id)}</span>
                      ))}</div>
                  </div>
                </div>
              </div>
            )})
          )}
        </div>

      </div>
    </div>
  );
};

export default AlternativeExerciseModal;
