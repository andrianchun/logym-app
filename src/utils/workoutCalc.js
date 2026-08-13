import { manualFieldValue, resolveLoggedExercise } from '../data/constants.js';

// MET (Metabolic Equivalent) untuk latihan beban/resistance training. Dipakai konsisten di
// seluruh app (dashboard, kartu riwayat kalender, share card) supaya estimasi kalori tidak
// beda-beda tergantung layar yang dibuka. Ini estimasi kasar (MET tetap, tidak membedakan
// intensitas/jenis gerakan) — mirip prinsip yang dipakai kebanyakan app fitness, tapi wearable
// berbasis detak jantung (mis. Samsung Health) biasanya menghasilkan angka lebih tinggi.
const WORKOUT_MET = 6.0;

// Kadensi jalan (langkah per menit) buat menaksir BERAPA LAMA user bergerak dari BERAPA BANYAK
// langkahnya. Health Connect tidak menyimpan durasi langkah — cuma jumlah — jadi angkanya harus
// diturunkan. 100 spm itu kadensi jalan santai-sedang orang dewasa; sengaja dibikin konstanta
// bernama karena ini knob kalibrasi: kadensi tiap orang beda (tinggi badan, kebiasaan), dan
// kalau durasinya terasa meleset yang perlu disetel cuma angka ini.
const KADENSI_JALAN = 100;

/**
 * Taksir menit aktif dari langkah per JAM (bukan total harian) — dijumlah per jam lalu tiap jam
 * di-cap 60 menit, supaya satu jam dengan 12.000 langkah tidak jadi "120 menit dalam sejam".
 * Total harian tidak dipakai justru karena cap itu: cap-nya cuma bermakna kalau sebarannya tahu.
 * @param {number[]} hourlySteps langkah tiap bucket satu jam
 * @returns {number} menit aktif, dibulatkan
 */
export const stepMinutesFromHourly = (hourlySteps) =>
  Math.round((hourlySteps || []).reduce((sum, steps) => sum + Math.min(60, (Number(steps) || 0) / KADENSI_JALAN), 0));

/**
 * Mengubah field `duration` workout (bisa berupa angka menit, atau string "H:MM:SS"/"MM:SS")
 * menjadi jumlah menit. Angka numerik selalu diperlakukan sebagai MENIT (bukan detik) —
 * konvensi ini mengikuti CalendarTab & DashboardTab.
 * @param {number|string} duration
 * @returns {number} durasi dalam menit
 */
export const parseWorkoutDurationMinutes = (duration) => {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
  const parts = duration.toString().split(':').map(Number);
  if (parts.length === 3) return Math.round(((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)) / 60);
  if (parts.length === 2) return Math.round(((parts[0] || 0) * 60 + (parts[1] || 0)) / 60);
  return 0;
};

/**
 * Rentang waktu sebenarnya satu sesi latihan: { start, end } (Date).
 *
 * `startedAt` (epoch ms, dicatat saat sesi disimpan) adalah sumber yang benar. Sesi lama tidak
 * punya itu, jadi jam mulainya direkonstruksi mundur dari `timestamp` — yang cuma "HH:MM" jam
 * SELESAI — dikurangi durasi. Sesi yang timestamp-nya pun tidak ada ditaruh di siang hari,
 * sekadar supaya tidak pernah menghasilkan tanggal invalid.
 *
 * SATU fungsi buat dua pemakai: rentang yang dikirim ke Health Connect dan rentang yang dipakai
 * memotong nadi WAJIB identik. Kalau dihitung terpisah di dua tempat, cepat atau lambat keduanya
 * bergeser dan nadi satu sesi diambil dari menit milik sesi lain.
 *
 * `guessed: true` menandai sesi yang jam-nya TIDAK diketahui sama sekali (jatuh ke siang hari).
 * Pemakai yang menarik data terikat waktu — nadi, misalnya — wajib melewatinya: menempelkan nadi
 * pukul 12 siang ke sesi yang entah jam berapa itu mengarang data, dan lebih buruk lagi karena
 * di UI ia tampil berlabel sumber asli.
 *
 * @param {object} workout record sesi (butuh `startedAt` atau `timestamp`, plus `duration`)
 * @param {string} ymd tanggal sesi "YYYY-MM-DD" (dipakai kalau jatuh ke `timestamp`)
 * @returns {{start: Date, end: Date, guessed: boolean}}
 */
export const workoutWindow = (workout, ymd) => {
  const mins = parseWorkoutDurationMinutes(workout?.duration);
  const startedAt = Number(workout?.startedAt) || 0;
  if (startedAt > 0) {
    const start = new Date(startedAt);
    return { start, end: new Date(start.getTime() + mins * 60000), guessed: false };
  }
  const known = /^\d{2}:\d{2}$/.test(workout?.timestamp || '');
  const end = new Date(`${ymd}T${known ? workout.timestamp : '12:00'}:00`);
  return { start: new Date(end.getTime() - mins * 60000), end, guessed: !known };
};

/**
 * Berapa detik durasi latihan yang boleh dipulihkan setelah app mati mendadak.
 *
 * `savedAt` = denyut terakhir yang menandakan app masih hidup. Durasi dihitung sampai denyut itu
 * saja; waktu SELAMA app mati tidak pernah ikut dihitung, berapa pun lamanya. Konsekuensinya
 * durasi selalu sedikit lebih pendek dari kenyataan (paling banyak satu selang denyut), dan itu
 * arah meleset yang benar: kalau waktu mati ikut dihitung, HP yang mati semalam mengubah sesi 40
 * menit jadi 8 jam, dan angka itu merembet merusak kalori serta jendela nadi yang berangkat dari
 * durasi. `now` tidak dipakai sama sekali — sengaja, supaya jelas jamnya tidak pernah berjalan
 * saat app tidak hidup.
 *
 * @returns {number} detik, tidak pernah negatif
 */
export const recoveredWorkoutSeconds = (startTime, savedAt) => {
  const start = Number(startTime) || 0;
  const beat = Number(savedAt) || 0;
  if (start <= 0 || beat <= 0) return 0;
  return Math.max(0, Math.floor((beat - start) / 1000));
};

