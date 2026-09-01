// Cek pemecahan kalori kardio/beban + format durasi tidur.
// Jalankan: node src/utils/dashboardCalc.test.mjs
// Kalau rincian tidak berjumlah sama dengan angka besarnya, user berhenti percaya semua angkanya.
import assert from 'node:assert/strict';
import { splitWorkoutCalories, isCardioExercise, calculateSmartWorkoutCalories, dailyBurnCalories, dailyActiveMinutes, heartRateCalories } from './workoutCalc.js';
import { sleepHoursToParts, formatSleepDuration } from './numberFormat.js';
import { buildLogymSyncPayload } from '../data/constants.js';

// --- isCardioExercise ----------------------------------------------------

assert.equal(isCardioExercise({ type: 'cardio' }), true);
assert.equal(isCardioExercise({ type: 'weight', target: ['Cardio'] }), true);
assert.equal(isCardioExercise({ type: 'time', name: 'Treadmill', target: ['Kardio'] }), true);
// REGRESI: plank berbasis waktu TAPI bukan kardio — itu kerja inti. Kalau ini salah, semua
// sesi beban yang ada planknya bocor sebagian ke kolom kardio.
assert.equal(isCardioExercise({ type: 'time', name: 'Plank', target: ['Core'] }), false);
assert.equal(isCardioExercise({ type: 'weight', name: 'Bench Press', target: ['Dada'] }), false);
assert.equal(isCardioExercise(undefined), false);

// --- splitWorkoutCalories ------------------------------------------------

const BERAT = 80;
const beban = { id: 1, name: 'Bench Press', type: 'weight', target: ['Dada'], reps: 10, defaultWeight: 40 };
const kardio = { id: 2, name: 'Treadmill', type: 'cardio', target: ['Cardio'], duration: 20 };

const sesi = (exercises, duration = '45:00') => ({ id: 'w1', exercises, duration });
const logSet = (n, extra = {}) => Array.from({ length: n }, () => ({ done: true, ...extra }));

// 1. INVARIAN UTAMA: kardio + beban == calculateSmartWorkoutCalories, apa pun isinya.
const cocokDenganTotal = (workout, logs, label) => {
  const { kardio: k, beban: b } = splitWorkoutCalories(BERAT, workout, logs);
  const total = calculateSmartWorkoutCalories(BERAT, workout, logs);
  assert.equal(k + b, total, `${label}: rincian ${k}+${b} tidak sama dengan total ${total}`);
  assert.ok(k >= 0 && b >= 0, `${label}: ada segmen negatif`);
  return { k, b, total };
};

// 2. Sesi CAMPURAN terbelah per latihan — bukan digolongkan satu jenis seperti dulu.
{
  const w = sesi([beban, kardio]);
  const logs = { 1: logSet(4, { r: 10, w: 40 }), 2: logSet(1, { duration: 20, distance: 4 }) };
  const { k, b } = cocokDenganTotal(w, logs, 'campuran');
  assert.ok(k > 0, 'bagian kardio hilang di sesi campuran');
  assert.ok(b > 0, 'bagian beban hilang di sesi campuran');
}

// 3. Sesi murni beban → semua ke beban.
{
  const w = sesi([beban]);
  const { k, b } = cocokDenganTotal(w, { 1: logSet(4, { r: 10, w: 40 }) }, 'murni beban');
  assert.equal(k, 0);
  assert.ok(b > 0);
}

// 4. Sesi murni kardio → semua ke kardio.
{
  const w = sesi([kardio]);
  const { k, b } = cocokDenganTotal(w, { 2: logSet(1, { duration: 30, distance: 5 }) }, 'murni kardio');
  assert.equal(b, 0);
  assert.ok(k > 0);
}

