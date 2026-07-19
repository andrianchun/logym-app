import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Dumbbell, History, Calculator, Replace, Video, Info, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';
import { formatTarget } from '../data/constants';
import SwipeInput from './SwipeInput';

const ExerciseDetailModal = ({ 
  ex: initialEx, 
  onClose, 
  t, 
  lang, 
  fullHistory, 
  onReplace,
  units,
  exerciseLibrary,
  setExerciseLibrary,
  programs
}) => {
  const isImp = units?.weight === 'lbs';
  const existingLibEx = exerciseLibrary?.find(e => e.name?.toLowerCase() === initialEx.name?.toLowerCase() || e.id === initialEx.id);
  const stored10RM = existingLibEx?.rm10 || 0;
  const storedLastWeight = existingLibEx?.lastWeight || 0;

  const [activeTab, setActiveTab] = useState('info'); // info, history, calc
  const [calcWeight, setCalcWeight] = useState(stored10RM || storedLastWeight || 50);
  const [calcReps, setCalcReps] = useState(10);
  const [showRmInfo, setShowRmInfo] = useState(false);
  const [isRmSaved, setIsRmSaved] = useState(false);

  const historyData = useMemo(() => {
    if (!fullHistory || !initialEx) return [];
    const logs = [];
    Object.entries(fullHistory).forEach(([date, dayData]) => {
      if (!dayData || !dayData.workouts) return;
      // Handle both array of workouts or object mapping (just in case)
      const workoutsArray = Array.isArray(dayData.workouts) ? dayData.workouts : Object.values(dayData.workouts);
      workoutsArray.forEach(w => {
        if (w.status !== 'completed') return;

        let completedSets = [];
        let realProgId = w.programId;
        if (realProgId && realProgId.startsWith('projected_')) {
            realProgId = realProgId.replace('projected_', '').split('_')[0];
        }
        
        let pName = w.name || w.programName || 'Sesi Latihan';
        if (realProgId && realProgId !== 'adhoc' && realProgId !== 'custom') {
           const p = programs?.find(prog => prog.id === realProgId);
           if (p && p.name) {
             pName = p.planName ? `${p.planName} - ${p.name}` : p.name;
           }
        }
        
        if (w.log) {
          let targetExIds = [];

          if (realProgId === 'adhoc' || realProgId === 'custom') {
            if (w.exercises) {
               const matchingExs = w.exercises.filter(e => e.id === initialEx.id || e.name?.trim().toLowerCase() === initialEx.name?.trim().toLowerCase());
               targetExIds = matchingExs.map(e => e.id);
            }
          } else {
            const p = programs?.find(prog => prog.id === realProgId);
            if (p && p.exercises) {
               const matchingExs = p.exercises.filter(e => e.id === initialEx.id || e.name?.trim().toLowerCase() === initialEx.name?.trim().toLowerCase());
               targetExIds = matchingExs.map(e => e.id);
            }
          }
          
          targetExIds.forEach(tId => {
             const compositeKey = `${tId}-${w.id}`;
             const exactKey = tId;
             if (w.log[compositeKey]) {
                completedSets.push(...w.log[compositeKey].filter(s => s.done));
             } else if (w.log[exactKey]) {
                completedSets.push(...w.log[exactKey].filter(s => s.done));
             }
          });
          
          // Fallback if still not found
          if (completedSets.length === 0 && w.log[initialEx.id]) {
             completedSets.push(...w.log[initialEx.id].filter(s => s.done));
          }
        }
        
        if (completedSets.length === 0 && w.exercises) {
          const targetEx = w.exercises.find(e => e.id === initialEx.id || e.name?.trim().toLowerCase() === initialEx.name?.trim().toLowerCase());
          if (targetEx && targetEx.sets) {
            completedSets = targetEx.sets.filter(s => s.done);
          }
        }

        if (completedSets.length > 0) {
          logs.push({
            date,
            programName: pName,
            sets: completedSets.map(s => ({
              w: Number(s.w) || 0,
              r: Number(s.r) || 0,
              distance: Number(s.distance) || 0,
              duration: Number(s.duration) || 0,
              rpe: s.rpe || '',
              notes: s.notes || ''
            }))
          });
        }
      });
    });
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [fullHistory, initialEx]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const isIndo = lang?.id === 'ID' || t?.settings !== 'Settings';
    return isIndo ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
  };

  // Epley formula: 1RM = weight * (1 + reps/30)
  const oneRM = calcReps > 1 ? Math.round(calcWeight * (1 + calcReps / 30)) : calcWeight;
  const calculated10RM = Math.round((oneRM / 1.3333) * 10) / 10;

  const handleSave10RM = () => {
    if (!setExerciseLibrary) return;
    setExerciseLibrary(lib => {
      const idx = lib.findIndex(e => e.name?.toLowerCase() === initialEx.name?.toLowerCase() || e.id === initialEx.id);
      if (idx >= 0) {
        const newLib = [...lib];
        newLib[idx] = { ...newLib[idx], rm10: calculated10RM };
        return newLib;
      }
      return [...lib, { ...initialEx, rm10: calculated10RM, id: initialEx.id || Date.now(), isFavorite: false }];
    });
    setIsRmSaved(true);
    setTimeout(() => setIsRmSaved(false), 2000);
  };

  const [ex, setEx] = useState(initialEx);

  React.useEffect(() => {
     setEx(initialEx);
     if (initialEx && (!initialEx.instructions || initialEx.instructions.length === 0)) {
         import('../utils/exerciseDbApi').then(({ fetchExercisesFromApi }) => {
             fetchExercisesFromApi().then(onlineDb => {
                 const locName = initialEx.name.toLowerCase();
                 // Pemasangan yang lebih fleksibel: exact, locName ada di dbName, atau dbName ada di locName
                 const onlineMatch = onlineDb.find(e => {
                     const dbName = e.name.toLowerCase();
                     return dbName === locName || dbName.includes(locName) || locName.includes(dbName);
                 });
                 if (onlineMatch && onlineMatch.instructions) {
                     setEx(prev => ({ 
                         ...prev, 
                         instructions: onlineMatch.instructions,
                         equipment: prev.equipment || onlineMatch.equipment
                     }));
                 }
             });
         }).catch(() => {});
     }
  }, [initialEx]);

  if (!ex) return null;

  if (ex.type === 'warmup' || ex.type === 'cooldown') {
    const urls = ex.ytVideo ? ex.ytVideo.split(/(?:,|\s)+/).filter(v => v.trim()) : [];
    const videos = urls.map(url => {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
        return { url, videoId: match ? match[1] : null };
    }).filter(v => v.videoId);

    return createPortal(
      <div className={`fixed inset-0 z-[100] flex flex-col ${t.bgApp}`}>
        <div className="p-4 flex justify-between items-center bg-black/80 absolute top-0 w-full z-20" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h2 className="h2 text-white drop-shadow-md">{ex.name}</h2>
          <button data-close-modal="true" onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 w-full overflow-y-auto hide-scrollbar pb-10" style={{ marginTop: 'calc(56px + max(1rem, env(safe-area-inset-top, 0px)))' }}>
          {videos.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-center opacity-50 mt-20">
              <Video size={64} className={`mb-4 ${t.textMuted}`} />
              <p className={`h3 ${t.textMuted}`}>Tidak ada link video yang tersedia.</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-8 p-4">
              {videos.map((vid, i) => (
                <div key={i} className={`flex flex-col rounded-3xl overflow-hidden shadow-xl ${t.bgCard}`}>
                  <div className="w-full relative pt-[56.25%] bg-black">
                    <iframe 
                      src={`https://www.youtube.com/embed/${vid.videoId}?enablejsapi=1&controls=1&modestbranding=1&playsinline=1&rel=0`}
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    ></iframe>
                  </div>
                  <div className="p-4">
                    <a href={`https://youtu.be/${vid.videoId}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-red-600 text-white font-bold body-lg hover:bg-red-700 active:scale-95 transition-all">
                      <Play size={20} className="fill-white" /> Buka di Aplikasi YouTube
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  const parseMedia = (exercise) => {
    let items = [];
    if (exercise.ytVideo && typeof exercise.ytVideo === 'string') {
      const urls = exercise.ytVideo.split(/(?:,|\s)+/).filter(v => v.trim());
      urls.forEach(u => items.push({ type: 'youtube', url: u }));
    }
    if (exercise.gifUrl) {
      const urls = exercise.gifUrl.split(/(?:,|\s)+/).filter(v => v.trim());
      urls.forEach(u => items.push({ type: u.match(/\.(mp4|webm)$/i) ? 'video' : 'image', url: u }));
    }
    return items;
  };
  const mediaItems = React.useMemo(() => parseMedia(ex), [ex]);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const activeMedia = mediaItems[activeMediaIndex];

  // Swipe logic for media carousel
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  React.useEffect(() => {
    setIsVideoReady(false);
  }, [activeMediaIndex]);

  // Custom YouTube Looping Logic reliably using e.source
  React.useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== "https://www.youtube.com") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "infoDelivery" && data.info) {
          if (data.info.playerState === 0) {
            // Video ended, send seekTo 0 and play to the iframe that emitted the event
            e.source.postMessage(JSON.stringify({event: "command", func: "seekTo", args: [0, true]}), "*");
            e.source.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "*");
          } else if (data.info.playerState === 1) {
            // Video is playing
            setIsVideoReady(true);
          }
        }
      } catch (err) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleIframeLoad = (e) => {
    e.target.contentWindow.postMessage(JSON.stringify({event: "listening"}), "*");
  };

  const minSwipeDistance = 40;

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
    if (isLeftSwipe && mediaItems.length > 1) {
      setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0);
    }
    if (isRightSwipe && mediaItems.length > 1) {
      setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1);
    }
  };

  // Swipe logic for tabs
  const [tabTouchStart, setTabTouchStart] = useState(null);
  const [tabTouchEnd, setTabTouchEnd] = useState(null);

  const onTabTouchStart = (e) => {
    setTabTouchEnd(null);
    setTabTouchStart(e.targetTouches[0].clientX);
  };

  const onTabTouchMove = (e) => setTabTouchEnd(e.targetTouches[0].clientX);

  const onTabTouchEnd = () => {
    if (!tabTouchStart || !tabTouchEnd) return;
    const distance = tabTouchStart - tabTouchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const tabs = ['info', 'history', 'calc'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
    if (isRightSwipe && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-swipe`} onClick={onClose}>
      <div className={`w-full max-w-md sm:max-w-4xl mx-auto ${t.bgCard} rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row h-[85vh] sm:h-[80vh] animate-in zoom-in-95 duration-200 shadow-2xl`} onClick={e => e.stopPropagation()}>
        
        {/* Kolom Kiri: Header with Video/Image */}
        <div className="w-full sm:w-[45%] flex flex-col relative shrink-0 bg-black h-[50%] sm:h-auto rounded-b-[2.5rem] sm:rounded-none z-10 shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden">
          <div 
            className="relative w-full h-full overflow-hidden group touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div 
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{ 
                transform: `translateX(-${activeMediaIndex * (100 / Math.max(1, mediaItems.length))}%)`,
                width: `${Math.max(1, mediaItems.length) * 100}%`
              }}
            >
              {mediaItems.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Dumbbell size={64} className="text-white/20" />
                </div>
              ) : (
                mediaItems.map((media, idx) => (
                  <div key={idx} className="relative h-full flex items-center justify-center shrink-0 overflow-hidden" style={{ width: `${100 / mediaItems.length}%` }}>
                    {(() => {
                      if (media.type === 'youtube') {
                        const match = media.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                        const videoId = match ? match[1] : null;
                        if (videoId) {
                          return (
                            <>
                              <iframe 
                                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${idx === activeMediaIndex ? '1' : '0'}&mute=1&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`}
                                title="YouTube video player" 
                                frameBorder="0" 
                                onLoad={handleIframeLoad}
                                className={`exercise-video-iframe absolute w-[150%] h-[150%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none pointer-events-none transition-opacity duration-700 ${isVideoReady || idx !== activeMediaIndex ? 'opacity-100' : 'opacity-0'}`}
                              ></iframe>
                              {!isVideoReady && idx === activeMediaIndex && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                                  <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                                </div>
                              )}
                            </>
                          );
                        }
                      }
                      if (media.type === 'video') {
                        return <video src={media.url} autoPlay={idx === activeMediaIndex} loop muted playsInline className="w-full h-full object-cover opacity-80 pointer-events-none scale-[1.10]" />;
                      }
                      
                      // Animated Image Component for ExerciseDB frames
                      const AnimatedImage = () => {
                        const [frame, setFrame] = React.useState(0);
                        React.useEffect(() => {
                           if (!media.url.includes('yuhonas/free-exercise-db') || idx !== activeMediaIndex) return;
                           const interval = setInterval(() => {
                               setFrame(f => f === 0 ? 1 : 0);
                           }, 800);
                           return () => clearInterval(interval);
                        }, [media.url, idx, activeMediaIndex]);
                        
                        const currentUrl = (media.url.includes('yuhonas/free-exercise-db') && media.url.endsWith('0.jpg'))
                            ? media.url.replace('0.jpg', `${frame}.jpg`)
                            : media.url;
                            
                        // Preload second frame
                        React.useEffect(() => {
                            if (media.url.includes('yuhonas/free-exercise-db') && media.url.endsWith('0.jpg')) {
                                const img = new Image();
                                img.src = media.url.replace('0.jpg', '1.jpg');
                            }
                        }, [media.url]);

                        return (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img src={currentUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-125 pointer-events-none" />
                            <img src={currentUrl} alt={ex.name} className="relative z-10 w-full h-full object-contain pb-6 pointer-events-none drop-shadow-2xl" />
                          </div>
                        );
                      };
                      
                      return <AnimatedImage />;
                    })()}
                  </div>
                ))
              )}
            </div>

            {/* Carousel Controls */}
            {mediaItems.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMediaIndex(prev => prev > 0 ? prev - 1 : mediaItems.length - 1); }}
                  className="p-2 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMediaIndex(prev => prev < mediaItems.length - 1 ? prev + 1 : 0); }}
                  className="p-2 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
            
            {/* Top gradient for obscuring iframe remnants and better button visibility */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none"></div>

            <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all sm:hidden z-20">
              <X size={20} />
            </button>
            
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-4 flex flex-col gap-2 z-10">
              <div>
                <h2 className="text-white h1 leading-tight drop-shadow-md">{ex.name}</h2>
                <div className="flex gap-1.5 mt-1.5 overflow-x-auto hide-scrollbar w-full pb-1 -mx-1 px-1">
                  {ex.target?.map(m => (
                    <span key={m} className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold bg-black/40 text-slate-200 border border-white/10 backdrop-blur-md`}>
                      {formatTarget(m, lang?.id)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Media Indicators */}
              {mediaItems.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-1">
                  {mediaItems.map((_, idx) => (
                    <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeMediaIndex ? `w-5 ${t.bgAccent}` : 'w-1.5 bg-white/40'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Action Tabs & Tab Content */}
        <div className="w-full sm:w-[55%] flex flex-col bg-transparent overflow-hidden h-full relative">
          {/* Desktop Close Button */}
          <button onClick={onClose} className="hidden sm:flex absolute top-3 right-3 bg-black/5 hover:bg-rose-500 hover:text-white dark:bg-white/5 dark:hover:bg-rose-500 text-slate-500 dark:text-slate-300 p-2 rounded-full transition-all z-20">
            <X size={20} />
          </button>



          <div 
            className="overflow-hidden flex-1 relative"
            style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
          >
            {ex.type !== 'warmup' && ex.type !== 'cooldown' ? (
              <div 
                className="flex h-full w-[300%] transition-transform duration-300 ease-in-out touch-pan-y"
                style={{ transform: `translateX(-${['info', 'history', 'calc'].indexOf(activeTab) * 33.3333}%)` }}
                onTouchStart={onTabTouchStart}
                onTouchMove={onTabTouchMove}
                onTouchEnd={onTabTouchEnd}
              >
                {/* Tab 1: Instruksi */}
                <div className="w-1/3 h-full p-6 pb-24 overflow-y-auto hide-scrollbar">
                  <div className="space-y-4">
                    <div>
                      <h3 className={`body-lg font-bold ${t.textMuted} mb-2`}>Peralatan</h3>
                      <p className={`body-lg font-bold ${t.textMain}`}>{ex.equipment || 'Bodyweight'}</p>
                    </div>
  
                    {!ex.ytVideo && (
                      <div className={`p-4 rounded-2xl border ${t.border} bg-rose-500/5`}>
                        <p className={`body-md ${t.textMuted} mb-3`}>Belum ada video tutorial untuk latihan ini.</p>
                        <a 
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' shorts tutorial @DeltaBolic @fitnessonlineapp @officialdemic')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-500 text-white font-bold body-lg hover:bg-rose-600 active:scale-95 transition-all"
                        >
                          <Video size={16} /> Cari Video Shorts di YouTube
                        </a>
                      </div>
                    )}
                    
                    <div>
                      <h3 className={`body-lg font-bold ${t.textMuted} mb-2`}>Cara Melakukan</h3>
                      {ex.instructions && ex.instructions.length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-2">
                          {ex.instructions.map((step, i) => (
                            <li key={i} className={`body-lg ${t.textMain} opacity-90 leading-relaxed`}>{step.replace(/^\d+[\.\)]\s*/, '')}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className={`body-lg ${t.textMuted} italic`}>Tidak ada instruksi khusus dari database.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab 2: Riwayat */}
                <div className="w-1/3 h-full p-4 pb-24 overflow-y-auto hide-scrollbar">
                  <div className="space-y-0">
                     {(!historyData || historyData.length === 0) ? (
                       <div className={`text-center py-8 ${t.textMuted}`}>
                         <History size={32} className="mx-auto mb-2 opacity-30" />
                         <p className="body-lg font-bold">Belum ada riwayat latihan ini.</p>
                       </div>
                     ) : (
                       historyData.map((log, i) => (
                         <div key={i} className={`mb-3 pb-3 border-b border-dashed last:border-b-0 ${t.border}`}>
                           <div className="flex items-center mb-1.5 px-1">
                             <div className={`caption ${t.textMuted} w-[65px] shrink-0`}>
                               {formatDate(log.date)}
                             </div>
                             <div className={`caption font-bold ${t.textMain} flex-1 truncate`}>
                               {log.programName}
                             </div>
                           </div>
                           <div className={`w-full overflow-hidden rounded-md bg-black/5 dark:bg-white/5`}>
                             <table className="w-full text-[10px] table-fixed">
                               <thead className={`bg-black/10 dark:bg-white/10 ${t.textMuted}`}>
                                 <tr>
                                   {initialEx.type === 'cardio' ? (
                                      <>
                                        <th className="py-1 text-center w-8">Set</th>
                                        <th className="py-1 text-center w-12">Jarak</th>
                                        <th className="py-1 text-center w-12">Waktu</th>
                                        <th className="py-1 text-center w-12">Pace</th>
                                        <th className="py-1 px-2 text-left">Notes</th>
                                      </>
                                   ) : (
                                      <>
                                        <th className="py-1 text-center w-8">Set</th>
                                        <th className="py-1 text-center w-14">Beban</th>
                                        <th className="py-1 text-center w-10">Reps</th>
                                        <th className="py-1 text-center border-l border-black/5 dark:border-white/5 w-10">RPE</th>
                                        <th className="py-1 px-2 text-left">Notes</th>
                                      </>
                                   )}
                                 </tr>
                               </thead>
                               <tbody>
                                 {log.sets.map((s, idx) => {
                                    if (initialEx.type === 'cardio') {
                                        const d = Number(s.distance || 0);
                                        const tMin = Number(s.duration || 0);
                                        let paceStr = '-:--';
                                        if (d > 0 && tMin > 0) {
                                            const paceTotalSeconds = (tMin * 60) / d;
                                            const pm = Math.floor(paceTotalSeconds / 60);
                                            const ps = Math.floor(paceTotalSeconds % 60);
                                            paceStr = `${pm}:${ps < 10 ? '0' : ''}${ps}`;
                                        }
                                        return (
                                          <tr key={idx} className={`border-t border-black/5 dark:border-white/5 ${t.textMain}`}>
                                            <td className="py-1.5 text-center font-bold opacity-70">{idx + 1}</td>
                                            <td className={`py-1.5 text-center font-bold ${t.textAccent}`}>{s.distance} <span className="text-[8px]">km</span></td>
                                            <td className="py-1.5 text-center font-bold">{s.duration} <span className="text-[8px]">mnt</span></td>
                                            <td className="py-1.5 text-center font-bold">{paceStr}</td>
                                            <td className={`py-1.5 px-2 text-left italic truncate ${s.notes ? '' : 'opacity-30'}`} title={s.notes}>{s.notes || '-'}</td>
                                          </tr>
                                        );
                                    }
                                    return (
                                      <tr key={idx} className={`border-t border-black/5 dark:border-white/5 ${t.textMain}`}>
                                        <td className="py-1.5 text-center font-bold opacity-70">{idx + 1}</td>
                                        <td className={`py-1.5 text-center font-bold ${t.textAccent}`}>{isImp ? Number((s.w * 2.20462).toFixed(1)) : s.w} <span className="text-[8px]">{isImp ? 'lbs' : 'kg'}</span></td>
                                        <td className="py-1.5 text-center font-bold">{s.r}</td>
                                        <td className={`py-1.5 text-center border-l border-black/5 dark:border-white/5 ${s.rpe ? '' : 'opacity-30'}`}>{s.rpe || '-'}</td>
                                        <td className={`py-1.5 px-2 text-left italic truncate ${s.notes ? '' : 'opacity-30'}`} title={s.notes}>{s.notes || '-'}</td>
                                      </tr>
                                    );
                                 })}
                               </tbody>
                             </table>
                           </div>
                         </div>
                       ))
                     )}
                  </div>
                </div>

                 {/* Tab 3: 1RM Calc / Pace Calc */}
                 <div className="w-1/3 h-full p-5 pb-24 overflow-y-auto hide-scrollbar relative">
                     {initialEx.type === 'cardio' ? (
                       <div className="space-y-4 text-center pb-5">
                          <div className="flex items-center justify-center gap-2">
                             <h3 className={`h3 ${t.textMain}`}>Kalkulator Pace</h3>
                          </div>
                          <div className={`p-3.5 rounded-xl ${t.bgCard} border ${t.border} text-left text-xs ${t.textMuted} space-y-2 shadow-lg mb-4`}>
                             <p>Pace dihitung otomatis pada sesi kardio. Bagian ini dalam pengembangan untuk visualisasi grafik.</p>
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-4 text-center pb-5">
                          <div className="flex items-center justify-center gap-2">
                             <h3 className={`h3 ${t.textMain}`}>Kalkulator RM</h3>
                             <button onClick={() => setShowRmInfo(!showRmInfo)} className={`p-1.5 rounded-full ${t.inputBg} ${t.textMuted} hover:${t.textAccent} transition-colors`}>
                                <Info size={16} />
                             </button>
                          </div>
                          
                          {showRmInfo && (
                             <div className={`p-3.5 rounded-xl ${t.bgCard} border ${t.border} text-left text-xs ${t.textMuted} space-y-2 shadow-lg mb-4`}>
                                <p>Kalkulator RM (Repetition Maximum) digunakan untuk mengestimasi beban maksimal yang bisa kamu angkat berdasarkan set terbaikmu.</p>
                                <p>Jika kamu sudah tahu kapasitas bebanmu (misal: "saya biasa angkat 50kg, 8 repetisi"), masukkan angkanya di bawah lalu <b>Simpan</b> sebagai baseline 10RM.</p>
                                <p>Jika kamu belum tahu kapasitas beban, silakan dicoba dengan beban ringan terlebih dahulu, naikkan bebannya bertahap sampai cukup untuk 10 repetisi.</p>
                                <p>Aplikasi LOGYM mencatat rekor 10RM otomatis selama kamu latihan, jadi kamu tidak wajib input manual di sini.</p>
                             </div>
                          )}
   
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={`body-md ${t.textMuted} block mb-0.5`}>Beban ({isImp ? 'lbs' : 'kg'})</label>
                              <SwipeInput 
                                value={calcWeight} 
                                onChange={(val) => setCalcWeight(Math.max(0, val))} 
                                step={2.5}
                                min={0}
                                language={lang?.id || 'ID'}
                                className={`w-full px-3 py-2 rounded-xl ${t.inputBg} ${t.textMain} font-black text-center h2 outline-none focus:ring-2 ${t.ringAccent}`}
                              />
                            </div>
                            <div>
                              <label className={`body-md ${t.textMuted} block mb-0.5`}>Repetisi</label>
                              <SwipeInput 
                                value={calcReps} 
                                onChange={(val) => setCalcReps(Math.max(1, val))} 
                                step={1}
                                min={1}
                                language={lang?.id || 'ID'}
                                className={`w-full px-3 py-2 rounded-xl ${t.inputBg} ${t.textMain} font-black text-center h2 outline-none focus:ring-2 ${t.ringAccent}`}
                              />
                            </div>
                          </div>
   
                          <div className={`p-5 rounded-2xl bg-gradient-to-br ${t.gradientBg} shadow-xl border border-white/10`}>
                            <div className="flex justify-between items-center mb-3 border-b border-white/20 pb-3">
                              <div>
                                <p className="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">Estimasi 1RM</p>
                                <p className="text-white h3">{oneRM} <span className="body-md">{isImp ? 'lbs' : 'kg'}</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/80 text-[10px] uppercase tracking-wider mb-0.5">Estimasi 10RM</p>
                                <p className="text-white h3">{calculated10RM} <span className="body-md">{isImp ? 'lbs' : 'kg'}</span></p>
                              </div>
                            </div>
                            
                            <button 
                              onClick={handleSave10RM}
                              disabled={isRmSaved || calculated10RM === stored10RM}
                              className={`w-full py-2.5 font-black body-lg rounded-xl shadow-md transition-all ${isRmSaved ? t.bgAccent : (calculated10RM === stored10RM ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-100 active:scale-95')}`}
                            >
                              {isRmSaved ? 'Tersimpan ✓' : 'Simpan'}
                            </button>
                          </div>
                       </div>
                     )}
                  </div>  </div>
            ) : (
              <div className="p-6 h-full text-center text-zinc-500 italic flex flex-col items-center justify-center gap-3">
                <Video size={48} className="opacity-20" />
                Tonton video di atas untuk panduan gerakan.
              </div>
            )}
          </div>
          
          {/* Floating Action Tabs */}
          {ex.type !== 'warmup' && ex.type !== 'cooldown' && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-between gap-3 px-5 z-20 pointer-events-none w-full max-w-md mx-auto">
              <button 
                onClick={() => setActiveTab('info')}
                className={`h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl pointer-events-auto backdrop-blur-xl border border-black/10 dark:border-white/10 ${activeTab === 'info' ? `flex-1 ${t.bgAccent} text-white px-5` : 'w-14 bg-white/50 dark:bg-white/10 ' + t.textMain}`}
              >
                <Info size={24} className="shrink-0" />
                <span className={`font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${activeTab === 'info' ? 'max-w-xs opacity-100 ml-2.5' : 'max-w-0 opacity-0 overflow-hidden m-0'}`}>Instruksi</span>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl pointer-events-auto backdrop-blur-xl border border-black/10 dark:border-white/10 ${activeTab === 'history' ? `flex-1 ${t.bgAccent} text-white px-5` : 'w-14 bg-white/50 dark:bg-white/10 ' + t.textMain}`}
              >
                <History size={24} className="shrink-0" />
                <span className={`font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${activeTab === 'history' ? 'max-w-xs opacity-100 ml-2.5' : 'max-w-0 opacity-0 overflow-hidden m-0'}`}>Riwayat</span>
              </button>
              <button 
                onClick={() => setActiveTab('calc')}
                className={`h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl pointer-events-auto backdrop-blur-xl border border-black/10 dark:border-white/10 ${activeTab === 'calc' ? `flex-1 ${t.bgAccent} text-white px-5` : 'w-14 bg-white/50 dark:bg-white/10 ' + t.textMain}`}
              >
                <Calculator size={24} className="shrink-0" />
                <span className={`font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${activeTab === 'calc' ? 'max-w-xs opacity-100 ml-2.5' : 'max-w-0 opacity-0 overflow-hidden m-0'}`}>
                  {ex.type === 'cardio' ? 'Pace' : 'RM Calc'}
                </span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ExerciseDetailModal;
