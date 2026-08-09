// Cek pemecahan kalori kardio/beban + format durasi tidur.
// Jalankan: node src/utils/dashboardCalc.test.mjs
// Kalau rincian tidak berjumlah sama dengan angka besarnya, user berhenti percaya semua angkanya.
import assert from 'node:assert/strict';
import { splitWorkoutCalories, isCardioExercise, calculateSmartWorkoutCalories, dailyBurnCalories } from './workoutCalc.js';
import { sleepHoursToParts, formatSleepDuration } from './numberFormat.js';

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

// 12. Dasar: BMR + langkah + latihan. Langkah ~0,04 kkal/langkah.
{
  const b = dailyBurnCalories({ bmr: 2000, steps: 5000 }, [], BERAT);
  assert.equal(b.bmr, 2000);
  assert.equal(b.steps, 200);
  assert.equal(b.workout, 0);
  assert.equal(b.total, 2200);
  assert.equal(b.floor, 2200);
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
  assert.equal(b.total, b.bmr + b.steps + b.workout);
}

// 15. Berat badan hari itu menang atas fallback — riwayat lama harus dihitung dengan berat
//     saat itu, bukan berat hari ini.
{
  const ringan = dailyBurnCalories({ bmr: 2000, weight: 50 }, [sesiSelesai], 120).workout;
  const berat = dailyBurnCalories({ bmr: 2000, weight: 120 }, [sesiSelesai], 50).workout;
  assert.ok(berat > ringan, 'berat badan hari itu tidak dipakai');
}

// 16. Manual menggantikan BASIS (BMR+langkah), TAPI latihan tetap ditambahkan di atasnya —
//     manual dimaksudkan menimpa sinkronisasi alat lain, bukan pencatatan latihan sendiri.
{
  const bio = { bmr: 2000, steps: 5000, _manualFlags: { activityCalories: 3000 } };
  const b = dailyBurnCalories(bio, [sesiSelesai], BERAT);
  assert.equal(b.isManual, true);
  assert.equal(b.manualBase, 3000);
  assert.equal(b.total, 3000 + b.workout, 'langkah tidak boleh ikut ditambah di cabang manual');
  // `floor` tetap lantai mentah tanpa manual — Lomeal memakainya sebagai basis koreksi.
  assert.equal(b.floor, 2000 + 200 + b.workout);
}

// 17. REGRESI: Lomeal menandai override dengan boolean `true` (angkanya di bioData), bukan angka.
//     `Number(true)` = 1, jadi versi lama meruntuhkan basisnya jadi Math.max(BMR, 1) = BMR dan
//     angka Lomeal hilang tanpa jejak — kartunya menampilkan "Manual" senilai BMR persis.
{
  const bio = { bmr: 2000, activityCalories: 2800, _manualFlags: { activityCalories: true } };
  assert.equal(dailyBurnCalories(bio, [], BERAT).total, 2800);
}

// 18. Manual di BAWAH BMR tidak boleh menurunkan angka di bawah lantai fisiologisnya.
{
  const bio = { bmr: 2000, _manualFlags: { activityCalories: 500 } };
  assert.equal(dailyBurnCalories(bio, [], BERAT).total, 2000);
}

// 19. REGRESI PING-PONG: `bioData.activityCalories` TIDAK BOLEH jadi masukan. Field itu keluaran
//     fungsi ini sendiri; kalau ikut dibaca, tiap putaran render/sinkron menambah kalori latihan
//     di atas hasil putaran sebelumnya (bug "ratchet"), dan nilai yang ditulis Health Connect
//     dengan satuan berbeda ikut merusak hitungannya.
{
  const tanpa = dailyBurnCalories({ bmr: 2000 }, [sesiSelesai], BERAT).total;
  const dengan = dailyBurnCalories({ bmr: 2000, activityCalories: 9999, hcActiveCalories: 700 }, [sesiSelesai], BERAT).total;
  assert.equal(dengan, tanpa, 'activityCalories/hcActiveCalories bocor jadi masukan hitungan');
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
  assert.equal(dailyBurnCalories(null, null, null).total, 1600); // fallback BMR ala Lomeal
  assert.equal(dailyBurnCalories({ bmr: 'x', steps: 'y' }, undefined, undefined).total, 1600);
  assert.ok(Number.isFinite(dailyBurnCalories({ steps: null }, [], NaN).total));
}

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

console.log('dashboardCalc OK');