// 5. Log dengan id gabungan `${ex.id}-${workout.id}` (bentuk sesi program) tetap kena — kalau
//    tidak, seluruh sesi program jatuh ke cabang "tanpa log" dan rinciannya salah kategori.
{
  const w = sesi([kardio]);
  const { k } = cocokDenganTotal(w, { '2-w1': logSet(1, { duration: 30, distance: 5 }) }, 'id gabungan');
  assert.ok(k > 0, 'log id gabungan tidak terbaca');
}

// 6. Tanpa log sama sekali (riwayat lama) → jatuh ke penggolongan tingkat sesi, tetap berjumlah.
cocokDenganTotal(sesi([beban]), {}, 'tanpa log beban');
{
  const { k, b } = cocokDenganTotal(sesi([kardio]), {}, 'tanpa log kardio');
  assert.ok(k > 0 && b === 0, 'sesi kardio tanpa log harus masuk kardio');
}

// 7. Kalori dari wearable (caloriesBurned) tetap terbagi & berjumlah pas.
{
  const w = { ...sesi([kardio]), caloriesBurned: 333 };
  const { k, b } = cocokDenganTotal(w, {}, 'wearable');
  assert.equal(k + b, 333);
}

// 8. Sesi kosong / durasi nol tidak bikin NaN atau pembagian nol.
assert.deepEqual(splitWorkoutCalories(BERAT, sesi([], '00:00'), {}), { kardio: 0, beban: 0 });
assert.deepEqual(splitWorkoutCalories(BERAT, null, {}), { kardio: 0, beban: 0 });

// 9. REGRESI 9 Agu 2026 — kalori NOL padahal setnya lengkap.
//    Sesi yang disimpan ulang bisa punya id berbeda dari saat lognya dibuat, jadi kunci
//    `${ex.id}-${idLama}` tidak cocok dengan `${ex.id}-${idBaru}`. Dulu latihannya dilewati
//    diam-diam dan kalorinya jadi 0 — angka yang salah total tanpa tanda apa pun.
{
  const w = { id: 'id-baru', exercises: [beban], duration: '45:00' };
  const logs = { '1-id-lama': logSet(4, { r: 10, w: 40 }) };
  const total = calculateSmartWorkoutCalories(BERAT, w, logs);
  assert.ok(total > 0, 'kalori 0 padahal set tercatat — kunci log tidak tercocokkan');
  cocokDenganTotal(w, logs, 'kunci sesi berbeda');
}

// 10. Set berbentuk OBJEK ber-key angka (bukan array) setelah bolak-balik penyimpanan.
//     Dulu ditolak Array.isArray lalu seluruh latihannya dianggap tidak ada.
{
  const w = sesi([beban]);
  const logs = { 1: { 0: { done: true, r: 10, w: 40 }, 1: { done: true, r: 10, w: 40 } } };
  assert.ok(calculateSmartWorkoutCalories(BERAT, w, logs) > 0, 'set berbentuk objek diabaikan');
  cocokDenganTotal(w, logs, 'set objek');
}

// 11. Durasi 0 (sesi disimpan ulang tanpa timer) tapi set lengkap → kalori TETAP dihitung.
{
  const w = { id: 'w1', exercises: [beban], duration: '00:00' };
  const logs = { 1: logSet(4, { r: 10, w: 40 }) };
  assert.ok(calculateSmartWorkoutCalories(BERAT, w, logs) > 0, 'durasi 0 tidak boleh menihilkan kalori');
}

// --- dailyBurnCalories ---------------------------------------------------
// Rumus kalori harian yang dipakai kartu dasbor, grafik aktivitas, kartu bagikan, DAN yang
// ditulis ke bioData buat Lomeal. Dulu empat salinan terpisah yang saling berbeda.

const hariKosong = { bmr: 2000, steps: 0 };
const sesiSelesai = { id: 'w1', status: 'completed', exercises: [beban], duration: '45:00', log: { 1: logSet(4, { r: 10, w: 40 }) } };

