import React, { useState, useEffect, useMemo } from 'react';
import { X, Play, Pause, ChevronRight, ChevronLeft, Dumbbell, Check, Info, Clock, Minimize2 } from 'lucide-react';
import ScrollPicker from './ScrollPicker';
import { playSoundEffect } from '../utils/audio';

const ImmersiveWorkout = ({
  t,
  unitSystem,
  programs,
  activeProgramId,
  activeProgramsList,
  extraExercises,
  skippedExercises,
  exerciseLogs,
  onSetChange,
  onToggleSet,
  onSkipSet,
  onClose,
  onSaveWorkout,
  onCancelWorkout,
  soundEnabled,
  onOpenDetail,
  workoutStartTime,
  restTimer,
  setRestTimer,
  setRestTargetTime
}) => {
  // 1. Gather all active exercises
  const allExercises = useMemo(() => {
    const baseExercises = activeProgramsList 
      ? activeProgramsList.flatMap(p => p.exercises || [])
      : (programs.find(p => p.id === activeProgramId) || programs[0])?.exercises || [];
    return [...baseExercises, ...extraExercises].filter(ex => !skippedExercises[ex.id]);
  }, [activeProgramsList, activeProgramId, programs, extraExercises, skippedExercises]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    for (let i = 0; i < allExercises.length; i++) {
      const ex = allExercises[i];
      const logs = exerciseLogs[ex.id];
      if (!logs || logs.some(set => !set.done)) return i;
    }
    return allExercises.length > 0 ? allExercises.length - 1 : 0;
  });
  const ex = allExercises[currentIndex];

  // 2. Workout Timer (Total Duration)
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  useEffect(() => {
    let interval;
    if (!isPaused && workoutStartTime) {
      // Calculate delta to survive background sleeping
      interval = setInterval(() => {
        setWorkoutSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, workoutStartTime]);

  // Rest Timer will be handled globally in App.jsx but we can display it here if passed as prop

  const formatTime = (totalSeconds) => {
    const isNegative = totalSeconds < 0;
    const absSeconds = Math.abs(totalSeconds);
    const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${m}:${s}`;
  };

  const [maxRestTimer, setMaxRestTimer] = useState(0);
  useEffect(() => {
    setMaxRestTimer(prev => restTimer === 0 ? 0 : Math.max(prev, restTimer));
  }, [restTimer]);

  // 3. Current Set Logic
  const logs = ex ? exerciseLogs[ex.id] || Array.from({length: ex.sets || 3}).map(() => ({
    w: ex.defaultWeight || 0, r: ex.reps || 10, d: ex.duration || 10, done: false
  })) : [];

  const firstIncompleteSet = logs.findIndex(s => !s.done);
  const activeSetIdx = firstIncompleteSet === -1 ? logs.length - 1 : firstIncompleteSet;
  const activeSet = logs[activeSetIdx];

  const handleDoneClick = () => {
    if (!ex) return;
    playSoundEffect('success', soundEnabled);
    onToggleSet(ex.id, activeSetIdx);
    
    // Timer istirahat sudah diurus oleh App.jsx via onToggleSet
  };

  const handleSkipSet = () => {
    if (!ex) return;
    playSoundEffect('click', soundEnabled);
    if (!isAllDone) {
      if (onSkipSet) {
        onSkipSet(ex.id, activeSetIdx);
      } else {
        onToggleSet(ex.id, activeSetIdx);
      }
      // Immediately cancel the rest timer that App.jsx triggers
      setTimeout(() => {
        setRestTimer(0);
        if (setRestTargetTime) setRestTargetTime(null);
      }, 50);
    } else {
      handleNextEx();
    }
  };

  const parseMedia = (exercise) => {
    if (!exercise) return [];
    let items = [];
    if (exercise.ytVideo) {
      const urls = exercise.ytVideo.split(' ').filter(v => v.trim());
      urls.forEach(u => items.push({ type: 'youtube', url: u }));
    }
    if (exercise.gifUrl) {
      const urls = exercise.gifUrl.split(' ').filter(v => v.trim());
      urls.forEach(u => items.push({ type: u.match(/\.(mp4|webm)$/i) ? 'video' : 'image', url: u }));
    }
    return items;
  };

  const mediaItems = React.useMemo(() => parseMedia(ex), [ex]);
  const [ytLoaded, setYtLoaded] = React.useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  
  React.useEffect(() => {
    setActiveMediaIndex(0);
  }, [currentIndex]);

  React.useEffect(() => {
    setYtLoaded(false);
  }, [activeMediaIndex, currentIndex]);

  const activeMedia = mediaItems[activeMediaIndex];

  // Pause / Play Logic
  React.useEffect(() => {
    const iframes = document.querySelectorAll('.immersive-video-iframe');
    const videoObjs = document.querySelectorAll('.immersive-video-html5');
    
    iframes.forEach((iframe, idx) => {
      if (idx === activeMediaIndex && !isPaused) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      } else {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });

    videoObjs.forEach((videoObj, idx) => {
      if (idx === activeMediaIndex && !isPaused) {
        videoObj.play();
      } else {
        videoObj.pause();
      }
    });
  }, [isPaused, activeMediaIndex, currentIndex]);

  // Swipe Logic
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe || isRightSwipe) {
      if (mediaItems.length > 1) {
        playSoundEffect('click', soundEnabled);
        if (isLeftSwipe) {
          setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0);
        } else {
          setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1);
        }
      }
    }
  };

  // Listen to YouTube player state to hide initial loading UI and handle seamless looping
  React.useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== "https://www.youtube.com") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "infoDelivery" && data.info) {
          if (data.info.playerState === 1) { // 1 = Playing
            if (!ytLoaded) setYtLoaded(true);
          }
          
          // Loop before it ends using seekTo(0.1) to avoid triggering the native loading/pause spinner
          if (data.info.duration && data.info.currentTime) {
            if (data.info.duration - data.info.currentTime < 0.5) {
              const iframe = document.querySelector('.immersive-video-iframe');
              if (iframe && iframe.contentWindow === e.source) {
                iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "seekTo", args: [0.1, true]}), "*");
                iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
              }
            }
          }
          // Fallback if it somehow hits ended state (0)
          if (data.info.playerState === 0) {
            const iframe = document.querySelector('.immersive-video-iframe');
            if (iframe && iframe.contentWindow === e.source) {
              iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "seekTo", args: [0.1, true]}), "*");
              iframe.contentWindow.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
            }
          }
        }
      } catch (err) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [ytLoaded]);

  const handleNextEx = () => {
    playSoundEffect('click', soundEnabled);
    if (currentIndex < allExercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFinishConfirm(true);
    }
  };

  const handlePrevSet = () => {
    playSoundEffect('click', soundEnabled);
    const isAllDone = logs.every(s => s.done);
    
    if (isAllDone && logs.length > 0) {
      // All sets done, undo the last set
      onToggleSet(ex.id, logs.length - 1);
    } else if (activeSetIdx > 0) {
      // Undo the previous set
      onToggleSet(ex.id, activeSetIdx - 1);
    } else if (currentIndex > 0) {
      // First set of current exercise, go to previous exercise
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!ex) return null;

  const isImp = unitSystem === 'imperial';

  const isAllDone = logs.every(s => s.done);
  const theme = t?.bgApp?.includes('040f1a') ? 'dark' : 'light';

  const handleIframeLoad = (e) => {
    e.target.contentWindow.postMessage(JSON.stringify({event: "listening"}), "*");
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${t.bgApp} ${t.textMain} overflow-hidden animate-in slide-in-from-bottom-full duration-300`}>
      
      {/* HEADER (UNIFIED BAR) */}
      <div className={`flex items-center justify-between p-4 absolute top-0 w-full z-10`}>
        
        {/* Durasi Group */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase ${t.textMuted} tracking-widest">Durasi Latihan</span>
            <span className="h2 ${t.textAccent}">{formatTime(workoutSeconds)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => { playSoundEffect('click', soundEnabled); setIsPaused(!isPaused); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center transition shadow-sm`} title="Play/Pause">
            {isPaused ? <Play size={18} className={`${t.textAccent}`} /> : <Pause size={18} />}
          </button>
          <button onClick={() => { playSoundEffect('click', soundEnabled); onClose(); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center transition shadow-sm`} title="Minimize">
            <Minimize2 size={18} />
          </button>
          <button onClick={() => { playSoundEffect('click', soundEnabled); onCancelWorkout(); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'} flex items-center justify-center transition shadow-sm`} title="Batalkan Workout">
            <X size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => { playSoundEffect('click', soundEnabled); setShowFinishConfirm(true); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-emerald-400' : 'bg-black/5 hover:bg-black/10 text-[#41759b]'} flex items-center justify-center transition shadow-sm`} title="Selesai Workout">
            <Check size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full h-1 ${t.bgApp}/10 dark:bg-white/10 z-20">
        <div 
          className="h-full  transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / allExercises.length) * 100}%` }}
        />
      </div>

      {/* TABLET SPLIT WRAPPER */}
      <div className="flex-1 flex flex-col sm:flex-row w-full mt-16 overflow-hidden">

      {/* MAIN VISUAL (Center) */}
      <div 
        className="flex-1 relative mb-6 sm:mb-4 rounded-3xl mx-4 sm:mr-0 overflow-hidden shadow-2xl border border-white/10 group touch-pan-y bg-black"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className="flex h-full w-full transition-transform duration-300 ease-in-out"
          style={{ 
            transform: `translateX(-${activeMediaIndex * (100 / Math.max(1, mediaItems.length))}%)`,
            width: `${Math.max(1, mediaItems.length) * 100}%`
          }}
        >
          {mediaItems.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell size={80} className="opacity-10" />
            </div>
          ) : (
            mediaItems.map((media, idx) => (
              <div key={idx} className="h-full flex items-center justify-center shrink-0 relative overflow-hidden" style={{ width: `${100 / mediaItems.length}%` }}>
                {(() => {
                  if (media.type === 'youtube') {
                    const match = media.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                    const videoId = match ? match[1] : null;
                    if (videoId) {
                      return (
                        <>
                          {!ytLoaded && idx === activeMediaIndex && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#040f1a] z-10">
                              <Clock className="animate-spin text-white/50" size={32} />
                            </div>
                          )}
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${idx === activeMediaIndex && !isPaused ? '1' : '0'}&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            onLoad={handleIframeLoad}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            className={`immersive-video-iframe w-[150%] h-[150%] max-w-none pointer-events-none scale-[1.35] sm:scale-125 transition-opacity duration-700 ${ytLoaded || idx !== activeMediaIndex ? 'opacity-100' : 'opacity-0'}`}
                          ></iframe>
                        </>
                      );
                    }
                  }
                  if (media.type === 'video') {
                    return <video src={media.url} autoPlay={idx === activeMediaIndex && !isPaused} loop muted playsInline className="immersive-video-html5 w-full h-full object-contain opacity-80 pointer-events-none" />;
                  }
                  return <img src={media.url} alt={ex.name} className="w-full h-full object-contain opacity-80 pointer-events-none" />;
                })()}
              </div>
            ))
          )}
        </div>

        {/* Carousel Controls */}
        {mediaItems.length > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); playSoundEffect('click', soundEnabled); setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1); }}
              className="p-3 rounded-full ${t.bgCard} opacity-90 ${t.textMain} backdrop-blur-sm hover:${t.bgApp}/70 transition-all shadow-lg active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); playSoundEffect('click', soundEnabled); setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0); }}
              className="p-3 rounded-full ${t.bgCard} opacity-90 ${t.textMain} backdrop-blur-sm hover:${t.bgApp}/70 transition-all shadow-lg active:scale-95"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
        
        {/* Media Indicators */}
        {mediaItems.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {mediaItems.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeMediaIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
            ))}
          </div>
        )}
        
        {/* Info Overlay */}
        <button 
          onClick={() => onOpenDetail(ex)}
          className="absolute top-4 right-4 ${t.bgCard} opacity-90 backdrop-blur-md p-2 rounded-xl ${t.textMuted} hover:${t.textMain} transition"
        >
          <Info size={24} />
        </button>

        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          <p className={`${t.textAccent} body-md tracking-widest mb-1`}>
            EXERCISE {currentIndex + 1} OF {allExercises.length}
          </p>
          <h1 className="h1 text-white leading-tight drop-shadow-lg">{ex.name}</h1>
        </div>
      </div>

      {/* CONTROLS (Bottom) */}
      <div className="w-full sm:w-[45%] lg:w-[40%] px-4 pb-8 sm:pb-4 space-y-6 sm:space-y-8 flex flex-col justify-center overflow-y-auto shrink-0 relative z-10">
        
        {/* Top Controls: Undo | Sets | Skip */}
        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={handlePrevSet}
            disabled={currentIndex === 0 && activeSetIdx === 0}
            className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} disabled:opacity-30 transition`}
            title="Kembali / Undo Set"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex-1 flex items-center justify-center gap-2">
            {logs.map((s, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all ${
                  s.skipped ? `w-8 bg-rose-500` :
                  s.done ? `w-8 ${t.bgAccent}` : 
                  i === activeSetIdx ? `w-12 ${t.bgAccent}` : `w-4 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/10'}`
                }`} 
              />
            ))}
          </div>

          <button 
            onClick={handleSkipSet}
            className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} transition flex items-center justify-center gap-1`}
            title="Skip 1 Set"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Scroll Pickers */}
        <div className="flex items-center justify-center gap-4 px-2">
          {ex.type !== 'time' && (
            <div className="flex-1 flex flex-col items-center">
              <span className="body-md mb-2 uppercase">Beban ({isImp ? 'lbs' : 'kg'})</span>
              <ScrollPicker 
                value={isImp ? Math.round(Number(activeSet?.w || 0) * 2.20462 * 10)/10 : (activeSet?.w || 0)} 
                onChange={(val) => onSetChange(ex.id, activeSetIdx, 'w', isImp ? Number((val / 2.20462).toFixed(2)) : val)}
                min={0} max={isImp ? 440 : 200} step={isImp ? 5 : 2.5} width="w-full max-w-[120px]" theme={theme}
              />
            </div>
          )}
          
          {ex.type === 'time' ? (
            <div className="flex-1 flex flex-col items-center">
              <span className="body-md mb-2 uppercase">Durasi (dtk)</span>
              <ScrollPicker 
                value={activeSet?.d || 15} 
                onChange={(val) => onSetChange(ex.id, activeSetIdx, 'd', val)}
                min={5} max={300} step={5} width="w-full max-w-[120px]" theme={theme}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center">
              <span className="body-md mb-2 uppercase">Repetisi</span>
              <ScrollPicker 
                value={activeSet?.r || 10} 
                onChange={(val) => onSetChange(ex.id, activeSetIdx, 'r', val)}
                min={1} max={50} step={1} width="w-full max-w-[120px]" theme={theme}
              />
            </div>
          )}
        </div>

        {/* Actions Row (Full Width) */}
        <div className="w-full relative">
          {restTimer !== 0 && !isAllDone ? (
            <div className={`w-full relative flex items-stretch justify-between rounded-2xl shadow-xl transition-all overflow-hidden border ${
              restTimer < 0 ? 'bg-rose-500 border-rose-500' : `${t.bgAccentSoft} ${t.borderAccent}`
            }`}>
              {restTimer > 0 && maxRestTimer > 0 && (
                <div 
                  className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear pointer-events-none ${theme === 'dark' ? 'bg-white/25' : 'bg-black/25'}`}
                  style={{ width: `${Math.min(100, Math.max(0, ((maxRestTimer - restTimer) / maxRestTimer) * 100))}%` }}
                />
              )}
              <button onClick={(e) => { e.stopPropagation(); setRestTimer(prev => prev - 5); }} className={`relative z-10 w-16 sm:w-20 flex items-center justify-center bg-transparent ${theme === 'dark' ? 'hover:bg-white/10 active:bg-white/20 border-white/20' : 'hover:bg-black/10 active:bg-black/20 border-black/10'} ${t.textMain} font-black transition-colors border-r h2`}>-5</button>
              <button onClick={() => setRestTimer(0)} className={`relative z-10 flex-1 py-4 flex items-center justify-center font-black h2 ${t.textMain} ${theme === 'dark' ? 'active:bg-white/10' : 'active:bg-black/10'} transition-colors`}>
                REST: {formatTime(restTimer)}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setRestTimer(prev => prev + 5); }} className={`relative z-10 w-16 sm:w-20 flex items-center justify-center bg-transparent ${theme === 'dark' ? 'hover:bg-white/10 active:bg-white/20 border-white/20' : 'hover:bg-black/10 active:bg-black/20 border-black/10'} ${t.textMain} font-black transition-colors border-l h2`}>+5</button>
            </div>
          ) : !isAllDone ? (
            <button 
              onClick={handleDoneClick}
              className={`w-full py-4 rounded-2xl ${t.bgAccent} font-black h2 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all`}
            >
              <Check size={24} /> SELESAI SET {activeSetIdx + 1}
            </button>
          ) : (
            <button 
              onClick={handleNextEx}
              className={`w-full py-4 rounded-2xl ${t.bgAccent} font-black h2 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all`}
            >
              {currentIndex === allExercises.length - 1 ? 'FINISH WORKOUT' : 'LATIHAN BERIKUTNYA'}
            </button>
          )}
        </div>
      </div>
      </div>
      {/* END TABLET SPLIT WRAPPER */}

      {/* FINISH CONFIRMATION MODAL */}
      {showFinishConfirm && (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in`}>
          <div className={`${t.bgCard} border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl scale-in-center`}>
            <h3 className={`h1 ${t.textMain} mb-2`}>Selesai Latihan?</h3>
            <p className={`${t.textMuted} mb-6 body-lg`}>Yakin ingin menyelesaikan sesi latihan ini sekarang? Log latihan akan disimpan.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFinishConfirm(false)}
                className={`flex-1 py-3 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 ${t.textMain} font-bold transition-colors`}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  playSoundEffect('success', soundEnabled);
                  onSaveWorkout();
                  setShowFinishConfirm(false);
                }}
                className={`flex-1 py-3 rounded-xl ${t.bgAccent} shadow-xl transition-colors`}
              >
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ImmersiveWorkout;
