import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getLocalYMD } from '../data/constants';
import { formatNumber } from '../utils/numberFormat';
import { dayBmr } from '../utils/bmr';
import { enrichBioWithImpedance } from '../utils/xiaomiScaleCalc';

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

const MAX_ACTIVE_CHART_METRICS = 6;
const DEFAULT_ACTIVE_METRICS = ['weight', 'bodyFat', 'musclePercent', 'ffmi', 'visceralFat', 'waist'];

const DashboardChart = ({ t, theme, history, soundEnabled, playSoundEffect, onPointClick, unitSystem, units, language, userProfile, isSubCard = false }) => {
  const isImp = unitSystem === 'imperial' || units?.weight === 'lbs';
  const isID = language === 'ID';

  const chartMetricsList = useMemo(() => [
      { key: 'weight', label: isID ? 'Berat Badan' : 'Weight', color: theme === 'dark' ? '#38bdf8' : '#0284c7' }, // Sky Blue
      { key: 'bodyFat', label: isID ? 'Kadar Lemak' : 'Body Fat', color: theme === 'dark' ? '#60a5fa' : '#2563eb' }, // Blue
      { key: 'musclePercent', label: isID ? 'Kadar Otot' : 'Muscle', color: theme === 'dark' ? '#818cf8' : '#4f46e5' }, // Soft Indigo
      { key: 'ffmi', label: 'FFMI', color: theme === 'dark' ? '#c084fc' : '#9333ea' }, // Purple
      { key: 'visceralFat', label: isID ? 'Lemak Visceral' : 'Visceral Fat', color: theme === 'dark' ? '#2dd4bf' : '#0d9488' }, // Teal
      { key: 'waist', label: isID ? 'Perut' : 'Waist', color: theme === 'dark' ? '#06b6d4' : '#0891b2' }, // Cyan
      { key: 'proteinPercent', label: isID ? 'Kadar Protein' : 'Protein', color: theme === 'dark' ? '#fbbf24' : '#d97706' }, // Amber
      { key: 'waterPercent', label: isID ? 'Kadar Air' : 'Water', color: theme === 'dark' ? '#34d399' : '#059669' }, // Emerald / Mint
      { key: 'boneMass', label: isID ? 'Mineral Tulang' : 'Bone Mass', color: theme === 'dark' ? '#fb7185' : '#e11d48' }, // Rose
      { key: 'bodyAge', label: isID ? 'Usia Tubuh' : 'Body Age', color: theme === 'dark' ? '#fb923c' : '#ea580c' }, // Orange
      { key: 'bmr', label: 'BMR', color: theme === 'dark' ? '#94a3b8' : '#64748b' }, // Slate
      { key: 'wthr', label: 'WTHR', color: theme === 'dark' ? '#a78bfa' : '#7c3aed' }, // Violet
  ], [theme, isID]);

  const [activeChartMetrics, setActiveChartMetrics] = useState(() => {
      try {
          const saved = localStorage.getItem('lyfit_chart_metrics');
          if (saved) {
              const parsed = JSON.parse(saved);
              const validKeys = [
                'weight', 'bodyFat', 'musclePercent', 'ffmi', 'visceralFat', 'waist',
                'proteinPercent', 'waterPercent', 'boneMass', 'bodyAge', 'bmr', 'wthr'
              ];
              const filtered = parsed.filter(k => validKeys.includes(k));
              if (filtered.length > 0) return filtered.slice(0, MAX_ACTIVE_CHART_METRICS);
          }
      } catch(e) {}
      return DEFAULT_ACTIVE_METRICS;
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
        newMetrics = DEFAULT_ACTIVE_METRICS;
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
          let newMetrics;
          if (prev.includes(key)) {
              if (prev.length === 1) return prev; // Minimal 1 metrik aktif
              newMetrics = prev.filter(k => k !== key);
          } else if (prev.length >= MAX_ACTIVE_CHART_METRICS) {
              // Jika sudah 6 aktif, rotasi FIFO: geser metrik terlama yang diaktifkan
              newMetrics = [...prev.slice(1), key];
          } else {
              newMetrics = [...prev, key];
          }
          localStorage.setItem('lyfit_chart_metrics', JSON.stringify(newMetrics));
          return newMetrics;
      });
  };

  // 1. Data mentah per hari
  const dailyPoints = useMemo(() => {
      const data = [];
      const bioEntries = [];
      const todayStr = getLocalYMD(new Date());
      let fallbackHeight = userProfile?.height || userProfile?.biometrics?.height || null;

      Object.keys(history).forEach(dateStr => {
          if (history[dateStr]?.bioData && dateStr <= todayStr) {
              const b = history[dateStr].bioData;
              if (!fallbackHeight && b.height) fallbackHeight = b.height;
              // Hanya masukkan tanggal yang benar-benar memiliki data komposisi tubuh
              // (agar hari yang hanya punya langkah/tidur tanpa timbangan tidak menjadi titik kosong hantu di kanan grafik)
              const hasComp = [
                'weight', 'bodyFat', 'musclePercent', 'muscleMass', 'boneMass',
                'visceralFat', 'waterPercent', 'proteinPercent', 'bodyAge', 'bmr', 'waist', 'impedance'
              ].some(k => Number(b[k]) > 0);
              if (hasComp) {
                  bioEntries.push({ dateStr, bioData: b });
              }
          }
      });
      bioEntries.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      bioEntries.forEach(entry => {
          const d = new Date(entry.dateStr.includes('T') ? entry.dateStr : entry.dateStr + 'T12:00:00');
          const histBio = enrichBioWithImpedance(entry.bioData, userProfile, fallbackHeight, entry.dateStr);

          const uH = Number(histBio?.height || fallbackHeight || userProfile?.height || 0);
          const uW = Number(histBio?.weight || 0);
          const uBf = Number(histBio?.bodyFat || 0);
          const uWaist = Number(histBio?.waist || 0);

          let ffmi = null;
          if (uH > 0 && uW > 0 && uBf > 0) {
              const hMeter = uH / 100;
              const ffmKg = uW * (1 - (uBf / 100));
              ffmi = Number((ffmKg / (hMeter * hMeter)).toFixed(1));
          }

          let wthr = null;
          if (uH > 0 && uWaist > 0) {
              wthr = Number((uWaist / uH).toFixed(2));
          }

          data.push({
              ts: d.getTime(),
              name: d.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' }),
              dateFull: entry.dateStr,
              weight: histBio?.weight ? Number((isImp ? Number(histBio.weight) * 2.20462 : Number(histBio.weight)).toFixed(1)) : null,
              bodyFat: histBio?.bodyFat ? Number(histBio.bodyFat) : null,
              musclePercent: histBio?.musclePercent ? Number(histBio.musclePercent) : null,
              ffmi,
              visceralFat: histBio?.visceralFat ? Number(histBio.visceralFat) : null,
              waist: histBio?.waist ? Number((isImp ? Number(histBio.waist) * 0.393701 : Number(histBio.waist)).toFixed(1)) : null,
              proteinPercent: histBio?.proteinPercent ? Number(histBio.proteinPercent) : null,
              waterPercent: histBio?.waterPercent ? Number(histBio.waterPercent) : null,
              boneMass: histBio?.boneMass ? Number(histBio.boneMass) : null,
              bodyAge: histBio?.bodyAge ? Number(histBio.bodyAge) : null,
              bmr: histBio?.weight || histBio?.bmr ? (dayBmr(histBio, userProfile) || null) : null,
              wthr,
          });
      });
      return data;
  }, [history, isImp, userProfile, language]);

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
                  ffmi: [],
                  visceralFat: [],
                  waist: [],
                  proteinPercent: [],
                  waterPercent: [],
                  boneMass: [],
                  bodyAge: [],
                  bmr: [],
                  wthr: [],
              };
          }
          byMonth[k].ts.push(p.ts);
          byMonth[k].dates.push(p.dateFull);
          if (p.weight != null) byMonth[k].weight.push(p.weight);
          if (p.bodyFat != null) byMonth[k].bodyFat.push(p.bodyFat);
          if (p.musclePercent != null) byMonth[k].musclePercent.push(p.musclePercent);
          if (p.ffmi != null) byMonth[k].ffmi.push(p.ffmi);
          if (p.visceralFat != null) byMonth[k].visceralFat.push(p.visceralFat);
          if (p.waist != null) byMonth[k].waist.push(p.waist);
          if (p.proteinPercent != null) byMonth[k].proteinPercent.push(p.proteinPercent);
          if (p.waterPercent != null) byMonth[k].waterPercent.push(p.waterPercent);
          if (p.boneMass != null) byMonth[k].boneMass.push(p.boneMass);
          if (p.bodyAge != null) byMonth[k].bodyAge.push(p.bodyAge);
          if (p.bmr != null) byMonth[k].bmr.push(p.bmr);
          if (p.wthr != null) byMonth[k].wthr.push(p.wthr);
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
              ffmi: round1(avg(v.ffmi)),
              visceralFat: round1(avg(v.visceralFat)),
              waist: round1(avg(v.waist)),
              proteinPercent: round1(avg(v.proteinPercent)),
              waterPercent: round1(avg(v.waterPercent)),
              boneMass: round1(avg(v.boneMass)),
              bodyAge: roundInt(avg(v.bodyAge)),
              bmr: roundInt(avg(v.bmr)),
              wthr: v.wthr?.length ? Number(avg(v.wthr).toFixed(2)) : null,
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
                  ffmi: [],
                  visceralFat: [],
                  waist: [],
                  proteinPercent: [],
                  waterPercent: [],
                  boneMass: [],
                  bodyAge: [],
                  bmr: [],
                  wthr: [],
              };
          }
          byYear[k].ts.push(p.ts);
          byYear[k].dates.push(p.dateFull);
          if (p.weight != null) byYear[k].weight.push(p.weight);
          if (p.bodyFat != null) byYear[k].bodyFat.push(p.bodyFat);
          if (p.musclePercent != null) byYear[k].musclePercent.push(p.musclePercent);
          if (p.ffmi != null) byYear[k].ffmi.push(p.ffmi);
          if (p.visceralFat != null) byYear[k].visceralFat.push(p.visceralFat);
          if (p.waist != null) byYear[k].waist.push(p.waist);
          if (p.proteinPercent != null) byYear[k].proteinPercent.push(p.proteinPercent);
          if (p.waterPercent != null) byYear[k].waterPercent.push(p.waterPercent);
          if (p.boneMass != null) byYear[k].boneMass.push(p.boneMass);
          if (p.bodyAge != null) byYear[k].bodyAge.push(p.bodyAge);
          if (p.bmr != null) byYear[k].bmr.push(p.bmr);
          if (p.wthr != null) byYear[k].wthr.push(p.wthr);
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
              ffmi: round1(avg(v.ffmi)),
              visceralFat: round1(avg(v.visceralFat)),
              waist: round1(avg(v.waist)),
              proteinPercent: round1(avg(v.proteinPercent)),
              waterPercent: round1(avg(v.waterPercent)),
              boneMass: round1(avg(v.boneMass)),
              bodyAge: roundInt(avg(v.bodyAge)),
              bmr: roundInt(avg(v.bmr)),
              wthr: v.wthr?.length ? Number(avg(v.wthr).toFixed(2)) : null,
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

  const scrollToLatest = useCallback(() => {
      if (!scrollRef.current || touchState.current.initialDist > 0) return;
      const el = scrollRef.current;
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  }, []);

  useEffect(() => {
      if (scrollTarget.current !== null && scrollRef.current) {
          scrollRef.current.scrollLeft = scrollTarget.current;
          scrollTarget.current = null;
      }
  }, [pointWidth, chartData]);

  // Auto scroll ke ujung kanan (data terbaru) saat mount, ganti metrik, atau data masuk
  useEffect(() => {
      if (chartData.length === 0) return;
      const raf = requestAnimationFrame(scrollToLatest);
      const timer = setTimeout(scrollToLatest, 50);
      const timer2 = setTimeout(scrollToLatest, 260);
      return () => {
          cancelAnimationFrame(raf);
          clearTimeout(timer);
          clearTimeout(timer2);
      };
  }, [chartData.length, activeChartMetrics, resolution, scrollToLatest]);

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
                    margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
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
                           else if (['bodyFat', 'musclePercent', 'waterPercent', 'proteinPercent', 'boneMass'].includes(props.dataKey)) unit = '%';
                           else if (props.dataKey === 'bmr') unit = ' kcal';
                           else if (props.dataKey === 'bodyAge') unit = isID ? ' th' : ' yo';
                           else if (['ffmi', 'visceralFat', 'wthr'].includes(props.dataKey)) unit = '';
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
                       interval={chartData.length <= 8 ? 0 : 'preserveStartEnd'} 
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
                        <Line key={metric.key} yAxisId={metric.key} type="monotone" name={metric.label} dataKey={metric.key} stroke={metric.color} strokeWidth={1.5} dot={chartData.length <= 1 ? { r: 5, fill: metric.color, strokeWidth: 0 } : false} activeDot={{ r: 5, strokeWidth: 0, fill: metric.color }} connectNulls={true} isAnimationActive={false} />
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
                         <span className="text-xs font-bold text-white/70 uppercase tracking-widest">{metric.label}</span>
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