/**
 * Ringkas deret nadi mentah jadi kurva pendek + angka ringkasan.
 *
 * WAJIB diringkas sebelum disimpan: nadi dari jam tangan itu ~1 sampel/detik (sejam = 3.600
 * titik), sedangkan riwayat SETAHUN tinggal di SATU dokumen Firestore yang batasnya 1 MiB.
 *
 * avg/min/max sengaja dihitung dari sampel ASLI, bukan dari hasil ringkasan: rata-rata per ember
 * menumpulkan puncak, jadi nadi maksimal yang cuma bertahan beberapa detik akan hilang justru
 * pada angka yang paling ingin dilihat orang setelah latihan.
 *
 * `t` pada hasilnya adalah DETIK sejak titik pertama, bukan epoch ms. Alasannya ukuran: epoch ms
 * itu 13 digit per titik, dan ratusan sesi setahun menumpuk di satu dokumen yang berbatas 1 MiB —
 * detik-offset cukup 3–4 digit dan informasinya sama saja untuk kurva satu sesi.
 *
 * @param {{t:number, v:number}[]} samples t = epoch ms, v = bpm
 * @param {number} targetPoints jumlah titik kurva yang diinginkan
 * @returns {{avg:number, min:number, max:number, points:{t:number,v:number}[]}|null} t = detik sejak awal
 */
export const summarizeHeartRate = (samples, targetPoints = 60) => {
  const valid = (samples || [])
    .map((s) => ({ t: Number(s?.t), v: Number(s?.v) }))
    .filter((s) => Number.isFinite(s.t) && s.v > 0)
    .sort((a, b) => a.t - b.t);
  if (valid.length === 0) return null;

  const values = valid.map((s) => s.v);
  const summary = {
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
  };

  const t0 = valid[0].t;
  const secOffset = (t) => Math.round((t - t0) / 1000);

  // Sampel lebih sedikit dari target: tidak ada yang perlu diringkas, pakai apa adanya.
  if (valid.length <= targetPoints) {
    return { ...summary, points: valid.map((s) => ({ t: secOffset(s.t), v: s.v })) };
  }

  // Ember dibagi rata berdasarkan WAKTU, bukan jumlah sampel — jam tangan bisa merekam rapat saat
  // bergerak dan renggang saat istirahat, dan pembagian per-jumlah bikin sumbu waktunya melar
  // tidak beraturan.
  const span = valid[valid.length - 1].t - t0;
  if (span <= 0) return { ...summary, points: [{ t: 0, v: valid[0].v }] };

  const buckets = [];
  valid.forEach((s) => {
    const idx = Math.min(targetPoints - 1, Math.floor(((s.t - t0) / span) * targetPoints));
    (buckets[idx] = buckets[idx] || []).push(s);
  });

  const points = buckets
    .filter(Boolean) // ember kosong (jeda rekaman) dibuang, bukan diisi nol yang bikin kurva terjun
    .map((bucket) => ({
      t: secOffset(bucket[0].t),
      v: Math.round(bucket.reduce((a, s) => a + s.v, 0) / bucket.length),
    }));

  return { ...summary, points };
};

/**
 * Ambil [durasi menit, jarak km] dari satu set, apapun bentuk penyimpanannya.
 *
 * Set KARDIO (ImmersiveWorkout/ExerciseCard mode cardio) menyimpan { duration: MENIT, distance: KM }.
 * Set TIME non-kardio (plank dsb, label UI "Durasi (dtk)") menyimpan { d: DETIK }.
 * Kalau set-nya kosong JANGAN jatuh ke ex.duration: itu default library (Treadmill 15 mnt,
 * Sepeda/Renang 30 mnt) yang bikin satu centang setelah 20 detik dihitung ~150 kcal.
 */
const setDurationKm = (set) => {
  if (set?.duration != null) return [Number(set.duration) || 0, Number(set.distance) || 0];
  if (set?.d != null) return [(Number(set.d) || 0) / 60, Number(set.distance) || 0];
  return [0, 0];
};

// Latihan berbasis waktu. Library punya dua penamaan ('time' & 'cardio'), keduanya bukan set beban.
const isTimeBased = (ex) => ex?.type === 'time' || ex?.type === 'cardio';

// MET kardio berdasar kecepatan rata-rata. Tanpa data jarak, pakai default sedang (7.0).
const cardioMet = (durationMins, distKm) => {
  if (!(distKm > 0) || !(durationMins > 0)) return 7.0;
  const speedKmH = distKm / (durationMins / 60);
  if (speedKmH <= 4) return 3.5;
  if (speedKmH <= 6) return 5.0;
  if (speedKmH <= 8) return 8.0;
  if (speedKmH <= 10) return 9.8;
  if (speedKmH <= 12) return 11.5;
  return 12.0;
};

/**
 * Kalori tambahan (di atas baseline MET 2.5) dari satu set yang sudah dicentang selesai.
 * Dipakai sama persis oleh perhitungan live maupun riwayat supaya angkanya tidak beda antar layar.
 */
const setExtraCalories = (weight, ex, set) => {
  if (isTimeBased(ex)) {
    const [setDurMins, distKm] = setDurationKm(set);
    return weight * Math.max(0, cardioMet(setDurMins, distKm) - 2.5) * (setDurMins / 60);
  }
  // BEBAN (Reps): Asumsi repetisi makan waktu rata-rata 4 detik per rep (TUT)
  const reps = Number(set.r || ex.reps || 10);
  const activeWorkMins = (reps * 4) / 60;
  // Tambahan MET 3.5 (total WORKOUT_MET 6.0 - 2.5 baseline)
  let setCal = weight * 3.5 * (activeWorkMins / 60);
  // Bonus kalori dari beban yang diangkat (Force x Distance -> kcal)
  const setWeight = Number(set.w || ex.defaultWeight || 0);
  if (setWeight > 0) setCal += setWeight * reps * 0.006;
  return setCal;
};

/**
 * Ambil daftar set satu latihan dari sebuah objek log, apa pun bentuk kuncinya.
 *
 * Kunci log tidak seragam: `ex.id` polos, `${ex.id}-${workout.id}`, dan untuk latihan ekstra
 * `${ex.id}-${timestamp}`. Mencocokkan dua bentuk saja seperti dulu bikin sesi yang kuncinya
 * sedikit berbeda menghasilkan kalori NOL padahal set-nya jelas tercatat — angka yang salah
 * total, dan tidak ada tanda apa pun bahwa penyebabnya cuma kunci tidak ketemu.
 *
 * Urutannya: dua bentuk baku dulu (paling murah dan paling sering benar), baru menyapu kunci
 * yang berawalan `${ex.id}-` sebagai jaring pengaman.
 */
