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
import { Capacitor } from '@capacitor/core';
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

const READ_TYPES = ['steps', 'calories', 'heartRate', 'weight', 'height', 'sleep', 'bodyFat', 'oxygenSaturation', 'bloodPressure'];
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
export const hcWriteWorkoutCalories = async (startDate, endDate, kcal) => {
  if (!isNative() || !kcal || kcal <= 0) return false;
  try {
    const H = Health;
    await H.saveSample({ dataType: 'calories', startDate, endDate, value: Math.round(kcal) });
    return true;
  } catch (e) {
    console.warn('hcWriteWorkoutCalories gagal:', e);
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

    H.queryAggregated({ dataType: 'calories', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' })
      .then((res) => (res?.samples || []).forEach((s) => { if (s.value > 0) put(ymdOf(s.startDate), { activityCalories: Math.round(s.value) }); }))
      .catch((e) => console.warn('hcReadRange calories gagal:', e)),

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
