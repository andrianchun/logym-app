/**
 * Readiness Engine — skor kesiapan latihan 0-100, dihitung Logym sendiri.
 * Deterministik, tanpa panggilan API.
 *
 * SEJARAH YANG PENTING: versi lama memakai `energyScore` sebagai input, yaitu angka milik Samsung
 * Health yang harus diketik user manual — Samsung tidak pernah mengekspornya ke Health Connect.
 * Praktisnya field itu selalu kosong, jadi skornya cuma mencerminkan durasi tidur. Sekarang
 * dihitung dari sinyal yang BENAR-BENAR ada di Health Connect + kurva sirkadian + kafein Lomeal.
 *
 * HRV sengaja tidak dipakai sebagai syarat wajib: Samsung tidak mengekspornya ke Health Connect.
 * RHR dibandingkan BASELINE adalah penggantinya yang sah — naiknya nadi istirahat terhadap
 * kebiasaan sendiri itu penanda lelah/sakit yang dipakai Oura & Whoop juga.
 */

const MIN_BASELINE_DAYS = 3;
const BASELINE_WINDOW = 14;
const SLEEP_BUFFER_WINDOW = 3;

/**
 * Rata-rata nadi istirahat dari `history`, sampai `BASELINE_WINDOW` hari SEBELUM `ymd`.
 * Hari yang dinilai sengaja tidak ikut — kalau ikut, hari yang buruk menaikkan baselinenya
 * sendiri dan sebagian sinyalnya hilang.
 * @returns {number|null} null kalau datanya belum cukup
 */
export const restingHrBaseline = (history, ymd) => {
  if (!history || !ymd) return null;
  const akhir = new Date(`${ymd}T12:00:00`);
  const nilai = [];
  for (let i = 1; i <= BASELINE_WINDOW; i++) {
    const d = new Date(akhir);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = Number(history?.[key]?.bioData?.restingHeartRate);
    if (Number.isFinite(v) && v > 0) nilai.push(v);
  }
  if (nilai.length < MIN_BASELINE_DAYS) return null;
  return nilai.reduce((a, b) => a + b, 0) / nilai.length;
};

/**
 * Rata-rata durasi tidur dari 3 hari SEBELUM `ymd` (Multi-Day Sleep Buffer).
 * Jika 2-3 hari sebelumnya tidur cukup (>= 7 jam), kurang tidur 1 malam saja tidak
 * langsung menghukum tubuh jatuh ke kondisi kritis.
 * @returns {{avgSleep:number, daysCount:number}|null}
 */
export const sleepHistoryBaseline = (history, ymd) => {
  if (!history || !ymd) return null;
  const akhir = new Date(`${ymd}T12:00:00`);
  const nilai = [];
  for (let i = 1; i <= SLEEP_BUFFER_WINDOW; i++) {
    const d = new Date(akhir);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const s = parseFloat(history?.[key]?.bioData?.sleep);
    if (Number.isFinite(s) && s > 0) nilai.push(s);
  }
  if (nilai.length < 2) return null;
  const avgSleep = nilai.reduce((a, b) => a + b, 0) / nilai.length;
  return { avgSleep, daysCount: nilai.length };
};

/**
 * Skor kesiapan dasar (pagi hari) dari bioData tidur + deviasi nadi istirahat.
 * @param {object} bio - bioData hari yang dinilai
 * @param {number|null} baselineRhr - hasil restingHrBaseline (boleh null)
 * @returns {{score:number, status:string, message:string, parts:object}}
 */