const setsForExercise = (logs, ex, workout) => {
  if (!logs || !ex) return null;
  const direct = logs[ex.id] || (workout?.id != null ? logs[`${ex.id}-${workout.id}`] : undefined);
  if (direct) return direct;
  const prefix = `${ex.id}-`;
  const kandidat = Object.keys(logs).filter(k => k.startsWith(prefix));
  if (kandidat.length === 0) return null;
  if (kandidat.length === 1) return logs[kandidat[0]];
  // Lebih dari satu kunci berawalan sama = `logs` ini log tingkat-HARI (dipakai saat `w.log`
  // kosong), jadi isinya set dari BEBERAPA sesi. Mengambil yang pertama seperti dulu berarti
  // sesi sore bisa dihitung memakai set sesi pagi. Utamakan yang berakhiran id sesi ini;
  // baru kalau tidak ada yang cocok, pakai yang pertama sebagai jaring pengaman.
  const milikSesi = workout?.id != null && kandidat.find(k => k.endsWith(`-${workout.id}`));
  return logs[milikSesi || kandidat[0]];
};

/**
 * Apakah SATU latihan tergolong kardio. Per-latihan, bukan per-sesi — sesi campuran (program
 * beban yang ditutup treadmill) harus terbelah benar.
 *
 * `type === 'time'` saja TIDAK cukup: plank juga berbasis waktu tapi itu kerja inti, bukan kardio.
 * Aturannya disamakan dengan yang sudah dipakai kartu riwayat kalender supaya tidak ada dua
 * definisi "kardio" yang bisa berbeda jawaban untuk latihan yang sama.
 */
export const isCardioExercise = (ex) => {
  if (ex?.type === 'cardio') return true;
  const hay = `${ex?.name || ''} ${Array.isArray(ex?.target) ? ex.target.join(' ') : ''}`.toLowerCase();
  return hay.includes('cardio') || hay.includes('kardio');
};

/**
 * Kata yang menandakan latihan kardio. Dicocokkan di AWAL KATA, bukan di mana saja:
 * "Cable Crunch" mengandung potongan "run" di tengah kata — pencocokan substring lama
 * menganggapnya kardio. Hari ini tidak berakibat (Crunch bertipe 'weight', promosi cuma
 * berlaku untuk 'time'), tapi begitu ada Crunch berbasis waktu, durasinya akan dibaca
 * sebagai MENIT dan kalorinya meledak. Batas awal kata membuat "Running" tetap cocok
 * sementara "Crunch" tidak.
 */
const CARDIO_WORDS = ['cardio', 'kardio', 'run', 'lari', 'jog', 'treadmill', 'cycl', 'bike',
  'sepeda', 'swim', 'renang', 'elliptical', 'eliptik', 'rowing', 'dayung', 'walk', 'jalan'];
const CARDIO_RE = new RegExp(`\\b(${CARDIO_WORDS.join('|')})`, 'i');

/**
 * SATU-SATUNYA penentu kategori latihan untuk UI. Mengembalikan 'weight' | 'reps' | 'time' | 'cardio'.
 *
 * Kenapa perlu: `type` di library tidak cukup. Latihan impor ExerciseDB yang jelas-jelas kardio
 * diberi `type: 'time'` (exerciseDbApi.js), jadi tiap layar dulu menebak ulang dari nama/target —
 * lima salinan dengan daftar kata kunci yang BERBEDA, sehingga "Swimming (Renang)" bertipe 'time'
 * dibaca kardio oleh kartu latihan tapi non-kardio oleh mode immersive. Beda jawaban = beda satuan
 * durasi (menit vs detik) untuk latihan yang sama.
 *
 * Promosi hanya dari 'time' ke 'cardio'. Latihan beban bernama kardio tetap beban.
 */
export const resolveExerciseKind = (ex) => {
  const type = ex?.type || 'weight';
  if (type !== 'time') return type;
  const hay = `${ex?.name || ''} ${Array.isArray(ex?.target) ? ex.target.join(' ') : (ex?.target || '')}`;
  return CARDIO_RE.test(hay) ? 'cardio' : 'time';
};

/**
 * Satuan durasi set menurut kategorinya. Kardio menyimpan MENIT di `set.duration`,
 * latihan waktu lain menyimpan DETIK di `set.d` — lihat setDurationKm di atas.
 */
export const durationUnitOf = (ex) => (resolveExerciseKind(ex) === 'cardio' ? 'menit' : 'detik');

/**
 * Pecah kalori satu sesi jadi { kardio, beban }.
 *
 * Jumlah keduanya DIJAMIN sama persis dengan calculateSmartWorkoutCalories untuk sesi yang sama:
 * totalnya diambil dari fungsi itu, lalu dibagi menurut porsi — bukan dihitung ulang dari nol.
 * Kalau dihitung ulang, pembulatan di dua tempat bikin rincian meleset dari angka besarnya, dan
 * itu jenis ketidakcocokan yang paling bikin user hilang percaya pada angkanya.
 *
 * ponytail: porsinya diambil dari kalori-EKSTRA tiap kategori, jadi baseline "waktu di gym"
 * (MET 2,5 × durasi) ikut terbagi proporsional. Baseline itu memang tidak dimiliki latihan mana
 * pun — pembagian ini taksiran. Jalur naiknya: catat durasi per latihan, lalu bagi baseline
 * menurut waktu sebenarnya.
 */
