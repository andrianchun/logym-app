import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../utils/numberFormat';

// Detail nadi/tensi/SpO2 dari Health Connect itu aslinya beresolusi tinggi (banyak titik
// sepanjang hari) — satu chart kontinu yang di-scroll+pinch, BUKAN navigasi hari per hari.
// Zoom-in nunjukin titik mentah per jam, zoom-out ngeratain jadi rata-rata per hari, lalu per
// bulan, lalu per tahun — biar tren jangka panjang (tensi terutama) tetap kebaca pas di-zoom
// out jauh, bukan cuma segerombol titik mentah yang numpuk gak jelas.
const HOUR_MIN_PW = 50;
const DAY_MIN_PW = 20;
const MONTH_MIN_PW = 10;

const monthKeyOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const dayKeyOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

// activeMetric dikontrol dari luar (bukan tab sendiri) — dipakai sebagai "extra tab" yang
// nempel di baris toggle ActivityChart (lihat DashboardTab.jsx), biar gak nambah tab row baru
// yang makan tempat vertikal.
export const VITALS_METRICS = (theme) => [
  { key: 'heartRateLog', dayKey: 'heartRate', label: 'Nadi', unit: 'bpm', color: theme === 'dark' ? '#06b6d4' : '#0891b2', field: 'value' },
  { key: 'bloodPressureLog', dayKey: 'bloodPressure', label: 'Tensi', unit: 'mmHg', color: theme === 'dark' ? '#a78bfa' : '#7c3aed', field: 'sys' },
  { key: 'oxygenSaturationLog', dayKey: 'oxygenSaturation', label: 'SpO2', unit: '%', color: theme === 'dark' ? '#93c5fd' : '#1e3a8a', field: 'value' },
];

