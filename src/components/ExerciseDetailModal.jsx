import React, { useState } from 'react';
import { X, Dumbbell, History, Calculator, Replace, Video, Info, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatTarget } from '../data/constants';

const ExerciseDetailModal = ({ 
  ex, 
  onClose, 
  t, 
  lang, 
  historyData, 
  onReplace 
}) => {
  const [activeTab, setActiveTab] = useState('info'); // info, history, calc
  const [calcWeight, setCalcWeight] = useState(50);
  const [calcReps, setCalcReps] = useState(10);

  // Epley formula: 1RM = weight * (1 + reps/30)
  const oneRM = calcReps > 1 ? Math.round(calcWeight * (1 + calcReps / 30)) : calcWeight;

  if (!ex) return null;

  const parseMedia = (exercise) => {
    let items = [];
    if (exercise.ytVideo) {
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

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in`} onClick={onClose}>
      <div className={`w-full max-w-md sm:max-w-4xl mx-auto ${t.bgCard} rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col sm:flex-row h-[85vh] sm:h-[80vh] animate-in zoom-in-95 duration-200 border ${t.border}`} onClick={e => e.stopPropagation()}>
        
        {/* Kolom Kiri: Header with Video/Image */}
        <div className="w-full sm:w-[45%] flex flex-col relative shrink-0 bg-black aspect-square sm:aspect-auto">
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
                  <div key={idx} className="h-full flex items-center justify-center shrink-0 overflow-hidden" style={{ width: `${100 / mediaItems.length}%` }}>
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
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                className={`exercise-video-iframe w-[140%] h-[140%] max-w-none pointer-events-none scale-[1.15] transition-opacity duration-700 ${isVideoReady || idx !== activeMediaIndex ? 'opacity-100' : 'opacity-0'}`}
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
                        return <video src={media.url} autoPlay={idx === activeMediaIndex} loop muted playsInline className="w-full h-full object-contain opacity-80 pointer-events-none" />;
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
        <div className="w-full sm:w-[55%] flex flex-col bg-black/5 dark:bg-black/20 overflow-hidden h-full relative">
          {/* Desktop Close Button */}
          <button onClick={onClose} className="hidden sm:flex absolute top-3 right-3 bg-black/5 hover:bg-rose-500 hover:text-white dark:bg-white/5 dark:hover:bg-rose-500 text-slate-500 dark:text-slate-300 p-2 rounded-full transition-all z-20">
            <X size={20} />
          </button>

          {/* Action Tabs - Disembunyikan untuk video Pemanasan/Pendinginan */}
        {ex.type !== 'warmup' && ex.type !== 'cooldown' && (
          <div className={`flex border-b ${t.border} flex-shrink-0`}>
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 body-md flex flex-col items-center gap-1 transition-all ${activeTab === 'info' ? `${t.textAccent} border-b-2 ${t.borderAccent}` : t.textMuted}`}
            >
              <Info size={18} /> Instruksi
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 body-md flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? `${t.textAccent} border-b-2 ${t.borderAccent}` : t.textMuted}`}
            >
              <History size={18} /> Riwayat
            </button>
            <button 
              onClick={() => setActiveTab('calc')}
              className={`flex-1 py-3 body-md flex flex-col items-center gap-1 transition-all ${activeTab === 'calc' ? `${t.textAccent} border-b-2 ${t.borderAccent}` : t.textMuted}`}
            >
              <Calculator size={18} /> 1RM Calc
            </button>
          </div>
        )}

          <div className="overflow-hidden flex-1 bg-black/5 dark:bg-black/20 relative">
            {ex.type !== 'warmup' && ex.type !== 'cooldown' ? (
              <div 
                className="flex h-full w-[300%] transition-transform duration-300 ease-in-out touch-pan-y"
                style={{ transform: `translateX(-${['info', 'history', 'calc'].indexOf(activeTab) * 33.3333}%)` }}
                onTouchStart={onTabTouchStart}
                onTouchMove={onTabTouchMove}
                onTouchEnd={onTabTouchEnd}
              >
                {/* Tab 1: Instruksi */}
                <div className="w-1/3 h-full p-5 overflow-y-auto hide-scrollbar">
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
                            <li key={i} className={`body-lg ${t.textMain} opacity-90 leading-relaxed`}>{step}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className={`body-lg ${t.textMuted} italic`}>Tidak ada instruksi khusus dari database.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab 2: Riwayat */}
                <div className="w-1/3 h-full p-5 overflow-y-auto hide-scrollbar">
                  <div className="space-y-3">
                     {(!historyData || historyData.length === 0) ? (
                       <div className={`text-center py-8 ${t.textMuted}`}>
                         <History size={32} className="mx-auto mb-2 opacity-30" />
                         <p className="body-lg font-bold">Belum ada riwayat latihan ini.</p>
                       </div>
                     ) : (
                       historyData.map((log, i) => (
                         <div key={i} className={`p-3 rounded-xl border ${t.border} ${t.bgCard} flex justify-between items-center`}>
                           <div>
                             <p className={`body-md ${t.textMuted}`}>{log.date}</p>
                             <p className={`body-lg font-bold ${t.textMain}`}>{log.programName}</p>
                           </div>
                           <div className="text-right">
                             <p className={`h2 ${t.textAccent}`}>{log.maxWeight} <span className="body-md">kg</span></p>
                             <p className={`body-md ${t.textMuted}`}>{log.totalSets} set</p>
                           </div>
                         </div>
                       ))
                     )}
                  </div>
                </div>

                {/* Tab 3: 1RM Calc */}
                <div className="w-1/3 h-full p-5 overflow-y-auto hide-scrollbar">
                  <div className="space-y-5 text-center pb-8">
                     <p className={`body-md ${t.textMuted}`}>Gunakan kalkulator One Rep Max (1RM) untuk mengestimasi beban maksimal yang bisa kamu angkat 1 kali berdasarkan set terbaikmu.</p>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className={`body-md ${t.textMuted} mb-1 block`}>Beban (kg)</label>
                         <input 
                           type="number" min="0" 
                           value={calcWeight} onChange={e => setCalcWeight(Number(e.target.value))}
                           className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} font-black text-center h2 outline-none focus:ring-2 ${t.ringAccent}`}
                         />
                       </div>
                       <div>
                         <label className={`body-md ${t.textMuted} mb-1 block`}>Repetisi</label>
                         <input 
                           type="number" min="1" 
                           value={calcReps} onChange={e => setCalcReps(Number(e.target.value))}
                           className={`w-full px-3 py-3 rounded-xl ${t.inputBg} ${t.textMain} font-black text-center h2 outline-none focus:ring-2 ${t.ringAccent}`}
                         />
                       </div>
                     </div>
  
                     <div className={`p-6 rounded-2xl bg-gradient-to-br ${t.gradientBg} shadow-lg shadow-amber-500/20`}>
                       <p className="text-white/80 body-md uppercase tracking-wider mb-1">Estimasi 1RM Kamu</p>
                       <p className="text-white h1">{oneRM} <span className="h2">kg</span></p>
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 h-full text-center text-zinc-500 italic flex flex-col items-center justify-center gap-3">
                <Video size={48} className="opacity-20" />
                Tonton video di atas untuk panduan gerakan.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExerciseDetailModal;