export const calculateReadiness = (bio, baselineRhr = null) => {
  const b = bio || {};
  const sleep = parseFloat(b.sleep) || 0;
  const rhr = Number(b.restingHeartRate) || 0;
  const deep = Number(b.sleepDeep) || 0;
  const rem = Number(b.sleepRem) || 0;
  const light = Number(b.sleepLight) || 0;
  const awake = Number(b.sleepAwake) || 0;

  let score = 100;
  const alasan = [];
  const parts = {};

  // 1. DURASI TIDUR — bobot terbesar, dan satu-satunya yang bisa membuat skor "unknown".
  if (sleep > 0) {
    parts.sleep = sleep;
    if (sleep < 5) alasan.push({ potong: 35, status: 'critical', msg: `Cuma ${sleep} jam tidur semalam. Kurangi volume latihan hari ini (deload) supaya tidak mengundang cedera.` });
    else if (sleep < 6) alasan.push({ potong: 20, status: 'warning', msg: `Tidurmu ${sleep} jam, di bawah kebutuhan. Turunkan beban dan jangan kejar PR hari ini.` });
    else if (sleep < 7) alasan.push({ potong: 10, status: 'warning', msg: `Tidur ${sleep} jam, sedikit kurang. Pemanasan ekstra sebelum set berat.` });
  } else {
    score = 80;
    return {
      score, status: 'unknown', parts,
      message: 'Bagaimana tidurmu semalam? Catat dulu durasinya untuk hitung skor kesiapan.',
    };
  }

  // 2. TAHAP TIDUR — porsi nyenyak (deep) + mimpi (REM) dari total.
  const totalStage = deep + rem + light + awake;
  if (totalStage > 0) {
    const pulih = (deep + rem) / totalStage;
    parts.restorativePct = Math.round(pulih * 100);
    if (pulih < 0.30) alasan.push({ potong: 15, status: 'warning', msg: `Tidurmu ${sleep} jam tapi cuma ${Math.round(pulih * 100)}% nyenyak (deep+REM). Jangan paksakan set maksimal.` });
    else if (pulih < 0.40) alasan.push({ potong: 5, status: 'optimal', msg: '' });
  }

  // 3. DEVIASI NADI ISTIRAHAT terhadap kebiasaan sendiri.
  if (rhr > 0 && baselineRhr) {
    const delta = rhr - baselineRhr;
    parts.rhr = rhr;
    parts.rhrBaseline = Math.round(baselineRhr);
    parts.rhrDelta = Math.round(delta);
    const naik = Math.round(delta);
    if (delta >= 10) alasan.push({ potong: 40, status: 'critical', msg: `Nadi istirahatmu ${rhr} bpm, naik +${naik} dari kebiasaan (${Math.round(baselineRhr)}). Tubuh belum pulih, sebaiknya istirahat hari ini.` });
    else if (delta >= 6) alasan.push({ potong: 25, status: 'critical', msg: `Nadi istirahat ${rhr} bpm, naik +${naik} dari kebiasaan. Tubuh masih memulihkan diri, pilih sesi ringan.` });
    else if (delta >= 3) alasan.push({ potong: 10, status: 'warning', msg: `Nadi istirahat sedikit di atas kebiasaan (+${naik} bpm). Boleh latihan, tapi dengarkan tubuhmu.` });
  }

  alasan.forEach((a) => { score -= a.potong; });
  score = Math.max(0, Math.min(100, score));

  const terberat = alasan.filter((a) => a.msg).sort((a, b) => b.potong - a.potong)[0];
  if (!terberat) {
    return { score, status: 'optimal', parts, message: 'Kondisi prima. Tidur cukup dan nadi istirahat normal, siap hajar PR hari ini!' };
  }
  return { score, status: terberat.status, parts, message: terberat.msg };
};

/**
 * Skor Tidur 0-100 — dihitung terpisah dari Skor Energi agar user melihat kualitas tidur
 * murni (durasi terhadap target + porsi Deep/REM + efisiensi terjaga).
 * @param {object} bio - bioData malam yang dinilai
 * @param {number} targetSleepHours - target durasi tidur (default 8 jam)
 * @returns {{score:number, status:string, label:string, durationScore:number, qualityScore:number, restorativePct:number|null}}
 */
