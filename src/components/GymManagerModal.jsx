import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, ArrowLeft, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { equipmentOptions } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import SwipeInput from './SwipeInput';

const generateId = () => `gym_${Date.now()}`;

const GymManagerModal = ({ gymProfiles, setGymProfiles, activeGymId, setActiveGymId, onClose, t, soundEnabled, setConfirmModal, language }) => {
  const [editingGym, setEditingGym] = useState(null); // null means list view, non-null means editing

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
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={onClose}>
        <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border ${t.border}`} onClick={e => e.stopPropagation()}>
          <div className={`p-4 border-b ${t.border} flex justify-between items-center`}>
            <h3 className={`text-xl font-bold ${t.textAccent}`}>Kelola Profil Gym</h3>
            <button onClick={onClose} className={`p-2 rounded-full ${t.btnBg} hover:opacity-80`}><X size={20} className={t.textMain} /></button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {gymProfiles.map(gym => (
              <div key={gym.id} className={`p-4 rounded-2xl border ${activeGymId === gym.id ? 'border-primary shadow-lg shadow-primary/20' : t.border} ${t.bg} flex items-center justify-between`}>
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setActiveGymId(gym.id);
                    playSoundEffect('click', soundEnabled);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${activeGymId === gym.id ? t.textAccent : t.textMain}`}>{gym.name}</span>
                    {activeGymId === gym.id && <Check size={16} className={t.textAccent} />}
                  </div>
                  <p className={`text-xs ${t.textMuted} mt-1`}>
                    {gym.equipment === 'all' || gym.equipment?.length === equipmentOptions.length ? 'Semua Alat Tersedia' : `${gym.equipment?.length || 0} Alat Tersedia`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {gym.id !== 'default' && (
                    <button onClick={() => handleEditGym(gym)} className={`p-2 rounded-xl ${t.btnBg} hover:opacity-80`}><Edit2 size={16} className={t.textMain} /></button>
                  )}
                  {gym.id !== 'default' && gymProfiles.length > 1 && (
                    <button onClick={() => handleDeleteGym(gym)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20"><X size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 border-t ${t.border}`}>
            <button onClick={handleCreateGym} className={`w-full py-3.5 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`}>
              <Plus size={20} /> Tambah Profil Gym
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
    const isBarbellBased = eqName.includes('Barbell') || eqName.includes('Smith') || eqName.includes('Leverage');
    const isMachine = eqName.includes('Cable') || eqName.includes('Machine') && !eqName.includes('Smith');
    
    if (!isBarbellBased && !isMachine) return null;

    const conf = editingGym.config[eqName] || { barWeight: isBarbellBased ? 20 : 0, increment: isBarbellBased ? 2.5 : 5 };

    return (
      <div className={`mt-3 p-3 rounded-xl ${t.bg} border ${t.border} grid grid-cols-2 gap-3`}>
        {isBarbellBased && (
          <div>
            <label className={`text-[10px] uppercase font-bold tracking-wider ${t.textMuted} block mb-1`}>Berat Bar (kg)</label>
            <SwipeInput language={language} 
              value={conf.barWeight}
              onChange={val => updateConfig(eqName, 'barWeight', val)}
              step={0.5} min={0} soundEnabled={soundEnabled}
              className={`w-full bg-transparent border-b border-slate-500/30 pb-1 outline-none ${t.textMain} font-semibold text-center`}
              placeholder="0"
            />
          </div>
        )}
        <div>
          <label className={`text-[10px] uppercase font-bold tracking-wider ${t.textMuted} block mb-1`}>Kenaikan Beban (kg)</label>
          <SwipeInput language={language} 
            value={conf.increment}
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
    <div className={`fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={() => setEditingGym(null)}>
      <div className={`w-full max-w-md mx-auto ${t.bgCard} rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border ${t.border}`} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 pb-4 shrink-0 border-b border-dashed border-slate-500/30">
          <h3 className={`text-2xl font-black ${t.textAccent}`}>Edit Gym</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Gym Name */}
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} mb-2 block`}>Nama Profil Gym</label>
            <input 
              type="text" 
              value={editingGym.name}
              onChange={e => setEditingGym({...editingGym, name: e.target.value})}
              className={`w-full bg-transparent border-b-2 ${t.border} focus:${t.borderAccent} pb-2 outline-none text-xl font-bold ${t.textMain}`}
              placeholder="Misal: Fitness First, Home Gym..."
              autoFocus
            />
          </div>

          {/* Equipment Toggles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Ketersediaan Alat</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingGym({...editingGym, equipment: [...equipmentOptions]})}
                  className="px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] uppercase font-bold hover:bg-primary/20 transition-colors"
                >
                  Pilih Semua
                </button>
                <button 
                  onClick={() => setEditingGym({...editingGym, equipment: []})}
                  className="px-2.5 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] uppercase font-bold hover:bg-rose-500/20 transition-colors"
                >
                  Hapus Semua
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {equipmentOptions.map(eq => {
                const isActive = editingGym.equipment.includes(eq);
                return (
                  <div key={eq} className={`border ${isActive ? t.borderAccentSoft : t.border} rounded-2xl p-3 ${t.bgCard}`}>
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleEquipment(eq)}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isActive ? t.bgAccent : `border-slate-500/30 ${t.bgCard}`}`}>
                        {isActive && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`font-semibold ${isActive ? t.textMain : t.textMuted}`}>{eq}</span>
                    </div>
                    {isActive && renderConfigFields(eq)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-4 mt-auto shrink-0 border-t border-dashed border-slate-500/30 bg-gradient-to-t from-black/5 to-transparent">
          <div className="flex gap-3">
            <button onClick={() => setEditingGym(null)} className={`w-1/3 py-3 rounded-xl font-bold text-sm sm:text-base ${t.textMuted} ${t.btnBg} active:scale-[0.98] transition-all`}>Batal</button>
            <button onClick={handleSaveEdit} disabled={!editingGym.name.trim()} className={`flex-1 py-3 rounded-xl font-black text-sm sm:text-base text-white ${t.bgAccent} shadow-lg shadow-black/20 disabled:opacity-50 active:scale-[0.98] transition-all`}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymManagerModal;
