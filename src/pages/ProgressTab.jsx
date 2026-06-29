import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getLocalYMD, formatTarget, normalizeMuscleKey } from '../data/constants';

const ProgressTab = ({ t, lang, language, theme, history, programs, exerciseLibrary, soundEnabled, playSoundEffect, selectedDate, units, activePlanIds, isSubCard = false }) => {
  const [chartType, setChartType] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_prog_chart_type');
          if (saved) return saved;
      } catch(e) {}
      return 'exercise';
  });
  
  const [activeChartLines, setActiveChartLines] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_prog_chart_lines');
          if (saved) return JSON.parse(saved);
      } catch(e) {}
      return [];
  });

  useEffect(() => {
      localStorage.setItem('lyfit_prog_chart_type', chartType);
  }, [chartType]);
  
  useEffect(() => {
      localStorage.setItem('lyfit_prog_chart_lines', JSON.stringify(activeChartLines));
  }, [activeChartLines]);

  const chartColors = theme === 'dark' 
    ? ['#41759b', '#B79347', '#93a6b2', '#A7967D', '#81571E', '#294c65', '#CBB989', '#738a98', '#957c4c', '#5b829e', '#c3a870']
    : ['#2563eb', '#1e3a8a', '#0891b2', '#4f46e5', '#334155', '#d97706', '#0284c7', '#475569', '#1d4ed8', '#0f172a', '#b45309'];

  // ==========================================
  // MESIN PERHITUNGAN GRAFIK (DIROMBAK UNTUK DETAIL PER SET)
  // ==========================================
  const chartDataObj = useMemo(() => {
    const isMusc = chartType === 'muscle';
    const itemsSet = new Set();
    const itemFreq = {};
    const dataPoints = []; // Menggunakan Array datar agar titiknya berurutan sesuai set

    const exLookup = {};
    programs.forEach(p => p.exercises.forEach(ex => exLookup[ex.id] = ex));
    exerciseLibrary.forEach(ex => exLookup[ex.id] = ex); 
    
    Object.values(history).forEach(d => {
      d?.workouts?.forEach(w => {
         if (w.exercises) w.exercises.forEach(ex => exLookup[ex.id] = ex);
         if (w.overriddenExercises) w.overriddenExercises.forEach(ex => exLookup[ex.id] = ex);
      });
      if (d?._activeSession?.extraExercises) {
         d._activeSession.extraExercises.forEach(ex => exLookup[ex.id] = ex);
      }
    });

    const now = new Date();
    // Allow all data instead of limiting to 90 days
    const startDate = new Date(now.getTime() - (5000 * 86400000)); // ~13 years (effectively no limit)
    const startStr = getLocalYMD(startDate);

    // Ambil history yang sudah selesai saja
    const filteredHistory = [];
    Object.entries(history).forEach(([dateStr, data]) => {
      if (dateStr >= startStr && data?.workouts) {
        data.workouts.filter(w => w.status === 'completed').forEach(w => {
           filteredHistory.push({ dateStr, dayData: w });
        });
      } else if (dateStr >= startStr && data?.status === 'completed') {
        filteredHistory.push({ dateStr, dayData: data });
      }
      
      // Tambahkan progress aktif (sementara) yang sedang berjalan hari ini / terpilih
      if (dateStr >= startStr && data?._activeSession?.exerciseLogs && Object.keys(data._activeSession.exerciseLogs).length > 0) {
        filteredHistory.push({ dateStr, dayData: { log: data._activeSession.exerciseLogs } });
      }
    });
    filteredHistory.sort((a, b) => a.dateStr.localeCompare(b.dateStr));



    const aggregatedByDate = {};

    filteredHistory.forEach(({dateStr, dayData}) => {
      const dateObj = new Date(dateStr);
      const dateLabel = dateObj.toLocaleDateString(language==='ID'?'id-ID':'en-US', { day: 'numeric', month: 'short' });

      if (!aggregatedByDate[dateStr]) {
          aggregatedByDate[dateStr] = { date: dateLabel, rawDate: dateStr };
      }
      const point = aggregatedByDate[dateStr];

      const log = dayData.log || {};
      const eLogs = log.exerciseLogs ? log.exerciseLogs : log; 

      Object.keys(eLogs).forEach(exIdStr => {
          const sets = eLogs[exIdStr];
          const baseId = typeof exIdStr === 'string' && exIdStr.includes('-') ? Number(exIdStr.split('-')[0]) : Number(exIdStr);
          const ex = exLookup[baseId];
          
          if (ex && sets) {
              const exName = ex.name;
              const exType = ex.type || 'weight';
              const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
              const isImp = units?.weight === 'lbs';
              
              Object.values(sets).forEach(s => {
                  if (s && s.done && !s.skipped) {
                      if (isMusc) {
                          let volume = 0;
                          if (exType === 'weight') volume = (Number(s.w) * Number(s.r)) * (isImp ? 2.20462 : 1);
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
                          if (exType === 'weight') val = Number(s.w) * (isImp ? 2.20462 : 1);
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
                    const baseId = typeof exIdStr === 'string' && exIdStr.includes('-') ? Number(exIdStr.split('-')[0]) : Number(exIdStr);
                    const ex = exLookup[baseId];
                    if (ex) {
                        if (isMusc) {
                           const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
                           exTargets.forEach(t => recentItems.add(normalizeMuscleKey(t)));
                        } else {
                           recentItems.add(ex.name);
                        }
                    }
                });
                
                // Selalu ekstrak otot dari program yang direncanakan (baik sudah ada progres maupun belum)
                if (w.programId && w.programId !== 'adhoc') {
                   const prog = programs.find(p => p.id === w.programId);
                   if (prog && prog.exercises) {
                       prog.exercises.forEach(exObj => {
                           const ex = exLookup[exObj.id];
                           if (ex) {
                              if (isMusc) {
                                 const exTargets = Array.isArray(ex.target) ? ex.target : [ex.target || 'Lainnya'];
                                 exTargets.forEach(t => recentItems.add(normalizeMuscleKey(t)));
                              } else {
                                 recentItems.add(ex.name);
                              }
                           }
                       });
                   }
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

  const scrollRef = useRef(null);

  useEffect(() => {
     if(scrollRef.current && chartDataObj.data.length > 0 && activeChartLines.length > 0) {
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
            if (activeChartLines.some(line => {
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
             scrollTarget.current = startIdx * newPointWidth;
        } else {
             // Fallback
             const targetDate = selectedDate || getLocalYMD(new Date());
             let idx = data.findIndex(d => d.rawDate === targetDate);
             if (idx === -1) idx = data.length - 1;
             
             scrollTarget.current = Math.max(0, (idx * pointWidth) - (scrollRef.current.clientWidth / 2));
        }
     }
  }, [chartDataObj, selectedDate, activeChartLines]);

  useEffect(() => { 
    if (isSubCard) return;
    
    let activeItems = [];
    if (activePlanIds && activePlanIds.length > 0) {
      const activeProgs = programs.filter(p => activePlanIds.includes(p.planId || 'custom'));
      activeProgs.forEach(prog => {
        prog.exercises?.forEach(ex => {
          if (chartType === 'exercise') {
            activeItems.push(ex.name);
          } else if (chartType === 'muscle') {
            const libEx = exerciseLibrary.find(e => e.id === ex.id);
            if (libEx && libEx.target) {
              const targets = Array.isArray(libEx.target) ? libEx.target : [libEx.target];
              targets.forEach(muscle => {
                if (typeof muscle === 'string' && muscle) {
                  const mKey = normalizeMuscleKey(muscle);
                  activeItems.push(formatTarget(mKey, lang.progress));
                }
              });
            }
          }
        });
      });
    }
    
    // Ensure uniqueness
    activeItems = [...new Set(activeItems)];
    
    // Filter to only include items that actually exist in chartDataObj.items
    const validActiveItems = activeItems.filter(item => chartDataObj.items.includes(item));

    if (validActiveItems.length > 0) {
        setActiveChartLines(validActiveItems.slice(0, 6));
    } else {
        // Fallback to top 6 most frequent/recent items
        setActiveChartLines(chartDataObj.items.slice(0, 6)); 
    }
  }, [chartType, chartDataObj, activePlanIds, programs, exerciseLibrary, lang.progress]);

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

  const [yDomain, setYDomain] = useState(['auto', 'auto']);
  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);

  const updateYDomain = useCallback(() => {
      if (!scrollRef.current || chartDataObj.data.length === 0) return;
      const { scrollLeft, clientWidth } = scrollRef.current;
      const pw = pointWidthRef.current;
      
      const startIndex = Math.max(0, Math.floor(scrollLeft / pw));
      const endIndex = Math.min(chartDataObj.data.length - 1, Math.ceil((scrollLeft + clientWidth) / pw));
      
      const visibleData = chartDataObj.data.slice(startIndex, endIndex + 1);
      
      let min = Infinity;
      let max = -Infinity;
      visibleData.forEach(d => {
          activeChartLines.forEach(key => {
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
          setYDomain(['auto', 'auto']);
      } else {
          const diff = max - min;
          if (diff === 0) {
              setYDomain([Math.floor(Math.max(0, min - 10)), Math.ceil(max + 10)]);
          } else {
              setYDomain([Math.floor(Math.max(0, min - diff * 0.1)), Math.ceil(max + diff * 0.1)]);
          }
      }
  }, [chartDataObj.data, activeChartLines]);

  const handleScroll = () => {
      if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
              updateYDomain();
              if (scrollRef.current) {
                  localStorage.setItem('lyfit_prog_scrollLeft', scrollRef.current.scrollLeft);
              }
              rafRef.current = null;
          });
      }
  };

  useEffect(() => {
      updateYDomain();
  }, [updateYDomain, pointWidth]);

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

  const toggleChartLine = (item) => { 
    playSoundEffect('click', soundEnabled); 
    setActiveChartLines(prev => {
        if (prev.includes(item)) return prev.filter(i => i !== item);
        if (prev.length >= 6) return [...prev.slice(1), item];
        return [...prev, item];
    }); 
  };

  const isImp = units?.weight === 'lbs';

  return (
    <div className={`${!isSubCard ? 'px-5 pt-5 pb-1' : ''} animate-in fade-in duration-300`}>
        {!isSubCard && (
        <div className="flex justify-between items-center mb-5">
           <h3 className={`h3 ${t.textMain}`}>Progres Latihan</h3>
        </div>
        )}
        
        {!isSubCard && (
        <div className={`mb-5 border-b border-dashed ${t.border} pb-5`}>
           <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg}`}>
               <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: chartType === 'exercise' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
               
               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('exercise');}} className={`flex-1 py-3 rounded-full body-lg font-black relative z-10 transition-colors duration-300 ${chartType === 'exercise' ? 'text-white' : t.textMuted}`}>{lang?.progExercise || 'Per Latihan'}</button>
               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('muscle');}} className={`flex-1 py-3 rounded-full body-lg font-black relative z-10 transition-colors duration-300 ${chartType === 'muscle' ? 'text-white' : t.textMuted}`}>{lang?.progMuscle || 'Per Otot'}</button>
           </div>
        </div>
        )}
        
        <div className={`flex ${isSubCard ? 'mb-1' : 'mb-5'} bg-black/5 rounded-2xl relative`}>
          
          {chartDataObj.data.length > 0 && (
              <div className={`w-12 shrink-0 pointer-events-none flex items-center border-r border-slate-500/10 z-10 bg-transparent py-3`}>
                    <LineChart width={48} height={isSubCard ? 250 : 288} data={chartDataObj.data} margin={{ top: 5, right: 0, left: 4, bottom: 5 }}>
                       <YAxis stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} width={40} domain={yDomain} allowDataOverflow={true} tickFormatter={(v) => v > 999 ? (v/1000).toFixed(1)+'k' : v} />
                       {chartDataObj.items.map((item, idx) => ( activeChartLines.includes(item) && <Line key={item} type="monotone" dataKey={item} stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} /> ))}
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
                                 else unit = isImp ? ' lbs' : ' kg';
                             } else {
                                 unit = isImp ? ' lbs' : ' kg';
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
                  <XAxis dataKey="date" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} padding={{ left: 20, right: 20 }} />
                  <YAxis hide={true} domain={yDomain} allowDataOverflow={true} />
                  {chartDataObj.items.map((item, idx) => ( activeChartLines.includes(item) && <Line key={item} type="monotone" name={chartType === 'muscle' ? formatTarget(item, lang?.id) : item} dataKey={item} stroke={chartColors[idx % chartColors.length]} strokeWidth={2} dot={{ r: 2, strokeWidth: 0, fill: chartColors[idx % chartColors.length] }} activeDot={{ r: 4, strokeWidth: 0, fill: chartColors[idx % chartColors.length] }} connectNulls={true} isAnimationActive={false} /> ))}
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
                 {chartDataObj.items.filter(item => activeChartLines.includes(item)).map((item, idx) => (
                     <div key={item} className="flex items-center space-x-1.5">
                         <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: chartColors[chartDataObj.items.indexOf(item) % chartColors.length] }}></div>
                         <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{chartType === 'muscle' ? formatTarget(item, lang?.id) : item}</span>
                     </div>
                 ))}
             </div>
        ) : (
            <div key={chartType} className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-2 hide-scrollbar auto-cols-max" style={{ WebkitOverflowScrolling: 'touch' }}>
              {chartDataObj.items.map((item, idx) => {
                 const isActive = activeChartLines.includes(item);
                 return (
                   <button key={item} onClick={() => toggleChartLine(item)} className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8" style={{ backgroundColor: isActive ? chartColors[idx % chartColors.length] : 'transparent', borderColor: chartColors[idx % chartColors.length], color: isActive ? '#fff' : chartColors[idx % chartColors.length], opacity: isActive ? 1 : 0.5 }}>
                      {chartType === 'muscle' ? formatTarget(item, lang?.id) : item}
                   </button>
                 )
              })}
            </div>
        )}
        
    </div>
  );
};

export default ProgressTab;