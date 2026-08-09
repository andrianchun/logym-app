// Cek pemecahan kalori kardio/beban + format durasi tidur.
// Jalankan: node src/utils/dashboardCalc.test.mjs
// Kalau rincian tidak berjumlah sama dengan angka besarnya, user berhenti percaya semua angkanya.
import assert from 'node:assert/strict';
import { splitWorkoutCalories, isCardioExercise, calculateSmartWorkoutCalories } from './workoutCalc.js';
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
