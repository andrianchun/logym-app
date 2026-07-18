import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalYMD } from '../data/constants';
import { formatNumber } from '../utils/numberFormat';

const DashboardChart = ({ t, theme, history, soundEnabled, playSoundEffect, onPointClick, unitSystem, language, isSubCard = false }) => {
  const isImp = unitSystem === 'imperial';
  const chartMetricsList = [
      { key: 'weight', label: 'Berat Badan', color: theme === 'dark' ? '#38bdf8' : '#0284c7' }, // Sky Blue
      { key: 'bodyFat', label: 'Kadar Lemak', color: theme === 'dark' ? '#60a5fa' : '#2563eb' }, // Lighter Blue
      { key: 'musclePercent', label: 'Kadar Otot', color: theme === 'dark' ? '#818cf8' : '#4f46e5' }, // Soft Indigo
      { key: 'visceralFat', label: 'Lemak Visceral', color: theme === 'dark' ? '#2dd4bf' : '#0d9488' }, // Teal
      { key: 'bmr', label: 'BMR', color: theme === 'dark' ? '#94a3b8' : '#64748b' }, // Slate
      { key: 'waist', label: 'Lingkar Perut', color: theme === 'dark' ? '#3b82f6' : '#1d4ed8' }, // Blue
      { key: 'bpSys', label: 'Tensi', color: theme === 'dark' ? '#a78bfa' : '#7c3aed' }, // Soft Purple
      { key: 'heartRate', label: 'Nadi', color: theme === 'dark' ? '#06b6d4' : '#0891b2' }, // Cyan
      { key: 'oxygenSaturation', label: 'SpO2', color: theme === 'dark' ? '#93c5fd' : '#1e3a8a' }, // Very Light Blue
  ];

  const [activeChartMetrics, setActiveChartMetrics] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_chart_metrics');
          if (saved) return JSON.parse(saved);
      } catch(e) {}
      return ['weight', 'bodyFat', 'musclePercent', 'visceralFat', 'waist'];
  });

  const toggleChartMetric = (key) => {
      playSoundEffect('click', soundEnabled);
      setActiveChartMetrics(prev => {
          const newMetrics = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
          localStorage.setItem('lyfit_chart_metrics', JSON.stringify(newMetrics));
          return newMetrics;
      });
  };

  const multiChartData = useMemo(() => {
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
          
          let bpSys = null;
          if (histBio?.bloodPressure) {
              const parts = histBio.bloodPressure.split('/');
              if (parts.length === 2) bpSys = Number(parts[0]);
          }

          data.push({
              name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              dateFull: entry.dateStr,
              weight: histBio?.weight ? Number((isImp ? Number(histBio.weight) * 2.20462 : Number(histBio.weight)).toFixed(1)) : null,
              bodyFat: histBio?.bodyFat ? Number(histBio.bodyFat) : null,
              musclePercent: histBio?.musclePercent ? Number(histBio.musclePercent) : null,
              visceralFat: histBio?.visceralFat ? Number(histBio.visceralFat) : null,
              bmr: histBio?.bmr ? Number(histBio.bmr) : null,
              waist: histBio?.waist ? Number((isImp ? Number(histBio.waist) * 0.393701 : Number(histBio.waist)).toFixed(1)) : null,
              bpSys: bpSys,
              heartRate: histBio?.heartRate ? Number(histBio.heartRate) : null,
              oxygenSaturation: histBio?.oxygenSaturation ? Number(histBio.oxygenSaturation) : null,
          });
      });
      return data;
  }, [history]);

  const scrollRef = useRef(null);

  // Pinch-to-zoom logic
  const [pointWidth, setPointWidth] = useState(45);
  const touchState = useRef({ initialDist: 0, initialPointWidth: 45, pinchRatio: 0, scrollRelCenterX: 0 });

  // Auto scroll ke tengah titik data terbaru
  useEffect(() => {
     if(scrollRef.current && multiChartData.length > 0 && activeChartMetrics.length > 0) {
        const data = multiChartData;
        
        let latestIdxWithData = -1;
        for (let i = data.length - 1; i >= 0; i--) {
            if (activeChartMetrics.some(metric => {
                const val = data[i][metric];
                return val !== undefined && val !== null && val !== 0;
            })) {
                latestIdxWithData = i;
                break;
            }
        }
        
        if (latestIdxWithData !== -1) {
             const latestDateObj = new Date(data[latestIdxWithData].dateFull);
             const oneMonthAgo = new Date(latestDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
             const oneMonthAgoStr = getLocalYMD(oneMonthAgo);

             let startIdx = latestIdxWithData;
             while (startIdx > 0 && data[startIdx - 1].dateFull >= oneMonthAgoStr) {
                 startIdx--;
             }

             const numPoints = latestIdxWithData - startIdx + 1;
             const clientW = scrollRef.current.clientWidth || (window.innerWidth - 64);
             
             let newPointWidth = clientW / Math.max(1.5, numPoints);
             if (newPointWidth > 200) newPointWidth = 200;
             if (newPointWidth < 15) newPointWidth = 15;

             setPointWidth(newPointWidth);
             scrollTarget.current = startIdx * newPointWidth;
        } else {
             const clientW = scrollRef.current.clientWidth || (window.innerWidth - 64);
             scrollTarget.current = Math.max(0, ((data.length - 1) * pointWidth) - (clientW / 2));
        }
     }
  }, [multiChartData, activeChartMetrics]);
  const scrollTarget = useRef(null);

  const [yDomains, setYDomains] = useState({});
  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);

  const updateYDomains = useCallback(() => {
      if (!scrollRef.current || multiChartData.length === 0) return;
      const { scrollLeft, clientWidth } = scrollRef.current;
      const pw = pointWidthRef.current;
      
      const startIndex = Math.max(0, Math.floor(scrollLeft / pw));
      const endIndex = Math.min(multiChartData.length - 1, Math.ceil((scrollLeft + clientWidth) / pw));
      
      const visibleData = multiChartData.slice(startIndex, endIndex + 1);
      
      const newDomains = {};
      activeChartMetrics.forEach(metric => {
          let min = Infinity;
          let max = -Infinity;

          const findMinMax = (dataList) => {
              dataList.forEach(d => {
                  let val = d[metric];
                  if (val !== undefined && val !== null) {
                      val = Number(val);
                      if (!isNaN(val)) {
                          if (val < min) min = val;
                          if (val > max) max = val;
                      }
                  }
              });
          };

          findMinMax(visibleData);
          
          if (min === Infinity || max === -Infinity) {
              findMinMax(multiChartData);
          }

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
      
      setYDomains(prev => {
          let changed = false;
          for (let m of activeChartMetrics) {
              const p = prev[m] || ['auto', 'auto'];
              const n = newDomains[m] || ['auto', 'auto'];
              if (p[0] !== n[0] || p[1] !== n[1]) {
                  changed = true;
                  break;
              }
          }
          return changed ? newDomains : prev;
      });
  }, [multiChartData, activeChartMetrics]);

  const handleScroll = () => {
      if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
              updateYDomains();
              rafRef.current = null;
          });
      }
  };

  useEffect(() => {
      updateYDomains();
  }, [updateYDomains, pointWidth]);

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
          const currentChartWidth = Math.max(multiChartData.length * pointWidth, window.innerWidth - 64);
          
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
          
          const nextChartWidth = Math.max(multiChartData.length * newWidth, window.innerWidth - 64);
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

  // Lebar grafik dinamis berdasarkan pointWidth yang di-zoom
  const chartWidth = Math.max(multiChartData.length * pointWidth, window.innerWidth - 64);

  return (
    <div className={!isSubCard ? "px-5 pb-5 pt-2" : ""}>

         <div ref={scrollRef} 
              onScroll={!isSubCard ? handleScroll : undefined}
              onTouchStartCapture={!isSubCard ? handleTouchStart : undefined} 
              onTouchMoveCapture={!isSubCard ? handleTouchMove : undefined}
              className={`w-full overflow-x-auto scrollbar-hide mb-4 touch-pan-x ${isSubCard ? 'pointer-events-none' : ''}`} 
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
             <div style={{ width: `${chartWidth}px`, height: '224px' }} className="cursor-crosshair relative">
                 {/* Gimmick Grid Lines */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ padding: '10px 0 30px 0' }}>
                     {[0, 25, 50, 75, 100].map((pct, i) => (
                         <line key={i} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke={theme === 'dark' ? '#3f3f46' : '#cbd5e1'} strokeDasharray="3 3" strokeWidth="1" />
                     ))}
                 </svg>

                 <LineChart 
                    width={chartWidth}
                    height={224}
                    data={multiChartData} 
                    style={{ outline: 'none' }}
                    onClick={(e) => {
                        if(e && e.activePayload && e.activePayload.length > 0) {
                            onPointClick(e.activePayload[0].payload.dateFull);

                            // Chart ini di dalam container yang scroll horizontal (bisa jauh lebih
                            // lebar dari layar). Tooltip Recharts diposisikan dekat titik yang diklik,
                            // jadi kalau titiknya dekat tepi kiri/kanan area yang terlihat, tooltip-nya
                            // ikut kepotong. Ukur posisi tooltip asli setelah render, lalu geser scroll
                            // horizontal seperlunya supaya tooltip-nya tetap utuh kelihatan.
                            // Dicoba beberapa kali (bukan sekali di 50ms) karena Recharts memposisikan
                            // ulang tooltip lewat efek internal yang bisa telat beberapa frame,
                            // terutama di device yang lebih lambat.
                            const adjustScrollForTooltip = () => {
                                const container = scrollRef.current;
                                const tooltipEl = container?.querySelector('.recharts-tooltip-wrapper');
                                if (!container || !tooltipEl) return;
                                const tooltipRect = tooltipEl.getBoundingClientRect();
                                if (tooltipRect.width === 0) return; // belum benar-benar diposisikan
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
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <Tooltip 
                       formatter={(value, name, props) => {
                           let unit = '';
                           if (props.dataKey === 'weight') unit = isImp ? ' lbs' : ' kg';
                           else if (props.dataKey === 'waist') unit = isImp ? ' in' : ' cm';
                           else if (['bodyFat', 'musclePercent', 'waterPercent', 'proteinPercent'].includes(props.dataKey)) unit = '%';
                           else if (props.dataKey === 'bmr') unit = ' kcal';
                           else if (props.dataKey === 'activeMinutes' || props.dataKey === 'weeklyDuration') unit = ' m';
                           else if (props.dataKey === 'heartRate') unit = ' bpm';
                           return [`${formatNumber(value, language)}${unit}`, name];
                       }}
                       cursor={{ stroke: theme === 'dark' ? '#52525b' : '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }} 
                       contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                       itemStyle={{ padding: 0, margin: 0, marginTop: '4px' }} 
                       labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                    />
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} />
                    {chartMetricsList.map(metric => {
                        if (!activeChartMetrics.includes(metric.key)) return null;
                        const isFirstActive = activeChartMetrics[0] === metric.key;
                        return (
                            <YAxis key={`y-${metric.key}`} yAxisId={metric.key} domain={yDomains[metric.key] || ['auto', 'auto']} hide={!isFirstActive} tickFormatter={() => ''} axisLine={false} tickLine={false} width={isFirstActive ? 1 : 0} allowDataOverflow={true} />
                        );
                    })}
                    {chartMetricsList.map(metric => (
                        activeChartMetrics.includes(metric.key) && 
                        <Line key={metric.key} yAxisId={metric.key} type="monotone" name={metric.label} dataKey={metric.key} stroke={metric.color} strokeWidth={2} dot={{ r: 2, strokeWidth: 0, fill: metric.color }} activeDot={{ r: 5, strokeWidth: 0, fill: metric.color }} connectNulls={true} isAnimationActive={false} />
                    ))}
                 </LineChart>
             </div>
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
                    <button key={metric.key} onClick={() => toggleChartMetric(metric.key)} className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8" style={{ backgroundColor: isActive ? metric.color : 'transparent', borderColor: metric.color, color: isActive ? '#fff' : metric.color, opacity: isActive ? 1 : 0.5 }}>
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