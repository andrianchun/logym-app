import React from 'react';
import { Heart, Edit2, X } from 'lucide-react';
import { formatTarget, getVideoId, exerciseTypeLabels } from '../data/constants';
import EquipmentIcon from './EquipmentIcon';
import { getCachedExercises } from '../utils/exerciseDbApi';

const UnifiedExerciseCard = ({ t, lang, ex, onEdit, onDelete, onToggleFavorite, index, onOpenDetail, isCustom, actionButton }) => {
  const isFav = !!ex.isFavorite;
  
  return (
    <div
      className={`relative flex items-stretch p-0 rounded-xl border ${t.border} ${t.bgCard} shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden`}
      style={index !== undefined ? { animationDelay: `${(index % 15) * 20}ms` } : {}}
    >
      {/* Background Image (Right side) */}
      <div 
        className="absolute inset-y-0 right-0 w-[55%] pointer-events-none opacity-50"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 60%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)' }}
      >
          {(() => {
             const apiExercises = getCachedExercises();
             const apiMatch = (!ex.gifUrl && !isCustom) ? apiExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase()) : null;
             const finalGifUrl = ex.gifUrl || apiMatch?.gifUrl;
             const ytId = getVideoId(ex.ytVideo);
             
             if (finalGifUrl) {
                // GIF dari API sudah berbentuk landscape/terpotong rapi
                return <img src={finalGifUrl} alt={ex.name} loading="lazy" className="w-full h-full object-cover object-[100%_25%]" />;
             } else if (ytId) {
                // Gunakan w-[320%] untuk memotong pilar hitam dari thumbnail Shorts (9:16 di dalam 16:9). 
                return <img 
                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                  onError={(e) => {
                    if (e.target.src.includes('maxresdefault')) {
                      e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                      e.target.className = "absolute top-1/2 left-1/2 w-[240%] h-auto max-w-none -translate-x-1/2 -translate-y-[25%] object-cover";
                    }
                  }}
                  alt={ex.name} 
                  loading="lazy" 
                  className="absolute top-1/2 left-1/2 w-[320%] h-auto max-w-none -translate-x-1/2 -translate-y-[25%] object-cover" 
                />;
             } else {
                return null;
             }
          })()}
          {isCustom && <div className="absolute bottom-3.5 right-[22px] text-emerald-500 text-[10px] font-black uppercase tracking-widest leading-none drop-shadow-lg z-10 pointer-events-none">CUSTOM</div>}
      </div>

        {/* Info */}
        <div 
          className="relative z-10 flex-1 py-4 pl-5 pr-2 min-w-0 cursor-pointer"
          onClick={onOpenDetail}
        >
          <h4 
            className={`body-lg font-black ${t.textMain} whitespace-nowrap overflow-hidden w-full`}
            style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}
          >
             {ex.name}
          </h4>
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex gap-1.5 flex-wrap items-center">
             <span className={`text-[10px] font-black uppercase tracking-wider ${t.textAccent}`}>{ex.equipment || 'Lainnya'}</span>
             <span className={`text-[10px] font-bold ${t.textMuted}`}>•</span>
             <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>{exerciseTypeLabels[ex.type] || ex.type}</span>
          </div>
          <div className="flex gap-1 flex-wrap items-center -ml-1.5">{Array.isArray(ex.target) ? ex.target.map(m => (
              <span key={m} className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(m, lang?.id)}</span>
            )) : ex.target && (
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${t.inputBg} ${t.textMuted} border ${t.border}`}>{formatTarget(ex.target, lang?.id)}</span>
            )}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 pr-4 pl-2 py-4 flex-shrink-0 z-20">
        {actionButton ? actionButton : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(ex); }}
              className={`p-2.5 rounded-xl backdrop-blur-md transition-all ${isFav ? 'bg-emerald-500/20 text-emerald-500' : 'bg-black/10 dark:bg-white/10 text-slate-500 hover:bg-emerald-500/20 hover:text-emerald-500'} active:scale-90`}
              title={isFav ? "Hapus dari Favorit" : "Tambah ke Favorit"}
            >
              <Heart size={16} fill={isFav ? "currentColor" : "none"} className={isFav ? "text-emerald-500" : ""} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit && onEdit(ex); }}
              className={`p-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-sky-500 hover:bg-sky-500/20 active:scale-90 transition-all opacity-80 hover:opacity-100 backdrop-blur-md`}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            {isCustom && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete && onDelete(ex); }}
                className="p-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-rose-500 hover:bg-rose-500/20 active:scale-90 transition-all opacity-80 hover:opacity-100 backdrop-blur-md"
                title="Hapus"
              >
                <X size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedExerciseCard;
