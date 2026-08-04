// ============================================================
// ORCHESTRATOR HEALTH CONNECT via @capgo/capacitor-health (baca + tulis + backfill histori)
// Baca: steps, kalori aktif, detak jantung, berat/tinggi, body fat, oksigen, tekanan darah,
// tidur (dengan breakdown stage kalau perangkatnya nyediain).
// Tulis: kalori terbakar per sesi latihan (ActiveCaloriesBurnedRecord, rentang waktu = durasi
// sesi). Plugin ini TIDAK punya jalur nulis sesi latihan formal (ExerciseSessionRecord) — cuma
// baca (queryWorkouts) — jadi Logym belum bisa bikin entry "Workout" yang dikenali app lain,
// tapi kalori + rentang waktunya tetap kepush dan kebaca app lain lewat Health Connect.
// Hanya aktif di platform native Android (Capacitor).
// ============================================================
import { Capacitor, registerPlugin } from '@capacitor/core';
// Import STATIS, jangan diganti dynamic import lewat fungsi async — plugin Capacitor itu
// Proxy yang menganggap SEMUA akses property sebagai method native, termasuk `.then` yang
// diakses otomatis saat promise me-resolve nilai balikan fungsi async. Hasilnya panggilan
// native "Health.then()" yang gak ada → promise gak pernah selesai → semua pemanggil
// nge-hang diam-diam selamanya. (Bug nyata: tombol "Hubungkan" macet di "Menghubungkan...".)
import { Health } from '@capgo/capacitor-health';

const isNative = () => Capacitor.isNativePlatform();

export const hcAvailable = async () => {
  if (!isNative()) return false;
  try {
    const H = Health;
    const res = await H.isAvailable();
    return !!res?.available;
  } catch { return false; }
};

// 'totalCalories' ikut diminta karena banyak sumber (mis. Samsung Health) cuma nulis
// TotalCaloriesBurned dan TIDAK pernah nulis ActiveCaloriesBurned — tanpa ini, query
// 'calories' balik kosong terus walau Health Connect penuh data (kejadian nyata).
const READ_TYPES = ['steps', 'calories', 'totalCalories', 'heartRate', 'restingHeartRate', 'weight', 'height', 'sleep', 'bodyFat', 'oxygenSaturation', 'bloodPressure', 'distance', 'basalCalories'];
const WRITE_TYPES = ['calories'];

