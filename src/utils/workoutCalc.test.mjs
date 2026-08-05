// Cek satuan durasi set. Jalankan: node src/utils/workoutCalc.test.mjs
// Set kardio simpan { duration: MENIT, distance: KM }; set 'time' simpan { d: DETIK }.
// Dulu keduanya dibaca sebagai MENIT dan field jaraknya salah nama ('dist'), jadi satu centang
// setelah beberapa detik bisa jadi ~150 kcal.
import assert from 'node:assert/strict';
import {
  calculateSmartWorkoutCalories,
  calculateLiveWorkoutCalories,
  calculateWorkoutCalories,
  guessWorkoutType,
} from './workoutCalc.js';

const KG = 70;

// 1. Kardio 30 detik (0.5 mnt, 50 m) di sesi 30 detik — dulu ~120 kcal karena jatuh ke ex.duration 15 mnt
const treadmill = { id: '126-1', type: 'time', name: 'Treadmill Running', duration: 15 };
const cardioSet = { done: true, duration: 0.5, distance: 0.05 };
const cardioKcal = calculateSmartWorkoutCalories(KG, {
  id: 'adhoc_1', duration: '00:30', exercises: [treadmill],
}, { '126-1': [cardioSet] });
assert.ok(cardioKcal < 10, `kardio 30 detik harus < 10 kcal, dapat ${cardioKcal}`);

// 2. Plank 45 DETIK — dulu dibaca 45 menit (60x)
const plankKcal = calculateSmartWorkoutCalories(KG, {
  id: 'w1', duration: '01:00', exercises: [{ id: 123, type: 'time', name: 'Plank', duration: 1 }],
}, { 123: [{ done: true, d: 45 }] });
assert.ok(plankKcal < 10, `plank 45 detik harus < 10 kcal, dapat ${plankKcal}`);

// 3. Set tanpa data durasi tidak boleh mengarang kalori dari default library (15-30 mnt)
const emptyKcal = calculateLiveWorkoutCalories(KG, [treadmill], { '126-1': [{ done: true }] }, 30);
assert.ok(emptyKcal < 5, `set kardio kosong harus ~baseline saja, dapat ${emptyKcal}`);

// 4. Live dan riwayat harus sepakat untuk input yang sama (selisih <= 1 kcal: durasi riwayat
//    disimpan sebagai "MM:SS" lalu dibulatkan ke menit oleh parseWorkoutDurationMinutes)
const liveKcal = calculateLiveWorkoutCalories(KG, [treadmill], { '126-1': [cardioSet] }, 30);
assert.ok(Math.abs(liveKcal - cardioKcal) <= 1, `live ${liveKcal} vs riwayat ${cardioKcal}`);

// 5. type 'cardio' (penamaan library) diperlakukan sama dengan 'time'
assert.equal(guessWorkoutType([{ type: 'cardio', name: 'Treadmill Running' }]), 'runningTreadmill');
assert.equal(guessWorkoutType([{ type: 'cardio', name: 'Lari' }, { type: 'weight', name: 'Bench' }]), 'strengthTraining');

// 6. Sesi beban normal tidak ikut berubah: 3x10 @40kg, 60 menit
const liftKcal = calculateSmartWorkoutCalories(KG, {
  id: 'w2', duration: '60:00', exercises: [{ id: 1, type: 'weight', name: 'Bench Press' }],
}, { 1: Array.from({ length: 3 }, () => ({ done: true, r: 10, w: 40 })) });
assert.ok(liftKcal > 150 && liftKcal < 220, `sesi beban 1 jam harus wajar, dapat ${liftKcal}`);

// 7. Riwayat lama tanpa logs tetap pakai fallback timer (tidak regresi)
assert.equal(calculateSmartWorkoutCalories(KG, { duration: 60 }, {}), calculateWorkoutCalories(KG, 60));

console.log('workoutCalc OK', { cardioKcal, plankKcal, liftKcal });