// 12. Dasar: BMR + langkah + latihan + TEF. Langkah ~0,04 kkal/langkah, TEF ~10%.
{
  const b = dailyBurnCalories({ bmr: 2000, steps: 5000 }, [], BERAT);
  assert.equal(b.bmr, 2000);
  assert.equal(b.steps, 200);
  assert.equal(b.workout, 0);
  assert.equal(b.tef, 200); // 10% BMR
  assert.equal(b.total, 2400); // 2000 + 200 + 0 + 200
  assert.equal(b.floor, 2400);
}

// 13. Hanya sesi 'completed'/adhoc yang dihitung — sesi terjadwal yang belum dikerjakan tidak
//     boleh menyumbang kalori, kalau tidak dasbor memberi kredit untuk latihan yang tidak terjadi.
{
  const planned = { id: 'w2', status: 'planned', exercises: [beban], duration: '45:00', log: { 1: logSet(4, { r: 10, w: 40 }) } };
  assert.equal(dailyBurnCalories(hariKosong, [planned], BERAT).workout, 0);
  assert.ok(dailyBurnCalories(hariKosong, [sesiSelesai], BERAT).workout > 0);
}

// 14. INVARIAN: kardio + beban == workout. Segmen bar tidak boleh meleset dari angka besarnya.
{
  const b = dailyBurnCalories(hariKosong, [sesiSelesai], BERAT);
  assert.equal(b.kardio + b.beban, b.workout);
  assert.equal(b.total, b.bmr + b.steps + b.workout + b.tef);
}

// 15. Berat badan hari itu menang atas fallback — riwayat lama harus dihitung dengan berat
//     saat itu, bukan berat hari ini.
{
  const ringan = dailyBurnCalories({ bmr: 2000, weight: 50 }, [sesiSelesai], 120).workout;
  const berat = dailyBurnCalories({ bmr: 2000, weight: 120 }, [sesiSelesai], 50).workout;
  assert.ok(berat > ringan, 'berat badan hari itu tidak dipakai');
}

// 16. Manual menggantikan BASIS (BMR+langkah+TEF), TAPI latihan tetap ditambahkan di atasnya —
//     manual dimaksudkan menimpa sinkronisasi alat lain, bukan pencatatan latihan sendiri.
{
  const bio = { bmr: 2000, steps: 5000, _manualFlags: { activityCalories: 3000 } };
  const b = dailyBurnCalories(bio, [sesiSelesai], BERAT);
  assert.equal(b.isManual, true);
  assert.equal(b.manualBase, 3000);
  assert.equal(b.total, 3000 + b.workout, 'langkah tidak boleh ikut ditambah di cabang manual');
  // `floor` tetap lantai mentah tanpa manual — Lomeal memakainya sebagai basis koreksi (BMR + steps + TEF + workout).
  assert.equal(b.floor, 2000 + 200 + 200 + b.workout);
}

// 17. REGRESI: Lomeal menandai override dengan boolean `true` (angkanya di bioData), bukan angka.
//     `Number(true)` = 1, jadi versi lama meruntuhkan basisnya jadi Math.max(BMR, 1) = BMR dan
//     angka Lomeal hilang tanpa jejak — kartunya menampilkan "Manual" senilai BMR persis.
{
  const bio = { bmr: 2000, activityCalories: 2800, _manualFlags: { activityCalories: true } };
  assert.equal(dailyBurnCalories(bio, [], BERAT).total, 2800);
}

// 18. Manual di BAWAH BMR+TEF tidak boleh menurunkan angka di bawah lantai fisiologisnya.
{
  const bio = { bmr: 2000, _manualFlags: { activityCalories: 500 } };
  assert.equal(dailyBurnCalories(bio, [], BERAT).total, 2200); // 2000 BMR + 200 TEF
}

