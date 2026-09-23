import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getLocalYMD } from '../data/constants';
import { formatNumber, formatSleepDuration } from '../utils/numberFormat';
import { calculateReadiness, restingHrBaseline } from '../utils/readinessEngine';
import { dailyBurnCalories, dailyActiveMinutes } from '../utils/workoutCalc';
import { dayBmr } from '../utils/bmr';

const CustomStackedBarShape = (props) => {
  const { x, y, width, height, fill, payload, dataKey } = props;
  if (!height || height <= 0 || !width || width <= 0) return null;

  const clampedY = Math.max(5, y);
  const clampedHeight = Math.max(1, height - (clampedY - y));
  const safeWidth = Math.max(1, width);

  const isTop = payload?.topBurnKey === dataKey || payload?.topSleepKey === dataKey || payload?.topActKey === dataKey || dataKey === 'nutritionCalories';
  const r = isTop ? Math.min(safeWidth / 2, clampedHeight, 18) : 0;

  if (r > 0) {
    // Kapsul mulus dengan bagian bawah RATA (flat bottom) agar menyatu rapat tanpa celah
    const d = `M ${x},${clampedY + clampedHeight} L ${x},${clampedY + r} A ${r},${r} 0 0,1 ${x + r},${clampedY} L ${x + safeWidth - r},${clampedY} A ${r},${r} 0 0,1 ${x + safeWidth},${clampedY + r} L ${x + safeWidth},${clampedY + clampedHeight} Z`;
    return <path d={d} fill={fill} />;
  }

  // Segmen bawah/tengah berbentuk balok persegi rata sempurna
  return (
    <rect
      x={x}
      y={clampedY}
      width={safeWidth}
      height={clampedHeight}
      fill={fill}
    />
  );
};

const TARGET_COLOR = (theme) => (theme === 'dark' ? '#facc15' : '#eab308');

const DAY_MIN_PW = 20;
const MONTH_MIN_PW = 10;

const monthKeyOf = (dateStr) => (dateStr ? dateStr.substring(0, 7) : '');
const yearKeyOf = (dateStr) => (dateStr ? dateStr.substring(0, 4) : '');
const avg = (arr) => arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const round1 = (val) => val != null ? Number(Number(val).toFixed(1)) : null;
const roundInt = (val) => val != null ? Math.round(Number(val)) : null;

