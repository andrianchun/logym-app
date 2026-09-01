import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, X, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getLocalYMD, formatTarget, normalizeMuscleKey, resolveLoggedExercise, resolveProjectedProgramId, getDayWorkouts, defaultMasterExercises } from '../data/constants';
import { estimate10RM, getEquipmentConfig, calculateActualWeight, getSetActualWeight, calculatePersonalRecords } from '../utils/workoutCalc';

const ProgressTab = ({ t, lang, language, theme, history, programs, exerciseLibrary, soundEnabled, playSoundEffect, selectedDate, units, activePlanIds, isSubCard = false, expandedSessions = {} }) => {
  const [chartType, setChartType] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_prog_chart_type');
          if (saved && saved !== 'rm10') return saved;
      } catch(e) {}
      return 'exercise';
  });
  
  const [customLinesByType, setCustomLinesByType] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_prog_custom_lines');
          if (saved) return JSON.parse(saved);
      } catch(e) {}
      return { exercise: null, muscle: null };
  });

  useEffect(() => {
      localStorage.setItem('lyfit_prog_chart_type', chartType);
  }, [chartType]);
  
  useEffect(() => {
      localStorage.setItem('lyfit_prog_custom_lines', JSON.stringify(customLinesByType));
  }, [customLinesByType]);

  const lastActiveExpandedRef = useRef(null);
  const currentActiveExpandedId = expandedSessions ? Object.keys(expandedSessions).find(k => expandedSessions[k]) : null;

  useEffect(() => {
    if (currentActiveExpandedId !== lastActiveExpandedRef.current) {
      lastActiveExpandedRef.current = currentActiveExpandedId;
      // Saat user membuka chevron sesi lain di tab latihan, sesuaikan garis grafik ke sesi baru tersebut
      setCustomLinesByType({ exercise: null, muscle: null });
    }
  }, [currentActiveExpandedId]);

  const chartColors = theme === 'dark' 
    ? ['#38bdf8', '#60a5fa', '#818cf8', '#2dd4bf', '#94a3b8', '#3b82f6', '#a78bfa', '#06b6d4', '#93c5fd']
    : ['#0284c7', '#2563eb', '#4f46e5', '#0d9488', '#64748b', '#1d4ed8', '#7c3aed', '#0891b2', '#1e3a8a'];

  // ==========================================
  // MESIN PERHITUNGAN GRAFIK (DIROMBAK UNTUK DETAIL PER SET)
  // ==========================================
  const chartDataObj = useMemo(() => {
    const isMusc = chartType === 'muscle';
    // Mode Per Latihan: menggunakan 10RM terstandarisasi untuk menormalkan beban + reps jadi satu angka kekuatan progresif
    const itemsSet = new Set();
    const itemFreq = {};
    const dataPoints = []; // Menggunakan Array datar agar titiknya berurutan sesuai set

    const exLookup = {};
    defaultMasterExercises.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; });
    exerciseLibrary.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; }); 
    
    Object.values(history).forEach(d => {
      d?.workouts?.forEach(w => {
         if (w.exercises) w.exercises.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; });
         if (w.overriddenExercises) w.overriddenExercises.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; });
      });
      if (d?._activeSession?.extraExercises) {
         d._activeSession.extraExercises.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; });
      }
    });

    programs.forEach(p => p.exercises?.forEach(ex => { if (ex?.id) exLookup[ex.id] = ex; }));

    const now = new Date();
    // Allow all data instead of limiting to 90 days
    const startDate = new Date(now.getTime() - (5000 * 86400000)); // ~13 years (effectively no limit)
    const startStr = getLocalYMD(startDate);

    // Ambil history yang sudah selesai saja
    const filteredHistory = [];
    Object.entries(history).forEach(([dateStr, data]) => {
      if (dateStr >= startStr && data?.workouts) {
        data.workouts.filter(w => w.status === 'completed').forEach(w => {
           filteredHistory.push({ dateStr, dayData: w, fullDay: data });
        });
      } else if (dateStr >= startStr && data?.status === 'completed') {
        filteredHistory.push({ dateStr, dayData: data, fullDay: data });
      }
      
      // Tambahkan progress aktif (sementara) yang sedang berjalan hari ini / terpilih
      if (dateStr >= startStr && data?._activeSession?.exerciseLogs && Object.keys(data._activeSession.exerciseLogs).length > 0) {
        filteredHistory.push({ dateStr, dayData: { log: data._activeSession.exerciseLogs }, fullDay: data });
      }
    });
    filteredHistory.sort((a, b) => a.dateStr.localeCompare(b.dateStr));



    const aggregatedByDate = {};

    filteredHistory.forEach(({dateStr, dayData, fullDay}) => {
      const dateObj = new Date(dateStr);
      const dateLabel = dateObj.toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' });

      if (!aggregatedByDate[dateStr]) {
          aggregatedByDate[dateStr] = { date: dateLabel, rawDate: dateStr };
      }
      const point = aggregatedByDate[dateStr];

      // FIX: Cek `dayData.log` dulu. Kalau kosong, baca dari `fullDay._activeSession.exerciseLogs`.
      let log = dayData.log || {};
      if (Object.keys(log).length === 0 && fullDay?._activeSession?.exerciseLogs) {
          log = fullDay._activeSession.exerciseLogs;
      }
      const eLogs = log.exerciseLogs ? log.exerciseLogs : log; 

      Object.keys(eLogs).forEach(exIdStr => {
          const sets = eLogs[exIdStr];
          const ex = resolveLoggedExercise(exIdStr, exLookup);

          if (ex && sets) {
              const exName = ex.name;
              const exType = ex.type || 'weight';
              let exTargets = Array.isArray(ex.target) ? ex.target : (ex.target ? [ex.target] : ['Lainnya']);
              if (exTargets.length === 1 && exTargets[0] === 'Lainnya') {
                 const libEx = exerciseLibrary?.find(e => e.id === ex.id || e.id === ex.originalId || e.name?.toLowerCase() === ex.name?.toLowerCase()) || defaultMasterExercises.find(e => e.id === ex.id || e.name?.toLowerCase() === ex.name?.toLowerCase());
                 if (libEx?.target) {
                    exTargets = Array.isArray(libEx.target) ? libEx.target : [libEx.target];
                 }
              }
              const isImp = units?.weight === 'lbs';
              
              const eqConf = getEquipmentConfig(null, null, ex);
              Object.values(sets).forEach(s => {
                  if (s && s.done && !s.skipped) {
                      const actW = getSetActualWeight(s, eqConf);
                      if (isMusc) {
                          let volume = 0;
                          if (exType === 'weight') volume = (actW * Number(s.r)) * (isImp ? 2.20462 : 1);
                          else if (exType === 'reps') volume = Number(s.r);
                          else if (exType === 'time') volume = Number(s.d);

                          if (volume > 0) {
                              exTargets.forEach(muscle => { 
                                  const mKey = normalizeMuscleKey(muscle);
                                  itemsSet.add(mKey); 
                                  point[mKey] = (point[mKey] || 0) + volume; 
                                  itemFreq[mKey] = (itemFreq[mKey] || 0) + 1;
                              });
                          }
                      } else {
                          let val = 0;
                          if (exType === 'weight') {
                              val = estimate10RM(actW, Number(s.r)) * (isImp ? 2.20462 : 1);
                          }
                          else if (exType === 'reps') val = Number(s.r);
                          else if (exType === 'time') val = Number(s.d);

                          if (val > 0) {
                              itemsSet.add(exName);
                              point[exName] = Math.max((point[exName] || 0), val); 
                              itemFreq[exName] = (itemFreq[exName] || 0) + 1;
                          }
                      }
                  }
              });
          }
      });
    });

    const finalDataPoints = Object.values(aggregatedByDate).sort((a,b) => a.rawDate.localeCompare(b.rawDate));
    
    // Round to 1 decimal place to prevent floating point issues and long labels
    finalDataPoints.forEach(pt => {
        Object.keys(pt).forEach(k => {
            if (k !== 'date' && k !== 'rawDate' && typeof pt[k] === 'number') {
                pt[k] = Number(pt[k].toFixed(1));
            }
        });
    });
    
    let recentItems = new Set();
    const todayStr = selectedDate || getLocalYMD(new Date());
    const extractFromDay = (dayData) => {
        let found = false;
        const workouts = dayData?.workouts || (dayData?.status ? [dayData] : []);
        workouts.forEach(w => {
            if (w.status === 'in_progress' || w.status === 'completed' || w.status === 'planned') {
                found = true;
                const activeSessionLogs = dayData?._activeSession?.exerciseLogs || {};
                const eLogs = (w.log && Object.keys(w.log).length > 0) ? (w.log.exerciseLogs || w.log) : activeSessionLogs;
                
                Object.keys(eLogs).forEach(exIdStr => {
                    const ex = resolveLoggedExercise(exIdStr, exLookup);
                    if (ex) {
                        if (isMusc) {
                           const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
                           exTargets.forEach(t => recentItems.add(normalizeMuscleKey(t)));
                        } else {
                           recentItems.add(ex.name);
                        }
                    }
                });
                
                // Ekstrak dari program yang direncanakan — pakai overriddenExercises kalau ada (exercise alternatif)
                if (w.programId && w.programId !== 'adhoc') {
                   const prog = programs.find(p => p.id === w.programId);
                   // Prefer overridden (alternative) exercises, fall back to original program exercises
                   const exercisesToUse = w.overriddenExercises || (prog?.exercises) || [];
                   exercisesToUse.forEach(exObj => {
                       const ex = exLookup[exObj.id] || exObj;
                       if (ex) {
                          if (isMusc) {
                             const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
                             exTargets.forEach(t => recentItems.add(normalizeMuscleKey(t)));
                          } else {
                             if (ex.name) recentItems.add(ex.name);
                          }
                       }
                   });
                }
            }
        });
        return found;
    };

    if (!history[todayStr] || !extractFromDay(history[todayStr])) {
        const sortedDates = Object.keys(history).sort((a,b) => b.localeCompare(a));
        for (let date of sortedDates) {
            if (extractFromDay(history[date])) break;
        }
    }

    const sortedItems = Array.from(itemsSet).sort((a,b) => {
        const aRecent = recentItems.has(a);
        const bRecent = recentItems.has(b);
        if (aRecent && !bRecent) return -1;
        if (!aRecent && bRecent) return 1;
        return (itemFreq[b] || 0) - (itemFreq[a] || 0);
    });
    return { data: finalDataPoints, items: sortedItems, recentItems: Array.from(recentItems) };
  }, [chartType, language, history, programs, exerciseLibrary, selectedDate, units]);

  const effectiveActiveLines = useMemo(() => {
    const custom = customLinesByType[chartType];
    if (Array.isArray(custom) && custom.length > 0) {
      const valid = custom.filter(item => chartDataObj.items.includes(item));
      if (valid.length > 0) return valid.slice(0, 6);
    }

    let activeItems = [];
    const todayStr = selectedDate || getLocalYMD(new Date());
    const todayWorkouts = getDayWorkouts(history, programs, activePlanIds, todayStr);
    const activeExpandedId = expandedSessions ? Object.keys(expandedSessions).find(k => expandedSessions[k]) : null;

    let targetExercises = [];

    if (activeExpandedId === 'extra') {
      const extraList = (history[todayStr]?._activeSession?.extraExercises) || (todayWorkouts.find(w => w.programId === 'adhoc')?.exercises) || [];
      targetExercises = extraList;
    } else if (activeExpandedId) {
      const targetWorkout = todayWorkouts.find(w => 
        w.id === activeExpandedId || 
        w.workoutId === activeExpandedId || 
        w.programId === activeExpandedId ||
        w.id === resolveProjectedProgramId(activeExpandedId)
      );
      if (targetWorkout) {
        const prog = programs.find(p => p.id === targetWorkout.programId || p.id === resolveProjectedProgramId(targetWorkout.programId));
        targetExercises = targetWorkout.overriddenExercises || prog?.exercises || targetWorkout.exercises || [];
      } else {
        const targetProgId = resolveProjectedProgramId(activeExpandedId);
        const prog = programs.find(p => p.id === targetProgId || p.id === activeExpandedId);
        targetExercises = prog?.exercises || [];
      }
    }

    if (targetExercises.length === 0) {
      todayWorkouts.forEach(w => {
        const prog = programs.find(p => p.id === w.programId || p.id === resolveProjectedProgramId(w.programId));
        const exs = w.overriddenExercises || prog?.exercises || w.exercises || [];
        targetExercises.push(...exs);
      });
    }

    if (chartType !== 'muscle') {
      targetExercises.forEach(ex => {
        const libEx = exerciseLibrary.find(e => e.id === ex.id || e.id === ex.originalId || e.name?.toLowerCase() === ex.name?.toLowerCase()) || ex;
        if (libEx?.name) activeItems.push(libEx.name);
      });
    } else {
      const muscleFreq = {};
      targetExercises.forEach(ex => {
        const libEx = exerciseLibrary.find(e => e.id === ex.id || e.id === ex.originalId || e.name?.toLowerCase() === ex.name?.toLowerCase()) || defaultMasterExercises.find(e => e.id === ex.id || e.name?.toLowerCase() === ex.name?.toLowerCase()) || ex;
        const targets = Array.isArray(libEx?.target) ? libEx.target : (libEx?.target ? [libEx.target] : ['Lainnya']);
        targets.forEach(m => {
          if (typeof m === 'string' && m) {
            const mKey = normalizeMuscleKey(m);
            if (mKey !== 'cardio' && mKey !== 'full_body') {
              muscleFreq[mKey] = (muscleFreq[mKey] || 0) + 1;
            }
          }
        });
      });
      activeItems = Object.keys(muscleFreq).sort((a, b) => muscleFreq[b] - muscleFreq[a]);
    }

    activeItems = [...new Set(activeItems)].filter(item => chartDataObj.items.includes(item));

    if (activeItems.length > 0) {
      return activeItems.slice(0, 6);
    } else {
      return chartDataObj.items.slice(0, 6);
    }
  }, [customLinesByType, chartType, chartDataObj, activePlanIds, programs, exerciseLibrary, history, selectedDate, expandedSessions]);

  // Pinch-to-zoom logic
  const [pointWidth, setPointWidth] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_prog_pointWidth');
          if (saved) return Number(saved);
      } catch(e) {}
      return 55;
  });
  useEffect(() => { localStorage.setItem('lyfit_prog_pointWidth', pointWidth); }, [pointWidth]);
  const touchState = useRef({ initialDist: 0, initialPointWidth: 55, pinchRatio: 0, scrollRelCenterX: 0 });
  const scrollTarget = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
     if(scrollRef.current && chartDataObj.data.length > 0 && effectiveActiveLines.length > 0) {
        if (isSubCard) {
            const savedScroll = localStorage.getItem('lyfit_prog_scrollLeft');
            if (savedScroll !== null) {
                scrollTarget.current = Number(savedScroll);
            }
            return;
        }

        const data = chartDataObj.data;
        
        let latestIdxWithData = -1;
        for (let i = data.length - 1; i >= 0; i--) {
            if (effectiveActiveLines.some(line => {
                const val = data[i][line];
                return val !== undefined && val !== null && val !== 0;
            })) {
                latestIdxWithData = i;
                break;
            }
        }
        
        if (latestIdxWithData !== -1) {
             const latestDateObj = new Date(data[latestIdxWithData].rawDate);
             const oneMonthAgo = new Date(latestDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
             const oneMonthAgoStr = getLocalYMD(oneMonthAgo);

             let startIdx = latestIdxWithData;
             while (startIdx > 0 && data[startIdx - 1].rawDate >= oneMonthAgoStr) {
                 startIdx--;
             }

             const numPoints = latestIdxWithData - startIdx + 1;
             const clientW = scrollRef.current.clientWidth || (window.innerWidth - 40);
             
             let newPointWidth = clientW / Math.max(1.5, numPoints); // Use 1.5 to leave slight padding if only 1 point
             if (newPointWidth > 200) newPointWidth = 200;
             if (newPointWidth < 15) newPointWidth = 15;

             setPointWidth(newPointWidth);
             // Scroll ke ujung kanan data terbaru (bukan ke awal range)
             scrollTarget.current = (latestIdxWithData + 1) * newPointWidth - clientW;
             if (scrollTarget.current < 0) scrollTarget.current = 0;
        } else {
             // Fallback: scroll ke kanan penuh
             const clientW = scrollRef.current.clientWidth || (window.innerWidth - 40);
             scrollTarget.current = Math.max(0, (data.length * pointWidth) - clientW);
        }
      }
   }, [chartDataObj, selectedDate, effectiveActiveLines]);

  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);

  const allDisplayItems = useMemo(() => {
     return [...new Set([...effectiveActiveLines, ...chartDataObj.items])];
  }, [effectiveActiveLines, chartDataObj.items]);

  const yDomain = useMemo(() => {
      if (chartDataObj.data.length === 0) return ['auto', 'auto'];
      
      let min = Infinity;
      let max = -Infinity;
      chartDataObj.data.forEach(d => {
          effectiveActiveLines.forEach(key => {
              let val = d[key];
              if (val !== undefined && val !== null) {
                  val = Number(val);
                  if (!isNaN(val)) {
                      if (val < min) min = val;
                      if (val > max) max = val;
                  }
              }
          });
      });
      
      if (min === Infinity || max === -Infinity) {
          return ['auto', 'auto'];
      } else {
          const diff = max - min;
          if (diff === 0) {
              return [Math.floor(Math.max(0, min - 10)), Math.ceil(max + 10)];
          } else {
              return [Math.floor(Math.max(0, min - diff * 0.1)), Math.ceil(max + diff * 0.1)];
          }
      }
  }, [chartDataObj.data, effectiveActiveLines]);

  const handleScroll = () => {
      if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
              if (scrollRef.current) {
                  localStorage.setItem('lyfit_prog_scrollLeft', scrollRef.current.scrollLeft);
              }
              rafRef.current = null;
          });
      }
  };

  // Agar zoom tetap mulus walau jumlah data sedikit
  const calculateChartWidth = (pw) => {
      const bWidth = window.innerWidth - 112; 
      const scaledBaseWidth = bWidth * (pw / 55);
      return Math.max(chartDataObj.data.length * pw, scaledBaseWidth);
  };

  const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          
          const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const rect = scrollRef.current.getBoundingClientRect();
          const scrollRelCenterX = pinchCenterX - rect.left;
          
          const currentScrollLeft = scrollRef.current.scrollLeft;
          const currentChartWidth = calculateChartWidth(pointWidth);
          
          const pinchRatio = (scrollRelCenterX + currentScrollLeft) / currentChartWidth;
          
          touchState.current = { initialDist: dist, initialPointWidth: pointWidth, pinchRatio, scrollRelCenterX };
      }
  };

  const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          const scale = dist / touchState.current.initialDist;
          let newWidth = touchState.current.initialPointWidth * scale;
          if (newWidth < 15) newWidth = 15;
          if (newWidth > 200) newWidth = 200;
          setPointWidth(newWidth);
          
          const nextChartWidth = calculateChartWidth(newWidth);
          const newPinchAbsX = touchState.current.pinchRatio * nextChartWidth;
          scrollTarget.current = newPinchAbsX - touchState.current.scrollRelCenterX;
      }
  };

  useEffect(() => {
     if (scrollTarget.current !== null && scrollRef.current) {
         scrollRef.current.scrollLeft = scrollTarget.current;
         scrollTarget.current = null;
     }
  }, [pointWidth]);

  const chartWidth = calculateChartWidth(pointWidth);

  const [limitHintVisible, setLimitHintVisible] = useState(false);
  const limitHintTimeoutRef = useRef(null);
  useEffect(() => () => { if (limitHintTimeoutRef.current) clearTimeout(limitHintTimeoutRef.current); }, []);

  const toggleChartLine = (item) => {
    playSoundEffect('click', soundEnabled);
    const currentActive = effectiveActiveLines.filter(it => chartDataObj.items.includes(it));
    if (currentActive.includes(item)) {
      const next = currentActive.filter(i => i !== item);
      setCustomLinesByType(prev => ({ ...prev, [chartType]: next }));
    } else {
      if (currentActive.length >= 6) {
        setLimitHintVisible(true);
        if (limitHintTimeoutRef.current) clearTimeout(limitHintTimeoutRef.current);
        limitHintTimeoutRef.current = setTimeout(() => setLimitHintVisible(false), 2000);
        return;
      }
      const next = [...currentActive, item];
      setCustomLinesByType(prev => ({ ...prev, [chartType]: next }));
    }
  };

  const isImp = units?.weight === 'lbs';
  const [activePrModal, setActivePrModal] = useState(null);

  useEffect(() => {
    if (activePrModal) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [activePrModal]);

  const prData = useMemo(() => {
    if (!history) return null;
    const lookup = {};
    defaultMasterExercises.forEach(ex => { if (ex?.id) lookup[ex.id] = ex; });
    (exerciseLibrary || []).forEach(ex => { if (ex?.id) lookup[ex.id] = ex; });
    (programs || []).forEach(p => (p.exercises || []).forEach(ex => { if (ex?.id) lookup[ex.id] = ex; }));
    return calculatePersonalRecords(history, lookup);
  }, [history, exerciseLibrary, programs]);

  return (
    <div className={`${!isSubCard ? 'px-4 pt-4 pb-1' : ''} animate-in fade-in duration-300`}>
        {!isSubCard && (
        <div className="flex justify-between items-center mb-3">
           <h3 className={`h2 ${t.textMain}`}>Progres Latihan</h3>
        </div>
        )}

        {/* High-Contrast PR Pill Row on Dashboard */}
        {!isSubCard && prData && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* BIG 3 CARD */}
            <button
              onClick={() => { playSoundEffect('click', soundEnabled); setActivePrModal('big3'); }}
              className="p-3 rounded-2xl flex flex-col justify-center text-left transition-all active:scale-95 bg-black/40 dark:bg-black/45 backdrop-blur-md shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Big 3</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-black text-white">
                  {prData.big3.total > 0 ? prData.big3.total : '-'}
                </span>
                {prData.big3.total > 0 && <span className="text-[10px] font-bold text-slate-300">kg</span>}
              </div>
            </button>

            {/* MAX SESI CARD */}
            <button
              onClick={() => { playSoundEffect('click', soundEnabled); setActivePrModal('volume'); }}
              className="p-3 rounded-2xl flex flex-col justify-center text-left transition-all active:scale-95 bg-black/40 dark:bg-black/45 backdrop-blur-md shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Max Sesi</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-black text-white">
                  {prData.maxSessionVolume.volumeKg >= 1000 
                    ? (prData.maxSessionVolume.volumeKg / 1000).toFixed(1) 
                    : (prData.maxSessionVolume.volumeKg > 0 ? prData.maxSessionVolume.volumeKg : '-')}
                </span>
                {prData.maxSessionVolume.volumeKg > 0 && (
                  <span className="text-[10px] font-bold text-slate-300">
                    {prData.maxSessionVolume.volumeKg >= 1000 ? 'Ton' : 'kg'}
                  </span>
                )}
              </div>
            </button>

            {/* KONSISTENSI CARD */}
            <button
              onClick={() => { playSoundEffect('click', soundEnabled); setActivePrModal('streak'); }}
              className="p-3 rounded-2xl flex flex-col justify-center text-left transition-all active:scale-95 bg-black/40 dark:bg-black/45 backdrop-blur-md shadow-sm"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Konsistensi</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-black text-white">
                  {prData.longestWeeklyStreak > 0 ? prData.longestWeeklyStreak : '-'}
                </span>
                {prData.longestWeeklyStreak > 0 && <span className="text-[10px] font-bold text-slate-300">Minggu</span>}
              </div>
            </button>
          </div>
        )}

        {/* PR Detail Modal */}
        {activePrModal && createPortal(
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xl animate-in fade-in overscroll-contain touch-none"
            onClick={() => setActivePrModal(null)}
          >
            <div 
              className="w-full max-w-md bg-slate-900/60 dark:bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-3xl p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="pb-3 border-b border-white/10 mb-4">
                <h4 className="text-base font-black text-white">
                  {activePrModal === 'big3' && 'Rincian Big 3 (Estimasi 1RM)'}
                  {activePrModal === 'volume' && 'Rekor Tonase 1 Sesi'}
                  {activePrModal === 'streak' && 'Konsistensi Mingguan'}
                </h4>
              </div>

              {/* Content for Big 3 */}
              {activePrModal === 'big3' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Big 3</span>
                    <span className="text-3xl font-black text-blue-400">{prData.big3.total} kg</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Bench Press (Dada)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.bench.name || 'Flat Bench Press'}
                          {prData.big3.bench.date && ` • ${new Date(prData.big3.bench.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.bench.weight1RM > 0 ? `${prData.big3.bench.weight1RM} kg` : '-'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Squat (Paha & Kaki)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.squat.name || 'Barbell Squat'}
                          {prData.big3.squat.date && ` • ${new Date(prData.big3.squat.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.squat.weight1RM > 0 ? `${prData.big3.squat.weight1RM} kg` : '-'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-white">Deadlift (Punggung Bawah & Posterior)</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prData.big3.deadlift.name || 'Deadlift'}
                          {prData.big3.deadlift.date && ` • ${new Date(prData.big3.deadlift.date + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-blue-400 shrink-0 whitespace-nowrap">
                        {prData.big3.deadlift.weight1RM > 0 ? `${prData.big3.deadlift.weight1RM} kg` : '-'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-400 mt-3 pt-2 border-t border-white/10">
                    * 1RM (One-Rep Max): Estimasi beban maksimal 1 repetisi berdasarkan set terberat Anda (rumus Epley).
                  </p>
                </div>
              )}

              {/* Content for Volume / Tonase */}
              {activePrModal === 'volume' && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 text-center">
                    <div className="text-3xl font-black text-blue-400">
                      {prData.maxSessionVolume.volumeKg >= 1000 
                        ? `${(prData.maxSessionVolume.volumeKg / 1000).toFixed(1)} Ton` 
                        : `${prData.maxSessionVolume.volumeKg} kg`}
                    </div>
                    {prData.maxSessionVolume.volumeKg > 0 && (
                      <div className="inline-flex items-center justify-center gap-1 px-3 py-1 mt-2 rounded-full bg-blue-500/20 backdrop-blur-sm text-blue-300 text-xs font-bold whitespace-nowrap">
                        Setara ~{prData.maxSessionVolume.analogy}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sesi Latihan:</span>
                      <span className="font-bold text-white">{prData.maxSessionVolume.workoutName || 'Sesi Latihan'}</span>
                    </div>
                    {prData.maxSessionVolume.date && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tanggal:</span>
                        <span className="font-bold text-white">
                          {new Date(prData.maxSessionVolume.date + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <b className="text-slate-200">Tonase</b> adalah akumulasi total (beban × repetisi) dari seluruh set dalam 1 sesi untuk mengukur kapasitas kerja (<i className="text-slate-300">work capacity</i>) otot Anda.
                    </p>
                  </div>
                </div>
              )}

              {/* Content for Streak */}
              {activePrModal === 'streak' && (
                <div className="space-y-3">
                  <div className="p-5 rounded-2xl bg-blue-500/10 backdrop-blur-md border border-blue-400/25 text-center">
                    <div className="text-3xl font-black text-blue-400">
                      {prData.longestWeeklyStreak} Minggu Beruntun
                    </div>
                    <p className="text-xs font-bold text-blue-300 mt-1">
                      Disiplin target mingguan
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <b className="text-slate-200">Konsistensi Mingguan</b> mengukur kepatuhan jadwal tanpa risiko <i>overtraining</i>. Hari istirahat (<i>Rest Day</i>) tetap menjaga rangkaian streak aktif.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
        
        {!isSubCard && (
        <div className={`mb-5 border-b border-dashed ${t.border} pb-5 no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
            <div className={`relative flex w-full p-1 rounded-full ${t.btnBg}`}>
               <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: chartType === 'exercise' ? 'translateX(0)' : 'translateX(100%)', left: '4px' }}></div>

               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('exercise');}} className={`flex-1 py-2 rounded-full body-md font-bold relative z-10 transition-colors duration-300 ${chartType === 'exercise' ? 'text-white' : t.textMuted}`}>{lang?.progExercise || 'Per Latihan'}</button>
               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('muscle');}} className={`flex-1 py-2 rounded-full body-md font-bold relative z-10 transition-colors duration-300 ${chartType === 'muscle' ? 'text-white' : t.textMuted}`}>{lang?.progMuscle || 'Per Otot'}</button>
           </div>
        </div>
        )}
        
        <div className={`flex ${isSubCard ? 'mb-1' : 'mb-5'} ${theme === 'dark' ? 'bg-black/40' : 'bg-black/5'} backdrop-blur-md rounded-2xl relative no-swipe`} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
          
          {chartDataObj.data.length > 0 && (
              <div className={`w-12 shrink-0 pointer-events-none flex items-center border-r border-slate-500/10 z-10 bg-transparent py-3`}>
                    <LineChart width={48} height={isSubCard ? 250 : 288} data={chartDataObj.data} margin={{ top: 5, right: 0, left: 4, bottom: 5 }}>
                       <YAxis stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} width={40} domain={yDomain} allowDataOverflow={true} tickFormatter={(v) => v > 999 ? (v/1000).toFixed(1)+'k' : v} />
                       {allDisplayItems.map((item, idx) => ( effectiveActiveLines.includes(item) && <Line key={item} type="monotone" dataKey={item} stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} /> ))}
                    </LineChart>
              </div>
          )}

          <div ref={scrollRef} 
               onScroll={!isSubCard ? handleScroll : undefined}
               onTouchStartCapture={!isSubCard ? handleTouchStart : undefined} 
               onTouchMoveCapture={!isSubCard ? handleTouchMove : undefined}
               className={`flex-1 overflow-x-auto scrollbar-hide touch-pan-x p-3 pl-0 ${isSubCard ? 'pointer-events-none' : ''}`} 
               style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
            {chartDataObj.data.length > 0 ? (
               <div style={{ width: `${chartWidth}px`, height: isSubCard ? '250px' : '288px' }}>
                <LineChart width={chartWidth} height={isSubCard ? 250 : 288} data={chartDataObj.data} style={{ outline: 'none' }}>
                  <defs>
                      <filter id="glowProgress" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                          </feMerge>
                      </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#3f3f46' : '#cbd5e1'} vertical={false} />
                  <Tooltip 
                     formatter={(value, name, props) => {
                         let unit = '';
                         if (chartType === 'muscle') {
                             unit = isImp ? ' lbs' : ' kg';
                         } else {
                             let foundEx = exerciseLibrary?.find(e => e.name === props.dataKey);
                             if (!foundEx && programs) {
                                 for (let p of programs) {
                                     const ex = p.exercises?.find(e => e.name === props.dataKey);
                                     if (ex) { foundEx = ex; break; }
                                 }
                             }
                             if (foundEx) {
                                 if (foundEx.type === 'time') unit = ' s';
                                 else if (foundEx.type === 'reps') unit = ' reps';
                                 else unit = isImp ? ' lbs (10RM)' : ' kg (10RM)';
                             } else {
                                 unit = isImp ? ' lbs (10RM)' : ' kg (10RM)';
                             }
                         }
                         return [`${value}${unit}`, name];
                     }}
                     cursor={{ stroke: theme === 'dark' ? '#52525b' : '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }} 
                     contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }} 
                     wrapperStyle={{ zIndex: 100 }} 
                     itemStyle={{ padding: 0, margin: 0, marginTop: '4px', whiteSpace: 'normal' }} 
                     labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                  />
                  <XAxis dataKey="date" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} padding={{ left: 20, right: 20 }} interval={Math.max(0, Math.ceil(50 / pointWidth) - 1)} />
                  <YAxis hide={true} domain={yDomain} allowDataOverflow={true} />
                  {allDisplayItems.map((item, idx) => ( effectiveActiveLines.includes(item) && <Line key={item} type="monotone" name={chartType === 'muscle' ? formatTarget(item, lang?.id) : item} dataKey={item} stroke={chartColors[idx % chartColors.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: chartColors[idx % chartColors.length] }} connectNulls={true} isAnimationActive={false} /> ))}
                </LineChart>
               </div>
            ) : ( 
              <div className="w-full h-72 flex flex-col items-center justify-center body-md opacity-60 text-center px-4">
                 <span>Tidak ada data, atur program dan rekam latihanmu sekarang.</span>
              </div>
            )}
          </div>
        </div>

        {isSubCard ? (
             <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-0 mb-0">
                 {allDisplayItems.filter(item => effectiveActiveLines.includes(item)).map((item, idx) => (
                     <div key={item} className="flex items-center space-x-1.5">
                         <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: chartColors[allDisplayItems.indexOf(item) % chartColors.length] }}></div>
                         <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{chartType === 'muscle' ? formatTarget(item, lang?.id) : item}</span>
                     </div>
                 ))}
             </div>
        ) : (
            <div className="no-swipe">
            {/* Tinggi selalu dicadangkan (toggle lewat opacity, bukan conditional render) biar
                ukuran kartu gak goyang pas hint muncul/hilang. */}
            <div className={`text-[10px] font-bold mb-1.5 h-3.5 leading-none ${t.textMuted} transition-opacity duration-200 ${limitHintVisible ? 'opacity-100' : 'opacity-0'}`}>
                Maksimal pilih 6 item — matikan salah satu dulu.
            </div>
            <div key={chartType} className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-2 hide-scrollbar auto-cols-max" style={{ WebkitOverflowScrolling: 'touch' }} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
              {/* Aktif dikumpulkan ke kiri, urutannya ngikutin urutan aktivasi di effectiveActiveLines
                  (baru diaktifkan = ditaruh paling akhir di grup aktif = kanan-bawah). Sisanya
                  (yang belum aktif) tetap di urutan asli chartDataObj.items. Warna tetap dikunci
                  ke index asli biar konsisten sama warna garis di grafik. */}
              {[
                ...effectiveActiveLines.filter(item => allDisplayItems.includes(item)),
                ...allDisplayItems.filter(item => !effectiveActiveLines.includes(item))
              ].map((item) => {
                 const idx = allDisplayItems.indexOf(item);
                 const isActive = effectiveActiveLines.includes(item);
                 return (
                   <button key={item} onClick={() => toggleChartLine(item)} className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8" style={{ backgroundColor: isActive ? chartColors[idx % chartColors.length] : 'transparent', borderColor: chartColors[idx % chartColors.length], color: isActive ? '#fff' : chartColors[idx % chartColors.length], opacity: isActive ? 1 : 0.5 }}>
                      {chartType === 'muscle' ? formatTarget(item, lang?.id) : item}
                   </button>
                 )
              })}
            </div>
            
            {/* Keterangan miring di bawah toggle2 */}
            <p className={`mt-2 text-[10.5px] italic font-medium ${t.textMuted}`}>
              {chartType === 'exercise' 
                ? '* Berdasarkan estimasi 10RM dan repetisi.' 
                : '* Berdasarkan total volume beban (kg × reps).'}
            </p>
            </div>
        )}
        
    </div>
  );
};

export default ProgressTab;