export const splitWorkoutCalories = (weightKg, workout, logs, globalRestTime = 90, profile = null) => {
  // `profile` WAJIB diteruskan: totalnya diambil dari fungsi itu, jadi kalau di sini tidak ikut,
  // rincian kardio/beban meleset dari angka besarnya persis di sesi yang memakai nadi.
  const total = calculateSmartWorkoutCalories(weightKg, workout, logs, globalRestTime, profile);
  if (!(total > 0)) return { kardio: 0, beban: 0 };

  const weight = Number(weightKg) || 70;
  const exercises = workout?.overriddenExercises || workout?.exercises || [];
  let extraCardio = 0;
  let extraBeban = 0;

  exercises.forEach((ex) => {
    // Pencocokan log sama persis dengan calculateSmartWorkoutCalories — sesi program me-render
    // tiap latihan dengan id gabungan `${ex.id}-${workout.id}`.
    const exLogs = setsForExercise(logs, ex, workout);
    if (!exLogs) return;
    const isCardio = isCardioExercise(ex);
    Object.values(exLogs).forEach((set) => {
      if (!set?.done) return;
      const cal = setExtraCalories(weight, ex, set);
      if (isCardio) extraCardio += cal; else extraBeban += cal;
    });
  });

  const extraTotal = extraCardio + extraBeban;
  let share;
  if (extraTotal > 0) {
    share = extraCardio / extraTotal;
  } else {
    // Tidak ada set tercatat (riwayat lama, atau kalori datang dari `caloriesBurned` wearable):
    // jatuh ke penggolongan tingkat SESI — kardio kalau semua latihannya kardio.
    share = exercises.length > 0 && exercises.every(isCardioExercise) ? 1 : 0;
  }

  // Satu sisi dibulatkan, sisanya diambil dari pengurangan — dengan begitu jumlahnya tidak pernah
  // meleset satu kalori dari total karena dua pembulatan terpisah.
  const kardio = Math.round(total * share);
  return { kardio, beban: total - kardio };
};

// Kata kunci nama latihan -> jenis olahraga Health Connect. Dipakai hanya kalau sesinya
// MURNI kardio; sesi yang mengandung latihan beban selalu dianggap latihan beban.
const CARDIO_KEYWORDS = [
  [/treadmill/i, 'runningTreadmill'],
  [/\b(lari|run|jog)/i, 'running'],
  [/(sepeda|cycl|bike|spinning)/i, 'cycling'],
  [/(jalan|walk)/i, 'walking'],
  [/(dayung|row)/i, 'rowingMachine'],
  [/(elliptical|eliptik)/i, 'elliptical'],
  [/(renang|swim)/i, 'swimming'],
  [/(tangga|stair)/i, 'stairClimbing'],
  [/(lompat tali|jump rope|skipping)/i, 'highIntensityIntervalTraining'],
];

/**
 * Tebak jenis olahraga sebuah sesi untuk ditulis ke Health Connect.
 *
 * Aturannya sengaja sederhana dan bisa diterka: sesi yang mengandung latihan beban selalu
 * jadi 'strengthTraining' — termasuk sesi CAMPURAN (mis. beban + treadmill sebagai pemanasan),
 * karena bagian bebannya yang jadi inti sesi. Hanya sesi yang SEMUA latihannya berbasis waktu
 * (kardio) yang dipetakan ke jenis kardio, ditebak dari nama latihannya.
 *
 * @param {Array} exercises - daftar latihan pada sesi (exercises / overriddenExercises)
 * @returns {string} nama jenis olahraga yang dikenali ExerciseWriterPlugin.kt
 */
export const guessWorkoutType = (exercises) => {
  const list = Array.isArray(exercises) ? exercises : [];
  if (list.length === 0) return 'strengthTraining';
  const cardio = list.filter(isTimeBased);
  // Ada latihan beban (murni atau campuran) -> latihan beban.
  if (cardio.length < list.length) return 'strengthTraining';
  const names = cardio.map((e) => e?.name || '').join(' ');
  for (const [re, type] of CARDIO_KEYWORDS) if (re.test(names)) return type;
  return 'running'; // kardio tapi namanya tidak dikenali
};

/**
 * Kalori dari NADI (Keytel et al., 2005) — rumus baku yang dipakai wearable berbasis detak jantung.
 *
 * KAPAN INI LEBIH BAIK: kardio stabil (treadmill, sepeda, elliptical). Di situ nadi naik sebanding
 * dengan konsumsi oksigen, jadi rumusnya valid — dan ia menangkap dua hal yang tidak diketahui
 * hitungan berbasis MET Logym: INKLINASI (treadmill 6 km/jam di tanjakan 10% jauh lebih berat
 * daripada di datar, tapi kecepatannya sama) dan tingkat kebugaran masing-masing orang.
 *
 * KAPAN INI JUSTRU SALAH: latihan beban. Nadi saat angkat beban naik karena kontraksi isometrik,
 * napas ditahan, dan lonjakan simpatis — bukan karena konsumsi oksigen berkelanjutan. Rumusnya
 * tidak tahu bedanya dan menerjemahkan nadi tinggi jadi kalori tinggi. Ini penyebab sesi angkat
 * beban tercatat ~700 kkal di Samsung Health padahal hitungan berbasis set-nya ~400 (MET 11,7 =
 * setara lari 11 km/jam selama 45 menit tanpa henti — mustahil untuk latihan berisi istirahat).
 * Karena itu pemanggilnya WAJIB membatasi ke sesi yang murni kardio.
 *
 * Mengembalikan 0 kalau datanya tidak cukup atau di luar nalar — pemanggil jatuh ke hitungan
 * berbasis set. Nadi itu PENINGKATAN, bukan prasyarat: tanpa jam tangan semuanya tetap terhitung.
 *
 * @returns {number} kcal, 0 kalau tidak bisa dihitung
 */
export const heartRateCalories = ({ avgHr, minutes, weightKg, age, gender }) => {
  const hr = Number(avgHr);
  const min = Number(minutes);
  const w = Number(weightKg);
  const a = Number(age);
  // Batas kewarasan. Nadi di luar 60–220 hampir pasti artefak sensor, dan umur di luar 10–100
  // biasanya berarti tanggal lahir salah isi — dua-duanya menghasilkan angka yang meyakinkan
  // tapi karangan, dan itu lebih buruk daripada tidak punya angka sama sekali.
  if (!(hr >= 60 && hr <= 220) || !(min > 0) || !(w > 0) || !(a >= 10 && a <= 100)) return 0;

  const perMin = gender === 'female'
    ? (-20.4022 + 0.4472 * hr - 0.1263 * w + 0.074 * a) / 4.184
    : (-55.0969 + 0.6309 * hr + 0.1988 * w + 0.2017 * a) / 4.184;

  // Di nadi rendah rumusnya bisa menghasilkan angka negatif — itu di luar rentang kalibrasinya,
  // bukan "membakar kalori negatif". Kembalikan 0 supaya pemanggil memakai hitungan set.
  const kcal = perMin * min;
  return kcal > 0 ? Math.round(kcal) : 0;
};