// 19. REGRESI PING-PONG: `bioData.activityCalories` TIDAK BOLEH jadi masukan. Field itu keluaran
//     fungsi ini sendiri; kalau ikut dibaca, tiap putaran render/sinkron menambah kalori latihan
//     di atas hasil putaran sebelumnya (bug "ratchet"), dan nilai yang ditulis Health Connect
//     dengan satuan berbeda ikut merusak hitungannya.
{
  const tanpa = dailyBurnCalories({ bmr: 2000 }, [sesiSelesai], BERAT).total;
  const dengan = dailyBurnCalories({ bmr: 2000, activityCalories: 9999, hcCalories: 700 }, [sesiSelesai], BERAT).total;
  assert.equal(dengan, tanpa, 'activityCalories/hcCalories bocor jadi masukan hitungan');
}

// 20. IDEMPOTEN: memberi makan hasilnya kembali tidak mengubah apa pun. Ini yang menjamin efek
//     tulis-balik di DashboardTab mengendap, bukan naik terus tiap render.
{
  const bio = { bmr: 2000, steps: 3000 };
  const b1 = dailyBurnCalories(bio, [sesiSelesai], BERAT);
  const b2 = dailyBurnCalories({ ...bio, activityCalories: b1.total, activityCaloriesFloor: b1.floor }, [sesiSelesai], BERAT);
  assert.equal(b2.total, b1.total);
}

// 21. Masukan kosong/kotor tidak boleh melahirkan NaN — satu NaN merusak seluruh kartu.
{
  assert.equal(dailyBurnCalories(null, null, null).total, 1760); // 1600 BMR + 160 TEF
  assert.equal(dailyBurnCalories({ bmr: 'x', steps: 'y' }, undefined, undefined).total, 1760);
  assert.ok(Number.isFinite(dailyBurnCalories({ steps: null }, [], NaN).total));
}

// --- HIBRIDA: kalori dari nadi untuk sesi kardio --------------------------
// Nadi lebih akurat untuk kardio stabil (menangkap inklinasi & kebugaran yang tidak diketahui
// tabel MET). Untuk beban justru menyesatkan — nadi naik dari kontraksi isometrik, bukan dari
// konsumsi oksigen, dan itu yang bikin Samsung mencatat ~700 kkal untuk sesi angkat beban.

const PROFIL = { gender: 'male', age: 30 };
const kardioMurni = (hr) => ({
  id: 'c1', status: 'completed', duration: '45:00',
  exercises: [{ id: 2, name: 'Treadmill', type: 'cardio', target: ['Cardio'] }],
  ...(hr ? { hr: { avg: hr } } : {}),
});
const bebanSesi2 = (hr) => ({
  id: 'b1', status: 'completed', duration: '45:00',
  exercises: [{ id: 1, name: 'Bench Press', type: 'weight' }],
  log: { 1: logSet(4, { r: 10, w: 40 }) },
  ...(hr ? { hr: { avg: hr } } : {}),
});

// 22. REGRESI PALING PENTING: TANPA nadi (tidak punya jam tangan / Health Connect mati),
//     semuanya tetap terhitung persis seperti sebelumnya. Nadi itu peningkatan, bukan syarat.
{
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  const tanpaHr = calculateSmartWorkoutCalories(BERAT, kardioMurni(null), logs, 90, PROFIL);
  const tanpaProfil = calculateSmartWorkoutCalories(BERAT, kardioMurni(null), logs);
  assert.ok(tanpaHr > 0, 'sesi tanpa nadi harus tetap punya kalori');
  assert.equal(tanpaHr, tanpaProfil, 'tanpa nadi, hasilnya harus identik dengan jalur lama');
}

// 23. Tanpa PROFIL (umur/gender belum diisi) juga tetap jatuh ke jalur lama, walau nadi ada.
{
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  assert.equal(
    calculateSmartWorkoutCalories(BERAT, kardioMurni(140), logs),
    calculateSmartWorkoutCalories(BERAT, kardioMurni(null), logs)
  );
}

