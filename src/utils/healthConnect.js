// ============================================================
// ORCHESTRATOR HEALTH CONNECT via @capgo/capacitor-health (baca + tulis + backfill histori)
// Baca: steps, kalori aktif, detak jantung, berat/tinggi, body fat, oksigen, tekanan darah,
// tidur (dengan breakdown stage kalau perangkatnya nyediain).
// Tulis: TIDAK ADA lewat plugin ini. Sesi latihan ditulis lewat ExerciseWriterPlugin.kt lokal
// (plugin capgo cuma bisa MEMBACA sesi). Kalori sengaja tidak pernah ditulis — HC menjumlahkan
// semua sumber, jadi taksiran Logym bertumpuk di atas hitungan Samsung untuk jam yang sama.
// Hanya aktif di platform native Android (Capacitor).
// ============================================================
import { Capacitor, registerPlugin } from '@capacitor/core';
// Import STATIS, jangan diganti dynamic import lewat fungsi async — plugin Capacitor itu
// Proxy yang menganggap SEMUA akses property sebagai method native, termasuk `.then` yang
// diakses otomatis saat promise me-resolve nilai balikan fungsi async. Hasilnya panggilan
// native "Health.then()" yang gak ada → promise gak pernah selesai → semua pemanggil
// nge-hang diam-diam selamanya. (Bug nyata: tombol "Hubungkan" macet di "Menghubungkan...".)
import { Health } from '@capgo/capacitor-health';
// Ekstensi .js ditulis eksplisit supaya file ini bisa di-import Node apa adanya (buat tes).
// Vite menerima kedua bentuk.
import { stepMinutesFromHourly } from './workoutCalc.js';

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
// PENTING: setiap nama di sini WAJIB ada di enum HealthDataType milik @capgo/capacitor-health
// (node_modules/@capgo/capacitor-health/android/.../HealthDataType.kt). Satu nama asing saja
// membuat requestAuthorization DITOLAK SELURUHNYA — parseTypeList melempar sebelum dialog izin
// sempat muncul, dan user cuma melihat "Gagal menyambungkan Health Connect: Unsupported data
// type: X". Nama enum-nya tidak selalu intuitif: NutritionRecord ber-identifier
// 'dietaryEnergyConsumed', bukan 'nutrition'.
const READ_TYPES = ['steps', 'calories', 'totalCalories', 'heartRate', 'restingHeartRate', 'heartRateVariability', 'weight', 'height', 'sleep', 'bodyFat', 'oxygenSaturation', 'bloodPressure', 'distance', 'basalCalories', 'dietaryEnergyConsumed'];
// Kalori TIDAK pernah ditulis lewat plugin ini (lihat catatan di bawah). Tiga tipe ini boleh:
// semuanya record TITIK WAKTU dari alat ukur BLE (lihat utils/ble.js), dibaca sebagai "paling
// baru per hari" dan tidak pernah dijumlah antar sumber — jadi tidak bisa menggandakan apa pun.
// Record sesi latihan tetap lewat ExerciseWriterPlugin.kt // Data yang ditulis aplikasi (atau lebih tepatnya: diklaim akan ditulis) di dialog perizinan awal.
// Di luar ini, usaha penulisan pasti ditolak. Logym (sejak rilis awal) sudah merangkum berat ke
// daily stats, tapi data tersebut belum dikirim ke Health Connect secara rinci per pengukuran.
// Sekarang, dengan integrasi Bluetooth skala berat (seperti MIBFS), ini perlu ditambahkan.
//
// CATATAN: 'bloodPressure' tidak ada di Health Connect UI "Vitals" yang standar, tapi tipenya
// dikenali plugin ini. Kalau suatu saat Health Connect menolak, mungkin perlu 'bloodPressure'
// dibuang dari daftar dan menggunakan 'bloodPressureSystolic'/'bloodPressureDiastolic'.
// (Saat ini, penulisannya masih lolos).
//
// Oxygen saturation, body temperature, dll sengaja dibuang: Logym belum punya form input-nya,
// minta izin di depan malah bikin user curiga (buat apa?).
//
// Kalori BMR ("basalCalories") diekspor bersamaan dengan berat, karena BMR dihitung ulang tiap
// ada berat baru. Kalori makanan TIDAK diekspor ?" Logym mengambilnya dari Lomeal,
// biar Lomeal yang ekspor ke HC. Mengekspor dari sini akan membuat data ganda kalau user juga
// menghubungkan Lomeal ke HC.
// 
// Langkah dan Menit Aktif (steps, stepMinutes) adalah input mentah dari jam tangan/HP, Logym 
// hanya membaca, BUKAN menulisnya. Kalori aktif diekspor per sesi latihan lewat plugin terpisah.
//
// heartRate ditulis karena tensimeter bluetooth juga mengirimkan data detak jantung (pulse).
//
// boneMass / leanBodyMass / bodyWaterMass DIBUANG dari daftar ini: plugin tidak mengenal
// ketiganya sama sekali (tidak ada di enum HealthDataType), jadi mencantumkannya menggagalkan
// seluruh permintaan izin dengan cara yang sama seperti 'nutrition'. Data itu tetap tersimpan
// di bioData Logym, cuma tidak diekspor ke Health Connect.
const WRITE_TYPES = ['weight', 'bodyFat', 'bloodPressure', 'basalCalories', 'heartRate'];