export const calculateSleepScore = (bio, targetSleepHours = 8) => {
  const b = bio || {};
  const sleep = parseFloat(b.sleep) || 0;
  if (sleep <= 0) {
    return {
      score: 0,
      status: 'unknown',
      label: 'Belum Diisi',
      durationScore: 0,
      qualityScore: 0,
      restorativePct: null,
    };
  }

  const target = Math.max(6, Math.min(10, Number(targetSleepHours) || 8));
  const deep = Number(b.sleepDeep) || 0;
  const rem = Number(b.sleepRem) || 0;
  const light = Number(b.sleepLight) || 0;
  const awake = Number(b.sleepAwake) || 0;
  const totalStage = deep + rem + light + awake;

  // 1. Skor Durasi (maks 65 poin)
  let durationScore = 65;
  if (sleep < target * 0.92 && sleep < 7.25) {
    const denom = Math.max(6.5, target * 0.92);
    durationScore = Math.max(10, Math.round(65 * Math.min(1, sleep / denom)));
  } else if (sleep > Math.max(9.5, target + 1.5)) {
    const excess = sleep - Math.max(9.5, target + 1.5);
    durationScore = Math.max(45, Math.round(65 - excess * 5));
  }

  let qualityScore = 0;
  let restorativePct = null;
  let score = 0;

  // 2. Skor Kualitas Tahapan (maks 35 poin: 25 Deep+REM + 10 efisiensi terjaga)
  if (totalStage > 0) {
    const restorativeRatio = (deep + rem) / totalStage;
    const awakeRatio = awake / totalStage;
    restorativePct = Math.round(restorativeRatio * 100);

    const restorativePts = Math.round(25 * Math.min(1, restorativeRatio / 0.38));
    const efficiencyPts = awakeRatio <= 0.08
      ? 10
      : Math.max(0, Math.round(10 * (1 - (awakeRatio - 0.08) / 0.22)));
    qualityScore = restorativePts + efficiencyPts;
    score = Math.max(0, Math.min(100, durationScore + qualityScore));
  } else {
    // Tanpa rincian tahapan (input durasi saja): skala proporsional maks 95
    score = Math.max(0, Math.min(95, Math.round((durationScore / 65) * 95)));
    qualityScore = Math.max(0, score - durationScore);
  }

  let status = 'critical';
  let label = 'Kurang';
  if (score >= 85) {
    status = 'optimal';
    label = 'Sangat Baik';
  } else if (score >= 70) {
    status = 'good';
    label = 'Baik';
  } else if (score >= 55) {
    status = 'warning';
    label = 'Cukup';
  }

  return {
    score,
    status,
    label,
    durationScore,
    qualityScore,
    restorativePct,
  };
};

/**
 * Konversi status readiness ke kategori wellness harian (prima | doms | deload).
 * Dipakai sebagai nilai awal otomatis di WorkoutTab, namun user tetap bebas mengubahnya manual.
 * @param {{score:number, status:string}|null} readiness
 * @returns {'prima'|'doms'|'deload'}
 */
export const readinessToWellness = (readiness) => {
  if (!readiness || readiness.status === 'unknown') return 'prima';
  if (readiness.status === 'critical' || readiness.score < 60) return 'deload';
  if (readiness.status === 'warning' || readiness.score < 80) return 'doms';
  return 'prima';
};

// ---------------------------------------------------------------------------
// INTRADAY DYNAMIC READINESS + CAFFEINE / LOMEAL PHARMACOKINETICS
// ---------------------------------------------------------------------------

const CAFFEINE_KEYWORDS = [
  { rx: /\b(pre[\s-]?workout|pwo|c4|gorilla\s?mode|total\s?war)\b/i, mg: 175, label: 'Pre-Workout' },
  { rx: /\b(double\s?espresso|cold\s?brew)\b/i, mg: 140, label: 'Kopi Kuat' },
  { rx: /\b(energy\s?drink|red\s?bull|monster|kratingdaeng|extra\s?joss|kuku\s?bima)\b/i, mg: 110, label: 'Energy Drink' },
  { rx: /\b(espresso|americano|kopi|coffee|latte|cappuccino|macchiato|mocha|flat\s?white|v60|arabika|robusta)\b/i, mg: 95, label: 'Kopi' },
  { rx: /\b(matcha)\b/i, mg: 70, label: 'Matcha' },
  { rx: /\b(green\s?tea|teh\s?hijau|oolong|black\s?tea|teh\s?hitam|earl\s?grey|thai\s?tea)\b/i, mg: 45, label: 'Teh' },
];