// 24. Sesi KARDIO dengan nadi: dipakai rumus nadi, dan hasilnya berbeda dari jalur MET.
{
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  const denganHr = calculateSmartWorkoutCalories(BERAT, kardioMurni(150), logs, 90, PROFIL);
  const tanpaHr = calculateSmartWorkoutCalories(BERAT, kardioMurni(null), logs, 90, PROFIL);
  assert.notEqual(denganHr, tanpaHr, 'nadi tidak dipakai untuk sesi kardio');
  assert.ok(denganHr > 0);
  // Nadi lebih tinggi harus berarti kalori lebih besar — kalau tidak, tandanya rumusnya terbalik.
  assert.ok(calculateSmartWorkoutCalories(BERAT, kardioMurni(170), logs, 90, PROFIL) > denganHr);
}

// 25. REGRESI UTAMA: sesi BEBAN dengan nadi TIDAK BOLEH pakai rumus nadi. Ini seluruh alasan
//     hibridanya dibatasi — kalau bocor ke sini, Logym mengulangi persis kesalahan Samsung.
{
  assert.equal(
    calculateSmartWorkoutCalories(BERAT, bebanSesi2(150), bebanSesi2(150).log, 90, PROFIL),
    calculateSmartWorkoutCalories(BERAT, bebanSesi2(null), bebanSesi2(null).log, 90, PROFIL),
    'sesi beban ikut memakai nadi — inilah bug yang bikin angka menggelembung'
  );
}

// 26. Sesi CAMPURAN (beban + treadmill) juga tidak pakai nadi — bagian bebannya akan digelembungkan.
{
  const campur = {
    id: 'm1', status: 'completed', duration: '45:00', hr: { avg: 150 },
    exercises: [{ id: 1, name: 'Bench', type: 'weight' }, { id: 2, name: 'Treadmill', type: 'cardio' }],
  };
  const logs = { 1: logSet(3, { r: 10, w: 40 }), 2: [{ done: true, duration: 10, distance: 1.5 }] };
  const { hr, ...tanpaNadi } = campur;
  assert.equal(
    calculateSmartWorkoutCalories(BERAT, campur, logs, 90, PROFIL),
    calculateSmartWorkoutCalories(BERAT, tanpaNadi, logs, 90, PROFIL)
  );
}

// 27. Nadi di luar nalar (artefak sensor) diabaikan — angka meyakinkan tapi karangan lebih
//     buruk daripada tidak punya angka.
{
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  const normal = calculateSmartWorkoutCalories(BERAT, kardioMurni(null), logs, 90, PROFIL);
  [30, 260].forEach(hr => assert.equal(
    calculateSmartWorkoutCalories(BERAT, kardioMurni(hr), logs, 90, PROFIL), normal, `HR ${hr} tidak ditolak`
  ));
  // Umur ngawur (tanggal lahir salah isi) juga ditolak.
  assert.equal(calculateSmartWorkoutCalories(BERAT, kardioMurni(150), logs, 90, { gender: 'male', age: 200 }), normal);
}

// 28. INVARIAN tetap berlaku di jalur nadi: kardio + beban == total.
{
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  const w = kardioMurni(150);
  const s = splitWorkoutCalories(BERAT, w, logs, 90, PROFIL);
  assert.equal(s.kardio + s.beban, calculateSmartWorkoutCalories(BERAT, w, logs, 90, PROFIL));
}

// 29. heartRateCalories langsung: perempuan dan laki-laki pakai koefisien berbeda, dan nadi
//     rendah yang menghasilkan angka negatif dikembalikan 0 (bukan kalori negatif).
{
  const p = { avgHr: 140, minutes: 45, weightKg: 80, age: 30 };
  assert.notEqual(heartRateCalories({ ...p, gender: 'male' }), heartRateCalories({ ...p, gender: 'female' }));
  assert.ok(heartRateCalories({ ...p, gender: 'male' }) > 0);
  assert.equal(heartRateCalories({ avgHr: 61, minutes: 5, weightKg: 50, age: 20, gender: 'male' }), 0);
  assert.equal(heartRateCalories({}), 0);
}