const VitalsChart = ({ t, theme, history, language, activeMetric }) => {
  const metrics = VITALS_METRICS(theme);
  const metric = metrics.find(m => m.key === activeMetric);

  // Titik mentah per jam (semua hari), plus fallback satu titik siang hari buat hari yang cuma
  // punya angka ringkasan harian (belum pernah di-resync sejak field log ini ada).
  const hourlyPoints = useMemo(() => {
    const points = [];
    Object.keys(history).sort().forEach((ymd) => {
      const bio = history[ymd]?.bioData;
      if (!bio) return;
      const log = bio[metric.key];
      if (Array.isArray(log) && log.length > 0) {
        log.forEach((p) => {
          if (p.ts == null) return;
          if (activeMetric === 'bloodPressureLog') {
            if (p.sys > 0) points.push({ ts: p.ts, value: p.sys, dia: p.dia });
          } else if (p.value > 0) {
            points.push({ ts: p.ts, value: p.value });
          }
        });
      } else if (activeMetric === 'bloodPressureLog') {
        const parts = String(bio.bloodPressure || '').split('/');
        const sys = Number(parts[0]);
        const dia = Number(parts[1]);
        if (sys > 0) points.push({ ts: new Date(`${ymd}T12:00:00`).getTime(), value: sys, dia });
      } else if (Number(bio[metric.dayKey]) > 0) {
        points.push({ ts: new Date(`${ymd}T12:00:00`).getTime(), value: Number(bio[metric.dayKey]) });
      }
    });
    points.sort((a, b) => a.ts - b.ts);
    return points;
  }, [history, activeMetric, metric.key, metric.dayKey]);

  const dailyPoints = useMemo(() => {
    const byDay = {};
    hourlyPoints.forEach((p) => {
      const k = dayKeyOf(p.ts);
      if (!byDay[k]) byDay[k] = { ts: [], value: [], dia: [] };
      byDay[k].ts.push(p.ts);
      byDay[k].value.push(p.value);
      if (p.dia != null) byDay[k].dia.push(p.dia);
    });
    return Object.entries(byDay).map(([k, v]) => {
      const minVal = Math.round(Math.min(...v.value));
      const maxVal = Math.round(Math.max(...v.value));
      const minDia = v.dia.length ? Math.round(Math.min(...v.dia)) : undefined;
      const maxDia = v.dia.length ? Math.round(Math.max(...v.dia)) : undefined;
      return {
        ts: avg(v.ts),
        value: Math.round(avg(v.value)),
        minVal,
        maxVal,
        minDia,
        maxDia,
        count: v.value.length,
        dia: v.dia.length ? Math.round(avg(v.dia)) : undefined,
      };
    }).sort((a, b) => a.ts - b.ts);
  }, [hourlyPoints]);

  const monthlyPoints = useMemo(() => {
    const byMonth = {};
    dailyPoints.forEach((p) => {
      const k = monthKeyOf(p.ts);
      if (!byMonth[k]) byMonth[k] = { ts: [], value: [], dia: [], minVal: [], maxVal: [], minDia: [], maxDia: [] };
      byMonth[k].ts.push(p.ts);
      byMonth[k].value.push(p.value);
      if (p.minVal != null) byMonth[k].minVal.push(p.minVal);
      if (p.maxVal != null) byMonth[k].maxVal.push(p.maxVal);
      if (p.minDia != null) byMonth[k].minDia.push(p.minDia);
      if (p.maxDia != null) byMonth[k].maxDia.push(p.maxDia);
      if (p.dia != null) byMonth[k].dia.push(p.dia);
    });
    return Object.entries(byMonth).map(([k, v]) => ({
      ts: avg(v.ts),
      value: Math.round(avg(v.value)),
      minVal: v.minVal.length ? Math.min(...v.minVal) : Math.round(Math.min(...v.value)),
      maxVal: v.maxVal.length ? Math.max(...v.maxVal) : Math.round(Math.max(...v.value)),
      minDia: v.minDia.length ? Math.min(...v.minDia) : (v.dia.length ? Math.round(Math.min(...v.dia)) : undefined),
      maxDia: v.maxDia.length ? Math.max(...v.maxDia) : (v.dia.length ? Math.round(Math.max(...v.dia)) : undefined),
      dia: v.dia.length ? Math.round(avg(v.dia)) : undefined,
    })).sort((a, b) => a.ts - b.ts);
  }, [dailyPoints]);

  const yearlyPoints = useMemo(() => {
    const byYear = {};
    monthlyPoints.forEach((p) => {
      const k = new Date(p.ts).getFullYear();
      if (!byYear[k]) byYear[k] = { ts: [], value: [], dia: [], minVal: [], maxVal: [], minDia: [], maxDia: [] };
      byYear[k].ts.push(p.ts);
      byYear[k].value.push(p.value);
      if (p.minVal != null) byYear[k].minVal.push(p.minVal);
      if (p.maxVal != null) byYear[k].maxVal.push(p.maxVal);
      if (p.minDia != null) byYear[k].minDia.push(p.minDia);
      if (p.maxDia != null) byYear[k].maxDia.push(p.maxDia);
      if (p.dia != null) byYear[k].dia.push(p.dia);
    });
    return Object.entries(byYear).map(([k, v]) => ({
      ts: avg(v.ts),
      value: Math.round(avg(v.value)),
      minVal: v.minVal.length ? Math.min(...v.minVal) : Math.round(Math.min(...v.value)),
      maxVal: v.maxVal.length ? Math.max(...v.maxVal) : Math.round(Math.max(...v.value)),
      minDia: v.minDia.length ? Math.min(...v.minDia) : (v.dia.length ? Math.round(Math.min(...v.dia)) : undefined),
      maxDia: v.maxDia.length ? Math.max(...v.maxDia) : (v.dia.length ? Math.round(Math.max(...v.dia)) : undefined),
      dia: v.dia.length ? Math.round(avg(v.dia)) : undefined,
    })).sort((a, b) => a.ts - b.ts);
  }, [monthlyPoints]);

  const scrollRef = useRef(null);
  const [pointWidth, setPointWidth] = useState(45);
  const touchState = useRef({ initialDist: 0, initialPointWidth: 45, pinchRatio: 0, scrollRelCenterX: 0 });
  const scrollTarget = useRef(null);

  const resolution = pointWidth >= HOUR_MIN_PW ? 'hour' : pointWidth >= DAY_MIN_PW ? 'day' : pointWidth >= MONTH_MIN_PW ? 'month' : 'year';
  const rawData = resolution === 'hour' ? hourlyPoints : resolution === 'day' ? dailyPoints : resolution === 'month' ? monthlyPoints : yearlyPoints;

  const chartData = useMemo(() => rawData.map((p) => {
    const d = new Date(p.ts);
    let name;
    if (resolution === 'hour') name = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    else if (resolution === 'day') name = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    else if (resolution === 'month') name = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    else name = String(d.getFullYear());
    return { ...p, name };
  }), [rawData, resolution]);

  // Auto-scroll ke titik terbaru pas metrik/resolusi ganti.
  useEffect(() => {
    if (scrollRef.current && chartData.length > 0) {
      const clientW = scrollRef.current.clientWidth || (window.innerWidth - 64);
      scrollTarget.current = Math.max(0, (chartData.length * pointWidth) - clientW);
    }
  }, [activeMetric]);

  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    let min = Infinity, max = -Infinity;
    chartData.forEach((d) => {
      [d.value, d.dia].forEach((v) => {
        if (v !== undefined && v !== null && !isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (min === Infinity) return [0, 100];
    const diff = max - min;
    return [Math.floor(min - (diff * 0.15 || 5)), Math.ceil(max + (diff * 0.15 || 5))];
  }, [chartData]);

  const handleScroll = () => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => { rafRef.current = null; });
    }
  };

  const pinchRafRef = useRef(null);
  const lastCommittedWidthRef = useRef(pointWidth);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
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
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
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
  }, [chartData.length]);

  const chartWidth = Math.max(chartData.length * pointWidth, window.innerWidth - 64);
  const resolutionLabel = { hour: 'Per Jam', day: 'Per Hari', month: 'Per Bulan', year: 'Per Tahun' }[resolution];

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStartCapture={handleTouchStart}
        onTouchMoveCapture={handleTouchMove}
        onTouchEndCapture={handleTouchEnd}
        onTouchCancelCapture={handleTouchEnd}
        className="w-full overflow-x-auto scrollbar-hide mb-4 touch-pan-x pt-2 flex"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          willChange: 'scroll-position',
          transform: 'translateZ(0)',
          contain: 'paint layout',
        }}
      >
        {chartData.length > 0 ? (
          <div style={{ width: `${chartWidth}px`, height: '224px', marginLeft: (chartData.length * pointWidth) < (window.innerWidth - 64) ? 'auto' : '0' }} className="cursor-crosshair relative shrink-0">
            <LineChart width={chartWidth} height={224} data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
              <Tooltip
                formatter={(value, name, props) => {
                  const p = props.payload || {};

                  // Format Rentang Tensi (Min – Max) jika ada beberapa pengukuran
                  if (activeMetric === 'bloodPressureLog') {
                    if (p.minVal != null && p.maxVal != null && (p.minVal !== p.maxVal || p.minDia !== p.maxDia)) {
                      return [`${p.minVal}/${p.minDia ?? '-'} – ${p.maxVal}/${p.maxDia ?? '-'} ${metric.unit}`, metric.label];
                    }
                    return [`${Math.round(p.value)}/${p.dia != null ? Math.round(p.dia) : '-'} ${metric.unit}`, metric.label];
                  }

                  // Untuk Nadi & SpO2: tampilkan rentang jika ada variasi (mis. 55 – 78 bpm)
                  if (p.minVal != null && p.maxVal != null && p.minVal !== p.maxVal) {
                    return [`${p.minVal} – ${p.maxVal} ${metric.unit}`, metric.label];
                  }

                  return [`${formatNumber(Math.round(value), language)} ${metric.unit}`, metric.label];
                }}
                cursor={{ stroke: theme === 'dark' ? '#52525b' : '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '9px' }}
              />
              <XAxis dataKey="name" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={9} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(50 / pointWidth) - 1)} />
              <YAxis hide domain={yDomain} allowDataOverflow />
              <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={1.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }} isAnimationActive={false} connectNulls />
              {activeMetric === 'bloodPressureLog' && (
                // tooltipType="none": garis diastol tetap digambar, tapi TIDAK ikut jadi baris
                // sendiri di tooltip. Tanpa ini tooltip memuat dua baris berlabel sama persis
                // ("Tensi : 89,5" lalu "Tensi : 133,5/89,5") — sistol dan diastol sudah digabung
                // dalam satu baris oleh formatter di atas.
                <Line type="monotone" dataKey="dia" tooltipType="none" stroke={metric.color} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls />
              )}
            </LineChart>
          </div>
        ) : (
          <div className="w-full h-[224px] flex items-center justify-center">
            <span className={`text-xs ${t.textMuted}`}>Belum ada data {metric.label.toLowerCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsChart;