// metricKeys: subset opsional dari metrik di bawah yang mau ditampilin — dipakai buat misahin
// grafik Aktivitas Harian (langkah/kalori/durasi) dari grafik Tidur & Pemulihan (tidur/skor
// energi), dua instance komponen yang sama dengan localStorage key beda (storageKey) biar
// pilihan tab-nya gak saling timpa.
// extraTabs/renderExtra: tab TAMBAHAN yang ikut nempel di baris toggle yang sama (mis. Nadi/
// Tensi/SpO2 di sebelah Durasi Aktif) tapi visualisasinya beda total (bukan bar per-hari) —
// pas tab itu aktif, seluruh area chart bar diganti sama renderExtra(key), baris toggle-nya
// tetap satu biar gak makan tempat vertikal buat tab row kedua.
const ActivityChart = ({ t, theme, history, soundEnabled, playSoundEffect, onPointClick, language, lomealToday, metricKeys, storageKey = 'lyfit_activity_chart', extraTabs, renderExtra, activityTargets, lomealTargets, userWeight, userProfile }) => {
  // `stackId` = batang bertumpuk (rincian satu angka), tanpa itu = batang berdampingan.
  // Kalori: "Masuk" berdiri sendiri di sebelah tumpukan "Dibakar" yang dirinci per sumber.
  // Tidur: satu tumpukan tahapan; `total` cuma dipakai hari yang sumbernya tidak merinci tahapan.
  const chartId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const allMetrics = [
      { key: 'steps', label: 'Langkah', color: theme === 'dark' ? '#818cf8' : '#6366f1', type: 'single', target: 'targetSteps' }, // Indigo
      { key: 'calories', label: 'Kalori', color: theme === 'dark' ? '#818cf8' : '#4f46e5', type: 'grouped',  // Indigo
        target: 'targetCalories',
        subMetrics: [
            { key: 'nutritionCalories', label: 'Masuk', color: theme === 'dark' ? '#34d399' : '#059669', stackId: 'eat', top: true },
            { key: 'calBmr', label: 'BMR', color: theme === 'dark' ? '#3b82f6' : '#2563eb', stackId: 'burn' }, // Logym blue
            { key: 'calSteps', label: 'Langkah', color: theme === 'dark' ? '#818cf8' : '#6366f1', stackId: 'burn' }, // Indigo
            { key: 'calCardio', label: 'Kardio', color: theme === 'dark' ? '#9ca3af' : '#6b7280', stackId: 'burn' }, // Gray
            { key: 'calWeights', label: 'Beban', color: theme === 'dark' ? '#38bdf8' : '#0369a1', stackId: 'burn', top: true }, // Light blueblue
        ]
      },
      { key: 'activeMinutes', label: 'Durasi Aktif', color: theme === 'dark' ? '#3b82f6' : '#1d4ed8', type: 'grouped', target: 'targetActiveMinutes', // Blue
          subMetrics: [
             { key: 'actSteps', label: 'Langkah', color: theme === 'dark' ? '#818cf8' : '#6366f1', stackId: 'act' },
             { key: 'actManual', label: 'Manual', color: theme === 'dark' ? '#a1a1aa' : '#71717a', stackId: 'act' },
             { key: 'actCardio', label: 'Kardio', color: theme === 'dark' ? '#9ca3af' : '#6b7280', stackId: 'act' },
             { key: 'actWeights', label: 'Beban', color: theme === 'dark' ? '#38bdf8' : '#0369a1', stackId: 'act', top: true },
          ]
      },
      { key: 'sleep', label: 'Tidur', color: theme === 'dark' ? '#a78bfa' : '#7c3aed', type: 'grouped', target: 'targetSleep',
        subMetrics: [
            { key: 'sleepDeepH', label: 'Deep', color: theme === 'dark' ? '#8b5cf6' : '#7c3aed', stackId: 'sleep' },
            { key: 'sleepLightH', label: 'Light', color: theme === 'dark' ? '#818cf8' : '#6366f1', stackId: 'sleep' },
            { key: 'sleepRemH', label: 'REM', color: theme === 'dark' ? '#38bdf8' : '#0284c7', stackId: 'sleep' },
            { key: 'sleepAwakeH', label: 'Bangun', color: theme === 'dark' ? '#9ca3af' : '#6b7280', stackId: 'sleep', top: true },
            { key: 'sleepTotalOnly', label: 'Tidur', color: theme === 'dark' ? '#8b5cf6' : '#7c3aed', stackId: 'sleep', top: true },
        ]
      },
      // Key-nya tetap `energyScore` supaya tab yang tersimpan di localStorage user tidak reset.
      // Isinya sekarang skor kesiapan hitungan Logym — lihat titik pengisiannya di bawah.
      { key: 'energyScore', label: 'Skor Kesiapan', color: theme === 'dark' ? '#94a3b8' : '#64748b', type: 'single' }, // Slate — tidak punya target
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
      // Target durasi HARIAN diturunkan dari target mingguan (WHO) dibagi 7 hari.
      // Fallback ke dailyActiveMinutes lama untuk backward compat.
      const targetActive = activityTargets?.weeklyActiveMinutes ? Math.round(activityTargets.weeklyActiveMinutes / 7) : (activityTargets?.dailyActiveMinutes || null);
      const targetSleepH = activityTargets?.sleep || null;
      const targetBurn = activityTargets?.activityCalories || null;

      bioEntries.forEach(entry => {
          const d = new Date(entry.dateStr);
          const histBio = entry.bioData;

          const isFreshToday = entry.dateStr === todayStr && lomealFresh;
          const nutritionKcal = isFreshToday ? lomealFresh.kcal : histBio?.nutritionCalories;
          const effectiveBio = isFreshToday
            ? { ...histBio, nutritionCalories: lomealFresh.kcal, protein: lomealFresh.protein, carbs: lomealFresh.carbs, fat: lomealFresh.fat }
            : histBio;

          // Rincian kalori dibakar — rumusnya BUKAN disalin dari kartu utama, tapi fungsi yang
          // sama persis (dailyBurnCalories). Salinan terpisah di sini pernah membuat grafik dan
          // kartu menampilkan angka berbeda untuk hari yang sama.
          //
          // Totalnya juga DIHITUNG, tidak dibaca dari bioData.activityCalories: field itu dulu
          // ikut ditulis Health Connect dengan satuan berbeda (kalori aktif, tanpa BMR), jadi
          // batang hari yang tersinkron HC menyusut drastis tanpa sebab yang kelihatan.
          const burn = dailyBurnCalories(effectiveBio, history[entry.dateStr]?.workouts, dayWeight, history[entry.dateStr]?.exerciseLogs, userProfile);
          // Log hari itu ikut dikirim: menit kardio/beban dipecah dari durasi SET, bukan dari
          // jenis sesi. Tanpa argumen ini, sesi campuran kembali digolongkan all-or-nothing.
          const act = dailyActiveMinutes(histBio, history[entry.dateStr]?.workouts, history[entry.dateStr]?.exerciseLogs);
          // Hari yang benar-benar kosong tidak boleh dapat batang. dailyBurnCalories selalu
          // memberi minimal BMR fallback 1600 (konvensi yang disamakan dengan Lomeal), jadi tanpa
          // penjaga ini tiap hari tanpa data muncul sebagai batang 1600 kkal yang mengarang.
          const punyaData = Number(histBio?.bmr) > 0 || Number(histBio?.steps) > 0 || burn.sessions > 0;
          const actCals = punyaData ? burn.total : 0;
          // BMR turunan Logym, bukan angka mentah bioData.bmr. Penjaga `punyaData` di atas TETAP
          // membaca field mentah itu — perannya cuma "hari ini ada datanya", jadi hari kosong tidak
          // mendapat batang palsu setinggi BMR.
          const bmr = punyaData ? dayBmr(histBio, userProfile) : 0;
          const stepCals = burn.steps;
          const cardioCals = burn.kardio;
          const weightCals = burn.beban;
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

          let topBurnKey = null;
          if (weightCals > 0) topBurnKey = 'calWeights';
          else if (cardioCals > 0) topBurnKey = 'calCardio';
          else if (stepCals > 0) topBurnKey = 'calSteps';
          else if (bmrShown > 0) topBurnKey = 'calBmr';

          let topSleepKey = null;
          if (!adaTahapan && totalSleep > 0) topSleepKey = 'sleepTotalOnly';
          else if (awakeH > 0) topSleepKey = 'sleepAwakeH';
          else if (remH > 0) topSleepKey = 'sleepRemH';
          else if (lightH > 0) topSleepKey = 'sleepLightH';
          else if (deepH > 0) topSleepKey = 'sleepDeepH';

          let topActKey = null;
          if (act.total > 0 && act.weightMinutes > 0) topActKey = 'actWeights';
          else if (act.total > 0 && act.cardioMinutes > 0) topActKey = 'actCardio';
          else if (act.total > 0 && act.isManual) topActKey = 'actManual';
          else if (act.total > 0 && act.stepMinutes > 0) topActKey = 'actSteps';

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
              // DIHITUNG, bukan dibaca dari bioData.activeMinutes. Field itu tidak pernah ditulis
              // siapa pun kecuali input manual — dan handleSaveManualData justru MENGHAPUSNYA
              // lagi kalau nilainya sama dengan hasil hitung. Jadi untuk hampir semua hari field
              // itu tidak ada, dan batang "Durasi Aktif" selalu kosong padahal kartunya terisi.
              activeMinutes: act.total > 0 ? act.total : null,
              actSteps: act.total > 0 && act.stepMinutes > 0 && !act.isManual ? act.stepMinutes : null,
              actManual: act.total > 0 && act.isManual ? Math.max(0, act.manual - act.workoutMinutes) : null,
              actCardio: act.total > 0 && act.cardioMinutes > 0 ? act.cardioMinutes : null,
              actWeights: act.total > 0 && act.weightMinutes > 0 ? act.weightMinutes : null,
              sleep: totalSleep,
              // Sumber yang tidak merinci tahapan tetap dapat satu balok utuh lewat sleepTotalOnly,
              // jadi hari lama tidak berubah jadi batang kosong.
              sleepDeepH: adaTahapan ? deepH || null : null,
              sleepLightH: adaTahapan ? lightH || null : null,
              sleepRemH: adaTahapan ? remH || null : null,
              sleepAwakeH: adaTahapan ? awakeH || null : null,
              sleepTotalOnly: !adaTahapan ? totalSleep : null,
              // RIWAYAT SKOR KESIAPAN, dihitung ulang per hari — bukan lagi `energyScore` yang
              // diketik manual. Karena dihitung dari data yang memang sudah tersimpan (tidur,
              // tahap tidur, nadi istirahat), seluruh riwayat langsung terisi tanpa perlu menunggu
              // hari baru terkumpul. Hari tanpa data tidur mengembalikan status 'unknown' dan
              // sengaja dibiarkan kosong, bukan digambar sebagai skor 80 yang menyesatkan.
              energyScore: (() => {
                  const r = calculateReadiness(histBio, restingHrBaseline(history, entry.dateStr));
                  return r.status === 'unknown' ? null : r.score;
              })(),
              targetSteps: histBio?.targetSteps || targetSteps,
              targetActiveMinutes: (() => {
                  const raw = Number(histBio?.targetActiveMinutes);
                  if (raw > 0 && raw <= 120) return raw;
                  if (raw > 120) return Math.round(raw / 5);
                  return targetActive;
              })(),
              targetSleep: histBio?.targetSleep || targetSleepH,
              targetCalories: (() => {
                  if (lomealTargets?.kcal) {
                      const baseTdee = Number(lomealTargets.tdee) || Number(lomealTargets.kcal) || 0;
                      const programDelta = Number(lomealTargets.kcal || 0) - baseTdee;
                      if (actCals > baseTdee) {
                          return Math.round(actCals + programDelta);
                      }
                      return lomealTargets.kcal;
                  }
                  return histBio?.targetCalories || targetBurn || null;
              })(),
              topBurnKey,
              topSleepKey,
              topActKey,
          });
      });
      return data;
  }, [history, lomealToday, userWeight, activityTargets, userProfile, lomealTargets, chartId]);

  // userProfile: lihat catatan yang sama di DashboardTab — profil tiba setelah render pertama.
  // 2. Data agregasi rata-rata per bulan
  const monthlyPoints = useMemo(() => {
    const byMonth = {};
    multiChartData.forEach(p => {
      const k = monthKeyOf(p.dateFull);
      if (!byMonth[k]) {
        byMonth[k] = {
          ts: [],
          dates: [],
          steps: [],
          nutritionCalories: [],
          activityCalories: [],
          calBmr: [],
          calSteps: [],
          calCardio: [],
          calWeights: [],
          activeMinutes: [],
          actSteps: [],
          actManual: [],
          actCardio: [],
          actWeights: [],
          sleep: [],
          sleepDeepH: [],
          sleepLightH: [],
          sleepRemH: [],
          sleepAwakeH: [],
          sleepTotalOnly: [],
          energyScore: [],
          targetSteps: [],
          targetActiveMinutes: [],
          targetSleep: [],
          targetCalories: [],
        };
      }
      const dObj = new Date(p.dateFull);
      byMonth[k].ts.push(dObj.getTime());
      byMonth[k].dates.push(p.dateFull);
      if (p.steps != null) byMonth[k].steps.push(p.steps);
      if (p.nutritionCalories != null) byMonth[k].nutritionCalories.push(p.nutritionCalories);
      if (p.activityCalories != null) byMonth[k].activityCalories.push(p.activityCalories);
      if (p.calBmr != null) byMonth[k].calBmr.push(p.calBmr);
      if (p.calSteps != null) byMonth[k].calSteps.push(p.calSteps);
      if (p.calCardio != null) byMonth[k].calCardio.push(p.calCardio);
      if (p.calWeights != null) byMonth[k].calWeights.push(p.calWeights);
      if (p.activeMinutes != null) byMonth[k].activeMinutes.push(p.activeMinutes);
      if (p.actSteps != null) byMonth[k].actSteps.push(p.actSteps);
      if (p.actManual != null) byMonth[k].actManual.push(p.actManual);
      if (p.actCardio != null) byMonth[k].actCardio.push(p.actCardio);
      if (p.actWeights != null) byMonth[k].actWeights.push(p.actWeights);
      if (p.sleep != null) byMonth[k].sleep.push(p.sleep);
      if (p.sleepDeepH != null) byMonth[k].sleepDeepH.push(p.sleepDeepH);
      if (p.sleepLightH != null) byMonth[k].sleepLightH.push(p.sleepLightH);
      if (p.sleepRemH != null) byMonth[k].sleepRemH.push(p.sleepRemH);
      if (p.sleepAwakeH != null) byMonth[k].sleepAwakeH.push(p.sleepAwakeH);
      if (p.sleepTotalOnly != null) byMonth[k].sleepTotalOnly.push(p.sleepTotalOnly);
      if (p.energyScore != null) byMonth[k].energyScore.push(p.energyScore);
      if (p.targetSteps != null) byMonth[k].targetSteps.push(p.targetSteps);
      if (p.targetActiveMinutes != null) byMonth[k].targetActiveMinutes.push(p.targetActiveMinutes);
      if (p.targetSleep != null) byMonth[k].targetSleep.push(p.targetSleep);
      if (p.targetCalories != null) byMonth[k].targetCalories.push(p.targetCalories);
    });

    return Object.entries(byMonth).map(([k, v]) => {
      const avgTs = avg(v.ts);
      const d = new Date(avgTs);
      const weightCals = roundInt(avg(v.calWeights)) || 0;
      const cardioCals = roundInt(avg(v.calCardio)) || 0;
      const stepCals = roundInt(avg(v.calSteps)) || 0;
      const bmrShown = roundInt(avg(v.calBmr)) || 0;

      let topBurnKey = null;
      if (weightCals > 0) topBurnKey = 'calWeights';
      else if (cardioCals > 0) topBurnKey = 'calCardio';
      else if (stepCals > 0) topBurnKey = 'calSteps';
      else if (bmrShown > 0) topBurnKey = 'calBmr';

      const awakeH = round1(avg(v.sleepAwakeH)) || 0;
      const remH = round1(avg(v.sleepRemH)) || 0;
      const lightH = round1(avg(v.sleepLightH)) || 0;
      const deepH = round1(avg(v.sleepDeepH)) || 0;
      const totalOnly = round1(avg(v.sleepTotalOnly)) || 0;

      let topSleepKey = null;
      if (totalOnly > 0 && deepH === 0 && lightH === 0) topSleepKey = 'sleepTotalOnly';
      else if (awakeH > 0) topSleepKey = 'sleepAwakeH';
      else if (remH > 0) topSleepKey = 'sleepRemH';
      else if (lightH > 0) topSleepKey = 'sleepLightH';
      else if (deepH > 0) topSleepKey = 'sleepDeepH';

      const actWeights = roundInt(avg(v.actWeights)) || 0;
      const actCardio = roundInt(avg(v.actCardio)) || 0;
      const actSteps = roundInt(avg(v.actSteps)) || 0;
      const actManual = roundInt(avg(v.actManual)) || 0;

      let topActKey = null;
      if (actWeights > 0) topActKey = 'actWeights';
      else if (actCardio > 0) topActKey = 'actCardio';
      else if (actManual > 0) topActKey = 'actManual';
      else if (actSteps > 0) topActKey = 'actSteps';

      return {
        ts: avgTs,
        name: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        periodLabel: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        dateFull: v.dates[v.dates.length - 1],
        steps: roundInt(avg(v.steps)),
        nutritionCalories: roundInt(avg(v.nutritionCalories)),
        activityCalories: roundInt(avg(v.activityCalories)),
        calBmr: bmrShown > 0 ? bmrShown : null,
        calSteps: stepCals > 0 ? stepCals : null,
        calCardio: cardioCals > 0 ? cardioCals : null,
        calWeights: weightCals > 0 ? weightCals : null,
        activeMinutes: roundInt(avg(v.activeMinutes)),
        actSteps: actSteps > 0 ? actSteps : null,
        actManual: actManual > 0 ? actManual : null,
        actCardio: actCardio > 0 ? actCardio : null,
        actWeights: actWeights > 0 ? actWeights : null,
        sleep: round1(avg(v.sleep)),
        sleepDeepH: deepH > 0 ? deepH : null,
        sleepLightH: lightH > 0 ? lightH : null,
        sleepRemH: remH > 0 ? remH : null,
        sleepAwakeH: awakeH > 0 ? awakeH : null,
        sleepTotalOnly: totalOnly > 0 ? totalOnly : null,
        energyScore: roundInt(avg(v.energyScore)),
        targetSteps: roundInt(avg(v.targetSteps)),
        targetActiveMinutes: roundInt(avg(v.targetActiveMinutes)),
        targetSleep: round1(avg(v.targetSleep)),
        targetCalories: roundInt(avg(v.targetCalories)),
        topBurnKey,
        topSleepKey,
        topActKey,
        count: v.ts.length,
      };
    }).sort((a, b) => a.ts - b.ts);
  }, [multiChartData]);

  // 3. Data agregasi rata-rata per tahun
  const yearlyPoints = useMemo(() => {
    const byYear = {};
    monthlyPoints.forEach(p => {
      const k = yearKeyOf(p.dateFull);
      if (!byYear[k]) {
        byYear[k] = {
          ts: [],
          dates: [],
          steps: [],
          nutritionCalories: [],
          activityCalories: [],
          calBmr: [],
          calSteps: [],
          calCardio: [],
          calWeights: [],
          activeMinutes: [],
          actSteps: [],
          actManual: [],
          actCardio: [],
          actWeights: [],
          sleep: [],
          sleepDeepH: [],
          sleepLightH: [],
          sleepRemH: [],
          sleepAwakeH: [],
          sleepTotalOnly: [],
          energyScore: [],
          targetSteps: [],
          targetActiveMinutes: [],
          targetSleep: [],
          targetCalories: [],
        };
      }
      const dObj = new Date(p.ts);
      byYear[k].ts.push(dObj.getTime());
      byYear[k].dates.push(p.dateFull);
      if (p.steps != null) byYear[k].steps.push(p.steps);
      if (p.nutritionCalories != null) byYear[k].nutritionCalories.push(p.nutritionCalories);
      if (p.activityCalories != null) byYear[k].activityCalories.push(p.activityCalories);
      if (p.calBmr != null) byYear[k].calBmr.push(p.calBmr);
      if (p.calSteps != null) byYear[k].calSteps.push(p.calSteps);
      if (p.calCardio != null) byYear[k].calCardio.push(p.calCardio);
      if (p.calWeights != null) byYear[k].calWeights.push(p.calWeights);
      if (p.activeMinutes != null) byYear[k].activeMinutes.push(p.activeMinutes);
      if (p.actSteps != null) byYear[k].actSteps.push(p.actSteps);
      if (p.actManual != null) byYear[k].actManual.push(p.actManual);
      if (p.actCardio != null) byYear[k].actCardio.push(p.actCardio);
      if (p.actWeights != null) byYear[k].actWeights.push(p.actWeights);
      if (p.sleep != null) byYear[k].sleep.push(p.sleep);
      if (p.sleepDeepH != null) byYear[k].sleepDeepH.push(p.sleepDeepH);
      if (p.sleepLightH != null) byYear[k].sleepLightH.push(p.sleepLightH);
      if (p.sleepRemH != null) byYear[k].sleepRemH.push(p.sleepRemH);
      if (p.sleepAwakeH != null) byYear[k].sleepAwakeH.push(p.sleepAwakeH);
      if (p.sleepTotalOnly != null) byYear[k].sleepTotalOnly.push(p.sleepTotalOnly);
      if (p.energyScore != null) byYear[k].energyScore.push(p.energyScore);
      if (p.targetSteps != null) byYear[k].targetSteps.push(p.targetSteps);
      if (p.targetActiveMinutes != null) byYear[k].targetActiveMinutes.push(p.targetActiveMinutes);
      if (p.targetSleep != null) byYear[k].targetSleep.push(p.targetSleep);
      if (p.targetCalories != null) byYear[k].targetCalories.push(p.targetCalories);
    });

    return Object.entries(byYear).map(([k, v]) => {
      const avgTs = avg(v.ts);
      const d = new Date(avgTs);
      const weightCals = roundInt(avg(v.calWeights)) || 0;
      const cardioCals = roundInt(avg(v.calCardio)) || 0;
      const stepCals = roundInt(avg(v.calSteps)) || 0;
      const bmrShown = roundInt(avg(v.calBmr)) || 0;

      let topBurnKey = null;
      if (weightCals > 0) topBurnKey = 'calWeights';
      else if (cardioCals > 0) topBurnKey = 'calCardio';
      else if (stepCals > 0) topBurnKey = 'calSteps';
      else if (bmrShown > 0) topBurnKey = 'calBmr';

      const awakeH = round1(avg(v.sleepAwakeH)) || 0;
      const remH = round1(avg(v.sleepRemH)) || 0;
      const lightH = round1(avg(v.sleepLightH)) || 0;
      const deepH = round1(avg(v.sleepDeepH)) || 0;
      const totalOnly = round1(avg(v.sleepTotalOnly)) || 0;

      let topSleepKey = null;
      if (totalOnly > 0 && deepH === 0 && lightH === 0) topSleepKey = 'sleepTotalOnly';
      else if (awakeH > 0) topSleepKey = 'sleepAwakeH';
      else if (remH > 0) topSleepKey = 'sleepRemH';
      else if (lightH > 0) topSleepKey = 'sleepLightH';
      else if (deepH > 0) topSleepKey = 'sleepDeepH';

      const actWeights = roundInt(avg(v.actWeights)) || 0;
      const actCardio = roundInt(avg(v.actCardio)) || 0;
      const actSteps = roundInt(avg(v.actSteps)) || 0;
      const actManual = roundInt(avg(v.actManual)) || 0;

      let topActKey = null;
      if (actWeights > 0) topActKey = 'actWeights';
      else if (actCardio > 0) topActKey = 'actCardio';
      else if (actManual > 0) topActKey = 'actManual';
      else if (actSteps > 0) topActKey = 'actSteps';

      return {
        ts: avgTs,
        name: String(d.getFullYear()),
        periodLabel: `Tahun ${d.getFullYear()}`,
        dateFull: v.dates[v.dates.length - 1],
        steps: roundInt(avg(v.steps)),
        nutritionCalories: roundInt(avg(v.nutritionCalories)),
        activityCalories: roundInt(avg(v.activityCalories)),
        calBmr: bmrShown > 0 ? bmrShown : null,
        calSteps: stepCals > 0 ? stepCals : null,
        calCardio: cardioCals > 0 ? cardioCals : null,
        calWeights: weightCals > 0 ? weightCals : null,
        activeMinutes: roundInt(avg(v.activeMinutes)),
        actSteps: actSteps > 0 ? actSteps : null,
        actManual: actManual > 0 ? actManual : null,
        actCardio: actCardio > 0 ? actCardio : null,
        actWeights: actWeights > 0 ? actWeights : null,
        sleep: round1(avg(v.sleep)),
        sleepDeepH: deepH > 0 ? deepH : null,
        sleepLightH: lightH > 0 ? lightH : null,
        sleepRemH: remH > 0 ? remH : null,
        sleepAwakeH: awakeH > 0 ? awakeH : null,
        sleepTotalOnly: totalOnly > 0 ? totalOnly : null,
        energyScore: roundInt(avg(v.energyScore)),
        targetSteps: roundInt(avg(v.targetSteps)),
        targetActiveMinutes: roundInt(avg(v.targetActiveMinutes)),
        targetSleep: round1(avg(v.targetSleep)),
        targetCalories: roundInt(avg(v.targetCalories)),
        topBurnKey,
        topSleepKey,
        topActKey,
        count: v.ts.length,
      };
    }).sort((a, b) => a.ts - b.ts);
  }, [monthlyPoints]);

  const scrollRef = useRef(null);

  // Pinch-to-zoom logic
  const [pointWidth, setPointWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_pointWidth`);
      if (saved) return Number(saved);
    } catch(e) {}
    return 32;
  });
  useEffect(() => {
    localStorage.setItem(`${storageKey}_pointWidth`, pointWidth);
  }, [pointWidth, storageKey]);

  const resolutionRef = useRef(pointWidth >= DAY_MIN_PW ? 'day' : pointWidth >= MONTH_MIN_PW ? 'month' : 'year');
  const resolution = useMemo(() => {
    let cur = resolutionRef.current;
    if (cur === 'day' && pointWidth < 18) cur = 'month';
    else if (cur === 'month') {
      if (pointWidth > 24) cur = 'day';
      else if (pointWidth < 8) cur = 'year';
    } else if (cur === 'year' && pointWidth > 12) cur = 'month';

    if (cur !== resolutionRef.current) {
      resolutionRef.current = cur;
    }
    return cur;
  }, [pointWidth]);

  const chartData = resolution === 'day' ? multiChartData : resolution === 'month' ? monthlyPoints : yearlyPoints;

  const clientW = typeof window !== 'undefined' ? (window.innerWidth - 64) : 320;

  // Lebar slot per item: seragam, padat, dan rapat tanpa rongga lebar
  const slotWidth = useMemo(() => {
    if (resolution === 'day') {
      return Math.max(20, Math.min(28, Math.round(pointWidth)));
    } else if (resolution === 'month') {
      return 28;
    } else {
      return 32;
    }
  }, [resolution, pointWidth]);

  const slotWidthRef = useRef(slotWidth);
  useEffect(() => { slotWidthRef.current = slotWidth; }, [slotWidth]);

  const singleBarSize = Math.max(16, slotWidth - 4);
  const subBarSize = Math.max(10, Math.round((slotWidth - 6) / 2));
  const stackedBarSize = activeMetric === 'calories' ? subBarSize : singleBarSize;

  const contentWidth = Math.max(chartData.length * slotWidth, 40);
  const isCentered = contentWidth < clientW;

  const [visibleRange, setVisibleRange] = useState(() => ({
      start: Math.max(0, (chartData?.length || 35) - 35),
      end: Math.max(35, (chartData?.length || 35) - 1),
  }));
  const touchState = useRef({ initialDist: 0, initialPointWidth: 45, pinchRatio: 0, scrollRelCenterX: 0 });

  const updateVisibleRange = useCallback(() => {
      const el = scrollRef.current;
      if (!el || chartData.length === 0) return;
      if (contentWidth <= clientW) {
          setVisibleRange({ start: 0, end: chartData.length - 1 });
          return;
      }
      const sLeft = el.scrollLeft;
      const cWidth = el.clientWidth || clientW;
      const sWidth = slotWidthRef.current || 28;

      const start = Math.max(0, Math.floor(sLeft / sWidth));
      const end = Math.min(chartData.length - 1, Math.ceil((sLeft + cWidth) / sWidth));

      setVisibleRange(prev => {
          if (prev.start === start && prev.end === end) return prev;
          return { start, end };
      });
  }, [contentWidth, clientW, chartData.length]);

  const scrollTimeoutRef = useRef(null);

  // Native scroll event listener dengan throttling + debounce agar scrolling 120fps ultra-fluid tanpa micro-stutter
  useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      let lastCall = 0;
      const onScrollNative = () => {
          const now = performance.now();
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
          
          if (now - lastCall > 140) {
              lastCall = now;
              updateVisibleRange();
          }
          scrollTimeoutRef.current = setTimeout(() => {
              updateVisibleRange();
          }, 70);
      };
      el.addEventListener('scroll', onScrollNative, { passive: true });
      return () => {
          el.removeEventListener('scroll', onScrollNative);
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
  }, [updateVisibleRange]);

  const scrollToLatest = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (contentWidth <= clientW) {
          el.scrollLeft = 0;
          updateVisibleRange();
          return;
      }
      const target = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = target;

      requestAnimationFrame(() => {
          if (el) el.scrollLeft = contentWidth <= clientW ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
          updateVisibleRange();
      });
      setTimeout(() => {
          if (el) el.scrollLeft = contentWidth <= clientW ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
          updateVisibleRange();
      }, 50);
      setTimeout(() => {
          if (el) el.scrollLeft = contentWidth <= clientW ? 0 : Math.max(0, el.scrollWidth - el.clientWidth);
          updateVisibleRange();
      }, 180);
  }, [contentWidth, clientW, updateVisibleRange]);

  // Auto scroll ke data terbaru, default zoom 30 hari terakhir (hanya jika belum ada saved zoom)
  const hasInitializedZoom = useRef(false);
  useEffect(() => {
     if (multiChartData.length > 0 && !hasInitializedZoom.current) {
        hasInitializedZoom.current = true;
        const savedPw = localStorage.getItem(`${storageKey}_pointWidth`);

        if (savedPw) {
           scrollToLatest();
           return;
        }

        const data = multiChartData;
        const latestIdx = data.length - 1;
        const latestDate = new Date(data[latestIdx].dateFull);
        const oneMonthAgo = new Date(latestDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneMonthAgoStr = getLocalYMD(oneMonthAgo);

        let startIdx = latestIdx;
        while (startIdx > 0 && data[startIdx - 1].dateFull >= oneMonthAgoStr) {
            startIdx--;
        }

        const numPoints = latestIdx - startIdx + 1;
        let newPointWidth = clientW / Math.max(10, numPoints);
        if (newPointWidth > 32) newPointWidth = 32;
        if (newPointWidth < 22) newPointWidth = 22;
        setPointWidth(newPointWidth);

        // Scroll ke ujung kanan data terbaru
        scrollTarget.current = (latestIdx + 1) * newPointWidth - clientW;
        if (scrollTarget.current < 0) scrollTarget.current = 0;
        scrollToLatest();
     }
  }, [multiChartData.length, scrollToLatest, storageKey, clientW]);

  const scrollTarget = useRef(null);
  const pointWidthRef = useRef(pointWidth);
  useEffect(() => { pointWidthRef.current = pointWidth; }, [pointWidth]);
  const rafRef = useRef(null);

  // Deteksi pergantian resolusi (day <-> month <-> year): reset scrollTarget agar tidak melompat off-screen
  const prevResolutionRef = useRef(resolution);
  useEffect(() => {
    if (prevResolutionRef.current !== resolution) {
      prevResolutionRef.current = resolution;
      if (touchState.current.initialDist > 0) {
        // Sedang pinch-to-zoom: posisi scroll dijaga oleh pinch handler tanpa interupsi scrollToLatest
        return;
      }
      scrollTarget.current = null;
      if (contentWidth <= clientW && scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
        updateVisibleRange();
      } else {
        scrollToLatest();
      }
    }
  }, [resolution, contentWidth, clientW, scrollToLatest, updateVisibleRange]);

  useEffect(() => {
      if (contentWidth <= clientW) {
          if (scrollRef.current) scrollRef.current.scrollLeft = 0;
          scrollTarget.current = null;
          updateVisibleRange();
          return;
      }
      if (scrollTarget.current !== null && scrollRef.current) {
          const maxScroll = Math.max(0, scrollRef.current.scrollWidth - scrollRef.current.clientWidth);
          scrollRef.current.scrollLeft = Math.max(0, Math.min(maxScroll, scrollTarget.current));
          scrollTarget.current = null;
          updateVisibleRange();
      } else {
          updateVisibleRange();
      }
   }, [pointWidth, chartData, contentWidth, clientW, updateVisibleRange]);

  // Selalu tampilkan data terbaru saat user mengganti tab metrik
  useEffect(() => {
     scrollToLatest();
  }, [activeMetric, scrollToLatest]);

  const yDomain = useMemo(() => {
      if (chartData.length === 0) return ['auto', 'auto'];
      const activeObj = chartMetricsList.find(m => m.key === activeMetric);
      if (!activeObj || activeObj.isExtra) return ['auto', 'auto'];

      if (activeMetric === 'energyScore') {
          return [0, 100];
      }

      // Ambil HANYA data yang sedang terlihat di layar (viewport) saat digeser/scroll
      const start = Math.max(0, visibleRange.start);
      const end = Math.min(chartData.length - 1, visibleRange.end);
      const visibleData = (contentWidth <= clientW || start > end || chartData.length <= 15)
          ? chartData
          : chartData.slice(start, end + 1);

      let max = 0;
      visibleData.forEach(d => {
          const consider = (val) => {
              const num = Number(val);
              if (Number.isFinite(num) && num > max) max = num;
          };
          if (activeObj.type === 'single') {
              consider(d[activeMetric]);
          } else {
              const stacks = {};
              activeObj.subMetrics.forEach(sub => {
                  const val = Number(d[sub.key]);
                  if (Number.isFinite(val) && val > 0) {
                      if (sub.stackId) stacks[sub.stackId] = (stacks[sub.stackId] || 0) + val;
                      else consider(val);
                  }
              });
              Object.values(stacks).forEach(consider);
          }
          // Garis target diikutsertakan jika wajar
          if (activeObj.target && d[activeObj.target]) {
              const targetVal = Number(d[activeObj.target]);
              if (Number.isFinite(targetVal) && targetVal > 0) {
                  if (max === 0 || targetVal <= Math.max(max * 1.5, 30)) {
                      consider(targetVal);
                  }
              }
          }
      });

      if (max > 0) {
          // Beri ruang atas ~25% agar batang tertinggi di viewport selalu mengisi ~75-85% tinggi chart
          let ceiling = max * 1.25;
          // Proteksi cerdas untuk durasi aktif harian
          if (activeMetric === 'activeMinutes') {
              if (max <= 50) ceiling = Math.min(ceiling, 60);
              else if (max <= 90) ceiling = Math.min(ceiling, 115);
              else if (max <= 120) ceiling = Math.min(ceiling, 140);
          }
          if (ceiling > 1000) return [0, Math.ceil(ceiling / 100) * 100];
          if (ceiling > 100) return [0, Math.ceil(ceiling / 10) * 10];
          if (ceiling > 10) return [0, Math.ceil(ceiling / 5) * 5];
          return [0, Math.ceil(ceiling)];
      }

      const defaultCeilings = {
          steps: 10000,
          calories: 2500,
          activeMinutes: 60,
          sleep: 10,
      };
      return [0, defaultCeilings[activeMetric] || 100];
  }, [chartData, visibleRange, activeMetric, chartMetricsList]);



  const handleScroll = () => {
      if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
              updateVisibleRange();
          });
      }
  };

  const pinchRafRef = useRef(null);
  const lastCommittedWidthRef = useRef(pointWidth);

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
          const currentChartWidth = Math.max(chartData.length * slotWidthRef.current, clientW);
          
          const pinchRatio = (scrollRelCenterX + currentScrollLeft) / currentChartWidth;
          
          touchState.current = {
              initialDist: dist,
              initialPointWidth: pointWidthRef.current,
              pinchRatio,
              scrollRelCenterX,
          };
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
          if (newWidth > 40) newWidth = 40;

          // Deadzone: lewati getaran mikro jari di bawah 1px untuk menghemat render cycles
          if (Math.abs(newWidth - lastCommittedWidthRef.current) < 1.0) return;

          const calcNextSlot = (w) => {
              if (w >= DAY_MIN_PW) return Math.max(20, Math.min(28, Math.round(w)));
              if (w >= MONTH_MIN_PW) return 28;
              return 32;
          };

          const nextRes = newWidth >= DAY_MIN_PW ? 'day' : newWidth >= MONTH_MIN_PW ? 'month' : 'year';
          const nextDataLen = nextRes === 'day' ? multiChartData.length : nextRes === 'month' ? monthlyPoints.length : yearlyPoints.length;
          const nextContentWidth = nextDataLen * calcNextSlot(newWidth);

          const targetScroll = nextContentWidth <= clientW 
              ? 0 
              : Math.max(0, touchState.current.pinchRatio * Math.max(nextContentWidth, clientW) - touchState.current.scrollRelCenterX);

          scrollTarget.current = targetScroll;
          lastCommittedWidthRef.current = newWidth;

          if (!pinchRafRef.current) {
              pinchRafRef.current = requestAnimationFrame(() => {
                  pinchRafRef.current = null;
                  if (scrollRef.current) {
                      scrollRef.current.scrollLeft = targetScroll;
                  }
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
      if (contentWidth <= clientW && scrollRef.current) {
          scrollRef.current.scrollLeft = 0;
      }
      updateVisibleRange();
  };

  const activeObj = chartMetricsList.find(m => m.key === activeMetric);

  return (
    <div className="p-5 relative">
       {/* Background Grid Lines: Selalu melintang penuh di kartu, tidak pernah tergeser/hilang */}
       <div className="absolute inset-x-5 top-7 h-[224px] pointer-events-none z-0">
           <svg className="w-full h-full" style={{ padding: '10px 0 30px 0' }}>
               {[0, 25, 50, 75, 100].map((pct, i) => (
                   <line key={i} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke={theme === 'dark' ? '#3f3f46' : '#cbd5e1'} strokeDasharray="3 3" strokeWidth="1" />
               ))}
           </svg>
       </div>

       {activeObj?.isExtra ? renderExtra(activeMetric) : (
         <div ref={scrollRef}
              onScroll={handleScroll}
              onTouchStartCapture={handleTouchStart}
              onTouchMoveCapture={handleTouchMove}
              onTouchEndCapture={handleTouchEnd}
              onTouchCancelCapture={handleTouchEnd}
              className="w-full scrollbar-hide mb-4 touch-pan-x pt-2 relative z-10"
              style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x pan-y',
                  willChange: 'scroll-position',
                  transform: 'translateZ(0)',
                  contain: 'paint layout',
                  overflowX: isCentered ? 'hidden' : 'auto',
              }}>
             <div style={{
                 width: isCentered ? '100%' : `${contentWidth}px`,
                 display: isCentered ? 'flex' : 'block',
                 justifyContent: isCentered ? 'center' : undefined,
                 height: '224px',
             }} className="cursor-crosshair relative shrink-0 z-10">
                 <ComposedChart
                    width={contentWidth}
                    height={224}
                    data={chartData}
                    barGap={2}
                    barCategoryGap={3}
                    style={{ outline: 'none' }}
                    onClick={(e) => {
                        if(e && e.activePayload && e.activePayload.length > 0) {
                            onPointClick(e.activePayload[0].payload.dateFull);
                        }
                    }}
                 >
                    <Tooltip
                        cursor={{ fill: theme === 'dark' ? '#27272a' : '#f4f4f5' }}
                        content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const p = payload[0]?.payload;
                            if (!p) return null;

                            let title = '';
                            if ((resolution === 'month' || resolution === 'year') && p.periodLabel) {
                                title = p.periodLabel;
                            } else if (p.dateFull) {
                                const d = new Date(p.dateFull.includes('T') ? p.dateFull : p.dateFull + 'T12:00:00');
                                title = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                            }

                            return (
                                <div
                                    style={{
                                        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                                        borderRadius: '12px',
                                        border: '1px solid ' + t.border,
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        minWidth: '140px',
                                    }}
                                >
                                    <div style={{ color: theme === 'dark' ? '#a1a1aa' : '#71717a', marginBottom: '6px', fontSize: '10px' }}>
                                        {title}
                                    </div>

                                    {/* 1. TARGET DI PALING ATAS */}
                                    {(() => {
                                        const targetItem = payload.find(item => item.dataKey && item.dataKey.startsWith('target') && item.value != null && item.value > 0);
                                        if (!targetItem) return null;
                                        const k = targetItem.dataKey;
                                        let targetFormatted = '';
                                        if (k === 'targetSleep') {
                                            targetFormatted = formatSleepDuration(targetItem.value);
                                        } else if (k === 'targetActiveMinutes') {
                                            targetFormatted = `${formatNumber(targetItem.value, language)} m`;
                                        } else if (k === 'targetCalories') {
                                            targetFormatted = `${formatNumber(targetItem.value, language)} kcal`;
                                        } else {
                                            targetFormatted = `${formatNumber(targetItem.value, language)}`;
                                        }

                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px', paddingBottom: '4px', borderBottom: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}` }}>
                                                <span style={{ color: TARGET_COLOR(theme) }}>Target :</span>
                                                <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b', fontWeight: 'bold' }}>{targetFormatted}</span>
                                            </div>
                                        );
                                    })()}

                                    {/* 2. KONTEN METRIK AKTIF */}
                                    {activeMetric === 'calories' ? (
                                        <>
                                            {/* Kalori Masuk (Nutrisi) */}
                                            {p.nutritionCalories != null && p.nutritionCalories > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                                                    <span style={{ color: theme === 'dark' ? '#34d399' : '#059669' }}>Masuk :</span>
                                                    <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}>{formatNumber(p.nutritionCalories, language)} kcal</span>
                                                </div>
                                            )}

                                            {/* Total Dibakar */}
                                            {(() => {
                                                const totalBurn = p.activityCalories != null && p.activityCalories > 0
                                                    ? p.activityCalories
                                                    : ((p.calBmr || 0) + (p.calSteps || 0) + (p.calCardio || 0) + (p.calWeights || 0));

                                                if (!totalBurn || totalBurn <= 0) return null;

                                                const burnSubItems = [
                                                    { label: 'BMR', val: p.calBmr, color: theme === 'dark' ? '#3b82f6' : '#2563eb' },
                                                    { label: 'Langkah', val: p.calSteps, color: theme === 'dark' ? '#818cf8' : '#6366f1' },
                                                    { label: 'Kardio', val: p.calCardio, color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                                                    { label: 'Beban', val: p.calWeights, color: theme === 'dark' ? '#38bdf8' : '#0369a1' },
                                                ].filter(item => item.val != null && item.val > 0);

                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '4px', paddingTop: (p.nutritionCalories != null && p.nutritionCalories > 0) ? '4px' : '0px', borderTop: (p.nutritionCalories != null && p.nutritionCalories > 0) ? `1px dashed ${theme === 'dark' ? '#27272a' : '#e4e4e7'}` : 'none' }}>
                                                            <span style={{ color: theme === 'dark' ? '#818cf8' : '#4f46e5', fontWeight: '900' }}>Dibakar :</span>
                                                            <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b', fontWeight: '900' }}>{formatNumber(totalBurn, language)} kcal</span>
                                                        </div>
                                                        {burnSubItems.map((sub, sIdx) => (
                                                            <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '2px', paddingLeft: '8px', fontSize: '10px' }}>
                                                                <span style={{ color: sub.color }}>• {sub.label} :</span>
                                                                <span style={{ color: theme === 'dark' ? '#d4d4d8' : '#3f3f46' }}>{formatNumber(sub.val, language)} kcal</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </>
                                    ) : activeMetric === 'activeMinutes' ? (
                                        <>
                                            {p.activeMinutes != null && p.activeMinutes > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                                                    <span style={{ color: theme === 'dark' ? '#3b82f6' : '#1d4ed8', fontWeight: '900' }}>Durasi Aktif :</span>
                                                    <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b', fontWeight: '900' }}>{formatNumber(p.activeMinutes, language)} m</span>
                                                </div>
                                            )}
                                            {(() => {
                                                const actSubItems = [
                                                    { label: 'Langkah', val: p.actSteps, color: theme === 'dark' ? '#818cf8' : '#6366f1' },
                                                    { label: 'Manual', val: p.actManual, color: theme === 'dark' ? '#a1a1aa' : '#71717a' },
                                                    { label: 'Kardio', val: p.actCardio, color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                                                    { label: 'Beban', val: p.actWeights, color: theme === 'dark' ? '#38bdf8' : '#0369a1' },
                                                ].filter(item => item.val != null && item.val > 0);

                                                return actSubItems.map((sub, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '2px', paddingLeft: '8px', fontSize: '10px' }}>
                                                        <span style={{ color: sub.color }}>• {sub.label} :</span>
                                                        <span style={{ color: theme === 'dark' ? '#d4d4d8' : '#3f3f46' }}>{formatNumber(sub.val, language)} m</span>
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : activeMetric === 'sleep' ? (
                                        <>
                                            {p.sleep != null && p.sleep > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                                                    <span style={{ color: theme === 'dark' ? '#c4b5fd' : '#7c3aed', fontWeight: '900' }}>Total Tidur :</span>
                                                    <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b', fontWeight: '900' }}>{formatSleepDuration(p.sleep)}</span>
                                                </div>
                                            )}
                                            {(() => {
                                                const sleepSubItems = [
                                                    { label: 'Deep', val: p.sleepDeepH, color: theme === 'dark' ? '#8b5cf6' : '#7c3aed' },
                                                    { label: 'Light', val: p.sleepLightH, color: theme === 'dark' ? '#818cf8' : '#6366f1' },
                                                    { label: 'REM', val: p.sleepRemH, color: theme === 'dark' ? '#38bdf8' : '#0284c7' },
                                                    { label: 'Bangun', val: p.sleepAwakeH, color: theme === 'dark' ? '#9ca3af' : '#6b7280' },
                                                ].filter(item => item.val != null && item.val > 0);

                                                return sleepSubItems.map((sub, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '2px', paddingLeft: '8px', fontSize: '10px' }}>
                                                        <span style={{ color: sub.color }}>• {sub.label} :</span>
                                                        <span style={{ color: theme === 'dark' ? '#d4d4d8' : '#3f3f46' }}>{formatSleepDuration(sub.val)}</span>
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : (
                                        payload.map((item, idx) => {
                                            const k = item.dataKey;
                                            if (!k || item.value == null || item.value === 0 || k.startsWith('target')) return null;
                                            let unit = '';
                                            if (k === 'energyScore') unit = ' / 100';
                                            return (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                                                    <span style={{ color: item.color || item.fill || (theme === 'dark' ? '#f4f4f5' : '#18181b') }}>{item.name} :</span>
                                                    <span style={{ color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}>{formatNumber(item.value, language)}{unit}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            );
                        }}
                    />
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#a1a1aa' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(30 / slotWidth) - 1)} />
                    <YAxis domain={yDomain} hide={true} allowDataOverflow={true} />
                    
                    {activeObj.type === 'single' ? (
                        <Bar
                            dataKey={activeMetric}
                            name={activeObj.label}
                            fill={activeObj.color}
                            radius={[12, 12, 0, 0]}
                            isAnimationActive={false}
                            barSize={singleBarSize}
                        />
                    ) : (
                        activeObj.subMetrics.map(sub => {
                            if (!sub.stackId) {
                                return (
                                    <Bar
                                        key={sub.key}
                                        dataKey={sub.key}
                                        name={sub.label}
                                        fill={sub.color}
                                        radius={[12, 12, 0, 0]}
                                        isAnimationActive={false}
                                        barSize={subBarSize}
                                    />
                                );
                            }

                            return (
                                <Bar
                                    key={sub.key}
                                    dataKey={sub.key}
                                    name={sub.label}
                                    stackId={sub.stackId}
                                    fill={sub.color}
                                    shape={<CustomStackedBarShape chartId={chartId} />}
                                    isAnimationActive={false}
                                    barSize={stackedBarSize}
                                />
                            );
                        })
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
                            allowDataOverflow={true}
                            connectNulls
                        />
                    )}
                 </ComposedChart>
             </div>
         </div>
       )}


       {activeMetric === 'sleep' && (
           <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mb-4 px-2" style={{ fontSize: '10px' }}>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme === 'dark' ? '#9ca3af' : '#6b7280' }}></div><span className="opacity-70">Bangun</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme === 'dark' ? '#38bdf8' : '#0284c7' }}></div><span className="opacity-70">REM</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme === 'dark' ? '#818cf8' : '#6366f1' }}></div><span className="opacity-70">Light</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme === 'dark' ? '#8b5cf6' : '#7c3aed' }}></div><span className="opacity-70">Deep</span></div>
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
