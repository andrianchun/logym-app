import React from 'react';
import { Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';

export default function UnifiedBadge({ achievementId, achievementTitle, isUnlocked = true, isDark, t }) {
  const ach = ACHIEVEMENTS.find(a => a.id === achievementId) || {
    id: achievementId,
    title: achievementTitle || 'Pencapaian',
    icon: Award,
    bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
    color: 'text-amber-500',
    borderColor: 'border-amber-500/30'
  };

  return (
    <div className={`flex flex-col items-center p-3 rounded-2xl ${t ? t.bgBox : (isDark ? 'bg-white/5' : 'bg-black/5')} border ${isDark ? 'border-white/5' : 'border-black/5'} shadow-sm ${!isUnlocked ? 'opacity-40 grayscale' : ''} shrink-0 w-24`}>
      <div className={`w-12 h-12 rounded-full ${ach.bg} ${ach.color} flex items-center justify-center mb-2 shadow-sm ${ach.borderColor ? `border ${ach.borderColor}` : ''}`}>
        {ach.icon({ size: 24, strokeWidth: isUnlocked ? 2 : 1.5 })}
      </div>
      <span className={`text-[10px] font-bold ${t ? t.textMain : (isDark ? 'text-white' : 'text-black')} text-center leading-tight`}>{ach.title}</span>
    </div>
  );
}
