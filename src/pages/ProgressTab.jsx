import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getLocalYMD, formatTarget, normalizeMuscleKey } from '../data/constants';

const ProgressTab = ({ t, lang, language, theme, history, programs, exerciseLibrary, soundEnabled, playSoundEffect, selectedDate }) => {
  const [chartType, setChartType] = useState('exercise');
  const [activeChartLines, setActiveChartLines] = useState([]);

  const chartColors = ['#41759b', '#B79347', '#93a6b2', '#A7967D', '#81571E', '#294c65', '#CBB989', '#738a98', '#957c4c', '#5b829e', '#c3a870'];

  // ==========================================
  // MESIN PERHITUNGAN GRAFIK (DIROMBAK UNTUK DETAIL PER SET)
  // ==========================================
  const chartDataObj = useMemo(() => {
    const isMusc = chartType === 'muscle';
    const itemsSet = new Set();
    const dataPoints = []; // Menggunakan Array datar agar titiknya berurutan sesuai set

    const exLookup = {};
    programs.forEach(p => p.exercises.forEach(ex => exLookup[ex.id] = ex));
    exerciseLibrary.forEach(ex => exLookup[ex.id] = ex); 

    const now = new Date();
    const msPerDay = 86400000;
    let daysLimit = 90; // Fixed 90 days for Brush scroll
    const startDate = new Date(now.getTime() - (daysLimit * msPerDay));
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
              
              Object.values(sets).forEach(s => {
                  if (s && s.done && !s.skipped) {
                      if (isMusc) {
                          let volume = 0;
                          if (exType === 'weight') volume = (Number(s.w) * Number(s.r));
                          else if (exType === 'reps') volume = Number(s.r);
                          else if (exType === 'time') volume = Number(s.d);

                          if (volume > 0) {
                              exTargets.forEach(muscle => { 
                                  const mKey = normalizeMuscleKey(muscle);
                                  itemsSet.add(mKey); 
                                  point[mKey] = (point[mKey] || 0) + volume; 
                              });
                          }
                      } else {
                          let val = 0;
                          if (exType === 'weight') val = Number(s.w);
                          else if (exType === 'reps') val = Number(s.r);
                          else if (exType === 'time') val = Number(s.d);

                          if (val > 0) {
                              itemsSet.add(exName);
                              point[exName] = Math.max((point[exName] || 0), val); 
                          }
                      }
                  }
              });
          }
      });
    });

    const finalDataPoints = Object.values(aggregatedByDate).sort((a,b) => a.rawDate.localeCompare(b.rawDate));
    
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

    return { data: finalDataPoints, items: Array.from(itemsSet), recentItems: Array.from(recentItems) };
  }, [chartType, language, history, programs, exerciseLibrary, selectedDate]);

  const scrollRef = useRef(null);

  useEffect(() => {
     if(scrollRef.current && chartDataObj.data.length > 0 && activeChartLines.length > 0) {
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
    if (chartDataObj.recentItems && chartDataObj.recentItems.length > 0) {
        setActiveChartLines(chartDataObj.recentItems);
    } else {
        setActiveChartLines(chartDataObj.items.slice(0, 3)); 
    }
  }, [chartType, chartDataObj]);

  // Pinch-to-zoom logic
  const [pointWidth, setPointWidth] = useState(55);
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
    setActiveChartLines(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]); 
  };

  return (
    <div className="px-5 pt-5 pb-1 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-5">
           <h3 className={`h3 ${t.textMain}`}>Progres Latihan</h3>
        </div>
        
        <div className={`mb-5 border-b border-dashed ${t.border} pb-5`}>
           <div className={`relative flex w-full p-1.5 rounded-full ${t.btnBg}`}>
               <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out ${t.bgAccent} shadow-sm`} style={{ transform: chartType === 'exercise' ? 'translateX(0)' : 'translateX(100%)', left: '6px' }}></div>
               
               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('exercise');}} className={`flex-1 py-3 rounded-full body-lg font-black relative z-10 transition-colors duration-300 ${chartType === 'exercise' ? 'text-white' : t.textMuted}`}>{lang.progExercise || 'Per Latihan'}</button>
               <button onClick={() => { playSoundEffect('click', soundEnabled); setChartType('muscle');}} className={`flex-1 py-3 rounded-full body-lg font-black relative z-10 transition-colors duration-300 ${chartType === 'muscle' ? 'text-white' : t.textMuted}`}>{lang.progMuscle || 'Per Otot'}</button>
           </div>
        </div>
        
        <div className="flex mb-5 bg-black/5 rounded-2xl relative">
          
          {chartDataObj.data.length > 0 && (
              <div className={`w-12 shrink-0 pointer-events-none flex items-center border-r border-slate-500/10 z-10 bg-transparent py-3`}>
                    <LineChart width={48} height={288} data={chartDataObj.data} margin={{ top: 5, right: 0, left: 4, bottom: 5 }}>
                       <YAxis stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} width={40} domain={yDomain} allowDataOverflow={true} tickFormatter={(v) => v > 999 ? (v/1000).toFixed(1)+'k' : v} />
                       {chartDataObj.items.map((item, idx) => ( activeChartLines.includes(item) && <Line key={item} type="monotone" dataKey={item} stroke="transparent" dot={false} activeDot={false} isAnimationActive={false} /> ))}
                    </LineChart>
              </div>
          )}

          <div ref={scrollRef} 
               onScroll={handleScroll}
               onTouchStartCapture={handleTouchStart} 
               onTouchMoveCapture={handleTouchMove}
               className="flex-1 overflow-x-auto scrollbar-hide touch-pan-x p-3 pl-0" 
               style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
            {chartDataObj.data.length > 0 ? (
               <div style={{ width: `${chartWidth}px`, height: '288px' }}>
                <LineChart width={chartWidth} height={288} data={chartDataObj.data} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e2e8f0'} vertical={false} />
                  <Tooltip cursor={{ stroke: theme === 'dark' ? '#52525b' : '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word' }} wrapperStyle={{ zIndex: 100 }} itemStyle={{ padding: 0, margin: 0, marginTop: '4px', whiteSpace: 'normal' }} labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <XAxis dataKey="date" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} padding={{ left: 20, right: 20 }} />
                  <YAxis hide={true} domain={yDomain} allowDataOverflow={true} />
                  {chartDataObj.items.map((item, idx) => ( activeChartLines.includes(item) && <Line key={item} type="monotone" name={chartType === 'muscle' ? formatTarget(item, lang?.id) : item} dataKey={item} stroke={chartColors[idx % chartColors.length]} strokeWidth={2} dot={{ r: 2, strokeWidth: 0, fill: chartColors[idx % chartColors.length] }} activeDot={{ r: 4, strokeWidth: 0, fill: chartColors[idx % chartColors.length] }} connectNulls={true} isAnimationActive={false} /> ))}
                </LineChart>
               </div>
            ) : ( 
              <div className="w-full h-72 flex items-center justify-center body-lg opacity-50">Tidak ada data</div> 
            )}
          </div>
        </div>

        <div className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x auto-cols-max" style={{ WebkitOverflowScrolling: 'touch' }}>
          {chartDataObj.items.length === 0 && <span className={`body-md ${t.textMuted} italic`}>Belum ada data.</span>}
          {chartDataObj.items.map((item, idx) => {
             const isActive = activeChartLines.includes(item); 
             const color = chartColors[idx % chartColors.length];
             return (
               <button key={item} onClick={() => toggleChartLine(item)} className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8" style={{ backgroundColor: isActive ? color : 'transparent', borderColor: color, color: isActive ? '#fff' : color, opacity: isActive ? 1 : 0.5 }}>
                 {chartType === 'muscle' ? formatTarget(item, lang?.id) : item}
               </button>
             )
          })}
        </div>
        
    </div>
  );
};

export default ProgressTab;