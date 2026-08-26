import React, { useState } from 'react';
import { ChevronRight, FolderHeart, X, Dumbbell, Clock, Flame } from 'lucide-react';
import { getPlanBgConfig } from '../utils/planBg';

/**
 * Shared program card used identically in:
 *  - CreatePostModal (staging preview)
 *  - EditPostModal (editing preview)
 *  - CommunityTab feed
 *
 * Props:
 *  post          – the post / postDataOverrides object
 *  isDark        – boolean
 *  t             – theme tokens (textMain, textMuted, border, etc.)
 *  onRemove      – optional callback when user removes/detaches program in edit mode
 *  onOpenProfile – optional callback ({ userId, userName, userPhoto }) => void
 */
export default function ProgramCard({ post, isDark = true, t = {}, onRemove = null, onOpenProfile = null }) {
  const programName = post.programName || post.programData?.name || post.name || 'Custom Program';
  const routines    = post.routines    || post.programData?.routines || [];
  const exercises   = post.exercises   || post.programData?.exercises || [];
  const planId      = post.planId      || post.programData?.planId || post.id || '';
  const restTime    = post.restTime    || post.programData?.restTime || 90;

  const [openRoutineIdx, setOpenRoutineIdx] = useState(null);

  // Background artwork config matching ProgramTab
  const bgConfig = getPlanBgConfig(programName, planId);

  // Prefer routines structure; fall back to flat list
  const hasRoutines = routines.length > 0;

  // Origin badge calculation
  const isAiPlan = post.isAI || post.programData?.isAI || (typeof planId === 'string' && (planId.startsWith('plan_ai_') || planId.startsWith('ai-')));
  const rawAuthor = post.sharedBy || post.programData?.sharedBy || post.authorName || post.userName || '';
  const authorUserId = post.userId || post.programData?.userId || post.authorId || null;
  const authorUserPhoto = post.userPhoto || post.programData?.userPhoto || null;

  let badgeType = 'custom';
  let badgeLabel = 'Custom';

  if (isAiPlan || rawAuthor.toLowerCase().includes('coach logy') || rawAuthor.toLowerCase().includes('ai')) {
    badgeType = 'ai';
    badgeLabel = 'Coach Logy';
  } else if (rawAuthor) {
    badgeType = 'user';
    const cleanUser = rawAuthor.startsWith('@') ? rawAuthor.slice(1) : rawAuthor;
    badgeLabel = `@${cleanUser.toLowerCase()}`;
  }

  const handleBadgeClick = (e) => {
    if (badgeType === 'user' && onOpenProfile) {
      e.stopPropagation();
      onOpenProfile({
        userId: authorUserId,
        userName: rawAuthor.replace(/^@/, ''),
        userPhoto: authorUserPhoto
      });
    }
  };

  return (
    <div className={`relative rounded-3xl border overflow-hidden transition-all shadow-xl ${
      isDark ? 'bg-[#0c1427]/90 border-white/10 shadow-black/60' : 'bg-slate-900 border-black/10 shadow-slate-900/30'
    } text-white`}>

      {/* ── Optional Red Remove Button (Edit / Staging mode) ── */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-xl shadow-rose-950/60 transition-all cursor-pointer"
          title="Hapus Lampiran Program"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}

      {/* ── Background Artwork Layer (Coach on the Right) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base Layer for Glassmorphism */}
        <div 
          className="absolute inset-0 opacity-30 mix-blend-luminosity"
          style={{
            backgroundImage: `url('${bgConfig.url}')`,
            backgroundSize: bgConfig.bgSize || 'cover',
            backgroundPosition: bgConfig.position || 'center right',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Focal Layer for Right Artwork */}
        <div 
          className="absolute top-0 -bottom-10 right-0 w-[60%] opacity-90"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
            maskImage: 'linear-gradient(to left, black 55%, transparent 100%)'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${bgConfig.url}')`,
              backgroundSize: bgConfig.bgSize || 'cover',
              backgroundPosition: bgConfig.position || 'center top',
              backgroundRepeat: 'no-repeat',
              transform: bgConfig.scale ? `scale(${bgConfig.scale})` : 'none',
              transformOrigin: 'center right'
            }}
          />
        </div>
        {/* Solid Darkening Gradients from Left to Protect Text */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060c1c] via-[#060c1c]/80 to-transparent" />
      </div>

      {/* ── Main Foreground Content ── */}
      <div className="relative z-10 p-4 sm:p-5 flex flex-col min-h-[160px]">
        
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">
                Program Latihan
              </span>
              
              {/* Origin Badge */}
              {badgeType === 'ai' ? (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/40 backdrop-blur-md shadow-sm">
                  Coach Logy
                </span>
              ) : badgeType === 'user' ? (
                <button
                  type="button"
                  onClick={handleBadgeClick}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md transition-all ${
                    onOpenProfile ? 'hover:bg-sky-500/30 hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'
                  }`}
                  title={onOpenProfile ? `Lihat profil ${badgeLabel}` : undefined}
                >
                  {badgeLabel}
                </button>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-white/10 text-white/70 border border-white/15">
                  Custom
                </span>
              )}
            </div>

            <h4 className="font-black text-lg sm:text-xl text-white leading-tight drop-shadow-md truncate">
              {programName}
            </h4>
          </div>

          <div className="shrink-0 text-right">
            <span className="inline-block px-2.5 py-1 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black text-white/90 uppercase tracking-wider backdrop-blur-md">
              {hasRoutines ? `${routines.length} Rutinitas` : `${exercises.length} Latihan`}
            </span>
          </div>
        </div>

        {/* Routines Accordion List */}
        {hasRoutines && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-white/10 pt-3">
            {routines.map((routine, ri) => {
              const isOpen = openRoutineIdx === ri;
              const days = routine.assignedDays || [];
              const routineExercises = routine.exercises || [];

              return (
                <div key={ri} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden backdrop-blur-md transition-all">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenRoutineIdx(isOpen ? null : ri); }}
                    className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ChevronRight 
                        size={14} 
                        className={`text-sky-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
                      />
                      {days.length > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-[8px] font-black uppercase text-sky-300">
                          {days.join('/')}
                        </span>
                      )}
                      <span className="text-xs font-bold text-white/95 truncate">
                        {routine.name || `Hari ${ri + 1}`}
                      </span>
                    </div>

                    <span className="text-[10px] font-medium text-white/60 shrink-0 ml-2">
                      {routineExercises.length} Latihan
                    </span>
                  </button>

                  {/* Expanded Exercise Breakdown */}
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/5 flex flex-col gap-1.5 animate-in fade-in duration-200">
                      {routineExercises.length === 0 ? (
                        <span className="text-[10px] text-white/40 italic">Belum ada latihan</span>
                      ) : (
                        routineExercises.map((ex, ei) => {
                          const isTime = ex.type === 'time';
                          const dose = isTime 
                            ? `${ex.sets || 1} × ${ex.duration || 0} dtk`
                            : `${ex.sets || 3} × ${ex.reps || 10}${ex.defaultWeight ? ` × ${ex.defaultWeight}kg` : ''}`;

                          return (
                            <div key={ei} className="flex items-center justify-between gap-2 text-[10px] text-white/80 py-0.5">
                              <span className="font-semibold text-white/90 truncate flex-1">
                                {ex.name}
                              </span>
                              <span className="font-mono font-bold text-sky-300 shrink-0 tabular-nums">
                                {dose}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Flat Exercise List Fallback */}
        {!hasRoutines && exercises.length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {exercises.slice(0, 8).map((ex, i) => (
                <span
                  key={i}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 border border-white/10 text-white/85 backdrop-blur-md"
                >
                  {ex.name}
                </span>
              ))}
              {exercises.length > 8 && (
                <span className="text-[10px] font-bold px-2 py-1 text-white/50">
                  +{exercises.length - 8} lagi
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
