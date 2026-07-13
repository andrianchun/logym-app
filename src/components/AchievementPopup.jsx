import React, { useEffect } from 'react';
import { X, Share2 } from 'lucide-react';
import { shareAchievementToFeed } from '../utils/communityApi';

const AchievementPopup = ({ achievements, onClose, soundEnabled, playSoundEffect, theme, t, user, onShareComplete }) => {
  useEffect(() => {
    if (achievements && achievements.length > 0) {
      playSoundEffect('success', soundEnabled);
    }
  }, [achievements]);

  const isDark = theme === 'dark';

  if (!achievements || achievements.length === 0) return null;

  const ach = achievements[0];

  const handleShare = async () => {
    playSoundEffect('click', soundEnabled);
    if (user) {
      const postId = await shareAchievementToFeed(
        user.uid,
        user.name || user.email?.split('@')[0],
        user.photoURL,
        ach
      );
      if (onShareComplete) onShareComplete(postId);
    }
    onClose(ach.id);
  };

  const handleClose = () => {
    playSoundEffect('click', soundEnabled);
    onClose(ach.id);
  };

  // Use theme accent color if available, fallback to a nice blue
  const btnBg = t?.bgAccent || 'bg-[#3b82f6]';
  const btnShadow = t?.bgAccent ? '' : 'shadow-[#3b82f6]/30';

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex flex-col justify-center p-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className={`w-full max-w-sm mx-auto relative rounded-3xl overflow-hidden ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-black/10'} shadow-2xl`}>
        
        {/* Glow Background */}
        <div className={`absolute top-0 left-0 right-0 h-40 ${ach.bg} opacity-50 blur-3xl rounded-full translate-y-[-50%] pointer-events-none`} />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-8 flex flex-col items-center text-center relative z-10">
          <div className="mb-2 uppercase tracking-widest text-[10px] font-black text-white/60 bg-black/20 px-3 py-1 rounded-full">
            Pencapaian Baru!
          </div>

          <div className={`w-32 h-32 my-6 flex items-center justify-center rounded-full ${ach.bg} ${ach.color} overflow-hidden relative ${ach.borderColor} border-4 shadow-lg animate-bounce`}>
            {ach.imageUrl ? (
                <img src={ach.imageUrl} alt={ach.title} className="w-full h-full object-cover mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            ) : null}
            <div style={{ display: ach.imageUrl ? 'none' : 'block' }}>
                {ach.fallbackIcon ? ach.fallbackIcon({ size: 64, strokeWidth: 1.5 }) : null}
            </div>
          </div>

          <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-black'}`}>{ach.title}</h3>
          <p className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-black/60'} mb-8`}>{ach.description}</p>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleShare}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-white ${btnBg} shadow-lg ${btnShadow} hover:opacity-90 active:scale-[0.98] transition-all`}
            >
              <Share2 size={20} />
              Bagikan ke Komunitas
            </button>
            <button
              onClick={handleClose}
              className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold ${isDark ? 'text-white/60 hover:text-white bg-white/5' : 'text-black/60 hover:text-black bg-black/5'} transition-colors`}
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementPopup;
