import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, ChevronRight, ChevronLeft, Dumbbell, Check, Info, Clock, Minimize2, SkipForward, ClipboardEdit, Brain, Flame, Activity, ArrowLeftRight, Square } from 'lucide-react';
import ScrollPicker from './ScrollPicker';
import { exerciseTypeLabels } from '../data/constants';
import { playSoundEffect } from '../utils/audio';
import { calculateWorkoutCalories } from '../utils/workoutCalc';

const ImmersiveWorkout = ({
  t,
  units,
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
  isClosing,
  workoutStartTime,
  restTimer,
  setRestTimer,
  gymProfiles,
  activeGymId,
  setRestTargetTime,
  showSupersetToast,
  getOverloadHint,
  userProfile
}) => {
  // 1. Gather all active exercise groups
  const validExercises = useMemo(() => {
    const baseExercises = activeProgramsList 
      ? activeProgramsList.flatMap(p => p.exercises || [])
      : (programs.find(p => p.id === activeProgramId) || programs[0])?.exercises || [];
    return [...baseExercises, ...extraExercises].filter(ex => !skippedExercises[ex.id]);
  }, [activeProgramsList, activeProgramId, programs, extraExercises, skippedExercises]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    for (let i = 0; i < validExercises.length; i++) {
      const eItem = validExercises[i];
      const logs = exerciseLogs[eItem.id];
      const isGroupIncomplete = !logs || logs.some(set => !set.done);
      if (isGroupIncomplete) return i;
    }
    return validExercises.length > 0 ? validExercises.length - 1 : 0;
  });
  
  const ex = validExercises[currentIndex];

  // 2. Workout Timer (Total Duration)
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showHint, setShowHint] = useState(false);

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

  const [activeSetDetail, setActiveSetDetail] = useState(null);
  const [showIntensityInfo, setShowIntensityInfo] = useState(false);
  const [rpeMode, setRpeMode] = useState(() => {
    return localStorage.getItem('logym_rpe_mode') !== 'false';
  });

  const handleSaveSetDetail = (exId, setIdx, details) => {
    if (details.isCardio) {
      if (details.heartRate !== undefined) onSetChange(exId, setIdx, 'heartRate', details.heartRate);
      if (details.elevation !== undefined) onSetChange(exId, setIdx, 'elevation', details.elevation);
      if (details.incline !== undefined) onSetChange(exId, setIdx, 'incline', details.incline);
    } else {
      onSetChange(exId, setIdx, 'notes', details.notes);
      onSetChange(exId, setIdx, 'rir', details.rir);
      onSetChange(exId, setIdx, 'rpe', details.rpe);
    }
    setActiveSetDetail(null);
  };

  const formatTime = (totalSeconds) => {
    const isNegative = totalSeconds < 0;
    const absSeconds = Math.abs(totalSeconds);
    const hrs = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    if (hrs > 0) return `${isNegative ? '-' : ''}${hrs}:${m}:${s}`;
    return `${isNegative ? '-' : ''}${m}:${s}`;
  };

  const caloriesBurned = calculateWorkoutCalories(userProfile?.weight || 70, Math.floor(workoutSeconds / 60));

  const [maxRestTimer, setMaxRestTimer] = useState(0);
  useEffect(() => {
    setMaxRestTimer(prev => restTimer === 0 ? 0 : Math.max(prev, restTimer));
  }, [restTimer]);

  const [activeTimer, setActiveTimer] = React.useState({ idx: null, timeLeft: 0, mode: 'down' });

  React.useEffect(() => {
    let interval = null;
    if (activeTimer.idx !== null) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          if (prev.mode === 'down') {
             if (prev.timeLeft <= 1) {
                playSoundEffect('done', soundEnabled);
                clearInterval(interval);
                return { idx: null, timeLeft: 0, mode: 'down' };
             }
             return { ...prev, timeLeft: prev.timeLeft - 1 };
          }
          return { ...prev, timeLeft: prev.timeLeft + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer.idx, soundEnabled]);

  const toggleTimer = (setIdx, duration, isCardio = false) => {
    playSoundEffect('click', soundEnabled);
    if (activeTimer.idx === setIdx) {
        if (activeTimer.mode === 'up') {
            const elapsedMins = Number((activeTimer.timeLeft / 60).toFixed(2));
            if (isCardio) {
                handleCardioChange('duration', elapsedMins);
            } else {
                onSetChange(ex.id, setIdx, 'd', activeTimer.timeLeft);
            }
        }
        setActiveTimer({ idx: null, timeLeft: 0, mode: 'down' });
    } else {
        const d = Number(duration || 0);
        if (d > 0) {
           const timeInSeconds = isCardio ? Math.round(d * 60) : Math.round(d);
           setActiveTimer({ idx: setIdx, timeLeft: timeInSeconds, mode: 'down' }); 
        } else {
           setActiveTimer({ idx: setIdx, timeLeft: 0, mode: 'up' }); 
        }
    }
  };

  // 3. Current Set Logic
  const getLogsForEx = (exItem) => exerciseLogs[exItem.id] || Array.from({length: exItem.sets || 3}).map(() => ({
    w: exItem.defaultWeight || 0, r: exItem.reps || 10, d: exItem.duration || 10, done: false
  }));

  const logs = ex ? getLogsForEx(ex) : [];

  let activeSetIdx = 0;
  if (ex) {
     const incompleteIdx = getLogsForEx(ex).findIndex(s => !s.done);
     if (incompleteIdx !== -1) {
       activeSetIdx = incompleteIdx;
     } else {
       activeSetIdx = Math.max(0, getLogsForEx(ex).length - 1);
     }
  }

  const activeSet = logs[activeSetIdx];
  const isAllDone = ex && getLogsForEx(ex).length > 0 && getLogsForEx(ex).every(s => s.done || s.skipped);

  const [isTreadmillMode, setIsTreadmillMode] = React.useState(() => (ex?.name || '').toLowerCase().includes('treadmill'));
  React.useEffect(() => {
    if (ex) setIsTreadmillMode((ex.name || '').toLowerCase().includes('treadmill'));
  }, [ex?.name]);

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
    setShowHint(false);
  }, [currentIndex]);

  React.useEffect(() => {
    setYtLoaded(false);
  }, [activeMediaIndex, currentIndex]);

  // Back button protection
  const popped = React.useRef(false);
  
  React.useEffect(() => {
    window.history.pushState({ immersive: true }, '');

    const handlePopState = () => {
      if (popped.current) return;
      popped.current = true;
      playSoundEffect('click', soundEnabled);
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleMinimize = () => {
    if (!popped.current) {
      popped.current = true;
      window.history.back(); // Trigger popstate or at least clean up history state
      onClose();
    }
  };

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
      if (idx === activeMediaIndex) {
        if (!isPaused) {
          videoObj.playbackRate = 1;
          videoObj.play().catch(() => {});
        } else {
          videoObj.playbackRate = 0;
          // Kita biarkan video statusnya "playing" di mata browser agar overlay pause tidak muncul
          videoObj.play().catch(() => {});
        }
      } else {
        videoObj.playbackRate = 1;
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

  // Root swipe logic for minimizing (swipe down)
  const [rootTouchStart, setRootTouchStart] = React.useState(null);
  const [rootTouchEnd, setRootTouchEnd] = React.useState(null);

  const onRootTouchStart = (e) => {
    if (activeSetDetail !== null || showFinishConfirm) return;
    if (e.target.closest('.no-swipe-minimize')) return;
    setRootTouchEnd(null);
    setRootTouchStart(e.targetTouches[0].clientY);
  };
  const onRootTouchMove = (e) => {
    if (activeSetDetail !== null || showFinishConfirm) return;
    setRootTouchEnd(e.targetTouches[0].clientY);
  }
  const onRootTouchEnd = () => {
    if (activeSetDetail !== null || showFinishConfirm || !rootTouchStart || !rootTouchEnd) return;
    const distance = rootTouchStart - rootTouchEnd;
    if (distance < -100) { // Swipe down
      playSoundEffect('click', soundEnabled);
      handleMinimize();
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
              if (e.source) {
                e.source.postMessage(JSON.stringify({event: "command", func: "seekTo", args: [0.1, true]}), "*");
                e.source.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
              }
            }
          }
          // Fallback if it somehow hits ended state (0)
          if (data.info.playerState === 0) {
            if (e.source) {
              e.source.postMessage(JSON.stringify({event: "command", func: "seekTo", args: [0.1, true]}), "*");
              e.source.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
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
    if (currentIndex < validExercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowFinishConfirm(true);
    }
  };

  const handlePrevSet = () => {
    playSoundEffect('click', soundEnabled);
    const targetSetIdx = isAllDone ? Math.max(0, activeSetIdx) : activeSetIdx - 1;
    if (targetSetIdx >= 0 && (!isAllDone || logs.length > 0)) {
       const itemLogs = getLogsForEx(ex);
       if (itemLogs[targetSetIdx]?.done || itemLogs[targetSetIdx]?.skipped) {
          let siblingIds = null;
          if (ex.supersetId) {
             siblingIds = validExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
          }
          onToggleSet(ex.id, targetSetIdx, siblingIds);
       }
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const advanceAfterSet = () => {
    if (ex.supersetId) {
      const supersetGroup = validExercises.filter(e => e.supersetId === ex.supersetId);
      const mySupersetIdx = supersetGroup.findIndex(e => e.id === ex.id);
      const isLastSibling = mySupersetIdx === supersetGroup.length - 1;
      
      setTimeout(() => {
        if (isLastSibling) {
          let isAllDone = true;
          supersetGroup.forEach(s => {
              const sLogs = exerciseLogs[s.id] || [];
              if (sLogs.some(l => !l.done && !l.skipped)) isAllDone = false;
          });
          
          if (!isAllDone) {
            const firstSiblingGlobalIdx = validExercises.findIndex(e => e.id === supersetGroup[0].id);
            setCurrentIndex(firstSiblingGlobalIdx);
          }
        } else {
          setCurrentIndex(currentIndex + 1);
        }
      }, 50);
    }
  };

  const handleCardioChange = (field, val) => {
      if (!ex) return;
      onSetChange(ex.id, activeSetIdx, field, val);
      const s = getLogsForEx(ex)[activeSetIdx] || {};
      let dist = field === 'distance' ? Number(val || 0) : Number(s.distance || 0);
      let dur = field === 'duration' ? Number(val || 0) : Number(s.duration || 0);
      let spd = field === 'speed' ? Number(val || 0) : Number(s.speed || 0);

      if (field === 'speed' && dur > 0) {
         const newDist = (val * (dur / 60)).toFixed(2);
         onSetChange(ex.id, activeSetIdx, 'distance', Number(newDist));
      }
      else if (field === 'distance' && dur > 0) {
         const newSpd = (val / (dur / 60)).toFixed(1);
         onSetChange(ex.id, activeSetIdx, 'speed', Number(newSpd));
      }
      else if (field === 'duration') {
         if (isTreadmillMode && spd > 0) {
            const newDist = (spd * (val / 60)).toFixed(2);
            onSetChange(ex.id, activeSetIdx, 'distance', Number(newDist));
         } else if (!isTreadmillMode && dist > 0) {
            const newSpd = (dist / (val / 60)).toFixed(1);
            onSetChange(ex.id, activeSetIdx, 'speed', Number(newSpd));
         } else if (dist > 0 && spd === 0) {
            const newSpd = (dist / (val / 60)).toFixed(1);
            onSetChange(ex.id, activeSetIdx, 'speed', Number(newSpd));
         }
      }
  };

  const handleDoneClick = () => {
    if (!ex) return;
    playSoundEffect('done_set', soundEnabled);
    const itemLogs = getLogsForEx(ex);
    if (!itemLogs[activeSetIdx]?.done) {
      let siblingIds = null;
      if (ex.supersetId) {
         siblingIds = validExercises.filter(e => e.supersetId === ex.supersetId).map(e => e.id);
      }
      onToggleSet(ex.id, activeSetIdx, siblingIds);
    }
    advanceAfterSet();
  };

  const handleSkipSet = () => {
    if (!ex) return;
    playSoundEffect('click', soundEnabled);
    if (!isAllDone) {
       onSkipSet(ex.id, activeSetIdx);
       advanceAfterSet();
    }
  };

  if (!ex) return null;

  const isImp = units?.weight === 'lbs';

  const theme = t?.bgApp?.includes('05070d') ? 'dark' : 'light';

  const handleIframeLoad = (e) => {
    e.target.contentWindow.postMessage(JSON.stringify({event: "listening"}), "*");
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col ${t.bgApp} ${t.textMain} overflow-hidden duration-300 ${isClosing ? 'animate-out slide-out-to-bottom-full' : 'animate-in slide-in-from-bottom-full'} no-swipe`}
      onTouchStart={onRootTouchStart}
      onTouchMove={onRootTouchMove}
      onTouchEnd={onRootTouchEnd}
    >
      
      {/* HEADER (UNIFIED BAR) */}
      <div className={`flex items-center justify-between p-4 absolute top-0 w-full z-10`} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        
        {/* Durasi Group */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase ${t.textMuted} tracking-widest">
              Durasi Latihan
            </span>
            <span className="h2 ${t.textAccent} flex items-baseline gap-1.5">
              <span className="tabular-nums tracking-tight">{formatTime(workoutSeconds)}</span>
              {caloriesBurned > 0 && <span className="opacity-80 text-[11px] font-semibold flex items-center gap-0.5"><Flame size={12} className={`${t.textAccent}`} strokeWidth={2.5} /> {caloriesBurned} kcal</span>}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => { playSoundEffect('click', soundEnabled); setIsPaused(!isPaused); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center transition shadow-sm`} title="Play/Pause">
            {isPaused ? <Play size={18} className={`${t.textAccent}`} /> : <Pause size={18} />}
          </button>
          <button data-close-modal="true" onClick={() => { playSoundEffect('click', soundEnabled); handleMinimize(); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'} flex items-center justify-center transition shadow-sm`} title="Minimize">
            <Minimize2 size={18} />
          </button>
          <button onClick={() => { playSoundEffect('click', soundEnabled); onCancelWorkout(); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'} flex items-center justify-center transition shadow-sm`} title="Batalkan Workout">
            <X size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => { playSoundEffect('click', soundEnabled); setShowFinishConfirm(true); }} className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-emerald-400' : 'bg-black/5 hover:bg-black/10 text-[#3b82f6]'} flex items-center justify-center transition shadow-sm`} title="Selesai Workout">
            <Check size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full h-1 ${t.bgApp}/10 dark:bg-white/10 z-20">
        <div 
          className="h-full  transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / validExercises.length) * 100}%` }}
        />
      </div>

      {/* TABLET SPLIT WRAPPER */}
      <div className="flex-1 flex flex-col sm:flex-row w-full mt-16 overflow-hidden">

        {/* MAIN VISUAL (Center) */}
        <div 
          className="flex-1 relative mb-6 sm:mb-4 rounded-3xl mx-4 sm:mr-0 overflow-hidden shadow-lg border border-black/5 dark:border-white/10 group touch-pan-y bg-black"
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
                            <div className="absolute inset-0 flex items-center justify-center bg-[#05070d] z-10">
                              <Clock className="animate-spin text-white/50" size={32} />
                            </div>
                          )}
                          <iframe 
                            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${idx === activeMediaIndex && !isPaused ? '1' : '0'}&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`}
                            title="YouTube video player" 
                            frameBorder="0" 
                            onLoad={handleIframeLoad}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            className={`immersive-video-iframe w-[160%] h-[160%] max-w-none pointer-events-none scale-[1.4] sm:scale-[1.3] transition-opacity duration-700 ${ytLoaded || idx !== activeMediaIndex ? 'opacity-100' : 'opacity-0'}`}
                          ></iframe>
                        </>
                      );
                    }
                  }
                  if (media.type === 'video') {
                    return <video src={media.url} autoPlay={idx === activeMediaIndex && !isPaused} loop muted playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback" className="immersive-video-html5 w-full h-full object-cover opacity-80 pointer-events-none scale-[1.10]" />;
                  }
                  return <img src={media.url} alt={ex.name} className="w-full h-full object-cover opacity-80 pointer-events-none scale-[1.10]" />;
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
        <div className="absolute top-6 left-5 z-20 flex flex-col items-start drop-shadow-md">
           <span className="text-white text-xs font-black uppercase tracking-widest leading-none drop-shadow-md shadow-black">
             {ex.equipment || 'Lainnya'}
           </span>
        </div>

        <button 
          onClick={() => onOpenDetail(ex)}
          className="absolute top-4 right-4 bg-black/30 backdrop-blur-md p-2 rounded-xl text-white/80 hover:text-white transition shadow-lg z-20"
        >
          <Info size={24} />
        </button>

        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-between">
          <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1 font-bold text-white/70 tracking-widest text-[10px] drop-shadow-md">
              <p className="shrink-0 uppercase">
                EXERCISE {currentIndex + 1} OF {validExercises.length}
              </p>
              {ex.supersetId && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${t.bgAccent} text-white shadow-[0_0_12px_rgba(255,255,255,0.3)] border border-white/20 shrink-0`}>
                  SUPERSET
                </span>
              )}
            </div>
            <h1 className="h1 text-white leading-tight drop-shadow-lg mb-1">{ex.name}</h1>
          </div>
          
          {/* COACH BUTTON */}
          {ex.type === 'weight' && (
            <div className="relative shrink-0 z-50">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHint(true); }}
                className={`p-3 ${t.bgAccent} border-none text-white rounded-xl shadow-lg shadow-black/30 dark:shadow-black/60 transition-all flex items-center justify-center`}
              >
                <Brain size={24} className="animate-pulse" />
              </button>
              {showHint && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowHint(false)} />
                    <div className={`relative overflow-hidden w-[90%] max-w-[340px] min-h-[480px] p-6 flex flex-col justify-between rounded-[32px] ${t.bgCard} shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-10 text-center leading-snug animate-in fade-in zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
                      <div 
                        className="absolute inset-0 z-0 pointer-events-none"
                        style={{ 
                           backgroundImage: `url('${getOverloadHint && getOverloadHint(ex)?.mode === 'praise' ? '/coach-praise.webp' : getOverloadHint && getOverloadHint(ex)?.mode === 'push' ? '/coach-push.webp' : '/bg-dashboard.webp'}')`,
                           backgroundSize: '180%',
                                          backgroundPosition: 'center 40px',
                           backgroundRepeat: 'no-repeat',
                           maskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)',
                           WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 90%)'
                        }}
                      />
                      <div className="relative z-10 flex flex-col h-full flex-1">
                          <div className="flex justify-center w-full">
                            <div className="flex items-center gap-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 pl-2.5 pr-4 py-2 rounded-full shadow-inner mt-2">
                              <div className={`w-8 h-8 rounded-full ${t.bgAccent} flex items-center justify-center shadow-lg`}>
                                <Brain size={16} className="text-white" />
                              </div>
                              <span className={`font-black text-[11px] tracking-widest uppercase ${t.textMain}`}>Coach Logi</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center mt-auto pt-32 pb-2">
                            {getOverloadHint && getOverloadHint(ex) ? (
                               <>
                                 <span className={`font-black text-lg tracking-widest uppercase block mb-3 ${t.textMain}`}>{getOverloadHint(ex).title}</span>
                                 <span className={`${t.textMuted} text-sm block whitespace-pre-wrap font-medium leading-relaxed`}>{getOverloadHint(ex).text}</span>
                               </>
                            ) : (
                               <span className={`${t.textMuted} text-sm font-medium whitespace-pre-wrap leading-relaxed`}>Belum ada rekor 10RM.\n\nGunakan beban yang menantang tapi sanggup diangkat 10x dengan benar (RPE 8).</span>
                            )}
                          </div>
                      </div>
                    </div>
                  </div>,
                document.body
              )}
            </div>
          )}
        </div>

        {/* Toast Lanjut Latihan Berikutnya (Immersive Only) */}
        <div className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 z-50 pointer-events-none flex justify-center transition-all duration-500 ease-in-out ${showSupersetToast ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className={`w-full py-5 flex items-center justify-center ${t.bgAccent} bg-opacity-90 ${t.textButton}`}>
            <span className="font-black whitespace-nowrap text-base tracking-widest uppercase opacity-90 mix-blend-overlay text-center px-4">Lanjut Latihan Berikutnya!</span>
          </div>
        </div>
      </div>

      {/* CONTROLS (Bottom) */}
      <div className="w-full sm:w-[45%] lg:w-[40%] px-4 pb-8 sm:pb-4 space-y-6 sm:space-y-8 flex flex-col justify-center overflow-y-auto shrink-0 relative z-10">
        

        {/* Scroll Pickers */}
        <div className="flex flex-col gap-6 no-swipe-minimize">
          {(() => {
            let exType = ex?.type || 'weight';
            const isCardioMatch = ex?.target?.some(t => t.toLowerCase().includes('cardio') || t.toLowerCase().includes('kardio')) 
                     || (ex?.name || '').toLowerCase().includes('lari') 
                     || (ex?.name || '').toLowerCase().includes('treadmill') 
                     || (ex?.name || '').toLowerCase().includes('sepeda') 
                     || (ex?.name || '').toLowerCase().includes('elliptical');
            
            if (exType === 'time' && isCardioMatch) {
              exType = 'cardio';
            }

            const isCardio = exType === 'cardio';
            const itemLogs = getLogsForEx(ex);
            const itemSet = itemLogs[activeSetIdx] || itemLogs[0];
            return (
              <div key={ex.id} className="w-full flex flex-col">
                  <div className="flex items-center justify-center gap-4">
                    {exType === 'weight' && (
                      <div className="flex-1 flex flex-col items-center relative">
                        <div className="flex items-center gap-1.5 mb-2 relative z-20">
                           <span className="body-md uppercase">{isImp ? 'LBS' : 'KG'}</span>
                        </div>
                        <ScrollPicker 
                        value={isImp ? Math.round(Number(itemSet?.w || 0) * 2.20462 * 10)/10 : (itemSet?.w || 0)} 
                        onChange={(val) => onSetChange(ex.id, activeSetIdx, 'w', isImp ? Number((val / 2.20462).toFixed(2)) : val)}
                        min={0} max={isImp ? 440 : 200} step={isImp ? 5 : 2.5} width="w-full" theme={theme} t={t}
                      />
                    </div>
                  )}
                  
                  {isCardio ? (
                    (() => {
                         const d = Number(itemSet?.distance || 0);
                         const tMin = Number(itemSet?.duration || 0);
                         let paceStr = '-:--';
                         if (d > 0 && tMin > 0) {
                             const paceTotalSeconds = (tMin * 60) / d;
                             const pm = Math.floor(paceTotalSeconds / 60);
                             const ps = Math.floor(paceTotalSeconds % 60);
                             paceStr = `${pm}:${ps < 10 ? '0' : ''}${ps}`;
                         }
                         return (
                           <>
                             <div className="flex-1 flex flex-col items-center">
                               <div className="h-8 mb-2 w-full flex items-center justify-center relative">
                                 <span className="body-md uppercase">KM</span>
                               </div>
                               <ScrollPicker 
                                 value={itemSet?.distance || 0} 
                                 onChange={(val) => handleCardioChange('distance', val)}
                                 min={0} max={50} step={0.1} width="w-full" theme={theme} t={t}
                               />
                             </div>
                             <div className="flex-1 flex flex-col items-center">
                               <div className="h-8 mb-2 w-full flex items-center justify-center gap-2 relative">
                                 <span className="body-md uppercase">Mnt</span>
                                 <button onClick={() => toggleTimer(activeSetIdx, itemSet?.duration, true)} className={`p-1.5 rounded-full text-white transition-all ${activeTimer.idx === activeSetIdx ? 'bg-rose-500 shadow-md scale-110' : t.bgAccent}`}>
                                   {activeTimer.idx === activeSetIdx ? <Square size={12}/> : <Play size={12} className="ml-[1px]"/>}
                                 </button>
                               </div>
                               {activeTimer.idx === activeSetIdx ? (
                                  <div className={`w-full h-[120px] flex items-center justify-center text-4xl sm:text-5xl font-black ${t.textAccent}`}>
                                     {formatTime(activeTimer.timeLeft)}
                                  </div>
                               ) : (
                                  <ScrollPicker 
                                    value={itemSet?.duration || 0} 
                                    onChange={(val) => handleCardioChange('duration', val)}
                                    min={0} max={300} step={1} width="w-full" theme={theme} t={t}
                                  />
                               )}
                             </div>
                             <div className="flex-1 flex flex-col items-center">
                               <div className="h-8 mb-2 w-full flex items-center justify-center relative">
                                 <span className="body-md uppercase">
                                   {isTreadmillMode ? 'Kec (km/j)' : 'Pace'}
                                 </span>
                                 <button onClick={() => setIsTreadmillMode(!isTreadmillMode)} className={`absolute right-0 sm:right-2 p-1.5 rounded-full ${t.bgAccentSoft} ${t.textAccent} hover:scale-110 transition`} title="Ganti Mode (Treadmill / Lari)">
                                   <ArrowLeftRight size={12} />
                                 </button>
                               </div>
                               {isTreadmillMode ? (
                                 <ScrollPicker 
                                   value={itemSet?.speed || 0} 
                                   onChange={(val) => handleCardioChange('speed', val)}
                                   min={0} max={30} step={0.5} width="w-full" theme={theme} t={t}
                                 />
                               ) : (
                                 <div className="w-full h-[120px] flex flex-col items-center justify-center opacity-80 pointer-events-none">
                                   <span className={`text-3xl font-black ${t.textMain}`}>{paceStr}</span>
                                   <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>mnt/km</span>
                                 </div>
                               )}
                             </div>
                           </>
                         );
                    })()
                  ) : exType === 'time' ? (
                    <div className="flex-1 flex flex-col items-center">
                      <div className="mb-2 w-full flex items-center justify-center gap-2 relative">
                         <span className="body-md uppercase">Durasi (dtk)</span>
                         <button onClick={() => toggleTimer(activeSetIdx, itemSet?.d, false)} className={`p-1.5 rounded-full text-white transition-all ${activeTimer.idx === activeSetIdx ? 'bg-rose-500 shadow-md scale-110' : t.bgAccent}`}>
                           {activeTimer.idx === activeSetIdx ? <Square size={12}/> : <Play size={12} className="ml-[1px]"/>}
                         </button>
                      </div>
                      {activeTimer.idx === activeSetIdx ? (
                         <div className={`w-full h-[120px] flex items-center justify-center text-4xl sm:text-5xl font-black ${t.textAccent}`}>
                            {formatTime(activeTimer.timeLeft)}
                         </div>
                      ) : (
                         <ScrollPicker 
                           value={itemSet?.d === undefined ? 0 : itemSet.d} 
                           onChange={(val) => onSetChange(ex.id, activeSetIdx, 'd', val)}
                           min={0} max={300} step={5} width="w-full" theme={theme} t={t}
                         />
                      )}
                    </div>
                  ) : (
                    (exType === 'weight' || exType === 'reps') && (
                      <div className="flex-1 flex flex-col items-center">
                        <span className="body-md mb-2 uppercase">Repetisi</span>
                        <ScrollPicker 
                          value={itemSet?.r || 10} 
                          onChange={(val) => onSetChange(ex.id, activeSetIdx, 'r', val)}
                          min={1} max={50} step={1} width="w-full" theme={theme} t={t}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })()}
        </div>

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
                style={{ flex: i === activeSetIdx ? 3 : (s.done || s.skipped ? 2 : 1) }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s.type === 'warmup' ? `bg-yellow-500` :
                  s.skipped ? `bg-rose-500` :
                  s.done ? `bg-emerald-500` : 
                  i === activeSetIdx ? `${t.bgAccent} shadow-[0_0_10px_rgba(255,255,255,0.3)]` : 
                  `${theme === 'dark' ? 'bg-white/20' : 'bg-black/10'}`
                }`} 
              />
            ))}
          </div>

          <button 
            onClick={handleSkipSet}
            className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'} transition flex items-center justify-center gap-1`}
            title="Skip 1 Set"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Actions Row (Full Width) */}
        <div className="w-full relative">
          {restTimer !== 0 && !isAllDone ? (
            <div className={`w-full relative flex items-stretch justify-between rounded-2xl shadow-xl transition-colors overflow-hidden border ${
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
            <div className="flex gap-2 w-full">
              {(() => {
                const s = getLogsForEx(ex)[activeSetIdx] || {};
                const isFilled = s.notes || s.rir || s.rpe;
                const isCardioEx = ['cardio', 'time', 'distance'].includes(ex.type?.toLowerCase()) || (ex.name || '').toLowerCase().includes('lari') || (ex.name || '').toLowerCase().includes('treadmill') || (ex.name || '').toLowerCase().includes('sepeda') || (ex.name || '').toLowerCase().includes('elliptical');
                const isCardioFilled = s.heartRate || s.elevation || s.incline;
                
                return (
                  <button 
                    onClick={() => {
                       playSoundEffect('click', soundEnabled);
                       setActiveSetDetail({ 
                         setIdx: activeSetIdx, 
                         rir: s.rir !== undefined ? s.rir : '', 
                         rpe: s.rpe !== undefined ? s.rpe : '', 
                         notes: s.notes || '',
                         heartRate: s.heartRate || '',
                         elevation: s.elevation || '',
                         incline: s.incline || '',
                         isCardio: isCardioEx
                       });
                    }}
                    className={`w-16 sm:w-20 rounded-2xl ${(isCardioEx ? isCardioFilled : isFilled) ? `${t.bgAccent} text-white` : `${t.bgAccentSoft} ${t.textAccent}`} hover:opacity-80 transition flex items-center justify-center shrink-0 shadow-xl`}
                    title={isCardioEx ? "Data Kardio (Nadi, Elevasi)" : "Catatan Set"}
                  >
                    {isCardioEx ? <Activity size={24} /> : <ClipboardEdit size={24} />}
                  </button>
                );
              })()}
              <button 
                onClick={handleDoneClick}
                className={`flex-1 py-4 rounded-2xl ${t.bgAccent} font-black h2 flex items-center justify-center gap-2 shadow-xl hover:opacity-90 active:opacity-80 transition-opacity`}
              >
                <Check size={24} /> SELESAI SET {activeSetIdx + 1}
              </button>
            </div>
          ) : (
            <button 
              onClick={handleNextEx}
              className={`w-full py-4 rounded-2xl ${t.bgAccent} font-black h2 flex items-center justify-center gap-2 shadow-xl hover:opacity-90 active:opacity-80 transition-opacity`}
            >
              {currentIndex === validExercises.length - 1 ? 'FINISH WORKOUT' : 'LATIHAN BERIKUTNYA'}
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

      {/* SET DETAILS MODAL (BOTTOM SHEET) */}
      {activeSetDetail !== null && createPortal(
        <div className="fixed inset-0 z-[999] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => { setActiveSetDetail(null); setShowIntensityInfo(false); }}>
          <div className={`w-full max-w-lg mx-auto bg-white/70 dark:bg-[#121a2f]/70 backdrop-blur-2xl border-t border-white/30 dark:border-white/10 shadow-2xl rounded-t-[2.5rem] p-6 pb-12 sm:pb-8 animate-in slide-in-from-bottom-1/2 duration-300`} onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black">Catatan Set {logs[activeSetDetail.setIdx]?.type === 'warmup' ? 'Pemanasan' : (activeSetDetail.setIdx + 1)}</h3>
              <button onClick={() => setActiveSetDetail(null)} className={`p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors`}>
                <X size={20} />
              </button>
            </div>

            {activeSetDetail.isCardio ? (
              <div className="flex flex-col gap-5 w-full">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Detak Jantung (BPM)</span>
                  <input 
                    type="number"
                    value={activeSetDetail.heartRate}
                    onChange={e => setActiveSetDetail({...activeSetDetail, heartRate: e.target.value})}
                    placeholder="Contoh: 140"
                    className={`w-full p-4 rounded-3xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base outline-none focus:ring-2 focus:${t.ringAccent} text-center font-black`}
                  />
                </div>
                <div className="flex w-full">
                  {isTreadmillMode ? (
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 text-center">Incline (%)</span>
                      <input 
                        type="number"
                        value={activeSetDetail.incline}
                        onChange={e => setActiveSetDetail({...activeSetDetail, incline: e.target.value})}
                        placeholder="Contoh: 2.5"
                        className={`w-full p-4 rounded-3xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base outline-none focus:ring-2 focus:${t.ringAccent} text-center font-black`}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 text-center">Elevasi (m)</span>
                      <input 
                        type="number"
                        value={activeSetDetail.elevation}
                        onChange={e => setActiveSetDetail({...activeSetDetail, elevation: e.target.value})}
                        placeholder="Contoh: 50"
                        className={`w-full p-4 rounded-3xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base outline-none focus:ring-2 focus:${t.ringAccent} text-center font-black`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {/* KIRI: Textarea & Tags */}
                <div className="flex-1 flex flex-col gap-4">
                  
                  <div className="relative">
                    <textarea 
                      rows="3" 
                      placeholder="Tulis catatan set ini (opsional)..." 
                      value={activeSetDetail.notes} 
                      onChange={e => setActiveSetDetail({...activeSetDetail, notes: e.target.value})} 
                      className={`w-full p-4 pr-10 rounded-3xl bg-black/5 dark:bg-white/5 ${t.textMain} placeholder-black/30 dark:placeholder-white/30 text-base resize-none outline-none focus:ring-2 focus:${t.ringAccent}`}
                    />
                    {activeSetDetail.notes && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); playSoundEffect('click', soundEnabled); setActiveSetDetail({...activeSetDetail, notes: ''}); }}
                        className={`absolute top-3 right-3 p-1.5 rounded-full bg-black/10 dark:bg-white/10 ${t.textMuted} hover:text-rose-500 hover:bg-rose-500/10 transition-colors`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                      {[
                        { label: 'Terlalu Ringan', rpe: 4, rir: 6, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                        { label: 'Cukup Menantang', rpe: 7, rir: 3, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
                        { label: 'Berat Banget', rpe: 9, rir: 1, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
                        { label: 'Gagal Angkat (Failure)', rpe: 10, rir: 0, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
                      ].map(tag => (
                        <button
                          key={tag.label}
                          onClick={(e) => {
                            e.preventDefault();
                            playSoundEffect('click', soundEnabled);
                            setActiveSetDetail({
                              ...activeSetDetail,
                              notes: tag.label,
                              rpe: tag.rpe,
                              rir: tag.rir
                            });
                          }}
                          className={`px-4 py-3 rounded-2xl text-sm font-bold border ${activeSetDetail.notes === tag.label ? tag.color + ' ring-2 ring-current' : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10'} text-left transition-all flex items-center justify-between`}
                        >
                          <span>{tag.label}</span>
                          <span className="text-[10px] uppercase tracking-widest opacity-60">{rpeMode ? 'RPE ' + tag.rpe : 'RIR ' + tag.rir}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                {/* KANAN: RPE Vertical Select */}
                <div className="w-14 shrink-0 flex flex-col relative">
                  <div className="flex items-center justify-center gap-1 mb-3">
                    <button onClick={() => {
                      const newMode = !rpeMode;
                      setRpeMode(newMode);
                      localStorage.setItem('logym_rpe_mode', newMode);
                    }} className="text-[10px] font-black tracking-widest uppercase text-zinc-500 hover:text-blue-500 flex items-center gap-0.5 transition-colors">
                      {rpeMode ? 'RPE' : 'RIR'} <ArrowLeftRight size={10} />
                    </button>
                    <button onClick={() => setShowIntensityInfo(!showIntensityInfo)} className="text-zinc-400 hover:text-blue-500 transition-colors"><Info size={12} /></button>
                  </div>

                  {/* POPUP INFO */}
                  {showIntensityInfo && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowIntensityInfo(false); }} />
                      <div className="absolute bottom-full right-0 mb-4 w-64 p-4 rounded-3xl bg-white/95 dark:bg-[#121a2f]/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 animate-in slide-in-from-bottom-2 z-50 pointer-events-none">
                        <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
                          {rpeMode ? (
                            <>
                              <p><strong>RPE (Perceived Exertion):</strong> Skala 1-10 seberapa berat usaha latihan.</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li><strong>RPE 7-8:</strong> Ideal (sisa tenaga 2-3 rep).</li>
                                <li><strong>RPE 9:</strong> Sangat berat (sisa tenaga 1 rep).</li>
                                <li><strong>RPE 10:</strong> Maksimal / gagal angkat.</li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <p><strong>RIR (Reps in Reserve):</strong> Estimasi sisa tenaga / sisa repetisi sebelum gagal angkat.</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li><strong>RIR 2-3:</strong> Ideal (setara RPE 7-8).</li>
                                <li><strong>RIR 1:</strong> Sangat berat (setara RPE 9).</li>
                                <li><strong>RIR 0:</strong> Maksimal / gagal angkat.</li>
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex-1 bg-black/10 dark:bg-white/10 rounded-[2rem] p-1 flex flex-col justify-between shadow-inner">
                     {(rpeMode ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map((val) => {
                        const isSelected = rpeMode ? activeSetDetail.rpe === val : activeSetDetail.rir === val;
                        return (
                          <button 
                            key={val}
                            onClick={() => {
                              playSoundEffect('click', soundEnabled);
                              const rpe = rpeMode ? val : 10 - val;
                              const rir = rpeMode ? 10 - val : val;
                              
                              let notes = activeSetDetail.notes;
                              const allTemplates = ['Terlalu Ringan', 'Cukup Menantang', 'Berat Banget', 'Gagal Angkat (Failure)'];
                              if (!notes || allTemplates.includes(notes)) {
                                if (rpe <= 4) notes = 'Terlalu Ringan';
                                else if (rpe <= 7) notes = 'Cukup Menantang';
                                else if (rpe <= 9) notes = 'Berat Banget';
                                else notes = 'Gagal Angkat (Failure)';
                              }

                              setActiveSetDetail({...activeSetDetail, rpe, rir, notes});
                            }}
                            className={`flex-1 min-h-[26px] flex items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected ? t.bgAccent + ' text-white shadow-md scale-110' : 'text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10'} `}
                          >
                            {val}
                          </button>
                        )
                     })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                   playSoundEffect('click', soundEnabled);
                   const emptyDetail = activeSetDetail.isCardio 
                     ? { setIdx: activeSetDetail.setIdx, heartRate: '', elevation: '', incline: '', isCardio: true }
                     : { setIdx: activeSetDetail.setIdx, notes: '', rpe: '', rir: '' };
                   handleSaveSetDetail(ex.id, activeSetDetail.setIdx, emptyDetail);
                }} 
                className={`flex-1 py-4 rounded-2xl border-2 border-rose-500/20 text-rose-500 font-bold text-base hover:bg-rose-500/10 transition-colors bg-rose-500/5`}
              >
                {activeSetDetail.isCardio ? 'Hapus Data' : 'Hapus Catatan'}
              </button>
              <button 
                onClick={() => handleSaveSetDetail(ex.id, activeSetDetail.setIdx, activeSetDetail)} 
                className={`flex-[1.5] py-4 rounded-2xl ${t.bgAccent} text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-transform`}
              >
                Simpan
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ImmersiveWorkout;
