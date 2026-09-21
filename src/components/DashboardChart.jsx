import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getLocalYMD } from '../data/constants';
import { formatNumber } from '../utils/numberFormat';
import { dayBmr } from '../utils/bmr';

// Resolusi pinch-to-zoom bertingkat (sama persis dengan arsitektur VitalsChart):
// Zoom-in: detail harian (per hari)
// Zoom-out sedang: rata-rata per bulan (bisa melihat tren 1 tahun dalam satu layar penuh)
// Zoom-out maksimal: rata-rata per tahun (melihat progres jangka panjang tanpa scroll ribuan px)
const DAY_MIN_PW = 20;
const MONTH_MIN_PW = 10;

const monthKeyOf = (dateStr) => (dateStr ? dateStr.substring(0, 7) : ''); // 'YYYY-MM'
const yearKeyOf = (dateStr) => (dateStr ? dateStr.substring(0, 4) : '');  // 'YYYY'
const avg = (arr) => arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const round1 = (val) => val != null ? Number(Number(val).toFixed(1)) : null;
const roundInt = (val) => val != null ? Math.round(Number(val)) : null;

const DashboardChart = ({ t, theme, history, soundEnabled, playSoundEffect, onPointClick, unitSystem, units, language, userProfile, isSubCard = false }) => {
  const isImp = unitSystem === 'imperial' || units?.weight === 'lbs';
  const chartMetricsList = [
      { key: 'weight', label: 'Berat Badan', color: theme === 'dark' ? '#38bdf8' : '#0284c7' }, // Sky Blue
      { key: 'bodyFat', label: 'Kadar Lemak', color: theme === 'dark' ? '#60a5fa' : '#2563eb' }, // Lighter Blue
      { key: 'musclePercent', label: 'Kadar Otot', color: theme === 'dark' ? '#818cf8' : '#4f46e5' }, // Soft Indigo
      { key: 'visceralFat', label: 'Lemak Visceral', color: theme === 'dark' ? '#2dd4bf' : '#0d9488' }, // Teal
      { key: 'bmr', label: 'BMR', color: theme === 'dark' ? '#94a3b8' : '#64748b' }, // Slate
      { key: 'waist', label: 'Lingkar Perut', color: theme === 'dark' ? '#3b82f6' : '#1d4ed8' }, // Blue
  ];

  const [activeChartMetrics, setActiveChartMetrics] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_chart_metrics');
          if (saved) return JSON.parse(saved);
      } catch(e) {}
      return ['weight', 'bodyFat', 'musclePercent', 'visceralFat', 'waist'];
  });

  const pressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef(0);

  useEffect(() => () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);

  const soloChartMetric = (key) => {
    playSoundEffect('click', soundEnabled);
    setActiveChartMetrics(prev => {
      let newMetrics;
      if (prev.length === 1 && prev[0] === key) {
        newMetrics = ['weight', 'bodyFat', 'musclePercent', 'visceralFat', 'waist'];
      } else {
        newMetrics = [key];
      }
      localStorage.setItem('lyfit_chart_metrics', JSON.stringify(newMetrics));
      return newMetrics;
    });
  };

  const startPillPress = (key, e) => {
    const isTouch = e.type?.startsWith('touch');
    if (isTouch) {
      lastTouchTimeRef.current = Date.now();
    } else if (Date.now() - lastTouchTimeRef.current < 600) {
      return;
    }
    isLongPressRef.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      soloChartMetric(key);
    }, 450);
  };

  const movePillPress = (e) => {
    if (!pressTimerRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(clientX - startPosRef.current.x);
    const dy = Math.abs(clientY - startPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const endPillPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handlePillClick = (key) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    toggleChartMetric(key);
  };

  const toggleChartMetric = (key) => {
      playSoundEffect('click', soundEnabled);
      setActiveChartMetrics(prev => {
          const newMetrics = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
          localStorage.setItem('lyfit_chart_metrics', JSON.stringify(newMetrics));
          return newMetrics;
      });
  };

  // 1. Data mentah per hari
  const dailyPoints = useMemo(() => {
      const data = [];
      const bioEntries = [];
      const todayStr = getLocalYMD(new Date());
      Object.keys(history).forEach(dateStr => {
          if (history[dateStr]?.bioData && dateStr <= todayStr) {
              bioEntries.push({ dateStr, bioData: history[dateStr].bioData });
          }
      });
      bioEntries.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      bioEntries.forEach(entry => {
          const d = new Date(entry.dateStr);
          const histBio = entry.bioData;

          data.push({
              ts: d.getTime(),
              name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              dateFull: entry.dateStr,
              weight: histBio?.weight ? Number((isImp ? Number(histBio.weight) * 2.20462 : Number(histBio.weight)).toFixed(1)) : null,
              bodyFat: histBio?.bodyFat ? Number(histBio.bodyFat) : null,
              musclePercent: histBio?.musclePercent ? Number(histBio.musclePercent) : null,
              visceralFat: histBio?.visceralFat ? Number(histBio.visceralFat) : null,
              bmr: histBio?.weight || histBio?.bmr ? (dayBmr(histBio, userProfile) || null) : null,
              waist: histBio?.waist ? Number((isImp ? Number(histBio.waist) * 0.393701 : Number(histBio.waist)).toFixed(1)) : null,
          });
      });
      return data;
  }, [history, isImp, userProfile]);

  // 2. Data agregasi rata-rata per bulan
  const monthlyPoints = useMemo(() => {
      const byMonth = {};
      dailyPoints.forEach((p) => {
          const k = monthKeyOf(p.dateFull);
          if (!byMonth[k]) {
              byMonth[k] = {
                  ts: [],
                  dates: [],
                  weight: [],
                  bodyFat: [],
                  musclePercent: [],
                  visceralFat: [],
                  bmr: [],
                  waist: [],
              };
          }
          byMonth[k].ts.push(p.ts);
          byMonth[k].dates.push(p.dateFull);
          if (p.weight != null) byMonth[k].weight.push(p.weight);
          if (p.bodyFat != null) byMonth[k].bodyFat.push(p.bodyFat);
          if (p.musclePercent != null) byMonth[k].musclePercent.push(p.musclePercent);
          if (p.visceralFat != null) byMonth[k].visceralFat.push(p.visceralFat);
          if (p.bmr != null) byMonth[k].bmr.push(p.bmr);
          if (p.waist != null) byMonth[k].waist.push(p.waist);
      });

      return Object.entries(byMonth).map(([k, v]) => {
          const avgTs = avg(v.ts);
          const d = new Date(avgTs);
          return {
              ts: avgTs,
              dateFull: v.dates[v.dates.length - 1],
              name: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
              periodLabel: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
              weight: round1(avg(v.weight)),
              bodyFat: round1(avg(v.bodyFat)),
              musclePercent: round1(avg(v.musclePercent)),
              visceralFat: round1(avg(v.visceralFat)),
              bmr: roundInt(avg(v.bmr)),
              waist: round1(avg(v.waist)),
              count: v.ts.length,
          };
      }).sort((a, b) => a.ts - b.ts);
  }, [dailyPoints]);

  // 3. Data agregasi rata-rata per tahun
  const yearlyPoints = useMemo(() => {
      const byYear = {};
      monthlyPoints.forEach((p) => {
          const k = yearKeyOf(p.dateFull);
          if (!byYear[k]) {
              byYear[k] = {
                  ts: [],
                  dates: [],
                  weight: [],
                  bodyFat: [],
                  musclePercent: [],
                  visceralFat: [],
                  bmr: [],
                  waist: [],
              };
          }
          byYear[k].ts.push(p.ts);
          byYear[k].dates.push(p.dateFull);
          if (p.weight != null) byYear[k].weight.push(p.weight);
          if (p.bodyFat != null) byYear[k].bodyFat.push(p.bodyFat);
          if (p.musclePercent != null) byYear[k].musclePercent.push(p.musclePercent);
          if (p.visceralFat != null) byYear[k].visceralFat.push(p.visceralFat);
          if (p.bmr != null) byYear[k].bmr.push(p.bmr);
          if (p.waist != null) byYear[k].waist.push(p.waist);
      });

      return Object.entries(byYear).map(([k, v]) => {
          const avgTs = avg(v.ts);
          const d = new Date(avgTs);
          return {
              ts: avgTs,
              dateFull: v.dates[v.dates.length - 1],
              name: String(d.getFullYear()),
              periodLabel: `Tahun ${d.getFullYear()}`,
              weight: round1(avg(v.weight)),
              bodyFat: round1(avg(v.bodyFat)),
              musclePercent: round1(avg(v.musclePercent)),
              visceralFat: round1(avg(v.visceralFat)),
              bmr: roundInt(avg(v.bmr)),
              waist: round1(avg(v.waist)),
              count: v.ts.length,
          };
      }).sort((a, b) => a.ts - b.ts);
  }, [monthlyPoints]);

  const scrollRef = useRef(null);
  const [pointWidth, setPointWidth] = useState(45);
  const touchState = useRef({ initialDist: 0, initialPointWidth: 45, pinchRatio: 0, scrollRelCenterX: 0 });
  const scrollTarget = useRef(null);
  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);
  const pinchRafRef = useRef(null);
  const lastCommittedWidthRef = useRef(pointWidth);

  const [resolution, setResolution] = useState(() => {
    if (pointWidth >= DAY_MIN_PW) return 'day';
    if (pointWidth >= MONTH_MIN_PW) return 'month';
    return 'year';
  });

  useEffect(() => {
    setResolution(prev => {
      let next = prev;
      if (prev === 'day' && pointWidth < 18) next = 'month';
      else if (prev === 'month') {
        if (pointWidth > 24) next = 'day';
        else if (pointWidth < 8) next = 'year';
      } else if (prev === 'year' && pointWidth > 12) next = 'month';

      return next;
    });
  }, [pointWidth]);

  const chartData = resolution === 'day' ? dailyPoints : resolution === 'month' ? monthlyPoints : yearlyPoints;

  const effectivePointWidth = useMemo(() => {
    const bWidth = typeof window !== 'undefined' ? window.innerWidth - 64 : 320;
    if (resolution === 'day') return pointWidth;
    if (resolution === 'month') return Math.max(50, Math.round(bWidth / Math.max(1, monthlyPoints.length)));
    return Math.max(80, Math.round(bWidth / Math.max(1, yearlyPoints.length)));
  }, [resolution, pointWidth, monthlyPoints.length, yearlyPoints.length]);

  const yDomains = useMemo(() => {
      if (chartData.length === 0) return {};
      
      const newDomains = {};
      activeChartMetrics.forEach(metric => {
          let min = Infinity;
          let max = -Infinity;

          chartData.forEach(d => {
              let val = d[metric];
              if (val !== undefined && val !== null) {
                  val = Number(val);
                  if (!isNaN(val)) {
                      if (val < min) min = val;
                      if (val > max) max = val;
                  }
              }
          });
          
          if (min !== Infinity && max !== -Infinity) {
              const diff = max - min;
              if (diff === 0) {
                  newDomains[metric] = [Math.max(0, min - (min * 0.1 || 1)), max + (max * 0.1 || 1)];
              } else {
                  newDomains[metric] = [Math.max(0, min - diff * 0.1), max + diff * 0.1];
              }
          } else {
              newDomains[metric] = [0, 100];
          }
      });
      return newDomains;
  }, [chartData, activeChartMetrics]);

  const handleScroll = () => {
      if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
          });
      }
  };

  const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          if (dist <= 0) return;
          const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const rect = scrollRef.current ? scrollRef.current.getBoundingClientRect() : { left: 0 };
          const scrollRelCenterX = pinchCenterX - rect.left;
          const currentScrollLeft = scrollRef.current ? scrollRef.current.scrollLeft : 0;
          const currentChartWidth = Math.max(chartData.length * pointWidthRef.current, window.innerWidth - 64);
          const pinchRatio = (scrollRelCenterX + currentScrollLeft) / currentChartWidth;
          touchState.current = { initialDist: dist, initialPointWidth: pointWidthRef.current, pinchRatio, scrollRelCenterX };
          lastCommittedWidthRef.current = pointWidthRef.current;
      }
  };

  const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchState.current.initialDist > 0) {
          if (e.cancelable) e.preventDefault();
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          const scale = dist / touchState.current.initialDist;
          let newWidth = touchState.current.initialPointWidth * scale;
          if (newWidth < 6) newWidth = 6;
          if (newWidth > 120) newWidth = 120;

          if (Math.abs(newWidth - lastCommittedWidthRef.current) < 1.0) return;

          const nextChartWidth = Math.max(chartData.length * newWidth, window.innerWidth - 64);
          const newPinchAbsX = touchState.current.pinchRatio * nextChartWidth;
          scrollTarget.current = Math.max(0, newPinchAbsX - touchState.current.scrollRelCenterX);
          lastCommittedWidthRef.current = newWidth;

          if (!pinchRafRef.current) {
              pinchRafRef.current = requestAnimationFrame(() => {
                  pinchRafRef.current = null;
                  setPointWidth(newWidth);
              });
          }
      }
  };

  const handleTouchEnd = () => {
      if (pinchRafRef.current) {
          cancelAnimationFrame(pinchRafRef.current);
          pinchRafRef.current = null;
      }
      touchState.current.initialDist = 0;
  };

  useEffect(() => {
      if (scrollTarget.current !== null && scrollRef.current) {
          scrollRef.current.scrollLeft = scrollTarget.current;
          scrollTarget.current = null;
      }
  }, [pointWidth, chartData]);

  // Auto scroll ke ujung kanan (data terbaru) saat ganti metrik atau data masuk
  useEffect(() => {
      if (scrollRef.current && chartData.length > 0) {
          const clientW = scrollRef.current.clientWidth || (window.innerWidth - 64);
          const nextChartWidth = Math.max(chartData.length * pointWidth, clientW);
          scrollTarget.current = nextChartWidth - clientW;
      }
  }, [chartData.length, activeChartMetrics]);

  const currentPW = resolution === 'day' ? pointWidth : effectivePointWidth;
  const chartWidth = Math.max(chartData.length * currentPW, typeof window !== 'undefined' ? window.innerWidth - 64 : 320);

  return (
    <div className={!isSubCard ? "px-5 pb-5 pt-2" : ""}>

         <div ref={scrollRef} 
              onScroll={!isSubCard ? handleScroll : undefined}
              onTouchStartCapture={!isSubCard ? handleTouchStart : undefined} 
              onTouchMoveCapture={!isSubCard ? handleTouchMove : undefined}
              onTouchEndCapture={!isSubCard ? handleTouchEnd : undefined}
              onTouchCancelCapture={!isSubCard ? handleTouchEnd : undefined}
              className={`w-full overflow-x-auto scrollbar-hide mb-4 touch-pan-x flex ${isSubCard ? 'pointer-events-none' : ''}`} 
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y',
                willChange: 'scroll-position',
                transform: 'translateZ(0)',
                contain: 'paint layout',
              }}>
             {chartData.length > 0 ? (
               <div style={{
                 width: `${chartWidth}px`,
                 height: '224px',
                 marginLeft: (chartData.length * currentPW) < (typeof window !== 'undefined' ? window.innerWidth - 64 : 320) ? 'auto' : '0'
               }} className="cursor-crosshair relative shrink-0 transition-all duration-200 ease-out">
                 {/* Gimmick Grid Lines */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ padding: '10px 0 30px 0' }}>
                     {[0, 25, 50, 75, 100].map((pct, i) => (
                         <line key={i} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke={theme === 'dark' ? '#3f3f46' : '#cbd5e1'} strokeDasharray="3 3" strokeWidth="1" />
                     ))}
                 </svg>

                 <LineChart 
                    width={chartWidth}
                    height={224}
                    data={chartData} 
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    style={{ outline: 'none' }}
                    onClick={(e) => {
                        if(e && e.activePayload && e.activePayload.length > 0) {
                            onPointClick?.(e.activePayload[0].payload.dateFull);

                            const adjustScrollForTooltip = () => {
                                const container = scrollRef.current;
                                const tooltipEl = container?.querySelector('.recharts-tooltip-wrapper');
                                if (!container || !tooltipEl) return;
                                const tooltipRect = tooltipEl.getBoundingClientRect();
                                if (tooltipRect.width === 0) return;
                                const containerRect = container.getBoundingClientRect();
                                let delta = 0;
                                if (tooltipRect.left < containerRect.left) {
                                    delta = tooltipRect.left - containerRect.left - 12;
                                } else if (tooltipRect.right > containerRect.right) {
                                    delta = tooltipRect.right - containerRect.right + 12;
                                }
                                if (delta !== 0) {
                                    container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
                                }
                            };
                            [50, 150, 300].forEach(delay => setTimeout(adjustScrollForTooltip, delay));
                        }
                    }}
                 >
                    <Tooltip 
                       formatter={(value, name, props) => {
                           let unit = '';
                           if (props.dataKey === 'weight') unit = isImp ? ' lbs' : ' kg';
                           else if (props.dataKey === 'waist') unit = isImp ? ' in' : ' cm';
                           else if (['bodyFat', 'musclePercent', 'waterPercent', 'proteinPercent'].includes(props.dataKey)) unit = '%';
                           else if (props.dataKey === 'bmr') unit = ' kcal';
                           return [`${formatNumber(value, language)}${unit}`, name];
                       }}
                       labelFormatter={(label, payload) => {
                           const p = payload?.[0]?.payload;
                           if ((resolution === 'month' || resolution === 'year') && p?.periodLabel) {
                               return p.periodLabel;
                           }
                           return label;
                       }}
                       cursor={{ stroke: theme === 'dark' ? '#52525b' : '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }} 
                       contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                       itemStyle={{ padding: 0, margin: 0, marginTop: '4px' }} 
                       labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '10px' }} 
                    />
                    <XAxis 
                       dataKey="name" 
                       stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} 
                       fontSize={9} 
                       tickLine={false} 
                       axisLine={false} 
                       interval={Math.max(0, Math.ceil(50 / effectivePointWidth) - 1)} 
                    />
                    {chartMetricsList.map(metric => {
                        if (!activeChartMetrics.includes(metric.key)) return null;
                        const isFirstActive = activeChartMetrics[0] === metric.key;
                        return (
                            <YAxis key={`y-${metric.key}`} yAxisId={metric.key} domain={yDomains[metric.key] || ['auto', 'auto']} hide={!isFirstActive} tickFormatter={() => ''} axisLine={false} tickLine={false} width={isFirstActive ? 1 : 0} allowDataOverflow={true} />
                        );
                    })}
                    {chartMetricsList.map(metric => (
                        activeChartMetrics.includes(metric.key) && 
                        <Line key={metric.key} yAxisId={metric.key} type="monotone" name={metric.label} dataKey={metric.key} stroke={metric.color} strokeWidth={1.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: metric.color }} connectNulls={true} isAnimationActive={false} />
                    ))}
                 </LineChart>
               </div>
             ) : (
               <div className="w-full h-[224px] flex items-center justify-center">
                 <span className={`text-xs ${t.textMuted}`}>Belum ada data komposisi tubuh</span>
               </div>
             )}
         </div>
         
         {isSubCard && (
             <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-2 mb-2">
                 {chartMetricsList.filter(m => activeChartMetrics.includes(m.key)).map(metric => (
                     <div key={metric.key} className="flex items-center space-x-1.5">
                         <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: metric.color }}></div>
                         <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{metric.label}</span>
                     </div>
                 ))}
             </div>
         )}
         
         {!isSubCard && (
         <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            {chartMetricsList.map(metric => {
                const isActive = activeChartMetrics.includes(metric.key);
                return (
                     <button
                        key={metric.key}
                        onTouchStart={(e) => startPillPress(metric.key, e)}
                        onTouchMove={movePillPress}
                        onTouchEnd={endPillPress}
                        onTouchCancel={endPillPress}
                        onMouseDown={(e) => startPillPress(metric.key, e)}
                        onMouseMove={movePillPress}
                        onMouseUp={endPillPress}
                        onMouseLeave={endPillPress}
                        onClick={() => handlePillClick(metric.key)}
                        onContextMenu={(e) => e.preventDefault()}
                        className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8 select-none"
                        style={{ backgroundColor: isActive ? metric.color : 'transparent', borderColor: metric.color, color: isActive ? '#fff' : metric.color, opacity: isActive ? 1 : 0.5 }}
                     >
                         {metric.label}
                     </button>
                )
            })}
         </div>
         )}
    </div>
  );
};

export default DashboardChart;