// 30. ageFromDob dipakai kalau profil cuma punya tanggal lahir, bukan `age` jadi.
{
  const tahunLahir = new Date().getFullYear() - 30;
  const logs = { 2: [{ done: true, duration: 45, distance: 6 }] };
  assert.equal(
    calculateSmartWorkoutCalories(BERAT, kardioMurni(150), logs, 90, { gender: 'male', dob: `${tahunLahir}-05-01` }),
    calculateSmartWorkoutCalories(BERAT, kardioMurni(150), logs, 90, PROFIL)
  );
}

// --- dailyActiveMinutes --------------------------------------------------
// Angka "Durasi Aktif" di kartu, grafik, dan kartu bagikan.

const kardioSesi = { id: 'c1', status: 'completed', duration: '30:00', exercises: [kardio] };
const bebanSesi = { id: 'b1', status: 'completed', duration: '45:00', exercises: [beban] };

// 22. Dasar: menit jalan + durasi latihan beban (beban tidak menghasilkan langkah).
{
  const a = dailyActiveMinutes({ stepMinutes: 50 }, [bebanSesi]);
  assert.equal(a.stepMinutes, 50);
  assert.equal(a.workoutMinutes, 45);
  assert.equal(a.total, 95);
}

// 23. REGRESI UTAMA: treadmill tidak boleh terhitung DUA KALI. 30 menit treadmill menghasilkan
//     langkah yang jadi ~30 menit-langkah, lalu sesinya menyumbang 30 menit lagi = 60 menit
//     untuk setengah jam yang sama.
{
  const a = dailyActiveMinutes({ stepMinutes: 40 }, [kardioSesi]);
  assert.equal(a.workoutMinutes, 30);
  assert.equal(a.stepMinutes, 10, 'menit-langkah harus dikurangi durasi sesi kardio');
  assert.equal(a.total, 40, 'bukan 70');
}

// 24. Sesi kardio lebih panjang dari menit-langkah -> menit jalan NOL, bukan negatif.
{
  const a = dailyActiveMinutes({ stepMinutes: 10 }, [kardioSesi]);
  assert.equal(a.stepMinutes, 0);
  assert.equal(a.total, 30);
}

// 25. Sesi beban tidak mengurangi menit-langkah — angkat besi tidak menghasilkan langkah.
assert.equal(dailyActiveMinutes({ stepMinutes: 40 }, [bebanSesi]).stepMinutes, 40);

// 26. Input manual menang sebagai lantai, tapi tidak pernah menurunkan hasil otomatis.
{
  assert.equal(dailyActiveMinutes({ stepMinutes: 10, activeMinutes: 90 }, []).total, 90);
  assert.equal(dailyActiveMinutes({ stepMinutes: 10, activeMinutes: 90 }, []).isManual, true);
  assert.equal(dailyActiveMinutes({ stepMinutes: 80, activeMinutes: 5 }, []).total, 80, 'manual kecil tidak boleh menurunkan');
}

// 27. REGRESI "bar kosong melompong": hari yang cuma punya langkah (tanpa latihan sama sekali)
//     TETAP menghasilkan angka. Grafik dulu membaca bioData.activeMinutes yang tidak pernah
//     ditulis, jadi hari seperti ini selalu jadi batang kosong.
assert.equal(dailyActiveMinutes({ stepMinutes: 75 }, []).total, 75);

// 28. Sesi terjadwal yang belum dikerjakan tidak menyumbang durasi.
assert.equal(dailyActiveMinutes({ stepMinutes: 0 }, [{ id: 'p', status: 'planned', duration: '60:00' }]).total, 0);

// 29. Masukan kosong/kotor tidak melahirkan NaN.
assert.equal(dailyActiveMinutes(null, null).total, 0);
assert.equal(dailyActiveMinutes({ stepMinutes: 'x', activeMinutes: null }, undefined).total, 0);

