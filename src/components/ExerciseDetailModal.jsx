import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Dumbbell, History, Calculator, Replace, Video, Info, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';
import { formatTarget, resolveProjectedProgramId, defaultMasterExercises, findMatchingMasterExercise, cleanExerciseNameForMatching, canonicalizeExercise } from '../data/constants';
import { resolveExerciseKind, estimate10RM, estimate1RM, getEquipmentConfig, calculateActualWeight, getSetActualWeight } from '../utils/workoutCalc';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import SwipeInput from './SwipeInput';
import TwoFrameMotionLoop from './TwoFrameMotionLoop';

export const isSameExerciseEntity = (e1, e2) => {
  if (!e1 || !e2) return false;
  if (e1.id && e2.id && String(e1.id) === String(e2.id)) return true;
  if (e1.originalId && e2.originalId && String(e1.originalId) === String(e2.originalId)) return true;
  if (e1.originalId && String(e1.originalId) === String(e2.id)) return true;
  if (e2.originalId && String(e2.originalId) === String(e1.id)) return true;

  const m1 = findMatchingMasterExercise(e1, defaultMasterExercises);
  const m2 = findMatchingMasterExercise(e2, defaultMasterExercises);
  if (m1 && m2 && m1.id === m2.id) return true;

  const c1 = canonicalizeExercise(e1);
  const c2 = canonicalizeExercise(e2);
  if (c1?.name && c2?.name && cleanExerciseNameForMatching(c1.name) === cleanExerciseNameForMatching(c2.name)) {
    return true;
  }

  const n1 = cleanExerciseNameForMatching(e1.name);
  const n2 = cleanExerciseNameForMatching(e2.name);
  if (!n1 || !n2) return false;
  return n1 === n2;
};

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
  const initialExType = resolveExerciseKind(initialEx);
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
            realProgId = resolveProjectedProgramId(realProgId);
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
               const matchingExs = w.exercises.filter(e => isSameExerciseEntity(e, initialEx));
               targetExIds = matchingExs.map(e => e.id);
            }
          } else {
            const p = programs?.find(prog => prog.id === realProgId);
            if (p && p.exercises) {
               const matchingExs = p.exercises.filter(e => isSameExerciseEntity(e, initialEx));
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
          const targetEx = w.exercises.find(e => isSameExerciseEntity(e, initialEx));
          if (targetEx && Array.isArray(targetEx.sets)) {
            completedSets = targetEx.sets.filter(s => s.done);
          }
        }

        const eqConf = getEquipmentConfig(null, null, initialEx);
        if (completedSets.length > 0) {
          logs.push({
            date,
            programName: pName,
            sets: completedSets.map(s => {
              const inputW = Number(s.input_w !== undefined ? s.input_w : s.w) || 0;
              const totalW = getSetActualWeight(s, eqConf);
              return {
                w: inputW,
                input_w: inputW,
                total_w: totalW,
                base_w: s.base_w !== undefined ? s.base_w : eqConf.baseWeight,
                ratio: s.ratio !== undefined ? s.ratio : eqConf.ratio,
                r: Number(s.r) || 0,
                distance: Number(s.distance) || 0,
                duration: Number(s.duration) || 0,
                rpe: s.rpe || '',
                notes: s.notes || ''
              };
            })
          });
        }
      });
    });
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [fullHistory, initialEx, programs]);

  const historyMax10RM = useMemo(() => {
    let max = 0;
    historyData.forEach(day => {
      day.sets.forEach(s => {
        const c10RM = estimate10RM(s.total_w !== undefined ? s.total_w : s.w, s.r);
        if (c10RM > max) max = c10RM;
      });
    });
    return max;
  }, [historyData]);

  const existingLibEx = exerciseLibrary?.find(e => e.name?.toLowerCase() === initialEx.name?.toLowerCase() || e.id === initialEx.id);
  const stored10RM = existingLibEx?.rm10 || 0;
  const storedLastWeight = existingLibEx?.lastWeight || 0;
  // Acuan yang berlaku = angka tersimpan (sekarang mengikuti sesi TERAKHIR, lihat mergeRm10),
  // bukan rekor tertinggi sepanjang masa. Dulu di sini Math.max(riwayat, tersimpan) — akibatnya
  // sesudah deload angka di layar tetap rekor lama sementara kolom kg saat latihan sudah turun:
  // dua angka berbeda untuk hal yang sama. Rekor tertinggi tetap ditampilkan, terpisah.
  const best10RM = stored10RM || historyMax10RM;

  const [activeTab, setActiveTab] = useState('info'); // info, history, calc
  const [calcWeight, setCalcWeight] = useState(best10RM || storedLastWeight || 50);
  const [calcReps, setCalcReps] = useState(10);
  const [showRmInfo, setShowRmInfo] = useState(false);
  const [isRmSaved, setIsRmSaved] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const isIndo = lang?.id === 'ID' || t?.settings !== 'Settings';
    return isIndo ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
  };

  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0 || initialExType !== 'weight') return [];
    const data = [];
    // historyData diurutkan dari baru ke lama, kita butuh lama ke baru untuk grafik
    [...historyData].reverse().forEach(day => {
      let max10RM = 0;
      day.sets.forEach(s => {
        const c = estimate10RM(s.total_w !== undefined ? s.total_w : s.w, s.r);
        if (c > max10RM) max10RM = c;
      });
      if (max10RM > 0) {
        data.push({
          date: formatDate(day.date),
          rm10: isImp ? Number((max10RM * 2.20462).toFixed(1)) : max10RM
        });
      }
    });
    return data;
  }, [historyData, initialExType, isImp, formatDate]);

  // Rumus yang SAMA dengan jalur riwayat. Versi lama di sini membulatkan 1RM ke bilangan bulat
  // dulu, sehingga 100 kg x 10 memberi 99,8 di kalkulator tapi 100,0 dari riwayat.
  const oneRM = Math.round(estimate1RM(calcWeight, calcReps) * 10) / 10;
  const calculated10RM = estimate10RM(calcWeight, calcReps);

  const handleSave10RM = () => {
    if (!setExerciseLibrary) return;
    setExerciseLibrary(lib => {
      // rm10ManualAt menandai KAPAN acuan ini ditetapkan sendiri oleh user. Tanpa penanda itu,
      // perhitungan ulang dari riwayat akan menaikkan angkanya lagi di sesi berikutnya dan
      // tombol simpan ini jadi tidak ada artinya — padahal justru dipakai untuk MENURUNKAN acuan
      // setelah jeda panjang. Rekor dari sesi SESUDAH tanggal ini tetap boleh menang.
      const manual = { rm10: calculated10RM, rm10ManualAt: Date.now() };
      const idx = lib.findIndex(e => e.name?.toLowerCase() === initialEx.name?.toLowerCase() || e.id === initialEx.id);
      if (idx >= 0) {
        const newLib = [...lib];
        newLib[idx] = { ...newLib[idx], ...manual };
        return newLib;
      }
      return [...lib, { ...initialEx, ...manual, id: initialEx.id || Date.now(), isFavorite: false }];
    });
    setIsRmSaved(true);
    setTimeout(() => setIsRmSaved(false), 2000);
  };

  const resolveFullExercise = (raw) => {
    if (!raw) return null;
    const canonical = canonicalizeExercise(raw);
    const masterMatch = findMatchingMasterExercise(canonical, defaultMasterExercises);
    return {
      ...masterMatch,
      ...canonical,
      instructions: masterMatch?.instructions || canonical.instructions,
      instructions_id: masterMatch?.instructions_id || canonical.instructions_id,
      instructions_en: masterMatch?.instructions_en || canonical.instructions_en,
      videoUrl: masterMatch?.videoUrl || canonical.videoUrl || '',
      thumbnailUrl: masterMatch?.thumbnailUrl || canonical.thumbnailUrl || masterMatch?.gifUrl || canonical.gifUrl || '',
      gifUrl: masterMatch?.gifUrl || canonical.gifUrl || '',
      ytVideo: masterMatch?.ytVideo || canonical.ytVideo || '',
    };
  };

  const [ex, setEx] = useState(() => resolveFullExercise(initialEx));

  React.useEffect(() => {
     const resolved = resolveFullExercise(initialEx);
     setEx(resolved);
     if (initialEx && initialEx.name) {
         import('../utils/exerciseDbApi').then(({ fetchExercisesFromApi }) => {
             fetchExercisesFromApi().then(onlineDb => {
                 const onlineMatch = findMatchingMasterExercise(resolved || initialEx, onlineDb);
                 if (onlineMatch) {
                     setEx(prev => ({ 
                         ...prev, 
                         instructions: onlineMatch.instructions || prev?.instructions,
                         instructions_id: onlineMatch.instructions_id || onlineMatch.instructions || prev?.instructions_id,
                         instructions_en: onlineMatch.instructions_en || onlineMatch.instructions || prev?.instructions_en,
                         videoUrl: prev?.videoUrl || onlineMatch.videoUrl,
                         thumbnailUrl: prev?.thumbnailUrl || onlineMatch.thumbnailUrl || onlineMatch.gifUrl,
                         gifUrl: prev?.gifUrl || onlineMatch.gifUrl,
                         equipment: prev?.equipment || onlineMatch.equipment
                     }));
                 }
             });
         }).catch(() => {});
     }
  }, [initialEx]);

  const activeInstructions = useMemo(() => {
    if (!ex) return [];
    if (lang?.id === 'EN') {
      return ex.instructions_en || ex.instructions || [];
    }
    return ex.instructions_id || ex.instructions || [];
  }, [ex, lang?.id]);


  const parseMedia = (exercise) => {
    let items = [];
    if (!exercise) return items;
    if (exercise.videoUrl) {
      const urls = exercise.videoUrl.split(/(?:,|\s)+/).filter(v => v.trim());
      urls.forEach(u => {
        if (u.match(/\.(mp4|webm)$/i)) {
          if (!items.some(it => it.url === u)) items.push({ type: 'video', url: u });
        }
      });
    }
    if (exercise.thumbnailUrl && !exercise.thumbnailUrl.match(/\.(mp4|webm)$/i)) {
      if (!items.some(it => it.url === exercise.thumbnailUrl)) {
        items.push({ type: 'image', url: exercise.thumbnailUrl });
      }
    }
    if (exercise.gifUrl) {
      const urls = exercise.gifUrl.split(/(?:,|\s)+/).filter(v => v.trim());
      urls.forEach(u => {
        if (u.match(/\.(mp4|webm)$/i)) {
          if (!items.some(it => it.url === u)) items.push({ type: 'video', url: u });
        } else if (!items.some(it => it.url === u)) {
          items.push({ type: 'image', url: u });
        }
      });
    }

    // Lini 3 (Backup): Looping 2-frame ExerciseDB Motion
    const exId = exercise.exerciseId || (exercise.id && String(exercise.id).startsWith('edb-') ? String(exercise.id).replace(/^edb-/, '') : null);
    const rawGif = exercise.gifUrl || '';
    let loopExId = exId;
    let loopGif = null;

    if (rawGif.includes('/0.jpg') || rawGif.includes('/1.jpg')) {
      loopGif = rawGif;
      const match = rawGif.match(/exercises\/([^/]+)\/[01]\.jpg/);
      if (match) loopExId = match[1];
    } else if (loopExId) {
      loopGif = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${loopExId}/0.jpg`;
    }

    if (loopExId || loopGif) {
      if (!items.some(it => it.type === 'motion-loop')) {
        items.push({ type: 'motion-loop', exerciseId: loopExId, gifUrl: loopGif, url: loopGif });
      }
    }

    return items;
  };
  const mediaItems = React.useMemo(() => parseMedia(ex), [ex]);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const activeMedia = mediaItems[activeMediaIndex];

  // Kunci scroll background (atas-bawah) saat modal detail aktif
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Swipe logic for media carousel
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  React.useEffect(() => {
    setIsVideoReady(false);
  }, [activeMediaIndex]);

  // Sinkronisasi pemutaran video YouTube & HTML5 video saat swipe media
  React.useEffect(() => {
    const iframes = document.querySelectorAll('.exercise-video-iframe');
    const videoObjs = document.querySelectorAll('.exercise-video-html5');

    iframes.forEach((iframe, idx) => {
      try {
        if (iframe && iframe.contentWindow) {
          if (idx === activeMediaIndex) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
          } else {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
          }
        }
      } catch (err) {}
    });

    videoObjs.forEach((v, idx) => {
      try {
        if (idx === activeMediaIndex) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      } catch (err) {}
    });
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

  const handleIframeLoad = (e, idx) => {
    try {
      e.target.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
      if (idx === activeMediaIndex) {
        e.target.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
      } else {
        e.target.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
      }
    } catch (err) {}
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

  // SEMUA HOOK SUDAH DIPANGGIL DI ATAS TITIK INI — jangan pernah menyisipkan `return` sebelumnya.
  //
  // Dulu dua cabang di bawah ini berdiri SEBELUM sembilan hook (mediaItems, activeMediaIndex,
  // touchStart/End, isVideoReady, dua useEffect, dua hook swipe tab). React mengenali hook dari
  // URUTAN pemanggilannya, bukan namanya: sekali render menempuh salah satu cabang itu, sembilan
  // hook berikutnya tidak ikut dipanggil, dan render selanjutnya memasangkan state ke slot yang
  // salah — isi satu useState muncul di useState lain. Bugnya acak, tidak melempar error, dan
  // hampir mustahil dilacak dari gejalanya.
  if (!ex) return null;

  if (ex.type === 'warmup' || ex.type === 'cooldown') {
    const urls = ex.ytVideo ? ex.ytVideo.split(/(?:,|\s)+/).filter(v => v.trim()) : [];
    const videos = urls.map(url => {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
        return { url, videoId: match ? match[1] : null };
    }).filter(v => v.videoId);

    return createPortal(
      <div role="dialog" aria-modal="true" className={`fixed inset-0 z-[100] flex flex-col ${t.bgApp} no-swipe`}>
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
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure" 
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in no-swipe overscroll-contain touch-none`} onClick={onClose}>
      <div className={`w-full max-w-md sm:max-w-4xl mx-auto ${t.bgCard} rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row h-[85vh] sm:h-[80vh] animate-in zoom-in-95 duration-200 shadow-2xl overscroll-contain`} onClick={e => e.stopPropagation()}>
        
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
                  <div key={idx} className="relative h-full flex items-center justify-center shrink-0 overflow-hidden bg-black" style={{ width: `${100 / mediaItems.length}%` }}>
                    {media.type === 'video' ? (
                      <video 
                        src={media.url} 
                        poster={ex?.thumbnailUrl || ex?.gifUrl || ''} 
                        autoPlay={idx === activeMediaIndex} 
                        loop 
                        muted 
                        playsInline 
                        preload="auto" 
                        className="exercise-video-html5 w-full h-full object-cover opacity-100 shadow-xl transition-all duration-300 bg-black" 
                      />
                    ) : media.type === 'motion-loop' ? (
                      <TwoFrameMotionLoop 
                        exerciseId={media.exerciseId} 
                        gifUrl={media.gifUrl} 
                        name={ex?.name} 
                      />
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-125 pointer-events-none" />
                        <img src={media.url} alt={ex.name} className="relative z-10 w-full h-full object-contain pb-6 pointer-events-none drop-shadow-2xl" />
                      </div>
                    )}
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
            
            {/* Top Left Equipment Badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white/90 border border-white/10 backdrop-blur-md text-xs font-semibold shadow-lg">
              <Dumbbell size={13} className="text-sky-400" />
              <span>{ex.equipment || 'Body Weight'}</span>
            </div>

            {/* Top gradient for obscuring iframe remnants and better button visibility */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none"></div>

            <button data-close-modal="true" onClick={onClose} aria-label="Tutup" className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm transition-all sm:hidden z-20">
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
                <div className="flex items-center justify-center gap-2 mt-2.5 py-1">
                  {mediaItems.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(idx);
                      }}
                      aria-label={`Media ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === activeMediaIndex 
                          ? `w-8 ${t.bgAccent} shadow-md` 
                          : 'w-2.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Action Tabs & Tab Content */}
        <div className="w-full sm:w-[55%] flex flex-col bg-transparent overflow-hidden h-full relative">
          {/* Desktop Close Button */}
          <button data-close-modal="true" onClick={onClose} aria-label="Tutup" className="hidden sm:flex absolute top-3 right-3 bg-black/5 hover:bg-rose-500 hover:text-white dark:bg-white/5 dark:hover:bg-rose-500 text-slate-500 dark:text-slate-300 p-2 rounded-full transition-all z-20">
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
                <div className="w-1/3 h-full p-6 pb-24 overflow-y-auto hide-scrollbar overscroll-contain touch-pan-y">
                  <div className="space-y-4">
                    {!ex.ytVideo && (
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' shorts tutorial @DeltaBolic @fitnessonlineapp @officialdemic')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 active:scale-[0.98] transition-all shadow-md shadow-rose-500/20"
                      >
                        <Video size={16} /> Cari Online
                      </a>
                    )}
                    
                    <div>
                      {activeInstructions && activeInstructions.length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-3">
                          {activeInstructions.map((step, i) => (
                            <li key={i} className={`body-lg ${t.textMain} opacity-90 leading-relaxed`}>{String(step).replace(/^\d+[\.\)]\s*/, '')}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className={`body-lg ${t.textMuted} italic`}>{lang?.id === 'EN' ? 'No specific instructions available.' : 'Tidak ada instruksi khusus dari database.'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab 2: Riwayat */}
                <div className="w-1/3 h-full p-4 pb-24 overflow-y-auto hide-scrollbar overscroll-contain touch-pan-y">
                  <div className="space-y-0">
                     {(!historyData || historyData.length === 0) ? (
                       <div className={`text-center py-8 ${t.textMuted}`}>
                         <History size={32} className="mx-auto mb-2 opacity-30" />
                         <p className="body-lg font-bold">Belum ada riwayat latihan ini.</p>
                       </div>
                     ) : (
                       <>
                         {chartData.length > 1 && (
                           <div className={`mb-6 p-4 rounded-2xl border ${t.border} bg-black/5 dark:bg-white/5`}>
                             <div className={`flex items-center justify-between mb-4`}>
                               <h3 className={`body-lg font-bold ${t.textMain}`}>Progresivitas Latihan (10RM)</h3>
                             </div>
                             <div className="w-full h-[120px] -ml-2">
                               <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                   <defs>
                                     <linearGradient id="colorRm10" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                     </linearGradient>
                                   </defs>
                                   <XAxis dataKey="date" hide />
                                   <YAxis domain={['auto', 'auto']} hide />
                                   <Tooltip 
                                     contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                                     itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                                     labelStyle={{ color: '#aaa', marginBottom: '4px' }}
                                   />
                                   <Area type="monotone" dataKey="rm10" name="10RM" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRm10)" />
                                 </AreaChart>
                               </ResponsiveContainer>
                             </div>
                           </div>
                         )}
                         {historyData.map((log, i) => (
                           <div key={i} className={`mb-3 pb-3 border-b border-dashed last:border-b-0 ${t.border}`}>
                           {/* gap-2 + w-auto, bukan w-[65px]. Lebarnya dulu dipatok 65px padahal
                               "23/08/2026" lebih lebar dari itu, jadi tanggalnya meluber ke nama
                               program dan dua teks itu saling menimpa. */}
                           <div className="flex items-center gap-2 mb-1.5 px-1">
                             <div className={`caption ${t.textMuted} shrink-0 whitespace-nowrap`}>
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
                                   {initialExType === 'cardio' ? (
                                      <>
                                        <th className="py-1 text-center w-12">Set</th>
                                        <th className="py-1 text-center w-12">Jarak</th>
                                        <th className="py-1 text-center w-12">Waktu</th>
                                        <th className="py-1 text-center w-12">Pace</th>
                                        <th className="py-1 px-2 text-left">Notes</th>
                                      </>
                                   ) : (
                                      <>
                                        <th className="py-1 text-center w-8">Set</th>
                                        <th className="py-1 text-center w-14">Beban</th>
                                        {/* Beban aktual = yang benar-benar diangkat (input x rasio + beban dasar alat).
                                            Sebelumnya cuma hidup di dalam perhitungan dan tidak pernah terlihat di riwayat. */}
                                        <th className="py-1 text-center w-14">Aktual</th>
                                        <th className="py-1 text-center w-10">Reps</th>
                                        <th className="py-1 text-center border-l border-black/5 dark:border-white/5 w-8">RPE</th>
                                        <th className="py-1 px-2 text-left">Notes</th>
                                      </>
                                   )}
                                 </tr>
                               </thead>
                               <tbody>
                                 {log.sets.map((s, idx) => {
                                    if (initialExType === 'cardio') {
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
                                        {/* Diredupkan kalau sama dengan beban yang diketik — alat tanpa beban dasar
                                            dan tanpa katrol memang menghasilkan angka yang sama, dan mengulangnya
                                            dengan penekanan yang sama cuma bikin mata bekerja dua kali. */}
                                        <td className={`py-1.5 text-center font-bold ${Number(s.total_w) !== Number(s.w) ? '' : 'opacity-30'}`}>
                                          {isImp ? Number((Number(s.total_w || s.w) * 2.20462).toFixed(1)) : Number(s.total_w || s.w)} <span className="text-[8px]">{isImp ? 'lbs' : 'kg'}</span>
                                        </td>
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
                       ))}
                       </>
                     )}
                  </div>
                </div>

                 {/* Tab 3: 1RM Calc / Pace Calc */}
                 <div className="w-1/3 h-full p-5 pb-24 overflow-y-auto hide-scrollbar relative overscroll-contain touch-pan-y">
                     {initialExType === 'cardio' ? (
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
                                <p>Acuan 10RM kamu diambil dari <b>sesi terakhir</b> latihan ini (<b>{best10RM} {isImp ? 'lbs' : 'kg'}</b>){historyMax10RM > best10RM ? <> — rekor tertingginya <b>{historyMax10RM} {isImp ? 'lbs' : 'kg'}</b></> : null}. Jadi angkanya ikut turun kalau kamu deload, dan salah input bisa terkoreksi sendiri di sesi berikutnya. Mau menetapkan acuan sendiri? Sesuaikan angkanya lalu <b>Simpan</b>.</p>
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
                              disabled={isRmSaved || calculated10RM === stored10RM || calculated10RM === best10RM}
                              className={`w-full py-2.5 font-black body-lg rounded-xl shadow-md transition-all ${isRmSaved ? t.bgAccent : (calculated10RM === stored10RM || calculated10RM === best10RM ? 'bg-white/20 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-100 active:scale-95')}`}
                            >
                              {isRmSaved ? 'Tersimpan ✓' : (calculated10RM === best10RM ? 'Otomatis Tersimpan' : 'Simpan Acuan Baru')}
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
                  {initialExType === 'cardio' ? 'Pace' : 'RM Calc'}
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
