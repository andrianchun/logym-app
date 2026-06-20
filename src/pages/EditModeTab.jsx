import React from 'react';
import { X, CheckCircle, GripVertical } from 'lucide-react';
import { playSoundEffect } from '../utils/audio';

const EditModeTab = ({ t, lang, programs, setPrograms, setIsEditingMode, setActiveAddModalTarget, soundEnabled, setConfirmModal }) => {

  const handleUpdateEx = (progId, exId, field, val) => {
    // Membiarkan string kosong ('') saat sedang diketik
    const numVal = val === '' ? '' : Number(val);
    setPrograms(programs.map(p => p.id === progId ? {
      ...p,
      exercises: p.exercises.map(ex => ex.id === exId ? { ...ex, [field]: numVal } : ex)
    } : p));
  };

  const handleRemoveEx = (progId, exId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Latihan?',
      message: 'Yakin ingin menghapus latihan ini dari program master?',
      onConfirm: () => {
        playSoundEffect('click', soundEnabled);
        setPrograms(programs.map(p => p.id === progId ? { 
          ...p, 
          exercises: p.exercises.filter(ex => ex.id !== exId) 
        } : p));
      }
    });
  };

  const handleRenameProg = (progId, newName) => {
     setPrograms(programs.map(p => p.id === progId ? { ...p, name: newName } : p));
  };

  const handleFinishEdit = () => {
     playSoundEffect('click', soundEnabled);
     
     // Sanitasi: Semua string kosong ('') dikembalikan menjadi 0 saat disimpan
     const cleanedPrograms = programs.map(p => ({
         ...p,
         exercises: p.exercises.map(ex => ({
             ...ex,
             sets: Number(ex.sets) || 0,
             reps: Number(ex.reps) || 0,
             duration: Number(ex.duration) || 0
         }))
     }));
     
     setPrograms(cleanedPrograms);
     setIsEditingMode(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className={`h1 ${t.textMain}`}>Mode Edit Master</h2>
            <p className={`body-md ${t.textMuted}`}>Ubah set, repetisi, atau hapus latihan.</p>
         </div>
         <button onClick={handleFinishEdit} className={`flex items-center px-4 py-2 rounded-xl text-white font-black body-md ${t.bgAccent} shadow-lg hover:opacity-90`}>
            <CheckCircle size={16} className="mr-1.5"/> Selesai
         </button>
      </div>

      {programs.map(prog => (
        <div key={prog.id} className={`p-4 rounded-2xl border ${t.border} ${t.bgCard} shadow-sm`}>
           <input 
              type="text" 
              value={prog.name} 
              onChange={(e) => handleRenameProg(prog.id, e.target.value)} 
              className={`w-full bg-transparent h2 ${t.textAccent} outline-none mb-4 border-b border-dashed ${t.borderAccentSoft} pb-2`} 
           />
           
           <div className="space-y-3">
              {prog.exercises.map((ex, idx) => {
                 const isTime = ex.type === 'time';
                 return (
                   <div key={ex.id} className={`flex flex-col p-3 rounded-xl bg-black/5 dark:bg-white/5 border ${t.border}`}>
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center">
                            <GripVertical size={16} className={`${t.textMuted} mr-2 cursor-grab`} />
                            <span className="font-bold body-lg">{idx + 1}. {ex.name}</span>
                         </div>
                         <button onClick={() => handleRemoveEx(prog.id, ex.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"><X size={16}/></button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 body-md">
                         <div className="flex items-center justify-between">
                            <span className={`font-bold ${t.textMuted}`}>Target Sets</span>
                            <input 
                               type="number" 
                               value={ex.sets === 0 ? '' : ex.sets} 
                               onChange={(e) => handleUpdateEx(prog.id, ex.id, 'sets', e.target.value)} 
                               placeholder="0" 
                               className={`w-16 p-2 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black outline-none`} 
                            />
                         </div>
                         {isTime ? (
                           <div className="flex items-center justify-between">
                              <span className={`font-bold ${t.textMuted}`}>Durasi (m)</span>
                              <input 
                                 type="number" 
                                 value={ex.duration === 0 ? '' : ex.duration} 
                                 onChange={(e) => handleUpdateEx(prog.id, ex.id, 'duration', e.target.value)} 
                                 placeholder="0" 
                                 className={`w-16 p-2 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black outline-none`} 
                              />
                           </div>
                         ) : (
                           <div className="flex items-center justify-between">
                              <span className={`font-bold ${t.textMuted}`}>Target Reps</span>
                              <input 
                                 type="number" 
                                 value={ex.reps === 0 ? '' : ex.reps} 
                                 onChange={(e) => handleUpdateEx(prog.id, ex.id, 'reps', e.target.value)} 
                                 placeholder="0" 
                                 className={`w-16 p-2 rounded-lg ${t.inputBg} ${t.textMain} text-center font-black outline-none`} 
                              />
                           </div>
                         )}
                      </div>
                   </div>
                 )
              })}
           </div>

           <button onClick={() => { playSoundEffect('click', soundEnabled); setActiveAddModalTarget({type: 'program', progId: prog.id}); }} className={`w-full mt-4 py-3 border-2 border-dashed ${t.border} rounded-xl font-black body-md ${t.textMuted} hover:${t.textAccent} hover:${t.borderAccentSoft} transition-all`}>
              + Tambah Latihan ke {prog.name}
         </button>
        </div>
      ))}
    </div>
  );
};

export default EditModeTab;