import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getLocalYMD } from '../data/constants';
import { formatNumber, formatSleepDuration } from '../utils/numberFormat';
import { splitWorkoutCalories } from '../utils/workoutCalc';

// Warna garis target, disamakan persis dengan grafik Lomeal (NutritionChart.jsx) supaya "garis
// kuning = target" berarti sama di kedua app.
const TARGET_COLOR = (theme) => (theme === 'dark' ? '#facc15' : '#eab308');

// metricKeys: subset opsional dari metrik di bawah yang mau ditampilin — dipakai buat misahin
// grafik Aktivitas Harian (langkah/kalori/durasi) dari grafik Tidur & Pemulihan (tidur/skor
// energi), dua instance komponen yang sama dengan localStorage key beda (storageKey) biar
// pilihan tab-nya gak saling timpa.
// extraTabs/renderExtra: tab TAMBAHAN yang ikut nempel di baris toggle yang sama (mis. Nadi/
// Tensi/SpO2 di sebelah Durasi Aktif) tapi visualisasinya beda total (bukan bar per-hari) —
// pas tab itu aktif, seluruh area chart bar diganti sama renderExtra(key), baris toggle-nya
// tetap satu biar gak makan tempat vertikal buat tab row kedua.
const ActivityChart = ({ t, theme, history, soundEnabled, playSoundEffect, onPointClick, language, lomealToday, metricKeys, storageKey = 'lyfit_activity_chart', extraTabs, renderExtra, activityTargets, lomealTargets, userWeight }) => {
  // `stackId` = batang bertumpuk (rincian satu angka), tanpa itu = batang berdampingan.
  // Kalori: "Masuk" berdiri sendiri di sebelah tumpukan "Dibakar" yang dirinci per sumber.
  // Tidur: satu tumpukan tahapan; `total` cuma dipakai hari yang sumbernya tidak merinci tahapan.
  const allMetrics = [
      { key: 'steps', label: 'Langkah', color: theme === 'dark' ? '#38bdf8' : '#0284c7', type: 'single', target: 'targetSteps' }, // Sky Blue
      { key: 'calories', label: 'Kalori', color: theme === 'dark' ? '#818cf8' : '#4f46e5', type: 'grouped',  // Indigo
        target: 'targetCalories',
        subMetrics: [
            { key: 'nutritionCalories', label: 'Masuk', color: theme === 'dark' ? '#34d399' : '#059669' },
            { key: 'calBmr', label: 'BMR', color: theme === 'dark' ? '#a1a1aa' : '#71717a', stackId: 'burn' },
            { key: 'calSteps', label: 'Langkah', color: theme === 'dark' ? '#60a5fa' : '#2563eb', stackId: 'burn' },
            { key: 'calCardio', label: 'Kardio', color: theme === 'dark' ? '#fb923c' : '#ea580c', stackId: 'burn' },
            { key: 'calWeights', label: 'Beban', color: theme === 'dark' ? '#34d399' : '#059669', stackId: 'burn', top: true },
        ]
      },
      { key: 'activeMinutes', label: 'Durasi Aktif', color: theme === 'dark' ? '#3b82f6' : '#1d4ed8', type: 'single', target: 'targetActiveMinutes' }, // Blue
      { key: 'sleep', label: 'Tidur', color: theme === 'dark' ? '#a78bfa' : '#7c3aed', type: 'grouped', target: 'targetSleep',
        subMetrics: [
            { key: 'sleepDeepH', label: 'Deep', color: theme === 'dark' ? '#6d28d9' : '#5b21b6', stackId: 'sleep' },
            { key: 'sleepLightH', label: 'Light', color: theme === 'dark' ? '#a78bfa' : '#7c3aed', stackId: 'sleep' },
            { key: 'sleepRemH', label: 'REM', color: theme === 'dark' ? '#38bdf8' : '#0284c7', stackId: 'sleep' },
            // `top` = potongan yang BISA jadi paling atas, jadi sudut membulatnya benar di dua
            // keadaan: hari yang punya rincian tahapan (Bangun paling atas) dan hari yang tidak
            // (sleepTotalOnly). Keduanya tidak pernah muncul bersamaan.
            { key: 'sleepAwakeH', label: 'Bangun', color: theme === 'dark' ? '#f87171' : '#dc2626', stackId: 'sleep', top: true },
            { key: 'sleepTotalOnly', label: 'Tidur', color: theme === 'dark' ? '#a78bfa' : '#7c3aed', stackId: 'sleep', top: true },
        ]
      },
      { key: 'energyScore', label: 'Skor Energi', color: theme === 'dark' ? '#94a3b8' : '#64748b', type: 'single' }, // Slate — tidak punya target
  ];
  const chartMetricsList = [
      ...(metricKeys ? allMetrics.filter(m => metricKeys.includes(m.key)) : allMetrics),
      ...(extraTabs || []).map(m => ({ ...m, isExtra: true })),
  ];

  const [activeMetric, setActiveMetric] = useState(() => {
      try {
          const saved = localStorage.getItem(storageKey);
          if (saved && chartMetricsList.some(m => m.key === saved)) return saved;
      } catch(e) {}
      return chartMetricsList[0]?.key;
  });

  const toggleChartMetric = (key) => {
      playSoundEffect('click', soundEnabled);
      setActiveMetric(key);
      localStorage.setItem(storageKey, key);
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
      if (!bioEntries.some(e => e.dateStr === todayStr)) {
          bioEntries.push({ dateStr: todayStr, bioData: history[todayStr]?.bioData || {} });
      }
      bioEntries.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      // Buat hari ini, bioData.nutritionCalories bisa telat/ketimpa balik oleh autosave Logym
      // sendiri (round-trip Firestore) — lomealToday didorong live dari Lomeal jadi dipakai
      // duluan, sama seperti kartu "Kalori Dimakan" (lihat DashboardTab.jsx).
      const lomealFresh = lomealToday?.ymd === todayStr ? lomealToday : null;

      const dayWeight = Number(userWeight) || 70;
      const targetSteps = activityTargets?.steps || null;
      // Target durasi HARIAN diturunkan dari target mingguan dengan pembagi yang sama dengan
      // kartu Durasi Aktif (5 hari latihan seminggu) — kalau beda, garis di grafik tidak akan
      // cocok dengan angka target di kartunya.
      const targetActive = activityTargets?.weeklyDuration ? Math.round(activityTargets.weeklyDuration / 5) : null;
      const targetSleepH = activityTargets?.sleep || null;
      const targetBurn = activityTargets?.activityCalories || null;

      bioEntries.forEach(entry => {
          const d = new Date(entry.dateStr);
          const histBio = entry.bioData;

          const actCals = Number(histBio?.activityCalories || 0);
          const nutritionKcal = entry.dateStr === todayStr && lomealFresh ? lomealFresh.kcal : histBio?.nutritionCalories;

          // Rincian kalori dibakar, rumusnya sama dengan kartu utama: BMR + langkah + latihan,
          // dengan latihan dipecah kardio/beban PER LATIHAN (splitWorkoutCalories).
          const bmr = Number(histBio?.bmr || 0);
          const stepCals = Math.round(Number(histBio?.steps || 0) * 0.04);
          let cardioCals = 0;
          let weightCals = 0;
          (history[entry.dateStr]?.workouts || [])
              .filter(w => w.status === 'completed' || w.programId === 'adhoc')
              .forEach(w => {
                  const s = splitWorkoutCalories(Number(histBio?.weight) || dayWeight, w, w.log);
                  cardioCals += s.kardio;
                  weightCals += s.beban;
              });
          // Hari yang tidak punya rincian sama sekali (mis. angka dibakar datang dari override
          // Lomeal/alat lain) tetap ditampilkan utuh sebagai satu balok, bukan hilang: sisanya
          // dimasukkan ke BMR. Tanpa ini batangnya menyusut diam-diam dan tidak cocok dengan kartu.
          const rinci = bmr + stepCals + cardioCals + weightCals;
          const bmrShown = rinci > 0 ? bmr + Math.max(0, actCals - rinci) : actCals;

          // Tahapan tidur tersimpan dalam MENIT (string) — grafiknya berskala jam.
          const stageH = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n / 60 : 0; };
          const deepH = stageH(histBio?.sleepDeep);
          const lightH = stageH(histBio?.sleepLight);
          const remH = stageH(histBio?.sleepRem);
          const awakeH = stageH(histBio?.sleepAwake);
          const totalSleep = histBio?.sleep ? Number(histBio.sleep) : null;
          const adaTahapan = deepH + lightH + remH + awakeH > 0;

          data.push({
              name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              dateFull: entry.dateStr,
              steps: histBio?.steps ? Number(histBio.steps) : null,
              nutritionCalories: nutritionKcal ? Number(nutritionKcal) : null,
              activityCalories: actCals > 0 ? actCals : null,
              calBmr: actCals > 0 ? bmrShown || null : null,
              calSteps: stepCals > 0 ? stepCals : null,
              calCardio: cardioCals > 0 ? cardioCals : null,
              calWeights: weightCals > 0 ? weightCals : null,
              activeMinutes: histBio?.activeMinutes ? Number(histBio.activeMinutes) : null,
              sleep: totalSleep,
              // Sumber yang tidak merinci tahapan tetap dapat satu balok utuh lewat sleepTotalOnly,
              // jadi hari lama tidak berubah jadi batang kosong.
              sleepDeepH: adaTahapan ? deepH || null : null,
              sleepLightH: adaTahapan ? lightH || null : null,
              sleepRemH: adaTahapan ? remH || null : null,
              sleepAwakeH: adaTahapan ? awakeH || null : null,
              sleepTotalOnly: !adaTahapan ? totalSleep : null,
              energyScore: histBio?.energyScore ? Number(histBio.energyScore) : null,
              targetSteps,
              targetActiveMinutes: targetActive,
              targetSleep: targetSleepH,
              targetCalories: lomealTargets?.kcal || targetBurn || null,
          });
      });
      return data;
  }, [history, lomealToday, activityTargets, lomealTargets, userWeight]);

  const scrollRef = useRef(null);

  // Pinch-to-zoom logic
  const [pointWidth, setPointWidth] = useState(45);
  const touchState = useRef({ initialDist: 0, initialPointWidth: 45, pinchRatio: 0, scrollRelCenterX: 0 });

  // Auto scroll ke data terbaru, default zoom 30 hari terakhir
  useEffect(() => {
     if(scrollRef.current && multiChartData.length > 0) {
        const data = multiChartData;
        const clientW = scrollRef.current?.clientWidth || (window.innerWidth - 64);

        // Hitung window 30 hari terakhir dari data point paling akhir
        const latestIdx = data.length - 1;
        const latestDate = new Date(data[latestIdx].dateFull);
        const oneMonthAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneMonthAgoStr = getLocalYMD(oneMonthAgo);

        let startIdx = latestIdx;
        while (startIdx > 0 && data[startIdx - 1].dateFull >= oneMonthAgoStr) {
            startIdx--;
        }

        const numPoints = latestIdx - startIdx + 1;
        let newPointWidth = clientW / Math.max(1.5, numPoints);
        if (newPointWidth > 200) newPointWidth = 200;
        if (newPointWidth < 25) newPointWidth = 25;
        setPointWidth(newPointWidth);

        // Scroll ke ujung kanan data terbaru
        scrollTarget.current = (latestIdx + 1) * newPointWidth - clientW;
        if (scrollTarget.current < 0) scrollTarget.current = 0;
     }
  }, [multiChartData, activeMetric]);
  const scrollTarget = useRef(null);

  const [yDomain, setYDomain] = useState(['auto', 'auto']);
  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);

  const updateYDomain = useCallback(() => {
      if (!scrollRef.current || multiChartData.length === 0) return;
      const activeObj = chartMetricsList.find(m => m.key === activeMetric);
      if (!activeObj || activeObj.isExtra) return;
      const { scrollLeft, clientWidth } = scrollRef.current;
      const pw = pointWidthRef.current;

      const startIndex = Math.max(0, Math.floor(scrollLeft / pw));
      const endIndex = Math.min(multiChartData.length - 1, Math.ceil((scrollLeft + clientWidth) / pw));
      const visibleData = multiChartData.slice(startIndex, endIndex + 1);

      let min = Infinity;
      let max = -Infinity;

      const findMinMax = (dataList) => {
          dataList.forEach(d => {
              const consider = (val) => {
                  if (val === null || val === undefined) return;
                  if (val < min) min = val;
                  if (val > max) max = val;
              };
              if (activeObj.type === 'single') {
                  consider(d[activeMetric]);
              } else {
                  // Batang bertumpuk diukur dari JUMLAH satu tumpukan, bukan tiap potongnya —
                  // pakai nilai per potong, puncak grafiknya kepotong setinggi potongan terbesar.
                  const stacks = {};
                  activeObj.subMetrics.forEach(sub => {
                      const val = d[sub.key];
                      if (val === null || val === undefined) return;
                      if (sub.stackId) stacks[sub.stackId] = (stacks[sub.stackId] || 0) + val;
                      else consider(val);
                  });
                  Object.values(stacks).forEach(consider);
              }
              // Garis target ikut diperhitungkan, kalau tidak ia bisa jatuh di luar layar persis
              // saat paling berguna: waktu targetnya jauh di atas capaian.
              if (activeObj.target) consider(d[activeObj.target]);
          });
      };

      findMinMax(visibleData);
      if (min === Infinity || max === -Infinity) findMinMax(multiChartData);

      if (min !== Infinity && max !== -Infinity) {
          const diff = max - min;
          setYDomain([0, max + diff * 0.15 || max * 1.1]);
      } else {
          setYDomain([0, 100]);
      }
  }, [multiChartData, activeMetric]);

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
          if (newWidth < 25) newWidth = 25;
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

  const chartWidth = Math.max(multiChartData.length * pointWidth, window.innerWidth - 64);
  const activeObj = chartMetricsList.find(m => m.key === activeMetric);

  return (
    <div className="p-5">
       {activeObj?.isExtra ? renderExtra(activeMetric) : (
         <div ref={scrollRef}
              onScroll={handleScroll}
              onTouchStartCapture={handleTouchStart}
              onTouchMoveCapture={handleTouchMove}
              className="w-full overflow-x-auto scrollbar-hide mb-4 touch-pan-x pt-2 flex"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
             <div style={{ width: `${chartWidth}px`, height: '224px', marginLeft: (multiChartData.length * pointWidth) < (window.innerWidth - 64) ? 'auto' : '0' }} className="cursor-crosshair relative shrink-0">
                 <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ padding: '10px 0 30px 0' }}>
                     {[0, 25, 50, 75, 100].map((pct, i) => (
                         <line key={i} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke={theme === 'dark' ? '#3f3f46' : '#cbd5e1'} strokeDasharray="3 3" strokeWidth="1" />
                     ))}
                 </svg>

                 <ComposedChart
                    width={chartWidth}
                    height={224}
                    data={multiChartData}
                    style={{ outline: 'none' }}
                    onClick={(e) => {
                        if(e && e.activePayload && e.activePayload.length > 0) {
                            onPointClick(e.activePayload[0].payload.dateFull);
                        }
                    }}
                 >
                    <defs>
                        {chartMetricsList.filter(m => !m.isExtra).map(metric => (
                            metric.type === 'single' ? (
                                <linearGradient key={metric.key} id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={metric.color} stopOpacity={1}/>
                                    <stop offset="95%" stopColor={metric.color} stopOpacity={0.3}/>
                                </linearGradient>
                            ) : (
                                metric.subMetrics.map(sub => (
                                    <linearGradient key={sub.key} id={`gradient-${sub.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={sub.color} stopOpacity={1}/>
                                        <stop offset="95%" stopColor={sub.color} stopOpacity={0.3}/>
                                    </linearGradient>
                                ))
                            )
                        ))}
                    </defs>
                    <Tooltip
                       formatter={(value, name, props) => {
                           const k = props.dataKey;
                           // Tidur ditulis "5 jam 18 mnt", bukan "5,3 h" — jam desimal itu tidak
                           // pernah jadi cara orang membaca durasi tidur.
                           if (k === 'sleep' || k?.startsWith('sleep')) return [formatSleepDuration(value), name];
                           if (k === 'targetSleep') return [formatSleepDuration(value), 'Target'];
                           if (k?.startsWith('target')) return [`${formatNumber(value, language)}${k === 'targetActiveMinutes' ? ' m' : k === 'targetSteps' ? '' : ' kcal'}`, 'Target'];
                           let unit = '';
                           if (k === 'nutritionCalories' || k === 'activityCalories' || k?.startsWith('cal')) unit = ' kcal';
                           else if (k === 'activeMinutes') unit = ' m';
                           return [`${formatNumber(value, language)}${unit}`, name];
                       }}
                       cursor={{ fill: theme === 'dark' ? '#27272a' : '#f4f4f5' }} 
                       contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: '12px', border: '1px solid ' + t.border, padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                       itemStyle={{ padding: 0, margin: 0, marginTop: '4px' }} 
                       labelStyle={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                    />
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(50 / pointWidth) - 1)} />
                    <YAxis domain={yDomain} hide={true} />
                    
                    {activeObj.type === 'single' ? (
                        <Bar
                            dataKey={activeMetric}
                            name={activeObj.label}
                            fill={`url(#gradient-${activeMetric})`}
                            radius={[50, 50, 0, 0]}
                            isAnimationActive={false}
                            maxBarSize={30}
                        />
                    ) : (
                        activeObj.subMetrics.map(sub => (
                            <Bar
                                key={sub.key}
                                dataKey={sub.key}
                                name={sub.label}
                                stackId={sub.stackId}
                                fill={`url(#gradient-${sub.key})`}
                                // Sudut membulat cuma di potongan PALING ATAS tiap tumpukan —
                                // kalau semua potongan dibulatkan, tumpukannya terlihat terputus.
                                radius={!sub.stackId || sub.top ? [50, 50, 0, 0] : [0, 0, 0, 0]}
                                isAnimationActive={false}
                                maxBarSize={sub.stackId ? 22 : 15}
                            />
                        ))
                    )}

                    {/* Garis target — gaya sama persis dengan grafik Lomeal. Per-hari (bukan garis
                        datar) supaya tetap benar kalau targetnya nanti disimpan per tanggal. */}
                    {activeObj.target && (
                        <Line
                            type="bumpX"
                            dataKey={activeObj.target}
                            name="Target"
                            stroke={TARGET_COLOR(theme)}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls
                        />
                    )}
                 </ComposedChart>
             </div>
         </div>
       )}

         <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            {chartMetricsList.map(metric => {
                const isActive = activeMetric === metric.key;
                return (
                    <button key={metric.key} onClick={() => toggleChartMetric(metric.key)} className="px-3 py-1.5 rounded-full caption font-black transition-all border active:scale-95 whitespace-nowrap snap-start flex items-center justify-center h-8" style={{ backgroundColor: isActive ? metric.color : 'transparent', borderColor: metric.color, color: isActive ? '#fff' : metric.color, opacity: isActive ? 1 : 0.5 }}>
                        {metric.label}
                    </button>
                )
            })}
         </div>
    </div>
  );
};

export default ActivityChart;
