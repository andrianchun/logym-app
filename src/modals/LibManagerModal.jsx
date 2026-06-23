import React, { useState } from 'react';
import { X, Search, Edit2, Plus, Filter, Link as LinkIcon, Dumbbell } from 'lucide-react';
import { formatTarget, normalizeMuscleKey, muscleOptions, equipmentOptions } from '../data/constants';
import { playSoundEffect } from '../utils/audio';

const LibManagerModal = ({ showLibManager, setShowLibManager, t, exerciseLibrary, setExerciseLibrary, soundEnabled, setConfirmModal }) => {
  const [viewMode, setViewMode] = useState('list');
  const [editForm, setEditForm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('All');
  const [filterEquip, setFilterEquip] = useState('All');
  const [sortBy, setSortBy] = useState('new');

  if (!showLibManager) return null;
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

  let filteredLib = exerciseLibrary.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (filterMuscle !== 'All') filteredLib = filteredLib.filter(ex => ex.target && ex.target.includes(filterMuscle));
  if (filterEquip !== 'All') filteredLib = filteredLib.filter(ex => ex.equipment === filterEquip || (!ex.equipment && filterEquip === 'Lainnya'));

  filteredLib.sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name);
      if (sortBy === 'za') return b.name.localeCompare(a.name);
      if (sortBy === 'new') return b.id - a.id; 
      return 0;
  });

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Master Latihan?',
      message: 'Yakin hapus dari database master? (Riwayat lama yang memakai ID ini namanya akan menjadi "Unknown")',
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        setExerciseLibrary(exerciseLibrary.filter(ex => ex.id !== id));
      }
    });
  };

  const openForm = (ex = null) => {
      playSoundEffect('click', soundEnabled);
      if (ex) {
          const normalizedTarget = Array.isArray(ex.target) ? ex.target.map(normalizeMuscleKey) : [normalizeMuscleKey(ex.target || 'Lainnya')];
          setEditForm({ ...ex, target: normalizedTarget });
      } else {
          setEditForm({ id: null, name: '', target: ['Dada Atas'], type: 'weight', equipment: 'Lainnya', ytVideo: '', defaultWeight: 0 });
      }
      setViewMode('form');
  };

  const handleSaveForm = () => {
      playSoundEffect('click', soundEnabled);
      if (!editForm.name.trim()) return;

      // Sanitasi angka kosong saat disimpan
      const finalForm = { ...editForm, defaultWeight: Number(editForm.defaultWeight) || 0 };

      if (finalForm.id) {
          setExerciseLibrary(exerciseLibrary.map(ex => ex.id === finalForm.id ? finalForm : ex));
      } else {
          setExerciseLibrary([...exerciseLibrary, { ...finalForm, id: Date.now() }]);
      }
      setViewMode('list');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border ${t.border}`}>
         
         <div className={`p-5 border-b ${t.border} flex justify-between items-center bg-black/5`}>
            <h3 className="font-black h2">{viewMode === 'list' ? 'Kelola Database Latihan' : (editForm.id ? 'Edit Latihan Master' : 'Tambah Master Baru')}</h3>
            <button onClick={() => { if(viewMode==='form') setViewMode('list'); else setShowLibManager(false); }} className={`p-2 rounded-full ${t.btnBg} hover:text-rose-500`}><X size={20}/></button>
         </div>
         
         {viewMode === 'list' ? (
           <>
             <div className={`p-4 border-b ${t.border} shrink-0 space-y-3`}>
                <div className="flex space-x-2">
                    <div className={`flex-1 flex items-center ${t.inputBg} rounded-xl px-4 py-3 border border-transparent focus-within:${t.borderAccentSoft} transition-colors`}>
                        <Search size={20} className={t.textMuted} />
                        <input type="text" placeholder="Cari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`ml-3 bg-transparent w-full outline-none ${t.textMain} font-medium`} />
                    </div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`w-28 ${t.inputBg} ${t.textMain} rounded-xl px-2 outline-none font-bold body-md cursor-pointer`}>
                        <option value="new">Terbaru</option>
                        <option value="az">A - Z</option>
                        <option value="za">Z - A</option>
                    </select>
                </div>
                
                <div className="flex items-center space-x-2 w-full overflow-x-auto hide-scrollbar pb-1">
                     <div className={`flex items-center body-md ${t.textMuted} whitespace-nowrap pl-1`}><Filter size={14} className="mr-1"/></div>
                     <button onClick={() => setFilterMuscle('All')} className={`px-3 py-1.5 rounded-lg body-md whitespace-nowrap transition-colors border ${filterMuscle === 'All' ? t.bgAccent + ' border-transparent' : t.inputBg + ' ' + t.textMuted + ' border-transparent'}`}>Semua Otot</button>
                     {muscleOptions.map(m => (
                         <button key={m} onClick={() => setFilterMuscle(m)} className={`px-3 py-1.5 rounded-lg body-md whitespace-nowrap transition-colors border ${filterMuscle === m ? t.bgAccent + ' border-transparent' : t.inputBg + ' ' + t.textMuted + ' border-transparent'}`}>{m}</button>
                     ))}
                </div>

                <div className="flex items-center space-x-2 w-full overflow-x-auto hide-scrollbar pb-1">
                     <div className={`flex items-center body-md ${t.textMuted} whitespace-nowrap pl-1`}><Dumbbell size={14} className="mr-1"/></div>
                     <button onClick={() => setFilterEquip('All')} className={`px-3 py-1.5 rounded-lg body-md whitespace-nowrap transition-colors border ${filterEquip === 'All' ? t.bgAccent + ' border-transparent' : t.inputBg + ' ' + t.textMuted + ' border-transparent'}`}>Semua Alat</button>
                     {equipmentOptions.map(eq => (
                         <button key={eq} onClick={() => setFilterEquip(eq)} className={`px-3 py-1.5 rounded-lg body-md whitespace-nowrap transition-colors border ${filterEquip === eq ? t.bgAccent + ' border-transparent' : t.inputBg + ' ' + t.textMuted + ' border-transparent'}`}>{eq}</button>
                     ))}
                </div>
             </div>
             
             <div className="p-3 overflow-y-auto flex-1 hide-scrollbar">
                {filteredLib.map(ex => (
                    <div key={ex.id} className={`flex justify-between items-center p-4 mb-2 rounded-xl ${t.bgApp} border border-transparent hover:${t.borderAccentSoft} transition-colors group`}>
                        <div className="flex flex-col">
                            <span className="font-bold body-lg">{ex.name}</span>
                            <span className="text-[10px] uppercase font-bold text-amber-500">{formatTarget(ex.target, lang?.id)} &middot; {ex.equipment || 'Lainnya'}</span>
                        </div>
                        <div className="flex space-x-1">
                            <button onClick={() => openForm(ex)} className={`p-2 ${t.btnBg} hover:${t.textAccent} rounded-lg transition-colors`}><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(ex.id)} className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors"><X size={16}/></button>
                        </div>
                    </div>
                ))}
                {filteredLib.length === 0 && <div className="text-center py-6 font-bold text-zinc-500">Tidak ada latihan yang cocok.</div>}
                <div className="mt-4 px-2 pb-6">
                    <button onClick={() => openForm()} className={`w-full py-4 border-2 border-dashed ${t.border} hover:${t.borderAccentSoft} rounded-2xl ${t.textAccent} font-bold flex justify-center items-center hover:${t.bgAccentSoft} transition-all`}><Plus size={18} className="mr-2"/> Tambah Master Latihan</button>
                </div>
             </div>
           </>
         ) : (
           <div className="p-6 space-y-6 flex-1 overflow-y-auto hide-scrollbar">
              <div>
                  <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider`}>Nama Latihan</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className={`w-full ${t.inputBg} ${t.textMain} px-4 py-4 rounded-xl outline-none focus:ring-2 focus:${t.ringAccent} font-bold`} />
              </div>
              <div>
                  <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider`}>Target Otot</label>
                  <div className="flex flex-wrap gap-2">
                      {muscleOptions.map(opt => (
                          <button key={opt} onClick={() => { setEditForm(prev => ({ ...prev, target: prev.target.includes(opt) ? prev.target.filter(t => t !== opt) : [...prev.target, opt] })) }} className={`px-3 py-1.5 rounded-full caption font-bold border transition-colors ${editForm.target.includes(opt) ? t.bgAccent + ' border-transparent' : t.inputBg + ' ' + t.textMuted + ' border-transparent'}`}>{opt}</button>
                      ))}
                  </div>
              </div>
              <div className="space-y-4" ref={dropdownRef}>
                  <div className="relative">
                      <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider`}>Equipment</label>
                      <button 
                          onClick={(e) => { e.preventDefault(); setOpenDropdown(openDropdown === 'equipment' ? null : 'equipment'); }}
                          className={`relative z-[60] w-full body-lg font-bold p-4 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border border-transparent focus:ring-2 focus:${t.ringAccent} transition-colors`}
                      >
                          <span>{editForm.equipment}</span>
                          <ChevronDown size={16} className={`transition-transform duration-200 ${openDropdown === 'equipment' ? 'rotate-180' : ''} ${t.textMuted}`} />
                      </button>
                      {openDropdown === 'equipment' && (
                          <div className={`absolute top-full right-0 left-0 -mt-4 pt-5 pb-1 rounded-b-2xl border ${t.border} border-t-0 ${t.bgCard} shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[50] animate-in slide-in-from-top-4 origin-top`}>
                              {equipmentOptions.map(eq => (
                                  <button
                                      key={eq}
                                      onClick={(e) => {
                                          e.preventDefault();
                                          setEditForm({...editForm, equipment: eq});
                                          setOpenDropdown(null);
                                      }}
                                      className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${editForm.equipment === eq ? t.textAccent + ' bg-emerald-500/10 dark:bg-emerald-500/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                                  >
                                      {eq}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="flex space-x-3 mt-2">
                      <div className="relative w-full">
                          <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider`}>Tipe Latihan</label>
                          <button 
                              onClick={(e) => { e.preventDefault(); setOpenDropdown(openDropdown === 'type' ? null : 'type'); }}
                              className={`relative z-[60] w-full body-lg font-bold p-4 rounded-xl flex items-center justify-between space-x-2 ${t.inputBg} ${t.textMain} border border-transparent focus:ring-2 focus:${t.ringAccent} transition-colors`}
                          >
                              <span>{editForm.type === 'weight' ? 'Beban & Repetisi' : editForm.type === 'reps' ? 'Repetisi' : 'Durasi'}</span>
                              <ChevronDown size={16} className={`transition-transform duration-200 ${openDropdown === 'type' ? 'rotate-180' : ''} ${t.textMuted}`} />
                          </button>
                          {openDropdown === 'type' && (
                              <div className={`absolute top-full right-0 left-0 -mt-4 pt-5 pb-1 rounded-b-2xl border ${t.border} border-t-0 ${t.bgCard} shadow-xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[50] animate-in slide-in-from-top-4 origin-top`}>
                                  {[
                                    { val: 'weight', label: 'Beban & Repetisi' },
                                    { val: 'reps', label: 'Repetisi' },
                                    { val: 'time', label: 'Durasi' }
                                  ].map(typeObj => (
                                      <button
                                          key={typeObj.val}
                                          onClick={(e) => {
                                              e.preventDefault();
                                              setEditForm({...editForm, type: typeObj.val});
                                              setOpenDropdown(null);
                                          }}
                                          className={`w-full text-left px-4 py-3 body-sm font-bold transition-colors ${editForm.type === typeObj.val ? t.textAccent + ' bg-emerald-500/10 dark:bg-emerald-500/10' : t.textMuted + ' hover:' + t.textMain + ' hover:bg-black/5 dark:hover:bg-white/5'}`}
                                      >
                                          {typeObj.label}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                      <div className="w-24">
                          <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider text-center`}>Beban (kg)</label>
                          <input 
                             type="number" 
                             value={editForm.defaultWeight === 0 ? '' : editForm.defaultWeight} 
                             onChange={(e) => setEditForm({...editForm, defaultWeight: e.target.value === '' ? '' : Number(e.target.value)})} 
                             className={`w-full ${t.inputBg} ${t.textMain} px-2 py-3.5 rounded-xl outline-none text-center font-bold body-lg`} 
                             placeholder="0"
                          />
                      </div>
                  </div>
              </div>
                <div>
                    <label className={`block caption font-black ${t.textMuted} mb-2 uppercase tracking-wider`}>Link Video</label>
                    <input type="text" value={editForm.ytVideo} onChange={(e) => setEditForm({...editForm, ytVideo: e.target.value})} className={`w-full ${t.inputBg} ${t.textMain} px-4 py-4 rounded-xl outline-none focus:ring-2 focus:${t.ringAccent} body-lg`} />
                </div>
              <div className="flex space-x-4 mt-8 pt-4 border-t border-dashed border-slate-500/30">
                  <button onClick={() => setViewMode('list')} className={`flex-1 py-4 rounded-xl font-bold ${t.btnBg} ${t.textMuted}`}>Batal</button>
                  <button onClick={handleSaveForm} disabled={!editForm.name} className={`flex-1 py-4 rounded-xl font-bold text-white transition-colors ${editForm.name ? `${t.bgAccent}` : 'bg-slate-500 cursor-not-allowed'}`}>Simpan Master</button>
              </div>
           </div>
         )}
         
      </div>
    </div>
  );
};

export default LibManagerModal;