const parseHourFromTimestamp = (ts) => {
  if (ts == null) return null;
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    if (ts >= 0 && ts <= 24) return ts;
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.getHours() + d.getMinutes() / 60;
    return null;
  }
  if (typeof ts === 'string') {
    const hm = ts.match(/^(\d{1,2}):(\d{2})/);
    if (hm) {
      const h = parseInt(hm[1], 10);
      const m = parseInt(hm[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60;
    }
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.getHours() + d.getMinutes() / 60;
  }
  return null;
};

/**
 * Mengekstrak daftar konsumsi kafein/stimulan hari itu dari `lomealDay` maupun `bioData`.
 * Mendukung 3 sumber:
 *  1. Array terstruktur `caffeineLogs: [{ mg, hour|consumedAt|time, source }]`
 *  2. Ringkasan `caffeine: { totalMg|mg, lastConsumedAt|consumedAt|hour, source }`
 *  3. Deteksi nama makanan/minuman berkafein pada `lomealDay.meals` / `lomealDay.items`
 * @returns {Array<{hour:number, mg:number, source:string}>}
 */
export const extractCaffeineEvents = (bio = null, lomealDay = null) => {
  const events = [];

  const pushLogArray = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      if (!item) return;
      const mg = Number(item.mg ?? item.caffeineMg ?? item.amount ?? 0);
      const hour = parseHourFromTimestamp(item.hour ?? item.consumedAt ?? item.timestamp ?? item.time);
      if (mg > 0 && hour !== null) {
        events.push({
          hour,
          mg: Math.min(600, mg),
          source: item.source || item.name || 'Kafein',
        });
      }
    });
  };

  pushLogArray(lomealDay?.caffeineLogs);
  pushLogArray(bio?.caffeineLogs);

  if (events.length === 0) {
    const cafObj = lomealDay?.caffeine || bio?.caffeine;
    if (cafObj && typeof cafObj === 'object') {
      const mg = Number(cafObj.totalMg ?? cafObj.mg ?? 0);
      const hour = parseHourFromTimestamp(cafObj.lastConsumedAt ?? cafObj.consumedAt ?? cafObj.hour ?? cafObj.time);
      if (mg > 0 && hour !== null) {
        events.push({
          hour,
          mg: Math.min(600, mg),
          source: cafObj.source || 'Kafein',
        });
      }
    }
  }

  // Fallback cerdas: baca daftar log makan/minum Lomeal jika field `caffeine` terstruktur belum tersedia
  if (events.length === 0) {
    const mealList = lomealDay?.meals || lomealDay?.items || lomealDay?.logs || [];
    if (Array.isArray(mealList)) {
      mealList.forEach((m) => {
        const name = String(m?.name || m?.title || m?.food || '');
        if (!name) return;
        const explicitMg = Number(m?.caffeineMg ?? m?.caffeine ?? 0);
        const hour = parseHourFromTimestamp(m?.hour ?? m?.consumedAt ?? m?.timestamp ?? m?.time ?? m?.createdAt);
        if (explicitMg > 0 && hour !== null) {
          events.push({ hour, mg: Math.min(600, explicitMg), source: name });
          return;
        }
        for (const rule of CAFFEINE_KEYWORDS) {
          if (rule.rx.test(name)) {
            const h = hour !== null ? hour : 9; // fallback pagi jika tidak ada jam
            events.push({ hour: h, mg: rule.mg, source: rule.label });
            break;
          }
        }
      });
    }
  }

  return events.sort((a, b) => a.hour - b.hour);
};

/**
 * Hitung kurva farmakokinetik kafein pada jam `hour` (0..23.9).
 * - Penyerapan cepat menuju puncak di 45 menit (0.75 jam) setelah konsumsi.
 * - Waktu paruh (half-life) 4.5 jam.
 * - Boost kesiapan dibatasi maks +18 poin agar realistis dan tidak menutupi kelelahan ekstrem.
 * @returns {{boost:number, activeMg:number, primarySource:string|null}}
 */
