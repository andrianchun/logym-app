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
  recomputeStrengthRecords,
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

// --- recomputeStrengthRecords --------------------------------------------
// Rekor 10RM + beban terakhir yang tampil di kartu latihan.

const bench = { id: 1, name: 'Bench Press', type: 'weight' };
const uuidEx = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: 'Latihan Custom', type: 'weight' };
const lookup = { [bench.id]: bench, [uuidEx.id]: uuidEx };
const hari = (log) => ({ workouts: [{ id: 'w1', status: 'completed', log }] });

// 8. Dasar: rekor diambil dari set TERBERAT sepanjang riwayat, beban terakhir dari hari TERBARU.
{
  const history = {
    '2026-08-01': hari({ 1: [{ w: 100, r: 5 }] }),  // 1RM ~116,7 -> 10RM ~87,5
    '2026-08-05': hari({ 1: [{ w: 60, r: 10 }] }),
  };
  const r = recomputeStrengthRecords(history, ['1'], lookup)['1'];
  assert.ok(r.rm10 > 85 && r.rm10 < 90, `10RM di luar dugaan: ${r.rm10}`);
  assert.equal(r.lastWeight, 60, 'beban terakhir harus dari hari terbaru, bukan yang terberat');
}

// 9. REGRESI UTAMA: latihan ber-UUID. Cara lama `key.split('-')[0]` memotong UUID di tanda
//    hubung pertama, jadi SETIAP latihan yang pernah ditambahkan/diganti user tidak pernah
//    mendapat rekor — diam-diam, kolom 10RM-nya kosong selamanya.
{
  const k = `${uuidEx.id}-w1`;
  const history = { '2026-08-01': hari({ [k]: [{ w: 50, r: 10 }] }) };
  const out = recomputeStrengthRecords(history, [k], lookup);
  assert.ok(out[uuidEx.id], 'latihan ber-UUID tidak dapat rekor');
  assert.equal(out[uuidEx.id].lastWeight, 50);
}

// 10. Set berbentuk OBJEK ber-key angka (hasil bolak-balik penyimpanan). Versi lama memanggil
//     `.forEach` langsung di atasnya — TypeError, dan seluruh proses simpan latihan gagal.
{
  const history = { '2026-08-01': hari({ 1: { 0: { w: 80, r: 8 }, 1: { w: 90, r: 6 } } }) };
  const r = recomputeStrengthRecords(history, ['1'], lookup)['1'];
  assert.ok(r && r.lastWeight === 90);
}

// 11. Set yang di-skip dan sesi yang belum selesai tidak boleh jadi rekor — kalau ikut, user
//     dapat PR palsu dari latihan yang tidak pernah dikerjakan.
{
  const history = {
    '2026-08-01': hari({ 1: [{ w: 200, r: 10, skipped: true }, { w: 50, r: 10 }] }),
    '2026-08-02': { workouts: [{ id: 'w9', status: 'planned', log: { 1: [{ w: 300, r: 10 }] } }] },
  };
  const r = recomputeStrengthRecords(history, ['1'], lookup)['1'];
  assert.equal(r.lastWeight, 50);
  assert.ok(r.rm10 < 100, `set skipped/planned bocor jadi rekor: ${r.rm10}`);
}

// 12. Hanya latihan yang disebut logKeys yang dihitung — bukan seluruh library tiap simpan.
{
  const history = { '2026-08-01': hari({ 1: [{ w: 50, r: 10 }], [uuidEx.id]: [{ w: 70, r: 10 }] }) };
  assert.deepEqual(Object.keys(recomputeStrengthRecords(history, ['1'], lookup)), ['1']);
}

// 13. Masukan kosong/kotor tidak melempar.
assert.deepEqual(recomputeStrengthRecords(null, null, null), {});
assert.deepEqual(recomputeStrengthRecords({ 'bukan-tanggal': hari({ 1: [{ w: 50, r: 10 }] }) }, ['1'], lookup), {});
assert.deepEqual(recomputeStrengthRecords({ '2026-08-01': hari({ 1: [] }) }, ['1'], lookup), {});

console.log('workoutCalc OK', { cardioKcal, plankKcal, liftKcal });