/** Umur dari tanggal lahir. Konvensinya disamakan dengan yang sudah dipakai calcBMR. */
export const ageFromDob = (dob) => {
  if (!dob) return 0;
  const t = new Date(dob).getFullYear();
  return Number.isFinite(t) ? new Date().getFullYear() - t : 0;
};

/**
 * Estimasi kalori terbakar untuk satu sesi latihan berdasarkan berat badan & durasi.
 * @param {number} weightKg - berat badan pengguna (kg). Fallback ke 70kg kalau belum diisi.
 * @param {number} durationMinutes
 * @returns {number} estimasi kcal (dibulatkan)
 */
export const calculateWorkoutCalories = (weightKg, durationMinutes) => {
  const weight = Number(weightKg) || 70;
  const duration = Number(durationMinutes) || 0;
  return Math.round(weight * WORKOUT_MET * (duration / 60));
};

/**
 * Estimasi kalori terbakar super cerdas (Set-Based) atau dari Health Connect.
 * Mencegah eksploitasi timer karena hanya menghitung set yang benar-benar selesai dicentang.
 * @param {number} weightKg - berat badan pengguna (kg).
 * @param {object} workout - Objek workout yang berisi exercises/overriddenExercises dan durasi.
 * @param {object} logs - Objek exerciseLogs (e.g. { "101": [{ done: true, r: 10 }] })
 * @param {number} [globalRestTime=90] - Default rest timer jika tidak ada di set/exercise.
 * @returns {number} estimasi kcal yang sangat akurat
 */
export const calculateSmartWorkoutCalories = (weightKg, workout, logs, globalRestTime = 90, profile = null) => {
  if (!workout) return 0;

  // 1. Prioritas Utama: Jika ada data nyata dari Smartwatch / Health Connect
  if (workout.caloriesBurned) {
    return Number(workout.caloriesBurned);
  }

  // 1b. HIBRIDA: sesi MURNI KARDIO yang punya nadi asli dihitung dari nadi, bukan dari MET.
  //
  // Hanya untuk kardio, dan itu batas yang paling penting di sini. Untuk latihan beban, nadi
  // menyesatkan (lihat catatan panjang di heartRateCalories) — di situ hitungan berbasis set
  // justru yang lebih dekat kebenaran. guessWorkoutType dipakai sebagai penentu "murni kardio"
  // supaya tidak ada definisi kedua yang bisa berbeda jawaban; sesi CAMPURAN sengaja tidak masuk,
  // karena bagian bebannya akan ikut digelembungkan.
  //
  // Nadi = peningkatan, bukan prasyarat. Tanpa jam tangan / tanpa Health Connect, `workout.hr`
  // tidak ada, blok ini dilewati begitu saja, dan hitungannya persis seperti sebelumnya.
  if (profile && workout.hr?.avg) {
    const exs = workout.overriddenExercises || workout.exercises || [];
    if (exs.length > 0 && guessWorkoutType(exs) !== 'strengthTraining') {
      const hrKcal = heartRateCalories({
        avgHr: workout.hr.avg,
        minutes: parseWorkoutDurationMinutes(workout.duration),
        weightKg: Number(weightKg) || 70,
        age: profile.age || ageFromDob(profile.dob),
        gender: profile.gender,
      });
      if (hrKcal > 0) return hrKcal;
    }
  }

  // 2. Fallback: Jika tidak ada logs sama sekali (riwayat lama banget), pakai blind timer lawas
  if (!logs || Object.keys(logs).length === 0) {
    const durMins = parseWorkoutDurationMinutes(workout.duration);
    return calculateWorkoutCalories(weightKg, durMins);
  }

  const weight = Number(weightKg) || 70;
  const durMins = parseWorkoutDurationMinutes(workout.duration);
  
  // Baseline kalori selama di gym (MET 2.5: aktivitas ringan, berdiri, berjalan pelan)
  // Memastikan durasi keseluruhan (termasuk pause/istirahat tak tercatat) ikut menyumbang kalori.
  const baselineCalories = weight * 2.5 * (durMins / 60);

  let extraCalories = 0;
  let matchedAnyExercise = false;

  // Ambil daftar latihan (bisa dari Override atau Adhoc)
  const exercises = workout.overriddenExercises || workout.exercises || [];

  exercises.forEach(ex => {
    const exLogs = setsForExercise(logs, ex, workout);
    if (!exLogs) return;
    matchedAnyExercise = true;

    // Object.values, bukan Array.isArray lalu forEach: set bisa berbentuk objek ber-key angka
    // setelah bolak-balik lewat penyimpanan. Dulu bentuk itu ditolak diam-diam dan seluruh
    // latihannya dianggap tidak ada — hasilnya kalori NOL padahal setnya lengkap.
    Object.values(exLogs).forEach(set => {
      // HANYA hitung kalori jika set benar-benar dicentang selesai
      if (set?.done) extraCalories += setExtraCalories(weight, ex, set);
    });
  });

  // Log beneran ada isinya, tapi gak ada satupun exercise yang id-nya cocok sama log.
  // Fallback ke estimasi timer biasa (durasi × MET) alih-alih 0.
  if (baselineCalories === 0 && extraCalories === 0 && !matchedAnyExercise) {
    return calculateWorkoutCalories(weight, durMins);
  }

  // Jika durasi 0 (lupa start timer), pastikan kalori tidak undercount drastis
  // dengan memberikan minimal MET 6.0 untuk set yang diselesaikan.
  if (durMins === 0 && extraCalories > 0) {
      return Math.round(extraCalories * (6.0 / 3.5)); 
  }

  return Math.round(baselineCalories + extraCalories);
};

/**
 * Hitung ulang rekor kekuatan (10RM estimasi + beban terakhir) dari SELURUH riwayat, untuk
 * latihan-latihan yang kuncinya disebut di `logKeys`.
 *
 * Kunci log diterjemahkan lewat resolveLoggedExercise, BUKAN `key.split('-')[0]`. Cara lama itu
 * memotong id UUID di tanda hubung pertama, jadi setiap latihan yang pernah ditambahkan atau
 * diganti user (semuanya ber-UUID) tidak pernah mendapat rekor — diam-diam, tanpa error, dan
 * kolom 10RM-nya kosong selamanya. Aturan yang sama sudah dipakai di grafik progres; ini titik
 * terakhir yang masih memakai versi lamanya.
 *
 * @param {object} history seluruh history
 * @param {string[]} logKeys kunci log dari sesi yang baru disimpan
 * @param {object} exLookup peta id -> latihan (program + library + latihan ekstra)
 * @returns {object} { [idLatihan]: { rm10, lastWeight } } — hanya yang punya rekor
 */