export const caffeineBoostAtHour = (caffeineEvents, hour) => {
  if (!Array.isArray(caffeineEvents) || caffeineEvents.length === 0) {
    return { boost: 0, activeMg: 0, primarySource: null };
  }

  let totalActiveMg = 0;
  let strongestMg = 0;
  let primarySource = null;

  for (const ev of caffeineEvents) {
    const dt = hour - ev.hour;
    if (dt < 0 || dt > 12) continue;

    let factor = 0;
    if (dt < 0.75) {
      // Penyerapan cepat menuju puncak (smooth ease-out)
      const p = dt / 0.75;
      factor = 0.25 + 0.75 * p;
    } else {
      // Half-life biologis rata-rata 4.5 jam
      factor = Math.pow(0.5, (dt - 0.75) / 4.5);
    }

    const active = ev.mg * factor;
    if (active >= 8) {
      totalActiveMg += active;
      if (active > strongestMg) {
        strongestMg = active;
        primarySource = ev.source || 'Kafein';
      }
    }
  }

  // Skala non-linear: 100mg aktif ~ +10 poin, 200mg+ ~ mentok +18 poin
  const rawBoost = totalActiveMg > 0 ? Math.min(18, Math.round(18 * (1 - Math.exp(-totalActiveMg / 125)))) : 0;
  return {
    boost: rawBoost,
    activeMg: Math.round(totalActiveMg),
    primarySource: rawBoost > 0 ? primarySource : null,
  };
};

/**
 * Ekstrak beban lelah dari sesi latihan hari itu untuk mengurangi energi pasca-latihan.
 * @returns {Array<{hour:number, drain:number, name:string}>}
 */
export const extractWorkoutDrainEvents = (workouts = []) => {
  if (!Array.isArray(workouts) || workouts.length === 0) return [];
  const res = [];
  for (const w of workouts) {
    if (!w) continue;
    const isCompleted = w.status === 'completed' || Number(w.calories) > 0 || Number(w.duration) > 0;
    if (!isCompleted) continue;
    const hour = parseHourFromTimestamp(w.completedAt ?? w.timestamp ?? w.endTime ?? w.startTime ?? w.time);
    if (hour === null) continue;
    const kcal = Number(w.calories) || 0;
    const durMins = typeof w.duration === 'number' ? w.duration : 0;
    const drain = kcal > 0
      ? Math.max(5, Math.min(16, Math.round(kcal / 35)))
      : Math.max(5, Math.min(14, Math.round(durMins / 5)));
    res.push({
      hour,
      drain,
      name: w.programName || w.name || 'Latihan',
    });
  }
  return res.sort((a, b) => a.hour - b.hour);
};

/**
 * Menentukan jam bangun dari sleepLog (jika tersedia), default 06:00.
 */
const resolveWakeHour = (bio, explicitWakeHour = null) => {
  if (typeof explicitWakeHour === 'number' && Number.isFinite(explicitWakeHour)) {
    return Math.max(4, Math.min(11, Math.floor(explicitWakeHour)));
  }
  const sleepLog = bio?.sleepLog;
  if (Array.isArray(sleepLog) && sleepLog.length > 0) {
    const last = sleepLog[sleepLog.length - 1];
    const h = parseHourFromTimestamp(last?.time);
    if (h !== null && h >= 4 && h <= 11) {
      return Math.floor(h);
    }
  }
  return 6;
};

/**
 * Menghasilkan kurva energi dinamis per jam sepanjang hari (Intraday Energy Curve).
 * Memperhitungkan:
 *  1. Baseline pagi (durasi tidur, tahap Deep+REM, RHR vs baseline, dan Multi-Day Sleep Buffer).
 *  2. Ritme sirkadian & penumpukan adenosin (segar di pagi hari, melandai turun di sore/malam —
 *     penurunan jauh lebih curam bila semalam kurang tidur).
 *  3. Efek lelah pasca-latihan (workout drain).
 *  4. Dorongan energi sementara dari kafein / pre-workout Lomeal.
 */
