import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, ArrowLeft, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { equipmentOptions } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from './SwipeInput';

const generateId = () => `gym_${Date.now()}`;

const GymManagerModal = ({ gymProfiles, setGymProfiles, activeGymId, setActiveGymId, onClose, t, soundEnabled, setConfirmModal, language }) => {
  const [editingGym, setEditingGym] = useState(null); // null means list view, non-null means editing

  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  const handleCreateGym = () => {
    playSoundEffect('click', soundEnabled);
    const newGym = {
      id: generateId(),
      name: 'Gym Baru',
      equipment: [...equipmentOptions], // Default all
      config: {}
    };
    setEditingGym(newGym);
  };

  const handleEditGym = (gym) => {
    playSoundEffect('click', soundEnabled);
    setEditingGym({ ...gym, equipment: gym.equipment === 'all' ? [...equipmentOptions] : [...gym.equipment] });
  };

  const handleDeleteGym = (gym) => {
    playSoundEffect('click', soundEnabled);
    if (gymProfiles.length <= 1) return; // Cannot delete last gym
    
    if (setConfirmModal) {
      setConfirmModal({
        isOpen: true,
        title: 'Hapus Profil Gym',
        message: `Kamu yakin ingin menghapus profil "${gym.name}"?`,
        onConfirm: () => {
          playSoundEffect('click', soundEnabled);
          setGymProfiles(prev => prev.filter(g => g.id !== gym.id));
          if (activeGymId === gym.id) {
            setActiveGymId('default'); // Fallback to default
          }
        }
      });
    } else {
      setGymProfiles(prev => prev.filter(g => g.id !== gym.id));
      if (activeGymId === gym.id) {
        setActiveGymId('default'); // Fallback to default
      }
    }
  };

  const handleSaveEdit = () => {
    playSoundEffect('click', soundEnabled);
    if (!editingGym.name.trim()) return;

    setGymProfiles(prev => {
      const idx = prev.findIndex(g => g.id === editingGym.id);
      if (idx >= 0) {
        const newProfiles = [...prev];
        newProfiles[idx] = editingGym;
        return newProfiles;
      }
      return [...prev, editingGym];
    });

    setEditingGym(null);
  };

  // ─── LIST VIEW ──────────────────────────────────────────────────
  if (!editingGym) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe" onClick={onClose}>
        <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border ${t.border} animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
          <div className={`p-4 border-b ${t.border} flex justify-between items-center shrink-0`}>
            <h3 className={`text-lg font-black ${t.textMain}`}>Kelola Profil Gym</h3>
            <button onClick={onClose} className={`p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`} data-close-modal="true"><X size={18} className={t.textMain} /></button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-3 overscroll-contain touch-pan-y hide-scrollbar">
            {gymProfiles.map(gym => (
              <div key={gym.id} className={`p-4 rounded-2xl border ${activeGymId === gym.id ? `${t.borderAccent || 'border-sky-500'} shadow-lg shadow-sky-500/10` : t.border} ${t.bgCard} flex items-center justify-between`}>
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setActiveGymId(gym.id);
                    playSoundEffect('click', soundEnabled);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${activeGymId === gym.id ? t.textAccent : t.textMain}`}>{gym.name}</span>
                    {activeGymId === gym.id && <Check size={16} className={t.textAccent} />}
                  </div>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>
                    {gym.equipment === 'all' || gym.equipment?.length === equipmentOptions.length ? 'Semua Alat Tersedia' : `${gym.equipment?.length || 0} Alat Tersedia`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {gym.id !== 'default' && (
                    <button onClick={() => handleEditGym(gym)} className={`p-2 rounded-xl ${t.btnBg} hover:opacity-80 text-sm`} title="Edit"><Edit2 size={15} className={t.textMain} /></button>
                  )}
                  {gym.id !== 'default' && gymProfiles.length > 1 && (
                    <button onClick={() => handleDeleteGym(gym)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-sm" title="Hapus"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 border-t ${t.border} shrink-0`}>
            <button onClick={handleCreateGym} className={`w-full py-3 rounded-2xl ${t.bgAccent} text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg`}>
              <Plus size={18} /> Tambah Profil Gym
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EDIT VIEW ──────────────────────────────────────────────────
  const toggleEquipment = (eqName) => {
    playSoundEffect('click', soundEnabled);
    setEditingGym(prev => {
      let newEq = [...prev.equipment];
      if (newEq.includes(eqName)) {
        newEq = newEq.filter(e => e !== eqName);
      } else {
        newEq.push(eqName);
      }
      return { ...prev, equipment: newEq };
    });
  };

  const updateConfig = (eqName, key, val) => {
    setEditingGym(prev => {
      const config = { ...prev.config };
      if (!config[eqName]) config[eqName] = { barWeight: 0, increment: 0 };
      config[eqName] = { ...config[eqName], [key]: parseFloat(val) || 0 };
      return { ...prev, config };
    });
  };

  const renderConfigFields = (eqName) => {
    const isBarbellBased = eqName.includes('Barbell') || eqName.includes('Smith') || eqName.includes('Leverage') || eqName.includes('Sled');
    const isCableOrMachine = eqName.includes('Cable') || eqName.includes('Machine');
    const isDumbbell = eqName.includes('Dumbbell') || eqName.includes('Kettlebell');
    
    if (!isBarbellBased && !isCableOrMachine && !isDumbbell) return null;

    const conf = editingGym.config[eqName] || { 
      baseWeight: isBarbellBased ? (eqName.includes('Sled') ? 45 : (eqName.includes('Smith') ? 15 : 20)) : 0, 
      ratio: isCableOrMachine ? 1 : 1,
      increment: isBarbellBased ? 2.5 : 5 
    };

    return (
      <div className={`mt-3 p-3 rounded-xl ${t.bg} border ${t.border} grid grid-cols-2 gap-3 text-left`}>
        {/* Beban dasar dulu HANYA muncul untuk alat berbasis bar. Cable, Machine, Dumbbell, dan
            Kettlebell tidak punya kolomnya sama sekali — padahal getEquipmentConfig membaca
            `baseWeight` untuk alat APA PUN, jadi yang hilang cuma inputnya, bukan dukungannya.
            Akibatnya beban aktual di alat-alat itu selalu dihitung seolah beban dasarnya nol,
            padahal di gym sungguhan tumpukan cable, rangka mesin, dan pegangan dumbbell punya
            berat bawaan sendiri — sering 2,5 sampai 5 kg. */}
        <div>
          <label className={`text-[10px] uppercase font-bold tracking-wider ${t.textMuted} block mb-1`}>
            {isBarbellBased ? 'Berat Bar/Alat (kg)' : isDumbbell ? 'Berat Pegangan (kg)' : 'Beban Dasar Alat (kg)'}
          </label>
          <SwipeInput language={language} 
            value={conf.baseWeight ?? conf.barWeight ?? (isBarbellBased ? (eqName.includes('Sled') ? 45 : 20) : 0)}
            onChange={val => {
              updateConfig(eqName, 'baseWeight', val);
              // barWeight ikut ditulis: nama lama yang masih dibaca getEquipmentConfig sebagai
              // cadangan, jadi profil gym lama tidak mendadak berubah artinya.
              updateConfig(eqName, 'barWeight', val);
            }}
            step={0.5} min={0} soundEnabled={soundEnabled}
            className={`w-full bg-transparent border-b border-slate-500/30 pb-1 outline-none ${t.textMain} font-semibold text-center`}
            placeholder="0"
          />
        </div>

        {isCableOrMachine && (
          <div>
            <label className={`text-[10px] uppercase font-bold tracking-wider ${t.textMuted} block mb-1`}>Rasio Katrol</label>
            <div className="flex gap-1.5 pt-1">
              <button 
                type="button"
                onClick={() => updateConfig(eqName, 'ratio', 1)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${conf.ratio === 1 || !conf.ratio ? `${t.bgAccent} text-white shadow-sm` : 'bg-black/10 dark:bg-white/10 opacity-60'}`}
              >
                1:1
              </button>
              <button 
                type="button"
                onClick={() => updateConfig(eqName, 'ratio', 0.5)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${conf.ratio === 0.5 ? `${t.bgAccent} text-white shadow-sm` : 'bg-black/10 dark:bg-white/10 opacity-60'}`}
              >
                2:1 (0.5x)
              </button>
            </div>
          </div>
        )}

        <div>
          <label className={`text-[10px] uppercase font-bold tracking-wider ${t.textMuted} block mb-1`}>Kenaikan Beban (kg)</label>
          <SwipeInput language={language} 
            value={conf.increment || (isBarbellBased ? 2.5 : 5)}
            onChange={val => updateConfig(eqName, 'increment', val)}
            step={0.5} min={0} soundEnabled={soundEnabled}
            className={`w-full bg-transparent border-b border-slate-500/30 pb-1 outline-none ${t.textMain} font-semibold text-center`}
            placeholder={isBarbellBased ? "Misal: 2.5" : "Misal: 5"}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overscroll-contain touch-none no-swipe" onClick={() => setEditingGym(null)}>
      <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border ${t.border} animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`flex justify-between items-center p-4 shrink-0 border-b ${t.border}`}>
          <h3 className={`text-lg font-black ${t.textMain}`}>Edit Profil Gym</h3>
          <button onClick={() => setEditingGym(null)} className={`p-1.5 rounded-full ${t.btnBg} hover:opacity-80 transition-all`} data-close-modal="true">
            <X size={18} className={t.textMain} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 overscroll-contain touch-pan-y hide-scrollbar">
          {/* Gym Name */}
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} mb-2 block`}>Nama Profil Gym</label>
            <input 
              type="text" 
              value={editingGym.name}
              onChange={e => setEditingGym({...editingGym, name: e.target.value})}
              className={`w-full bg-transparent border-b-2 ${t.border} focus:${t.borderAccent || 'border-sky-500'} pb-2 outline-none text-lg font-bold ${t.textMain}`}
              placeholder="Misal: Fitness First, Home Gym..."
              autoFocus
            />
          </div>

          {/* Equipment Toggles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Ketersediaan Alat</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingGym({...editingGym, equipment: [...equipmentOptions]})}
                  className={`px-2.5 py-1 ${t.bgAccentSoft || 'bg-sky-500/10'} ${t.textAccent || 'text-sky-500'} rounded-lg text-[10px] uppercase font-black hover:opacity-80 transition-all`}
                >
                  Pilih Semua
                </button>
                <button 
                  onClick={() => setEditingGym({...editingGym, equipment: []})}
                  className="px-2.5 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] uppercase font-black hover:bg-rose-500/20 transition-all"
                >
                  Hapus Semua
                </button>
              </div>
            </div>
            
            <div className="space-y-2.5">
              {equipmentOptions.map(eq => {
                const isActive = editingGym.equipment.includes(eq);
                return (
                  <div key={eq} className={`border ${isActive ? `${t.borderAccent || 'border-sky-500/40'} ${t.bgAccentSoft || 'bg-sky-500/5'}` : t.border} rounded-2xl p-3 ${t.bgCard} transition-all`}>
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleEquipment(eq)}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isActive ? `${t.bgAccent} border-transparent` : `border-slate-500/30 ${t.bgCard}`}`}>
                        {isActive && <Check size={12} className="text-white" />}
                      </div>
                      <span className={`font-bold text-sm ${isActive ? t.textMain : t.textMuted}`}>{eq}</span>
                    </div>
                    {isActive && renderConfigFields(eq)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 shrink-0 border-t ${t.border}`}>
          <div className="flex gap-3">
            <button onClick={() => setEditingGym(null)} className={`w-1/3 py-3 rounded-2xl font-bold text-sm ${t.textMuted} ${t.btnBg} active:scale-[0.98] transition-all`} data-close-modal="true">Batal</button>
            <button onClick={handleSaveEdit} disabled={!editingGym.name.trim()} className={`flex-1 py-3 rounded-2xl font-black text-sm text-white ${t.bgAccent} shadow-lg shadow-black/20 disabled:opacity-50 active:scale-[0.98] transition-all`}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymManagerModal;
