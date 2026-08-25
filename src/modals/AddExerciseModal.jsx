import React, { useState } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { formatTarget, normalizeMuscleKey, muscleOptions, equipmentOptions, levelOptions, exerciseAliasMap } from '../data/constants';
import { fetchExercisesFromApi, getCachedExercises } from '../utils/exerciseDbApi';
import FilterChips from '../components/FilterChips';
import UnifiedExerciseCard from '../components/UnifiedExerciseCard';

const AddExerciseModal = ({
  t, lang, 
  activeAddModalTarget, setActiveAddModalTarget,
  exerciseLibrary, 
  onAddExerciseTarget, setActiveTab
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState([]);
  const [equipFilter, setEquipFilter] = useState([]);
  const [levelFilter, setLevelFilter] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [onlineExercises, setOnlineExercises] = useState(getCachedExercises());

  const toggleFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  
  React.useEffect(() => {
    fetchExercisesFromApi().then(data => setOnlineExercises(data || []));
  }, []);

  const combinedLibrary = React.useMemo(() => {
    const onlineMap = new Map();
    onlineExercises.forEach(ex => {
      onlineMap.set(ex.name.trim().toLowerCase(), ex);
      if (ex.id) onlineMap.set(String(ex.id), ex);
    });

    const localMap = new Map();
    exerciseLibrary.forEach(localEx => {
      const aliasTargetId = exerciseAliasMap?.[String(localEx.id)];
      const onlineExByAlias = aliasTargetId ? onlineMap.get(aliasTargetId) : null;
      const canonicalName = onlineExByAlias ? onlineExByAlias.name : localEx.name;
      const key = canonicalName.trim().toLowerCase();
      if (!localMap.has(key)) {
        localMap.set(key, { ...localEx, name: canonicalName });
      }
    });

    const deduplicatedLocal = Array.from(localMap.values());
    const onlineToAdd = onlineExercises.filter(ex => !localMap.has(ex.name.trim().toLowerCase()));
    return [...deduplicatedLocal, ...onlineToAdd];
  }, [exerciseLibrary, onlineExercises]);


  let filteredLib = combinedLibrary;
  if (searchQuery.trim()) {
      const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const lowSearch = searchQuery.toLowerCase().trim();
      filteredLib = filteredLib.filter(ex => {
          const nameStr = ex.name.toLowerCase();
          const targetStr = formatTarget(ex.target, lang?.id).toLowerCase();
          return nameStr.includes(lowSearch) || targetStr.includes(lowSearch) || queryWords.every(word => nameStr.includes(word) || targetStr.includes(word));
      });
  }
  if (muscleFilter.length > 0) {
      filteredLib = filteredLib.filter(ex => {
        const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
        return exTargets.some(m => muscleFilter.includes(normalizeMuscleKey(m)));
      });
  }
  if (equipFilter.length > 0) {
      filteredLib = filteredLib.filter(ex => equipFilter.includes(ex.equipment));
  }
  if (levelFilter.length > 0) {
      filteredLib = filteredLib.filter(ex => levelFilter.includes(ex.level));
  }
  
  // limit to 100 to prevent lag
  filteredLib = filteredLib.slice(0, 100);

  const allEquipOptions = React.useMemo(() => {
    const set = new Set(combinedLibrary.map(ex => ex.equipment).filter(Boolean));
    return [...set].sort();
  }, [combinedLibrary]);

  if (!activeAddModalTarget) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-center p-4 animate-in fade-in"
      onClick={() => setActiveAddModalTarget(null)}
    >
      <div 
        className={`w-full max-w-md mx-auto ${t.bgCard} rounded-2xl overflow-hidden border ${t.border} flex flex-col h-[85vh] max-h-[800px] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className={`p-5 border-b ${t.border} flex justify-between items-center bg-black/5`}>
            <h3 className="font-black h2">{lang.searchLib || 'Cari di Library...'}</h3>
            <button onClick={() => setActiveAddModalTarget(null)} className={`p-2 rounded-full ${t.btnBg} hover:text-rose-500`}><X size={20}/></button>
        </div>

        <>
            <div className={`p-4 border-b ${t.border} shrink-0 space-y-3`}>
              <div className="flex gap-2 items-center">
                <div className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-3 rounded-xl ${t.inputBg}`}>
                  <Search size={16} className={`shrink-0 ${t.textMuted}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari latihan..."
                    className={`w-full min-w-0 bg-transparent body-lg ${t.textMain} outline-none placeholder:${t.textMuted}`}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className={`shrink-0 ${t.textMuted} hover:opacity-70`}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`shrink-0 p-3 rounded-xl transition-all ${
                    showFilters || muscleFilter.length > 0 || equipFilter.length > 0
                      ? `${t.bgAccent} text-white shadow-sm`
                      : `${t.inputBg} ${t.textMuted}`
                  }`}
                  title="Filter"
                >
                  <Filter size={18} />
                </button>
              </div>

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
                    formatOption={(opt) => opt.charAt(0).toUpperCase() + opt.slice(1)}
                  />
                  <div className={`flex items-center justify-between pt-3 mt-1 border-t ${t.border}`}>
                    <div></div>
                    {(muscleFilter.length > 0 || equipFilter.length > 0 || levelFilter.length > 0) && (
                      <button
                        onClick={() => { setMuscleFilter([]); setEquipFilter([]); setLevelFilter([]); }}
                        className="text-[10px] font-black text-rose-500 hover:opacity-80"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 hide-scrollbar">
              {filteredLib.map((ex, idx) => (
                <UnifiedExerciseCard
                  key={ex.id || `${ex.name}-${idx}`}
                  t={t} lang={lang} ex={ex}
                  actionButton={
                    <button onClick={() => {
                        const exToAdd = ex.source === 'exercisedb' ? { ...ex, id: Date.now() + Math.floor(Math.random() * 1000) } : ex;
                        onAddExerciseTarget(exToAdd);
                    }} className={`px-4 py-2.5 rounded-xl ${t.bgAccent} font-bold body-md text-white opacity-90 hover:opacity-100 transition-opacity`}>Tambah</button>
                  }
                  onOpenDetail={() => {
                        const exToAdd = ex.source === 'exercisedb' ? { ...ex, id: Date.now() + Math.floor(Math.random() * 1000) } : ex;
                        onAddExerciseTarget(exToAdd);
                  }}
                />
              ))}
              {filteredLib.length === 0 && <div className="text-center py-6 font-bold text-zinc-500">Tidak ada latihan yang cocok.</div>}
              <div className="mt-6 px-2 pb-6">
                  <button onClick={() => {
                      setActiveAddModalTarget(null);
                      setActiveTab('database');
                  }} className={`w-full py-5 border-2 border-dashed ${t.border} hover:${t.borderAccentSoft} rounded-2xl ${t.textAccent} font-bold hover:${t.bgAccentSoft} transition-all`}>+ {lang.customEx || 'Buat Latihan Kustom'}</button>
              </div>
            </div>
          </>
      </div>
    </div>
  );
};

export default AddExerciseModal;