export const generateIntradayEnergyCurve = ({
  bio,
  baselineRhr = null,
  sleepBuffer = null,
  workouts = [],
  caffeineEvents = [],
  wakeHour: explicitWakeHour = null,
} = {}) => {
  const base = calculateReadiness(bio, baselineRhr);
  if (base.status === 'unknown') {
    return {
      status: 'unknown',
      morningScore: base.score,
      points: [],
      peakScore: null,
      avgScore: null,
      wakeHour: 6,
      caffeineEvents,
      baseReadiness: base,
    };
  }

  const sleep = parseFloat(bio?.sleep) || 0;
  const restorativePct = base.parts?.restorativePct ?? null;

  // 1. Penyesuaian Resiliensi Pagi (mirip Samsung Health Energy Score):
  //    - Multi-day sleep buffer: kalau 3 hari sebelumnya tidur cukup (>= 7j), kurang tidur
  //      1 malam tidak langsung menjatuhkan skor pagi terlalu ekstrem.
  //    - Restorative sleep bonus: tidur agak pendek (5-6.9j) tapi porsi Deep+REM >= 35%.
  let morningBonus = 0;
  if (sleep > 0 && sleep < 7 && sleepBuffer?.avgSleep >= 7) {
    morningBonus += Math.min(8, Math.round((sleepBuffer.avgSleep - 6.5) * 4));
  }
  if (sleep >= 5 && sleep < 7 && restorativePct !== null && restorativePct >= 35) {
    morningBonus += 4;
  }

  const morningScore = Math.max(10, Math.min(100, base.score + morningBonus));
  const wakeHour = resolveWakeHour(bio, explicitWakeHour);
  const workoutDrains = extractWorkoutDrainEvents(workouts);

  // Laju kelelahan per jam bangun (adenosine pressure):
  // Jika tidur cukup (>=7j), energi bertahan stabil seharian; jika kurang tidur (<6j), sore cepat drop.
  const hourlyDecay = sleep >= 7 ? 0.75 : (sleep >= 6 ? 1.3 : 1.95);
  const dipDepth = sleep >= 7 ? 5 : (sleep >= 6 ? 10 : 16);

  const points = [];
  for (let h = wakeHour; h <= 23; h++) {
    const hoursAwake = h - wakeHour;

    // A. Cortisol Awakening Response (0-2 jam setelah bangun -> puncak segar pagi)
    const morningLift = hoursAwake <= 2 ? Math.round(Math.sin((hoursAwake / 2) * Math.PI) * 3) : 0;

    // B. Penumpukan adenosin linear sejak bangun
    const awakeFatigue = hoursAwake * hourlyDecay;

    // C. Afternoon Circadian Dip (kurva lonceng berpusat di jam 15:30)
    const distFromDip = h - 15.5;
    const circadianDip = dipDepth * Math.exp(-(distFromDip * distFromDip) / 4.5);

    // D. Evening Wind-Down (melatonin naik setelah jam 20:00)
    const eveningDrop = h >= 20 ? (h - 19) * 2.5 : 0;

    // E. Workout Drain (kelelahan fisik pasca olahraga, perlahan pulih sebagian dalam 4 jam)
    let totalWorkoutDrain = 0;
    let workoutLabel = null;
    for (const w of workoutDrains) {
      const dtW = h - w.hour;
      if (dtW >= 0) {
        const recovery = Math.min(0.35, dtW * 0.08);
        totalWorkoutDrain += w.drain * (1 - recovery);
        if (dtW < 1) workoutLabel = w.name;
      }
    }

    const baseScore = Math.max(
      5,
      Math.min(100, Math.round(morningScore + morningLift - awakeFatigue - circadianDip - eveningDrop - totalWorkoutDrain))
    );

    // F. Caffeine / Stimulant Boost dari Lomeal
    const caf = caffeineBoostAtHour(caffeineEvents, h);
    const score = Math.max(5, Math.min(100, baseScore + caf.boost));

    // Tandai momen konsumsi kafein tepat di jam tersebut
    const cafMoment = caffeineEvents.find((ev) => Math.floor(ev.hour) === h);

    points.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      score,
      baseScore,
      caffeineBoost: caf.boost,
      caffeineSource: caf.primarySource,
      workoutDrain: Math.round(totalWorkoutDrain),
      eventType: cafMoment ? 'caffeine' : (workoutLabel ? 'workout' : null),
      eventLabel: cafMoment ? cafMoment.source : (workoutLabel || null),
    });
  }

  const peakScore = points.reduce((m, p) => Math.max(m, p.score), 0);
  const avgScore = points.length > 0
    ? Math.round(points.reduce((s, p) => s + p.score, 0) / points.length)
    : morningScore;

  return {
    status: base.status,
    morningScore,
    morningBonus,
    points,
    peakScore,
    avgScore,
    wakeHour,
    caffeineEvents,
    baseReadiness: base,
  };
};