// 30. REGRESI: SESI CAMPURAN — beban lalu ditutup treadmill 8 menit, dalam satu sesi 53 menit.
//     Dulu penggolongannya all-or-nothing per sesi (guessWorkoutType): sesi ini dicap 100% beban,
//     menit kardionya hilang, dan menit-langkah treadmill tidak dikurangi sehingga 8 menit itu
//     terhitung dua kali.
{
  const campuran = {
    id: 'mix', status: 'completed', duration: '53:00',
    exercises: [beban, kardio],
    log: { 1: logSet(4, { r: 10, w: 40 }), 2: [{ done: true, duration: 8 }] },
  };
  const a = dailyActiveMinutes({ stepMinutes: 30 }, [campuran]);
  assert.equal(a.workoutMinutes, 53);
  assert.equal(a.cardioMinutes, 8, 'menit kardio dari durasi SET treadmill, bukan seluruh sesi');
  assert.equal(a.weightMinutes, 45, 'sisanya beban');
  assert.equal(a.stepMinutes, 22, 'menit-langkah dikurangi 8, bukan 53');
}

// 31. Durasi set tidak boleh melebihi durasi sesinya (mis. salah ketik 999 menit).
{
  const ngawur = {
    id: 'x', status: 'completed', duration: '20:00', exercises: [kardio],
    log: { 2: [{ done: true, duration: 999 }] },
  };
  assert.equal(dailyActiveMinutes({ stepMinutes: 60 }, [ngawur]).cardioMinutes, 20);
}

// 32. Riwayat lama tanpa log per-set tetap memakai aturan lama, bukan jadi nol.
assert.equal(dailyActiveMinutes({ stepMinutes: 40 }, [kardioSesi]).cardioMinutes, 30);

// --- format durasi tidur -------------------------------------------------

assert.deepEqual(sleepHoursToParts(5.3), { jam: 5, menit: 18 });
assert.equal(formatSleepDuration(5.3), '5 jam 18 mnt');
assert.equal(formatSleepDuration(8), '8 jam');
assert.equal(formatSleepDuration(0.5), '30 mnt');
assert.equal(formatSleepDuration(0), '-');
assert.equal(formatSleepDuration(null), '-');
assert.equal(formatSleepDuration('7.5'), '7 jam 30 mnt');

// REGRESI: cara lama (Math.round((h % 1) * 60)) memberi "5 jam 60 mnt" untuk 5,999 jam karena
// bagian jam dihitung sebelum menitnya dibulatkan.
assert.deepEqual(sleepHoursToParts(5.999), { jam: 6, menit: 0 });
assert.equal(formatSleepDuration(5.999), '6 jam');

// --- buildLogymSyncPayload (Lomeal Sync Contract) ------------------------
{
  const hist = {
    '2026-08-25': {
      workouts: [
        {
          id: 'sesi_1',
          status: 'completed',
          exercises: [
            { id: 101, name: 'Squat' },
            { id: 102, name: 'Leg Extension' },
            { id: 103, name: 'Calf Raise' },
            { id: 104, name: 'Plank' },
          ],
          log: {
            '101-sesi_1': [{ done: true, w: 50, r: 10 }],
            '102-sesi_1': [{ done: true, w: 30, r: 10 }],
            '103-sesi_1': [{ done: true, w: 20, r: 15 }],
            '104-sesi_1': [{ done: true, d: 60 }],
          },
        },
      ],
      bioData: { activityCalories: 350 },
    },
  };

  const payload = buildLogymSyncPayload(hist, 70, '2026-08-25');
  assert.equal(payload.logymSync.today.workoutsCount, 1);
  assert.equal(payload.logymSync.today.exercisesCount, 4);
  assert.equal(payload.logymSync.today.kcal, 350);
  assert.equal(payload.logymSync.today.ymd, '2026-08-25');
}

// History kosong tidak error
{
  const emptyPayload = buildLogymSyncPayload({}, 70, '2026-08-25');
  assert.equal(emptyPayload.logymSync.today.workoutsCount, 0);
  assert.equal(emptyPayload.logymSync.today.exercisesCount, 0);
}

console.log('dashboardCalc OK');
