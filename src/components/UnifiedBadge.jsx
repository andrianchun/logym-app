import React from 'react';
import { Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';

export default function UnifiedBadge({ achievementId, achievementTitle, isUnlocked = true, currentProgress, target, metric, isDark, t, onClick }) {
  const ach = ACHIEVEMENTS.find(a => a.id === achievementId) || {
    id: achievementId,
    title: achievementTitle || 'Pencapaian',
    fallbackIcon: (props) => <Award {...props} />,
    bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
    color: 'text-amber-500',
    borderColor: 'border-amber-500/30'
  };

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center justify-start ${!isUnlocked ? 'opacity-50 grayscale' : ''} shrink-0 w-24 ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all' : ''}`}
    >
      <div className={`w-16 h-16 rounded-full ${ach.bg} ${ach.color} flex items-center justify-center mb-2 shadow-sm relative ${ach.borderColor ? `border ${ach.borderColor}` : ''} overflow-hidden`}>
        {ach.imageUrl ? (
          <img src={ach.imageUrl} alt={ach.title} className="w-full h-full object-cover mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
        ) : null}
        <div style={{ display: ach.imageUrl ? 'none' : 'block' }}>
          {ach.fallbackIcon({ size: 28, strokeWidth: isUnlocked ? 2 : 1.5 })}
        </div>
      </div>
      <span className={`text-[10px] font-bold ${t ? t.textMain : (isDark ? 'text-white' : 'text-black')} text-center leading-tight mb-1`}>{ach.title}</span>
      
      {!isUnlocked && target > 0 && (
        <div className="w-full mt-1">
          <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} overflow-hidden`}>
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${Math.min(100, Math.max(0, ((currentProgress || 0) / target) * 100))}%` }}
            />
          </div>
          <div className={`text-[8px] font-black text-center mt-1 uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-black/40'}`}>
            {currentProgress || 0} / {target}
          </div>
        </div>
      )}
    </div>
  );
}