/**
 * Menghitung skor kesiapan dinamis real-time untuk hari ini (atau ringkasan untuk hari lampau).
 * Menggabungkan tidur, RHR, sleep buffer 3 hari, ritme sirkadian jam saat ini, dan boost kafein Lomeal.
 */
export const calculateDynamicReadiness = (bio, baselineRhr = null, options = {}) => {
  const {
    history = null,
    ymd = null,
    workouts = [],
    lomealDay = null,
    hour = null,
    isToday = true,
    wakeHour = null,
  } = options;

  const sleepBuffer = options.sleepBuffer !== undefined
    ? options.sleepBuffer
    : (history && ymd ? sleepHistoryBaseline(history, ymd) : null);

  const caffeineEvents = options.caffeineEvents !== undefined
    ? options.caffeineEvents
    : extractCaffeineEvents(bio, lomealDay);

  const curve = generateIntradayEnergyCurve({
    bio,
    baselineRhr,
    sleepBuffer,
    workouts,
    caffeineEvents,
    wakeHour,
  });

  if (curve.status === 'unknown') {
    return {
      ...curve.baseReadiness,
      morningScore: curve.morningScore,
      baseScore: curve.morningScore,
      caffeineBoost: 0,
      caffeineSource: null,
      curve,
    };
  }

  const nowHour = typeof hour === 'number' && Number.isFinite(hour)
    ? Math.max(0, Math.min(23, Math.floor(hour)))
    : new Date().getHours();

  // Jika melihat hari lampau, pakai rata-rata harian aktif (atau pagi jika tidak ada kurva)
  const activePoint = isToday
    ? (curve.points.find((p) => p.hour === nowHour) || curve.points[curve.points.length - 1] || curve.points[0])
    : null;

  const score = isToday && activePoint ? activePoint.score : curve.avgScore;
  const baseScore = isToday && activePoint ? activePoint.baseScore : curve.morningScore;
  const caffeineBoost = isToday && activePoint ? activePoint.caffeineBoost : 0;
  const caffeineSource = isToday && activePoint ? activePoint.caffeineSource : null;

  const status = score >= 80 ? 'optimal' : (score >= 60 ? 'warning' : 'critical');
  const sleep = parseFloat(bio?.sleep) || 0;

  let message = curve.baseReadiness.message;
  if (isToday) {
    if (caffeineBoost >= 5 && caffeineSource) {
      message = score >= 80
        ? `Energi terangkat +${caffeineBoost} poin dari ${caffeineSource}. Kondisi siap hajar sesi latihan.`
        : `Terbantu ${caffeineSource} (+${caffeineBoost} poin), namun cadangan tidur tetap perlu dijaga.`;
    } else if (nowHour >= 14 && nowHour <= 18 && sleep > 0 && sleep < 6) {
      message = `Tidur ${sleep} jam mulai terasa di sore hari. Fokus teknik form atau kurangi beban set berat.`;
    } else if (nowHour >= 20 && score < 70) {
      message = 'Energi melandai menuju jam istirahat. Pilih sesi ringan agar tidur malam tetap nyenyak.';
    } else if (status === 'optimal' && curve.morningBonus > 0) {
      message = 'Cadangan tidur beberapa hari terakhir menopang energimu. Tubuh masih cukup prima untuk berlatih.';
    } else if (status === 'optimal') {
      message = 'Kondisi prima. Tidur dan pemulihan mendukung untuk target progresi hari ini.';
    }
  }

  return {
    score,
    morningScore: curve.morningScore,
    baseScore,
    caffeineBoost,
    caffeineSource,
    status,
    message,
    parts: {
      ...curve.baseReadiness.parts,
      sleepBufferAvg: sleepBuffer?.avgSleep ? Number(sleepBuffer.avgSleep.toFixed(1)) : null,
      caffeineBoost,
      currentHour: isToday ? nowHour : null,
    },
    curve,
  };
};