// Android gak nge-throw kalau user pencet "Tolak" di dialog izin — tetap resolve normal
// dengan readAuthorized kosong. Lempar di sini kalau BENERAN nihil, biar caller yang udah
// punya try/catch otomatis kebenerin tanpa perlu diubah manual satu-satu.
// requestHistoryAccess:true — tanpa ini Health Connect cuma kasih akses baca 30 hari
// terakhir, backfill histori yang lebih lama gak akan dapat apa-apa.
// Tipe yang terpaksa dibuang karena ditolak plugin — dibaca layar Pengaturan supaya user tahu
// ada yang tidak ikut tersinkron, alih-alih diam-diam kehilangan satu sumber data.
export let hcDroppedTypes = [];

export const hcRequestPermissions = async () => {
  const H = Health;
  // Race pakai timeout — tanpa ini, kalau dialog izin native gagal muncul/nyangkut, tombol
  // "Hubungkan" nge-freeze diam-diam selamanya (gak ada error, gak ada dialog) dan user gak
  // tau apa yang salah.
  const minta = (read, write) => Promise.race([
    H.requestAuthorization({ read, write, requestHistoryAccess: true }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Waktu habis menunggu dialog izin Health Connect (30 detik) — dialognya kemungkinan gagal muncul. Coba lagi, atau buka app Health Connect langsung lalu cek/aktifkan izin untuk app ini secara manual.')), 30000)),
  ]);

  // SATU nama tipe yang tidak dikenal plugin membatalkan SELURUH permintaan izin sebelum
  // dialognya sempat muncul — akibatnya tidak ada satu pun izin baca yang diberikan, dan Logym
  // berhenti menarik data sama sekali (kejadian nyata dengan 'nutrition'). Kalau itu terjadi,
  // buang tipe yang disebut error lalu ulangi, supaya kehilangan satu sumber data tidak
  // berubah jadi kehilangan semuanya. Dicatat di hcDroppedTypes untuk ditampilkan di Pengaturan.
  let read = [...READ_TYPES];
  let write = [...WRITE_TYPES];
  hcDroppedTypes = [];
  let result;
  for (let percobaan = 0; ; percobaan++) {
    try {
      result = await minta(read, write);
      break;
    } catch (e) {
      const nama = /Unsupported data type:\s*([\w]+)/.exec(e?.message || '')?.[1];
      if (!nama || percobaan >= 5) throw e;
      console.warn(`Health Connect menolak tipe '${nama}' — dibuang lalu dicoba lagi.`);
      hcDroppedTypes.push(nama);
      read = read.filter((x) => x !== nama);
      write = write.filter((x) => x !== nama);
    }
  }
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

// Logym TIDAK menulis kalori ke Health Connect. hcWriteWorkoutCalories dihapus, jangan
// dihidupkan lagi: HC menjumlahkan semua sumber, jadi taksiran Logym bertumpuk di atas kalori
// yang sudah dihitung Samsung Health dari sensor nadi untuk jam yang sama (satu hari pernah
// tercatat ~2.000 kkal padahal sesinya 400). Tidak bisa ditambal dedup: plugin ini tidak
// mengekspos metadata, jadi record kalori tidak punya clientRecordId, tidak bisa di-upsert, dan
// tidak bisa dihapus. Yang dikirim ke HC sekarang cuma record SESI (lihat hcWriteWorkoutSession).

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

// --- Menulis SESI LATIHAN (jenis olahraga + durasi), lewat plugin lokal ExerciseWriterPlugin.kt.
// @capgo/capacitor-health cuma bisa MEMBACA sesi latihan, jadi tanpa ini latihan Logym cuma
// muncul sebagai angka kalori polos di app lain, bukan sebagai "Workout" seperti Samsung Health.
const ExerciseWriter = registerPlugin('ExerciseWriter');

// Cek tanpa memunculkan dialog — dipakai sinkron otomatis, yang tidak boleh tiba-tiba
// menampilkan permintaan izin saat user cuma membuka app.
export const hcCheckWorkoutWritePermission = async () => {
  if (!isNative()) return false;
  try {
    const res = await ExerciseWriter.checkPermission();
    return !!res?.granted;
  } catch { return false; }
};

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

// `dedupeKey` (id sesi Logym) diteruskan sebagai clientRecordId, jadi Health Connect sendiri yang
// MENG-UPSERT: menulis ulang sesi yang sama tidak pernah melahirkan record kedua. Ini pengganti
// sebenarnya untuk memo localStorage — memo itu hilang saat app di-reinstall, dan sesudahnya
// sapuan setahun menulis ulang semua sesi jadi duplikat yang permanen (HC tidak punya jalur hapus
// lewat plugin ini).
//
// `version` dinaikkan pemanggil kalau isi sesinya berubah (mis. durasinya diperbaiki); HC membuang
// tulisan dengan versi lebih rendah dari yang sudah tersimpan.
//
// Memo localStorage tetap dipakai sebagai penghemat panggilan native, BUKAN sebagai penjaga
// korektnya — dan dilewati saat `version` naik, supaya koreksi benar-benar sampai.
export const hcWriteWorkoutSession = async ({ startDate, endDate, exerciseType, title, dedupeKey, version = 1, segments = [], notes = '', calories = 0 }) => {
  if (!isNative()) return false;
  const memo = dedupeKey ? `hc_session_written_${dedupeKey}` : null;
  if (memo && localStorage.getItem(memo) === String(version)) return false;
  try {
    await ExerciseWriter.saveWorkout({
      startDate, endDate, exerciseType, title, energy: calories,
      // Rincian isi sesi: segmen per latihan (dengan jumlah repetisi) + ringkasan teks
      // "3x10 @40kg". Tanpa ini sesi Logym muncul di app lain sebagai blok kosong tanpa isi.
      segments, notes,
      clientRecordId: dedupeKey ? String(dedupeKey) : null,
      clientRecordVersion: version,
    });
    if (memo) localStorage.setItem(memo, String(version));
    return true;
  } catch (e) {
    console.warn('hcWriteWorkoutSession gagal:', e);
    return false;
  }
};

// ============================================================
// TULIS PENGUKURAN ALAT BLE (berat / tensi / body fat) — lihat utils/ble.js
//
// Ini AMAN ditulis walau kalori tidak (lihat catatan panjang di atas): berat, tensi, dan body
// fat itu record TITIK WAKTU yang dibaca sebagai "yang paling baru per hari", bukan dijumlah
// antar sumber. Record kedua di jam yang sama menggantikan tampilannya, tidak menggandakannya.
//
// Tetap TIDAK bisa dihapus/di-upsert lewat plugin ini (saveSample selalu Metadata.manualEntry()
// tanpa clientRecordId), jadi hanya panggil ini dari event pengukuran alat — sekali per hasil,
// jangan dari sapuan berulang atau loop sinkron.
const hcSaveSample = async (dataType, value, at, extra = {}) => {
  if (!isNative()) return false;
  const iso = (at instanceof Date ? at : new Date(at)).toISOString();
  try {
    await Health.saveSample({ dataType, value, startDate: iso, endDate: iso, ...extra });
    return true;
  } catch (e) {
    console.warn(`hcSaveSample ${dataType} gagal:`, e);
    return false;
  }
};

export const hcWriteWeight = (kg, at = new Date()) => hcSaveSample('weight', kg, at);
export const hcWriteBodyFat = (percent, at = new Date()) => hcSaveSample('bodyFat', percent, at);
// hcWriteBoneMass / hcWriteLeanBodyMass / hcWriteBodyWaterMass DIHAPUS: plugin tidak punya
// identifier untuk BoneMassRecord, LeanBodyMassRecord, maupun BodyWaterMassRecord, jadi
// panggilannya selalu ditolak. Angkanya tetap tersimpan di bioData Logym. Jalur naiknya kalau
// suatu saat perlu: tulis lewat plugin native sendiri, seperti ExerciseWriterPlugin.kt.
export const hcWriteBMR = (kcal, at = new Date()) => hcSaveSample('basalCalories', kcal, at, { unit: 'kilocalories' });

// BloodPressureRecord tidak punya "nilai tunggal" — plugin tetap mewajibkan `value` terisi,
// dan yang benar-benar dipakai cuma systolic/diastolic.
export const hcWriteBloodPressure = (systolic, diastolic, at = new Date()) =>
  hcSaveSample('bloodPressure', systolic, at, { systolic, diastolic });
export const hcWriteHeartRate = (bpm, at = new Date()) => hcSaveSample('heartRate', bpm, at);

// slice(0,10) di ISO string ngasih tanggal UTC, bukan tanggal lokal — buat user WIB (UTC+7),
// sample yang jam lokalnya dini hari (00:00-07:00) masih "kemarin" di UTC, jadi kesplit ke
// hari yang salah (tidur semalam kepotong, sebagian nyasar ke tanggal sebelumnya).
const ymdOf = (isoStr) => {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

/** Kelompokkan sample berjangka-waktu per tanggal lokal, dibuang yang tidak valid. */
export const groupByDay = (samples) => {
  const out = {};
  (samples || []).forEach((s) => {
    const mulai = new Date(s?.startDate).getTime();
    if (!Number.isFinite(mulai) || !(s.value > 0)) return;
    const selesaiRaw = new Date(s?.endDate ?? s?.startDate).getTime();
    (out[ymdOf(s.startDate)] = out[ymdOf(s.startDate)] || []).push({
      mulai,
      selesai: Number.isFinite(selesaiRaw) ? Math.max(mulai, selesaiRaw) : mulai,
      nilai: s.value,
    });
  });
  return out;
};

/**
 * Jumlahkan nilai record berjangka-waktu, MELEWATI yang tumpang tindih.
 *
 * Menjumlah semua record mentah itu salah: sumber seperti Samsung Health bisa menulis record
 * total HARIAN sekaligus record per-SESI yang rentangnya berada di dalam hari itu. Keduanya sah,
 * tapi yang kedua sudah tercakup di yang pertama — dijumlah polos, satu sesi latihan terhitung
 * dua kali dan kalori harian menggelembung tanpa sebab yang kelihatan.
 *
 * queryAggregated milik Health Connect menangani ini lewat prioritas sumber, tapi plugin capgo
 * tidak mendukung agregasi untuk TotalCaloriesBurned (lihat aggregateMetrics di HealthManager.kt),
 * jadi harus dikerjakan di sini.
 *
 * Yang paling awal dan paling PANJANG menang, supaya record harian mengalahkan record sesi yang
 * bersarang di dalamnya — bukan sebaliknya.
 */
export const sumNonOverlapping = (list) => {
  const urut = [...(list || [])].sort(
    (a, b) => a.mulai - b.mulai || (b.selesai - b.mulai) - (a.selesai - a.mulai)
  );
  let batas = -Infinity;
  let total = 0;
  urut.forEach((r) => {
    if (r.mulai < batas) return; // bersarang/tumpang tindih — sudah terhitung
    total += r.nilai;
    batas = Math.max(batas, r.selesai);
  });
  return total;
};

// Batas titik per hari untuk log intraday.
//
// WAJIB ADA. Riwayat SETAHUN tinggal di SATU dokumen Firestore yang berbatas 1 MiB, sementara
// jam tangan merekam nadi hampir tiap menit — sampel mentah berarti puluhan KB per hari, jadi
// megabyte per tahun. Yang terjadi saat batas itu tertabrak bukan "grafiknya jadi jelek": SELURUH
// tulisan ke history_years/<tahun> ditolak, dan seluruh latihan tahun itu berhenti tersimpan.
// (Dokumen yang sama sudah pernah menabrak batas index entry 40.000 karena sebab sejenis.)
//
// Sesi latihan sudah lama diringkas lewat summarizeHeartRate dengan alasan yang persis sama;
// log harian ini yang kelewat. 96 titik = satu titik tiap 15 menit, ~4 KB/hari, ~1,5 MB setahun
// untuk KETIGA log digabung. Ini knob kalibrasi: naikkan kalau kurvanya terasa terlalu kasar,
// tapi hitung dulu ongkosnya terhadap batas 1 MiB.
const MAX_LOG_POINTS = 96;

// Kelompokkan sample "titik waktu" jadi log intraday per hari — dipakai grafik detail per jam
// (nadi, tensi, SpO2), beda dari latestPerDay yang cuma nyimpen satu angka ringkasan per hari.
//
// Titiknya diikat ke JAM DINDING (menit ke berapa dalam hari itu), bukan ke sebaran sampel:
// dengan begitu ember hari ini dan hari kemarin mewakili rentang jam yang sama, dan sumbu
// waktunya tidak melar cuma karena jam tangan merekam lebih rapat di satu hari. Ember kosong
// (jam tanpa rekaman) dibuang, bukan diisi nol yang bikin kurva terjun ke lantai.
//
// Bentuk keluarannya SENGAJA tidak berubah ({ time, ts, ...nilai }) — VitalsChart, ActivityChart,
// dan DashboardTab membacanya langsung, dan yang perlu diperbaiki cuma JUMLAHnya.
const BUCKET_MINUTES = 1440 / MAX_LOG_POINTS;
export const logPerDay = (samples, mapValue) => {
  const byDay = {};
  for (const s of samples) {
    const ymd = ymdOf(s.startDate);
    const at = new Date(s.startDate);
    const ts = at.getTime();
    if (!Number.isFinite(ts)) continue;
    const bucket = Math.floor((at.getHours() * 60 + at.getMinutes()) / BUCKET_MINUTES);
    const day = (byDay[ymd] = byDay[ymd] || {});
    (day[bucket] = day[bucket] || []).push({ ts, vals: mapValue(s) });
  }

  const out = {};
  Object.entries(byDay).forEach(([ymd, buckets]) => {
    out[ymd] = Object.values(buckets)
      .map((list) => {
        list.sort((a, b) => a.ts - b.ts);
        // Rata-rata per ember. Tiap kunci numerik dirata-rata sendiri, jadi satu fungsi ini
        // melayani nadi ({value}) maupun tensi ({sys, dia}) tanpa cabang khusus.
        const avg = {};
        Object.keys(list[0].vals).forEach((k) => {
          const nums = list.map((x) => Number(x.vals[k])).filter(Number.isFinite);
          if (nums.length > 0) avg[k] = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
        });
        const ts = list[0].ts;
        return { time: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), ts, ...avg };
      })
      .sort((a, b) => a.ts - b.ts);
  });
  return out;
};

/**
 * Ringkas log intraday yang SUDAH TERSIMPAN (bentuk { time, ts, ...nilai }).
 *
 * logPerDay di atas cuma menjaga data BARU. Hari-hari yang terlanjur tersimpan sebelum batas ini
 * ada tetap gemuk, dan merekalah yang sudah menggerus jatah 1 MiB dokumen tahunan. Sinkron rutin
 * hanya menyentuh 7–30 hari terakhir, jadi sisanya tidak akan pernah sembuh sendiri.
 *
 * Mengembalikan ARRAY YANG SAMA (referensi identik) kalau sudah cukup pendek — supaya pemanggil
 * bisa memakai perbandingan referensi untuk tahu ada yang berubah, dan hari yang sudah beres
 * tidak ikut ditandai kotor lalu dikirim ulang ke Firestore tanpa guna.
 */
export const capIntradayLog = (list) => {
  if (!Array.isArray(list) || list.length <= MAX_LOG_POINTS) return list;
  const byDay = logPerDay(
    list.map((p) => ({ startDate: new Date(p.ts), _p: p })),
    (s) => {
      // eslint-disable-next-line no-unused-vars
      const { time, ts, ...vals } = s._p;
      return vals;
    }
  );
  // Digabung lintas key, bukan diambil satu: entri di sekitar tengah malam bisa jatuh ke tanggal
  // tetangga, dan mengambil satu key berarti membuang titik-titik itu diam-diam.
  return Object.values(byDay).flat().sort((a, b) => a.ts - b.ts);
};

// Jumlahkan durasi tidur per stage per hari, dikelompokkan dari TANGGAL BANGUN (akhir sesi),
// bukan tanggal mulai. Tidur 3 Agu 23:00 -> 4 Agu 07:00 itu "tidurnya tanggal 4" — begitu cara
// Samsung Health/Fitbit menampilkannya, dan sesuai akal sehat: pagi ini kita lihat tidur
// semalam. Dulu dikelompokkan dari tanggal MULAI, akibatnya dasbor hari ini selalu kosong
// karena tidur semalam tercatat di tanggal kemarin.
const sleepPerDay = (samples) => {
  const byDay = {};
  for (const s of samples) {
    // Tanggal BANGUN = tanggal lokal endDate. Dulu di sini dipakai `startDate - 12 jam`, yang
    // justru kebalikannya: tidur 23:00 -> 07:00 mundur jadi 11:00 tanggal MULAI, sehingga tidur
    // semalam muncul di slot kemarin dan slot hari ini kosong (grafik terlihat "bolong 1 hari").
    const ymd = ymdOf(s.endDate);
    if (!byDay[ymd]) byDay[ymd] = { totalMinutes: 0, awake: 0, rem: 0, light: 0, deep: 0, sleepLog: [] };
    
    let currentEpoch = new Date(s.startDate).getTime();
    
    if (s.hasStageData && s.stages?.length) {
      s.stages.forEach((stage) => {
        byDay[ymd].totalMinutes += stage.durationMinutes;
        if (stage.stage in byDay[ymd]) byDay[ymd][stage.stage] += stage.durationMinutes;
        
        // Map string stages to chart numeric values (3=Awake, 2=REM, 1=Light, 0=Deep)
        let numStage = 1; // default Light
        const stg = stage.stage?.toLowerCase() || '';
        if (stg.includes('awake') || stg.includes('out') || stg === 'awake') numStage = 3;
        else if (stg.includes('rem') || stg === 'rem') numStage = 2;
        else if (stg.includes('deep') || stg === 'deep') numStage = 0;
        
        const timeStr = new Date(currentEpoch).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
        byDay[ymd].sleepLog.push({ time: timeStr, stage: numStage });
        
        currentEpoch += (stage.durationMinutes * 60000);
      });
      // Add closing point for the area chart
      const endTimeStr = new Date(currentEpoch).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
      const lastStage = byDay[ymd].sleepLog.length > 0 ? byDay[ymd].sleepLog[byDay[ymd].sleepLog.length - 1].stage : 1;
      byDay[ymd].sleepLog.push({ time: endTimeStr, stage: lastStage });
    } else {
      const durMins = (new Date(s.endDate) - new Date(s.startDate)) / 60000;
      byDay[ymd].totalMinutes += durMins;
      
      const timeStr = new Date(currentEpoch).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
      const endTimeStr = new Date(currentEpoch + (durMins * 60000)).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
      byDay[ymd].sleepLog.push({ time: timeStr, stage: 1 });
      byDay[ymd].sleepLog.push({ time: endTimeStr, stage: 1 });
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
      sleepLog: d.sleepLog
    };
  });
  return out;
};

// Tarik ringkasan kesehatan sehari-hari dalam SATU rentang tanggal sekaligus (bukan loop
// per-hari — tiap query native ada overhead round-trip, jadi 1 query lebar jauh lebih murah
// daripada N query sempit). Dipakai baik buat "hari ini" (range 1 hari) maupun backfill
// (range N hari) — bentuknya sama, cuma rentang tanggalnya beda.
// Hasil: { 'YYYY-MM-DD': { steps, stepMinutes, activityCalories, heartRate, minHeartRate, maxHeartRate,
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
    // Langkah diambil per JAM, bukan per hari: totalnya sama persis, tapi sebarannya dibutuhkan
    // buat menaksir DURASI jalan (lihat stepMinutesFromHourly — cap 60 menit/jam cuma bermakna
    // kalau sebaran per jamnya tahu). Kalau agregasi per jam gagal/kosong, jatuh balik ke bucket
    // harian: durasinya hilang, tapi jumlah langkahnya JANGAN sampai ikut hilang.
    (async () => {
      try {
        const res = await H.queryAggregated({ dataType: 'steps', startDate: startISO, endDate: endISO, bucket: 'hour', aggregation: 'sum' });
        const perDay = {};
        (res?.samples || []).forEach((s) => {
          if (!(s.value > 0)) return;
          const ymd = ymdOf(s.startDate);
          (perDay[ymd] = perDay[ymd] || []).push(s.value);
        });
        if (Object.keys(perDay).length > 0) {
          Object.entries(perDay).forEach(([ymd, hours]) => put(ymd, {
            steps: Math.round(hours.reduce((a, b) => a + b, 0)),
            stepMinutes: stepMinutesFromHourly(hours),
          }));
          return;
        }
      } catch (e) { console.warn('hcReadRange steps per jam gagal:', e); }
      try {
        const res = await H.queryAggregated({ dataType: 'steps', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' });
        (res?.samples || []).forEach((s) => { if (s.value > 0) put(ymdOf(s.startDate), { steps: Math.round(s.value) }); });
      } catch (e) { console.warn('hcReadRange steps gagal:', e); }
    })(),

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

    // HRV (RMSSD, satuan milidetik) — beda besaran dari restingHeartRate yang bpm.
    //
    // SAMSUNG HEALTH TIDAK MENGEKSPOR HRV KE HEALTH CONNECT (diverifikasi 11 Agu 2026 langsung di
    // layar "Data and access" HC: bagian Vitals cuma Heart rate, Oxygen saturation, dan Resting
    // heart rate). Kueri ini sengaja DIBIARKAN: ongkosnya satu readSamples dan dia langsung
    // berguna sendiri kalau kelak Samsung menulisnya, atau kalau user ganti ke jam tangan lain
    // (Polar/Garmin/Whoop menulis HRV ke HC). Jangan dikira rusak kalau hasilnya selalu kosong.
    H.readSamples({ dataType: 'heartRateVariability', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ hrv: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange heartRateVariability gagal:', e)),

    // BMR terukur dari Samsung Health/Google Fit — angka asli, lebih tepat daripada
    // hasil hitungan rumus Logym sendiri.
    H.readSamples({ dataType: 'basalCalories', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ bmr: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange basalCalories gagal:', e)),

    // Disimpan sebagai `hcCalories`, BUKAN `activityCalories`. Dua alasan, keduanya bug nyata:
    //  1. Satuannya beda. Ini kalori AKTIF (tanpa BMR); `activityCalories` milik Logym adalah
    //     TOTAL (BMR + langkah + latihan). Satu field dua satuan bikin grafik mingguan bergerigi:
    //     hari yang disinkron HC ~600 kkal, hari hitungan Logym ~2.400 kkal.
    //  2. Angka ini SUDAH MENGANDUNG record yang Logym sendiri tulis ke Health Connect
    //     (pushWorkoutsToHc). Menimpakannya balik ke field yang juga menghitung latihan Logym =
    //     satu sesi terhitung dua kali. Itu ping-pong yang bikin kalori hari lampau menggelembung.
    // Sekarang murni informasi pembanding; yang dipakai berhitung selalu dailyBurnCalories.
    //
    // Fallback dua tipe: 'calories' (ActiveCaloriesBurned, bisa di-aggregate langsung) dulu;
    // kalau kosong, baru 'totalCalories' (TotalCaloriesBurned) yang HARUS dibaca mentah lalu
    // dijumlah manual — queryAggregated plugin ini gak dukung tipe itu (lihat aggregateMetrics
    // di HealthManager.kt). Sumber macam Samsung Health cuma nulis yang kedua.
    (async () => {
      try {
        const res = await H.queryAggregated({ dataType: 'calories', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: 'sum' });
        const hit = (res?.samples || []).filter((s) => s.value > 0);
        if (hit.length > 0) {
          // AKTIF = di atas metabolisme istirahat, TIDAK termasuk BMR.
          hit.forEach((s) => put(ymdOf(s.startDate), { hcCalories: Math.round(s.value), hcCaloriesType: 'active' }));
          return;
        }
      } catch (e) { console.warn('hcReadRange calories gagal:', e); }
      try {
        const res = await H.readSamples({ dataType: 'totalCalories', startDate: startISO, endDate: endISO, limit: 5000, ascending: true });
        const byDay = {};
        // Dikelompokkan lalu DIJUMLAH TANPA TUMPANG TINDIH.
        //
        // Menjumlah semua sample mentah begitu saja itu salah: sumber seperti Samsung Health bisa
        // menulis record total HARIAN sekaligus record per-SESI yang rentangnya berada di dalam
        // hari itu. Keduanya sah, tapi yang kedua sudah termasuk di yang pertama — dijumlah
        // polos, satu sesi latihan terhitung dua kali. queryAggregated milik Firestore-nya HC
        // menangani ini lewat prioritas sumber, tapi plugin capgo tidak mendukung agregasi untuk
        // tipe ini (lihat aggregateMetrics di HealthManager.kt), jadi harus dikerjakan di sini.
        //
        // Aturannya: urutkan menurut waktu mulai, ambil record hanya kalau ia mulai SESUDAH
        // record terakhir yang sudah dihitung berakhir. Yang bersarang di dalamnya dilewati.
        Object.entries(groupByDay(res?.samples || [])).forEach(([ymd, list]) => {
          byDay[ymd] = sumNonOverlapping(list);
        });
        // TOTAL = BMR + aktif. Jenisnya ikut dicatat, karena angkanya TIDAK sebanding dengan
        // cabang 'active' di atas — beda ~1.500 kkal sehari, dan tanpa penanda ini grafik yang
        // menampilkan keduanya berdampingan akan terlihat melonjak tanpa sebab.
        Object.entries(byDay).forEach(([ymd, kcal]) => { if (kcal > 0) put(ymd, { hcCalories: Math.round(kcal), hcCaloriesType: 'total' }); });
      } catch (e) { console.warn('hcReadRange totalCalories gagal:', e); }
    })(),

    H.queryAggregated({ dataType: 'heartRate', startDate: startISO, endDate: endISO, bucket: 'day', aggregation: ['average', 'min', 'max'] })
      .then((res) => (res?.samples || []).forEach((s) => put(ymdOf(s.startDate), {
        ...(s.values?.average != null && { heartRate: Math.round(s.values.average) }),
        ...(s.values?.min != null && { minHeartRate: Math.round(s.values.min) }),
        ...(s.values?.max != null && { maxHeartRate: Math.round(s.values.max) }),
      })))
      .catch((e) => console.warn('hcReadRange heartRate gagal:', e)),

    // Log detail per jam (nadi/tensi/SpO2) — dipakai grafik intraday di kartu Aktivitas
    // Harian, terpisah dari angka ringkasan harian di atas yang dipakai kartu Komposisi Tubuh.
    H.readSamples({ dataType: 'heartRate', startDate: startISO, endDate: endISO, limit: 5000, ascending: true })
      .then((res) => Object.entries(logPerDay(res?.samples || [], (s) => ({ value: Math.round(s.value) })))
        .forEach(([ymd, log]) => put(ymd, { heartRateLog: log })))
      .catch((e) => console.warn('hcReadRange heartRateLog gagal:', e)),

    H.readSamples({ dataType: 'weight', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => {
         const samples = res?.samples || [];
         Object.entries(latestPerDay(samples, (s) => ({ weight: Number(s.value.toFixed(1)) })))
          .forEach(([ymd, v]) => put(ymd, v));
         Object.entries(logPerDay(samples, (s) => ({ value: Number(s.value.toFixed(1)) })))
          .forEach(([ymd, log]) => put(ymd, { weightLog: log }));
      })
      .catch((e) => console.warn('hcReadRange weight gagal:', e)),

    H.readSamples({ dataType: 'height', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ height: Math.round(s.value) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange height gagal:', e)),

    H.readSamples({ dataType: 'bodyFat', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(latestPerDay(res?.samples || [], (s) => ({ bodyFat: Number(s.value.toFixed(1)) })))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange bodyFat gagal:', e)),

    H.readSamples({ dataType: 'oxygenSaturation', startDate: startISO, endDate: endISO, limit: 5000, ascending: true })
      .then((res) => {
        const samples = res?.samples || [];
        Object.entries(latestPerDay(samples, (s) => ({ oxygenSaturation: Math.round(s.value) })))
          .forEach(([ymd, v]) => put(ymd, v));
        Object.entries(logPerDay(samples, (s) => ({ value: Math.round(s.value) })))
          .forEach(([ymd, log]) => put(ymd, { oxygenSaturationLog: log }));
      })
      .catch((e) => console.warn('hcReadRange oxygenSaturation gagal:', e)),

    H.readSamples({ dataType: 'bloodPressure', startDate: startISO, endDate: endISO, limit: 5000, ascending: true })
      .then((res) => {
        const samples = res?.samples || [];
        Object.entries(latestPerDay(samples, (s) => ({ bloodPressure: `${Math.round(s.systolic)}/${Math.round(s.diastolic)}` })))
          .forEach(([ymd, v]) => put(ymd, v));
        Object.entries(logPerDay(samples, (s) => ({ sys: Math.round(s.systolic), dia: Math.round(s.diastolic) })))
          .forEach(([ymd, log]) => put(ymd, { bloodPressureLog: log }));
      })
      .catch((e) => console.warn('hcReadRange bloodPressure gagal:', e)),

    // Sleep gak bisa di-aggregate (batasan plugin) — jumlah manual dari sample mentah.
    H.readSamples({ dataType: 'sleep', startDate: startISO, endDate: endISO, limit: 1000, ascending: true })
      .then((res) => Object.entries(sleepPerDay(res?.samples || []))
        .forEach(([ymd, v]) => put(ymd, v)))
      .catch((e) => console.warn('hcReadRange sleep gagal:', e)),

    H.readSamples({ dataType: 'dietaryEnergyConsumed', startDate: startISO, endDate: endISO, limit: 5000, ascending: true })
      .then((res) => {
        const byDay = {};
        (res?.samples || []).forEach((s) => {
          const ymd = ymdOf(s.startDate);
          const kcal = s.energy?.value ?? s.energy ?? s.value ?? 0;
          if (kcal > 0) byDay[ymd] = (byDay[ymd] || 0) + kcal;
        });
        Object.entries(byDay).forEach(([ymd, kcal]) => put(ymd, { nutritionCalories: Math.round(kcal) }));
      })
      .catch((e) => console.warn('hcReadRange nutrition gagal:', e)),
  ]);

  return byDay;
};

// Nadi mentah dalam SATU rentang sempit (dipakai per sesi latihan, bukan per hari).
//
// Sengaja TIDAK menumpang heartRateLog harian di hcReadRange. Di implementasi Android plugin
// (HealthManager.kt: readRecords), `limit` menghitung RECORD bukan sampel dan paging berhenti
// begitu kuotanya habis — sementara `ascending` yang dikirim dari JS tidak pernah dipakai sama
// sekali, jadi urutannya selalu default HC (paling lama dulu). Pada backfill 30 hari, kuota habis
// di hari-hari tertua dan hari terbaru diam-diam kosong: persis hari yang paling dibutuhkan.
// Rentang selebar satu sesi (1–2 jam) tidak pernah mendekati batas itu.
export const hcReadHeartRateWindow = async (startISO, endISO) => {
  if (!isNative()) return [];
  try {
    const res = await Health.readSamples({ dataType: 'heartRate', startDate: startISO, endDate: endISO, limit: 5000, ascending: true });
    return (res?.samples || [])
      .map((s) => ({ t: new Date(s.startDate).getTime(), v: Math.round(s.value) }))
      .filter((s) => Number.isFinite(s.t) && s.v > 0);
  } catch (e) {
    console.warn('hcReadHeartRateWindow gagal:', e);
    return [];
  }
};

// Field bioData yang boleh diisi dari Health Connect — TIDAK PERNAH menimpa field yang sudah
// ditandai manual (`_manualFlags`, lihat handleSaveManualData di DashboardTab.jsx).
//
// `activityCalories` SENGAJA TIDAK ADA DI SINI, jangan ditambahkan lagi. Field itu milik Logym
// (BMR + langkah + latihan, lihat dailyBurnCalories); versi Health Connect punya satuan berbeda
// (aktif saja, tanpa BMR) DAN sudah mengandung kalori yang Logym sendiri push ke sana, jadi
// menimpakannya bikin satu sesi terhitung dua kali. Angka HC-nya tetap masuk sebagai
// `hcCalories` (+ `hcCaloriesType`: 'active' atau 'total') — pembanding, bukan sumber hitungan.
export const HC_FIELDS = ['steps', 'stepMinutes', 'hcCalories', 'hcCaloriesType', 'heartRate', 'minHeartRate', 'maxHeartRate', 'restingHeartRate', 'hrv', 'weight', 'height', 'bodyFat', 'oxygenSaturation', 'bloodPressure', 'sleep', 'sleepAwake', 'sleepRem', 'sleepLight', 'sleepDeep', 'sleepLog', 'distance', 'bmr', 'heartRateLog', 'oxygenSaturationLog', 'bloodPressureLog', 'weightLog', 'nutritionCalories', 'activityCalories'];

// Bagian yang boleh ditambal ke hari LAMPAU (lihat healHcHoles di App.jsx): angka ringkasan saja.
// Kurva intraday sengaja dibuang — ~4 KB/hari x 365 hari itu jalur langsung ke batas 1 MiB
// dokumen history_years/<tahun>, batas yang sudah pernah ditabrak. Diturunkan dari HC_FIELDS,
// bukan disalin, supaya field baru tidak perlu didaftar dua kali.
export const HC_HEAL_FIELDS = HC_FIELDS.filter((k) => !k.endsWith('Log'));

/**
 * Patch "isi yang kosong saja": nilai yang SUDAH ada di bioData tidak pernah disentuh.
 *
 * Beda dari merge sinkron rutin, yang memang harus menimpa karena Health Connect bersifat
 * kumulatif (langkah hari ini nambah terus). Untuk hari lampau tidak ada yang perlu diperbarui —
 * yang ada cuma lubang. Menimpa di sana berarti menghapus angka yang mungkin dicatat sumber lain,
 * diam-diam, di ratusan hari sekaligus, tanpa jalur batal.
 */
export const fillOnlyPatch = (existingBio, hcData, fields = HC_HEAL_FIELDS) => {
  const bio = existingBio || {};
  const flags = bio._manualFlags || {};
  const patch = {};
  fields.forEach((k) => {
    if (hcData?.[k] === undefined) return;
    if (flags[k] !== undefined) return; // diisi user sendiri — bukan lubang
    const ada = bio[k];
    if (ada !== undefined && ada !== null && ada !== '') return;
    patch[k] = hcData[k];
  });
  return patch;
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