/**
 * SATU-SATUNYA rumus 10RM. Sebelumnya ada empat salinan yang tidak sepakat, dan yang paling
 * mencolok: kalkulator manual di ExerciseDetailModal membulatkan 1RM ke bilangan bulat SEBELUM
 * dibagi 1,3333. Untuk 100 kg x 10 reps, jalur riwayat memberi 100,0 sementara kalkulator memberi
 * 99,8 — dari data yang sama persis. Itulah keluhan "10RM calc kok ga sinkron".
 *
 * Epley (1RM = w x (1 + reps/30)) tidak berlaku untuk 1 repetisi: kalau seseorang mengangkat 1
 * kali, beban itu MEMANG 1RM-nya, bukan 3,3% lebih berat. Kekecualian ini dulu hanya ada di
 * kalkulator manual.
 */
export const estimate1RM = (weightKg, reps) => {
  const w = Number(weightKg) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return r > 1 ? w * (1 + r / 30) : w;
};

export const estimate10RM = (weightKg, reps) => {
  const oneRM = estimate1RM(weightKg, reps);
  if (oneRM <= 0) return 0;
  return Math.round((oneRM / 1.3333) * 10) / 10;
};

/**
 * Bulatkan KE BAWAH ke kelipatan yang benar-benar tersedia di alat. Ke bawah, bukan ke terdekat:
 * menawarkan beban yang lebih berat dari kemampuan terukur itu saran yang bisa mencederai.
 * 10RM 42,5 kg di alat berkelipatan 5 -> 40 kg.
 */
export const roundDownToStep = (weightKg, step) => {
  const w = Number(weightKg) || 0;
  const s = Number(step) || 0;
  if (w <= 0) return 0;
  if (s <= 0) return w;
  return Math.round(Math.floor(w / s) * s * 100) / 100;
};

/**
 * Kelipatan beban yang tersedia di gym yang sedang aktif, untuk satu jenis alat.
 * Sumbernya sama dengan yang dipakai kolom input beban di ExerciseCard.
 */
export const gymStepFor = (gymProfiles, activeGymId, equipment, isImperial = false) => {
  const bawaan = isImperial ? 5 : 2.5;
  if (!gymProfiles || !activeGymId || !equipment) return bawaan;
  const gym = gymProfiles.find((g) => g.id === activeGymId) || gymProfiles[0];
  return Number(gym?.config?.[equipment]?.increment) || bawaan;
};

/**
 * Beban awal yang muncul di kolom kg saat satu set belum pernah disentuh.
 *
 * Urutannya SENGAJA 10RM lebih dulu, baru beban terakhir: 10RM adalah taksiran kemampuan
 * sekarang dan ikut naik begitu user memecahkan rekor, sementara lastWeight cuma "angka yang
 * terakhir diketik" — termasuk kalau sesi terakhir kebetulan ringan. Selalu dibulatkan KE BAWAH
 * ke kelipatan yang benar-benar ada di alat.
 */
export const defaultSetWeight = (libEx, ex, step) => {
  const rm10 = Number(libEx?.rm10) || 0;
  if (rm10 > 0) {
    const bulat = roundDownToStep(rm10, step);
    if (bulat > 0) return bulat;
  }
  return Number(libEx?.lastWeight) || Number(ex?.defaultWeight) || 0;
};

export const recomputeStrengthRecords = (history, logKeys, exLookup) => {
  const ids = new Set();
  (logKeys || []).forEach((k) => {
    const ex = resolveLoggedExercise(k, exLookup);
    if (ex) ids.add(String(ex.id));
  });
  if (ids.size === 0) return {};

  const out = {};
  Object.keys(history || {}).forEach((dateStr) => {
    const dateMs = new Date(dateStr).getTime();
    if (!Number.isFinite(dateMs)) return;
    (history[dateStr]?.workouts || []).forEach((wk) => {
      if (wk?.status !== 'completed' || !wk.log) return;
      Object.keys(wk.log).forEach((k) => {
        const id = String(resolveLoggedExercise(k, exLookup)?.id);
        if (!ids.has(id)) return;
        const rec = (out[id] = out[id] || { rm10: 0, rm10At: 0, lastWeight: 0, _at: 0 });
        let bestInSession = 0;
        // Object.values, bukan .forEach langsung: set bisa berbentuk objek ber-key angka setelah
        // bolak-balik lewat penyimpanan, dan `.forEach` pada objek melempar TypeError — satu sesi
        // berbentuk begitu dulu menjatuhkan seluruh proses simpan latihan.
        Object.values(wk.log[k] || {}).forEach((s) => {
          if (!s || s.skipped || !(Number(s.w) > 0) || !(Number(s.r) > 0)) return;
          const c10RM = estimate10RM(s.w, s.r);
          // rm10At = KAPAN rekor itu tercatat. Dibutuhkan supaya 10RM yang di-override manual
          // tidak bisa ditimpa oleh sesi lama, tapi tetap boleh dipecahkan sesi baru.
          if (c10RM > rec.rm10) { rec.rm10 = c10RM; rec.rm10At = dateMs; }
          if (Number(s.w) > bestInSession) bestInSession = Number(s.w);
        });
        // `>=`: sesi yang baru saja disimpan bertanggal sama dengan rekor terakhir, dan yang
        // terbaru harus menang.
        if (bestInSession > 0 && dateMs >= rec._at) { rec._at = dateMs; rec.lastWeight = bestInSession; }
      });
    });
  });

  const clean = {};
  Object.entries(out).forEach(([id, r]) => {
    if (r.rm10 > 0) clean[id] = { rm10: r.rm10, rm10At: r.rm10At, lastWeight: r.lastWeight };
  });
  return clean;
};

