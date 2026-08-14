import React from 'react';
import { Edit2 } from 'lucide-react';

const ProgramSelector = ({
  t, programs, activeProgramId, onSelectProgram,
  soundEnabled, playSoundEffect, onEditMode
}) => {
  return (
    <div className="flex justify-between items-center mb-4">
      
      {/* DERETAN TAB PROGRAM (Bisa di-scroll / swipe) */}
      <div className="no-swipe flex overflow-x-auto space-x-2 hide-scrollbar pb-1">
        {programs.map(p => (
          <button 
            key={p.id} 
            onClick={() => { playSoundEffect('click', soundEnabled); onSelectProgram(p.id); }} 
            className={`px-5 py-2 rounded-full whitespace-nowrap font-bold body-lg transition-all ${activeProgramId === p.id ? `${t.bgAccent} shadow-md ${t.shadowAccent}` : `${t.btnBg} ${t.textMuted}`}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* TOMBOL PENSIL (MODE EDIT MASTER) */}
      <button 
        onClick={() => { playSoundEffect('click', soundEnabled); onEditMode(); }} 
        className={`ml-3 p-2.5 shrink-0 rounded-full ${t.btnBg} ${t.textMuted} hover:${t.textAccent} hover:${t.bgAccentSoft} transition-colors`}
      >
        <Edit2 size={18}/>
      </button>

    </div>
  );
};

export default ProgramSelector;