// Android gak nge-throw kalau user pencet "Tolak" di dialog izin — tetap resolve normal
// dengan readAuthorized kosong. Lempar di sini kalau BENERAN nihil, biar caller yang udah
// punya try/catch otomatis kebenerin tanpa perlu diubah manual satu-satu.
// requestHistoryAccess:true — tanpa ini Health Connect cuma kasih akses baca 30 hari
// terakhir, backfill histori yang lebih lama gak akan dapat apa-apa.
export const hcRequestPermissions = async () => {
  const H = Health;
  // Race pakai timeout — tanpa ini, kalau dialog izin native gagal muncul/nyangkut, tombol
  // "Hubungkan" nge-freeze diam-diam selamanya (gak ada error, gak ada dialog) dan user gak
  // tau apa yang salah.
  const result = await Promise.race([
    H.requestAuthorization({ read: READ_TYPES, write: WRITE_TYPES, requestHistoryAccess: true }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Waktu habis menunggu dialog izin Health Connect (30 detik) — dialognya kemungkinan gagal muncul. Coba lagi, atau buka app Health Connect langsung lalu cek/aktifkan izin untuk app ini secara manual.')), 30000)),
  ]);
  if (!result?.readAuthorized?.length && !result?.writeAuthorized?.length) {
    throw new Error('Izin ditolak — buka Pengaturan Android > Aplikasi > Health Connect > Aplikasi terhubung untuk memberi akses manual.');
  }
  return result;
};

// Cek izin yang BENERAN aktif sekarang (tanpa munculin dialog) — beda dari hcRequestPermissions,
// ini buat diagnosa: app bisa aja "nangkring" di daftar Health Connect padahal izin per-tipenya
// belum tentu ke-grant semua (khususnya tipe yang baru ditambahkan setelah user connect duluan).
export const hcCheckStatus = async () => {
  if (!isNative()) return null;
  try {
    const H = Health;
    return await H.checkAuthorization({ read: READ_TYPES, write: WRITE_TYPES });
  } catch (e) {
    console.warn('hcCheckStatus gagal:', e);
    return null;
  }
};

// Tulis kalori terbakar satu sesi latihan yang baru selesai. startDate/endDate = rentang waktu
// sesi (jadi durasinya ikut kebawa lewat rentang record, bukan cuma angka kalori polos) — app
// lain yang baca ActiveCaloriesBurnedRecord dari Health Connect akan lihat kapan & berapa lama.
// `dedupeKey` (opsional) — id sesi latihan. Health Connect MENJUMLAHKAN semua record dan
// plugin ini tidak punya delete/update, jadi sesi yang sama tidak boleh terkirim dua kali
// (mis. saat mendorong histori berulang kali). Sesi yang sudah terkirim dicatat di
// localStorage dan dilewati di panggilan berikutnya.
export const hcWriteWorkoutCalories = async (startDate, endDate, kcal, dedupeKey) => {
  if (!isNative() || !kcal || kcal <= 0) return false;
  const memo = dedupeKey ? `hc_workout_written_${dedupeKey}` : null;
  if (memo && localStorage.getItem(memo)) return false;
  try {
    const H = Health;
    await H.saveSample({ dataType: 'calories', startDate, endDate, value: Math.round(kcal) });
    if (memo) localStorage.setItem(memo, '1');
    return true;
  } catch (e) {
    console.warn('hcWriteWorkoutCalories gagal:', e);
    return false;
  }
};

// DIAGNOSA: cek semua tipe yang didukung plugin, laporkan mana yang benar-benar ada isinya
// di Health Connect perangkat ini dan dari aplikasi mana. Dipakai buat memutuskan data apa
// saja yang layak ditarik ke Logym — bukan menebak dari dokumentasi.
const ALL_READABLE = [
  'steps', 'distance', 'distanceCycling', 'flightsClimbed',
  'calories', 'totalCalories', 'basalCalories',
  'heartRate', 'restingHeartRate', 'heartRateVariability', 'vo2Max',
  'weight', 'height', 'bodyFat',
  'sleep', 'mindfulness',
  'oxygenSaturation', 'respiratoryRate', 'bloodPressure', 'bloodGlucose',
  'bodyTemperature', 'basalBodyTemperature',
  'dietaryWater', 'dietaryEnergyConsumed',
];

export const hcInventory = async (days = 90) => {
  if (!isNative()) return null;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startISO = start.toISOString();
  const endISO = end.toISOString();
  const found = {};
  await Promise.all(ALL_READABLE.map(async (dataType) => {
    try {
      const res = await Health.readSamples({ dataType, startDate: startISO, endDate: endISO, limit: 200, ascending: false });
      const s = res?.samples || [];
      if (s.length) found[dataType] = { jumlah: s.length, sumber: [...new Set(s.map((x) => x.sourceName).filter(Boolean))].join(', '), contoh: s[0].value };
    } catch (e) { found[dataType] = { error: String(e?.message || e) }; }
  }));
  try {
    const w = await Health.queryWorkouts({ startDate: startISO, endDate: endISO, limit: 200 });
    const list = w?.workouts || [];
    if (list.length) found.workouts = { jumlah: list.length, sumber: [...new Set(list.map((x) => x.sourceName).filter(Boolean))].join(', '), jenis: [...new Set(list.map((x) => x.workoutType).filter(Boolean))].join(', ') };
  } catch (e) { found.workouts = { error: String(e?.message || e) }; }
  console.log('HC_INVENTORY ' + JSON.stringify(found));
  return found;
};

// Nama jenis latihan Health Connect -> label Indonesia. Yang tidak terdaftar dipakai apa
// adanya (dipisah dari camelCase), jadi jenis baru tetap tampil masuk akal tanpa perlu diurus.
const WORKOUT_LABEL = {
  runningTreadmill: 'Lari Treadmill', running: 'Lari', walking: 'Jalan Kaki', hiking: 'Hiking',
  cycling: 'Sepeda', bikingStationary: 'Sepeda Statis', swimming: 'Renang', swimmingPool: 'Renang Kolam',
  strengthTraining: 'Angkat Beban', traditionalStrengthTraining: 'Angkat Beban',
  functionalStrengthTraining: 'Latihan Fungsional', weightlifting: 'Angkat Beban',
  highIntensityIntervalTraining: 'HIIT', elliptical: 'Elliptical', rowingMachine: 'Mesin Dayung',
  stairClimbing: 'Naik Tangga', stairClimbingMachine: 'Mesin Tangga', yoga: 'Yoga',
  pilates: 'Pilates', stretching: 'Peregangan', calisthenics: 'Kalistenik', boxing: 'Tinju',
  martialArts: 'Bela Diri', badminton: 'Bulu Tangkis', basketball: 'Basket', soccer: 'Sepak Bola',
  tennis: 'Tenis', tableTennis: 'Tenis Meja', dancing: 'Menari', jumpRope: 'Lompat Tali',
  coreTraining: 'Latihan Core', bootCamp: 'Boot Camp', crossTraining: 'Cross Training',
  exerciseClass: 'Kelas Olahraga', other: 'Latihan Lain',
};
const workoutLabel = (t) => WORKOUT_LABEL[t] || String(t || 'Latihan').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

// Baca sesi latihan yang dicatat APLIKASI LAIN (Samsung Health, Hevy, Google Fit, dsb) supaya
// riwayat Logym tidak bolong. Hanya BACA — plugin ini tidak punya jalur menulis sesi latihan
// (lihat catatan di atas). Hasil: { 'YYYY-MM-DD': [ {..} ] } sudah dalam bentuk siap pakai
// buat history[ymd].workouts, ditandai source:'healthconnect' biar bisa dibedakan dari sesi
// yang dicatat sendiri di Logym.
export const hcReadWorkouts = async (days = 30) => {
  if (!isNative()) return {};
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  try {
    const res = await Health.queryWorkouts({ startDate: start.toISOString(), endDate: end.toISOString(), limit: 500, ascending: true });
    const byDay = {};
    for (const w of res?.workouts || []) {
      const ymd = ymdOf(w.startDate);
      const mins = Math.round((w.duration || 0) / 60);
      if (mins <= 0) continue;
      const endD = new Date(w.endDate);
      (byDay[ymd] ||= []).push({
        // platformId = id unik record Health Connect, jadi impor berulang tidak menggandakan.
        id: `hc_${w.platformId || `${w.startDate}_${w.workoutType}`}`,
        programId: 'healthconnect',
        programName: workoutLabel(w.workoutType),
        status: 'completed',
        source: 'healthconnect',
        sourceName: w.sourceName || '',
        workoutType: w.workoutType,
        duration: mins,
        caloriesBurned: w.totalEnergyBurned ? Math.round(w.totalEnergyBurned) : undefined,
        distanceKm: w.totalDistance ? Number((w.totalDistance / 1000).toFixed(2)) : undefined,
        timestamp: `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`,
        log: {},
        exercises: [],
      });
    }
    return byDay;
  } catch (e) {
    console.warn('hcReadWorkouts gagal:', e);
    return {};
  }
};

// --- Menulis SESI LATIHAN (jenis olahraga + durasi), lewat plugin lokal ExerciseWriterPlugin.kt.
// @capgo/capacitor-health cuma bisa MEMBACA sesi latihan, jadi tanpa ini latihan Logym cuma
// muncul sebagai angka kalori polos di app lain, bukan sebagai "Workout" seperti Samsung Health.
const ExerciseWriter = registerPlugin('ExerciseWriter');

export const hcRequestWorkoutWritePermission = async () => {
  if (!isNative()) return false;
  try {
    const res = await ExerciseWriter.requestPermission();
    return !!res?.granted;
  } catch (e) {
    // Wajar gagal di APK lama yang belum punya plugin native ini — jangan bikin sinkron berhenti.
    console.warn('izin tulis sesi latihan gagal:', e);
    return false;
  }
};

// `dedupeKey` sama seperti hcWriteWorkoutCalories: Health Connect tidak bisa hapus/ubah record
// lewat plugin, jadi sesi yang sama tidak boleh terkirim dua kali.
export const hcWriteWorkoutSession = async ({ startDate, endDate, exerciseType, title, dedupeKey }) => {
  if (!isNative()) return false;
  const memo = dedupeKey ? `hc_session_written_${dedupeKey}` : null;
  if (memo && localStorage.getItem(memo)) return false;
  try {
    await ExerciseWriter.saveWorkout({ startDate, endDate, exerciseType, title });
    if (memo) localStorage.setItem(memo, '1');
    return true;
  } catch (e) {
    console.warn('hcWriteWorkoutSession gagal:', e);
    return false;
  }
};

const ymdOf = (isoStr) => isoStr.slice(0, 10);

// Kelompokkan sample "titik waktu" (berat, tinggi, body fat, oksigen, tekanan darah — bukan
// yang dijumlah per hari) berdasarkan tanggal, ambil yang PALING BARU per hari.
const latestPerDay = (samples, mapValue) => {
  const byDay = {};
  for (const s of samples) {
    const ymd = ymdOf(s.startDate);
    if (!byDay[ymd] || new Date(s.startDate) > new Date(byDay[ymd]._at)) {
      byDay[ymd] = { ...mapValue(s), _at: s.startDate };
    }
  }
  Object.values(byDay).forEach((v) => delete v._at);
  return byDay;
};

// Jumlahkan durasi tidur per stage per hari (dikelompokkan dari TANGGAL MULAI sesi tidur —
// sesi yang lewat tengah malam tetap dihitung di hari sesi itu MULAI, bukan berakhir).
const sleepPerDay = (samples) => {
  const byDay = {};
  for (const s of samples) {
    const ymd = ymdOf(s.startDate);
    if (!byDay[ymd]) byDay[ymd] = { totalMinutes: 0, awake: 0, rem: 0, light: 0, deep: 0 };
    if (s.hasStageData && s.stages?.length) {
      s.stages.forEach((stage) => {
        byDay[ymd].totalMinutes += stage.durationMinutes;
        if (stage.stage in byDay[ymd]) byDay[ymd][stage.stage] += stage.durationMinutes;
      });
    } else {
      byDay[ymd].totalMinutes += (new Date(s.endDate) - new Date(s.startDate)) / 60000;
    }
  }
  const out = {};
  Object.entries(byDay).forEach(([ymd, d]) => {
    out[ymd] = {
      sleep: Number((d.totalMinutes / 60).toFixed(1)),
      sleepAwake: String(Math.round(d.awake)),
      sleepRem: String(Math.round(d.rem)),
      sleepLight: String(Math.round(d.light)),
      sleepDeep: String(Math.round(d.deep)),
    };
  });
  return out;
};

// Tarik ringkasan kesehatan sehari-hari dalam SATU rentang tanggal sekaligus (bukan loop
// per-hari — tiap query native ada overhead round-trip, jadi 1 query lebar jauh lebih murah
// daripada N query sempit). Dipakai baik buat "hari ini" (range 1 hari) maupun backfill
// (range N hari) — bentuknya sama, cuma rentang tanggalnya beda.
// Hasil: { 'YYYY-MM-DD': { steps, activityCalories, heartRate, minHeartRate, maxHeartRate,
//          weight, height, bodyFat, oxygenSaturation, bloodPressure, sleep, sleepAwake,
//          sleepRem, sleepLight, sleepDeep } }
export const hcReadRange = async (startYmd, endYmd) => {
  if (!isNative()) return {};
  const H = Health;
  const startISO = new Date(`${startYmd}T00:00:00`).toISOString();
  const endISO = new Date(`${endYmd}T23:59:59`).toISOString();
  const byDay = {};
  const put = (ymd, patch) => { byDay[ymd] = { ...(byDay[ymd] || {}), ...patch }; };

  await Promise.all([
    H.queryAggregated({ dataType: 'steps', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' })
      .then((res) => (res?.samples || []).forEach((s) => { if (s.value > 0) put(ymdOf(s.startDate), { steps: Math.round(s.value) }); }))
      .catch((e) => console.warn('hcReadRange steps gagal:', e)),

    // Jarak: plugin kasih meter, Logym nyimpen km. distanceCycling SENGAJA gak dipakai —
    // plugin memetakannya ke DistanceRecord yang SAMA, jadi angkanya duplikat persis, bukan
    // jarak bersepeda terpisah (terbukti di diagnosa: nilainya identik dengan distance).
    H.queryAggregated({ dataType: 'distance', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' })
      .then((res) => (res?.samples || []).forEach((s) => { if (s.value > 0) put(ymdOf(s.startDate), { distance: Number((s.value / 1000).toFixed(2)) }); }))
      .catch((e) => console.warn('hcReadRange distance gagal:', e)),

    H.readSamples({ dataType: 'restingHeartRate', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ restingHeartRate: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange restingHeartRate gagal:', e)),

    // BMR terukur dari Samsung Health/Google Fit — angka asli, lebih tepat daripada
    // hasil hitungan rumus Logym sendiri.
    H.readSamples({ dataType: 'basalCalories', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ bmr: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange basalCalories gagal:', e)),

    // Fallback dua tipe: 'calories' (ActiveCaloriesBurned, bisa di-aggregate langsung) dulu;
    // kalau kosong, baru 'totalCalories' (TotalCaloriesBurned) yang HARUS dibaca mentah lalu
    // dijumlah manual — queryAggregated plugin ini gak dukung tipe itu (lihat aggregateMetrics
    // di HealthManager.kt). Sumber macam Samsung Health cuma nulis yang kedua.
    (async () => {
      try {
        const res = await H.queryAggregated({ dataType: 'calories', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' });
        const hit = (res?.samples || []).filter((s) => s.value > 0);
        if (hit.length > 0) {
          hit.forEach((s) => put(ymdOf(s.startDate), { activityCalories: Math.round(s.value) }));
          return;
        }
      } catch (e) { console.warn('hcReadRange calories gagal:', e); }
      try {
        const res = await H.readSamples({ dataType: 'totalCalories', startDate: startISO, endDate: endISO, limit: 5000, ascending: true });
        const byDay = {};
        (res?.samples || []).forEach((s) => {
          const ymd = ymdOf(s.startDate);
          byDay[ymd] = (byDay[ymd] || 0) + (s.value || 0);
        });
        Object.entries(byDay).forEach(([ymd, kcal]) => { if (kcal > 0) put(ymd, { activityCalories: Math.round(kcal) }); });
      } catch (e) { console.warn('hcReadRange totalCalories gagal:', e); }
    })(),

    H.queryAggregated({ dataType: 'heartRate', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: ['average', 'min', 'max'] })
      .then((res) => (res?.samples || []).forEach((s) => put(ymdOf(s.startDate), {
        ...(s.values?.average != null && { heartRate: Math.round(s.values.average) }),
        ...(s.values?.min != null && { minHeartRate: Math.round(s.values.min) }),
        ...(s.values?.max != null && { maxHeartRate: Math.round(s.values.max) }),
      })))
      .catch((e) => console.warn('hcReadRange heartRate gagal:', e)),

    H.readSamples({ dataType: 'weight', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ weight: Number(s.value.toFixed(1)) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange weight gagal:', e)),

    H.readSamples({ dataType: 'height', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ height: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange height gagal:', e)),

    H.readSamples({ dataType: 'bodyFat', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ bodyFat: Number(s.value.toFixed(1)) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange bodyFat gagal:', e)),

    H.readSamples({ dataType: 'oxygenSaturation', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ oxygenSaturation: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange oxygenSaturation gagal:', e)),

    H.readSamples({ dataType: 'bloodPressure', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ bloodPressure: `${Math.round(s.systolic)}/${Math.round(s.diastolic)}` })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange bloodPressure gagal:', e)),

    // Sleep gak bisa di-aggregate (batasan plugin) — jumlah manual dari sample mentah.
    H.readSamples({ dataType: 'sleep', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(sleepPerDay(res?.samples || []))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange sleep gagal:', e)),
  ]);

  return byDay;
};

// Backfill: isi kekosongan histori N hari ke belakang. `hasOtherSource(ymd)` mengembalikan
// true kalau hari itu udah punya data manual/sumber lain (jangan ditimpa). `onDayResult(ymd,
// summary)` dipanggil per hari yang berhasil diisi — caller yang nulis ke Firestore.
export const hcBackfillHistory = async (days, hasOtherSource, onDayResult) => {
  if (!isNative()) return;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startYmd = start.toISOString().slice(0, 10);
  const endYmd = end.toISOString().slice(0, 10);
  const byDay = await hcReadRange(startYmd, endYmd);
  Object.entries(byDay).forEach(([ymd, summary]) => {
    if (hasOtherSource(ymd)) return;
    onDayResult(ymd, summary);
  });
};