/**
 * Gabungkan 10RM tersimpan dengan yang baru dihitung dari riwayat.
 *
 * Aturannya tiga baris, tapi tiap barisnya menutup satu cara data hilang:
 *  1. Tanpa override manual -> ambil yang tertinggi. Rekor tidak boleh turun hanya karena sesi
 *     asalnya tidak lagi ada di `history` (riwayat lama belum tersinkron, dipangkas, dsb).
 *  2. Ada override manual, dan rekor riwayat berasal dari SEBELUM tanggal override -> pertahankan
 *     nilai manual. Inilah gunanya tombol simpan di kalkulator 10RM: menurunkan acuan setelah
 *     jeda panjang. Kalau riwayat lama boleh menimpanya, tombol itu tidak ada artinya.
 *  3. Ada override manual, tapi rekor riwayat berasal dari SESUDAH tanggal override -> ambil yang
 *     tertinggi seperti biasa. Override menetapkan titik awal baru, bukan plafon permanen.
 */
export const mergeRm10 = (tersimpan, manualAt, dariRiwayat, rm10At) => {
  const a = Number(tersimpan) || 0;
  const b = Number(dariRiwayat) || 0;
  const manual = Number(manualAt) || 0;
  if (manual > 0 && (Number(rm10At) || 0) <= manual) return a;
  return Math.max(a, b);
};

/**
 * Rincian satu sesi untuk ditulis ke Health Connect: segmen per latihan + ringkasan teks.
 *
 * Sebelumnya sesi Logym masuk ke HC sebagai satu blok kosong — cuma nama, jenis, dan durasi.
 * Dibuka di Samsung Health, isinya tidak menunjukkan latihan apa pun.
 *
 * BATAS PLATFORM YANG PERLU DIKETAHUI SEBELUM BERHARAP LEBIH:
 *  - `repetitions` per segmen: ADA. Jumlah reps seluruh set latihan itu.
 *  - beban (kg): TIDAK ADA di skema HC mana pun. Satu-satunya jalan adalah teks `notes`,
 *    makanya ringkasan "3x10 @40kg" dirakit di sini.
 *  - jumlah SET sebagai angka: tidak ada juga; ikut ke teks.
 *
 * Waktu tiap segmen dibagi RATA sepanjang durasi sesi. Logym tidak mencatat kapan tiap latihan
 * dimulai — yang tersimpan cuma jam mulai & durasi sesi. HC mewajibkan segmen tidak tumpang
 * tindih dan berada di dalam rentang sesi, dan pembagian rata memenuhi itu.
 * ponytail: urutannya benar, durasinya perkiraan. Jalan naiknya: catat `startedAt` per latihan
 * saat set pertamanya dicentang.
 *
 * @returns {{segments: Array, notes: string}}
 */
export const buildHcSessionDetail = (workout, logs, startMs, endMs) => {
  const exercises = workout?.overriddenExercises || workout?.exercises || [];
  const span = Math.max(0, Number(endMs) - Number(startMs));
  if (exercises.length === 0 || span <= 0) return { segments: [], notes: '' };

  const slice = span / exercises.length;
  const segments = [];
  const ringkasan = [];

  exercises.forEach((ex, i) => {
    const sets = Object.values(setsForExercise(logs, ex, workout) || {}).filter(s => s?.done);
    if (sets.length === 0) return; // latihan yang tidak dikerjakan tidak ikut ditulis

    const reps = sets.reduce((n, s) => n + (Number(s.r) || 0), 0);
    segments.push({
      startDate: new Date(startMs + i * slice).toISOString(),
      endDate: new Date(startMs + (i + 1) * slice).toISOString(),
      type: ex?.name || '',
      reps,
    });

    // "Bench Press — 3x10 @40kg" — beban diambil dari set terberat, karena satu baris teks tidak
    // muat menampung beban tiap set dan yang terberat itu yang paling sering dicari orang.
    const nama = ex?.name || 'Latihan';
    const beratMaks = Math.max(0, ...sets.map(s => Number(s.w) || 0));
    const repsTypical = Math.round(reps / sets.length) || 0;

    let rincian;
    if (repsTypical > 0) {
      rincian = `${sets.length}x${repsTypical}`;
      if (beratMaks > 0) rincian += ` @${beratMaks}kg`;
    } else {
      // Latihan berbasis waktu (plank, dsb) tidak punya repetisi — versi lama menulis "Plank 3x0",
      // yang terbaca seperti nol repetisi alias tidak dikerjakan. Tampilkan durasinya.
      // Set 'time' menyimpan detik di `d`; set kardio menyimpan menit di `duration`.
      const detik = sets.reduce((n, s) => n + (Number(s.d) || Number(s.duration) * 60 || 0), 0);
      rincian = detik >= 60
        ? `${sets.length}x, total ${Math.round(detik / 60)} mnt`
        : `${sets.length}x, total ${Math.round(detik)} dtk`;
      if (!(detik > 0)) rincian = `${sets.length} set`;
    }
    ringkasan.push(`${nama} — ${rincian}`);
  });

  // Baris baru, bukan titik-tengah: Health Connect merender notes apa adanya, dan pemisah
  // titik-tengah membuat seluruh sesi jadi satu paragraf padat yang sulit dibaca.
  return { segments, notes: ringkasan.join('\n') };
};

/**
 * Menit aktif SATU HARI: menit jalan + durasi latihan.
 *
 * SATU rumus untuk kartu, grafik, dan kartu bagikan — alasan yang sama dengan dailyBurnCalories.
 * Grafik dulu tidak memakai rumus apa pun: ia membaca `bioData.activeMinutes` mentah, field yang
 * TIDAK PERNAH ditulis siapa pun kecuali input manual — dan handleSaveManualData justru
 * MENGHAPUSNYA lagi kalau nilainya sama dengan hasil hitung. Jadi untuk hampir semua hari field
 * itu tidak ada, dan batang "Durasi Aktif" di grafik selalu kosong sementara kartunya terisi.
 *
 * LANGKAH SAAT KARDIO DI GYM TIDAK DIHITUNG DUA KALI. Treadmill 30 menit menghasilkan langkah
 * yang jadi ~30 menit-langkah, lalu sesinya sendiri menyumbang 30 menit lagi — totalnya 60 menit
 * untuk setengah jam yang sama. Menit-langkah dikurangi sebanyak durasi sesi kardio hari itu.
 *
 * ponytail: pengurangannya pakai durasi sesi, bukan irisan jam sebenarnya — sebaran langkah per
 * jam tidak ikut disimpan (sengaja; lihat batas 1 MiB dokumen tahunan). Sesi CAMPURAN yang cuma
 * ditutup treadmill 10 menit karena itu terkoreksi sedikit berlebihan. Jalan naiknya: simpan
 * bucket per jam hari ini saja, lalu kecualikan jam yang tertutup `startedAt`..`startedAt+durasi`.
 */
export const dailyActiveMinutes = (bioData, workouts) => {
  const bio = bioData || {};
  const list = (Array.isArray(workouts) ? workouts : [])
    .filter(w => w?.status === 'completed' || w?.programId === 'adhoc');

  let workoutMinutes = 0;
  let cardioMinutes = 0;
  list.forEach(w => {
    const mins = parseWorkoutDurationMinutes(w.duration);
    workoutMinutes += mins;
    // Sesi yang SEMUA latihannya berbasis waktu — itulah yang menghasilkan langkah. Aturannya
    // dipinjam dari guessWorkoutType supaya tidak ada definisi "kardio" kedua yang bisa berbeda.
    if (guessWorkoutType(w.overriddenExercises || w.exercises) !== 'strengthTraining') cardioMinutes += mins;
  });

  const rawStepMinutes = Math.round(Number(bio.stepMinutes)) || 0;
  // Tidak pernah negatif: kalau sesi kardio lebih panjang dari menit-langkah hari itu, yang benar
  // adalah nol menit jalan terpisah, bukan mengurangi durasi latihan.
  const stepMinutes = Math.max(0, rawStepMinutes - Math.min(rawStepMinutes, cardioMinutes));

  const auto = stepMinutes + workoutMinutes;
  const manual = Number(bio.activeMinutes) || 0;
  return {
    total: Math.max(manual, auto),
    auto, manual, stepMinutes, workoutMinutes,
    cardioMinutes, weightMinutes: workoutMinutes - cardioMinutes,
    isManual: manual > auto,
  };
};

/**
 * Kalori terbakar SATU HARI: BMR + langkah + latihan.
 *
 * SATU rumus untuk semua pemakai. Sebelumnya rumus ini disalin di empat tempat — useMemo
 * DashboardTab, handleSaveWorkout, ActivityChart, dan ShareCardGenerator — dan salinan yang
 * berbeda-beda itulah yang membuat kartu, grafik, dan kartu bagikan menampilkan tiga angka
 * berbeda untuk hari yang sama.
 *
 * KENAPA DIHITUNG, BUKAN DIBACA dari `bioData.activityCalories`: field itu pernah jadi rebutan.
 * Health Connect menimpanya dengan kalori AKTIF (tanpa BMR, dan sudah termasuk record yang Logym
 * sendiri tulis ke sana), sementara Logym menulisnya sebagai TOTAL (dengan BMR). Satu field, dua
 * satuan, dua penulis — hari yang disinkron HC tampil ~600 kkal, hari hitungan Logym ~2.400 kkal,
 * dan latihan yang sama terhitung dua kali. Sekarang field itu murni KELUARAN (buat Lomeal yang
 * membacanya langsung), tidak pernah jadi masukan hitungan.
 *
 * @param {object} bioData bioData hari itu
 * @param {Array} workouts day.workouts hari itu
 * @param {number} fallbackWeightKg dipakai kalau hari itu tidak mencatat berat badan
 * @param {object} [dayExerciseLogs] log tingkat-hari, untuk sesi yang `log`-nya kosong
 */
export const dailyBurnCalories = (bioData, workouts, fallbackWeightKg, dayExerciseLogs, profile = null) => {
  const bio = bioData || {};
  const weight = Number(bio.weight) || Number(fallbackWeightKg) || 70;

  let workout = 0;
  let kardio = 0;
  let beban = 0;
  let sessions = 0;
  (Array.isArray(workouts) ? workouts : [])
    .filter(w => w?.status === 'completed' || w?.programId === 'adhoc')
    .forEach(w => {
      const logs = (w.log && Object.keys(w.log).length > 0) ? w.log : dayExerciseLogs;
      workout += calculateSmartWorkoutCalories(weight, w, logs, 90, profile);
      // Rincian diambil dari splitWorkoutCalories, yang menjamin kardio+beban = total sesi itu —
      // jadi segmen bar tidak pernah meleset dari angka besarnya.
      const s = splitWorkoutCalories(weight, w, logs, 90, profile);
      kardio += s.kardio;
      beban += s.beban;
      sessions++;
    });

  // Fallback 1600 menyamakan konvensi Lomeal (nutrition.js: calcBMR(profile) || 1600).
  const bmr = Number(bio.bmr) || 1600;
  const steps = Math.round(Number(bio.steps) * 0.04) || 0;
  const floor = bmr + steps + workout;

  // Angka manual menggantikan BASIS (BMR + langkah) saja — latihan Logym hari itu SELALU
  // ditambahkan di atasnya. Manual dimaksudkan untuk menimpa sinkronisasi alat/app LAIN, bukan
  // pencatatan latihan sendiri.
  const isManual = !!bio._manualFlags?.activityCalories;
  const manualBase = isManual ? Math.max(bmr, manualFieldValue(bio, 'activityCalories')) : 0;

  return {
    total: isManual ? manualBase + workout : floor,
    floor,   // lantai mentah TANPA manual — dipakai Lomeal sebagai basis koreksi
    workout, kardio, beban, bmr, steps, sessions, isManual, manualBase,
  };
};

/**
 * Estimasi kalori terbakar saat sesi LIVE berlangsung.
 * Menggabungkan durasi baseline (mondar-mandir di gym) dengan tambahan intensitas set selesai.
 */
export const calculateLiveWorkoutCalories = (weightKg, exercises, logs, currentDurationSecs) => {
  const weight = Number(weightKg) || 70;
  // Baseline kalori selama di gym (MET 2.5: aktivitas ringan, berdiri, berjalan pelan)
  const baselineCalories = weight * 2.5 * (currentDurationSecs / 3600);
  
  let extraCalories = 0;
  
  if (exercises && logs) {
    exercises.forEach(ex => {
      const exLogs = logs[ex.id];
      if (!exLogs || !Array.isArray(exLogs)) return;

      exLogs.forEach(set => {
        if (set.done) extraCalories += setExtraCalories(weight, ex, set);
      });
    });
  }

  return Math.round(baselineCalories + extraCalories);
};
