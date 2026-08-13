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
  buildHcSessionDetail,
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

// --- buildHcSessionDetail ------------------------------------------------
// Rincian isi sesi yang ditulis ke Health Connect. Sebelumnya sesi Logym masuk sebagai blok
// kosong: cuma nama, jenis, dan durasi — dibuka di Samsung Health tidak ada isinya.

const T0 = new Date('2026-08-09T08:00:00Z').getTime();
const T1 = T0 + 60 * 60 * 1000; // sesi 1 jam

// 14. Segmen dibuat per latihan, dengan TOTAL repetisi, plus ringkasan teks berisi kg.
{
  const w = {
    id: 'w1',
    exercises: [
      { id: 1, name: 'Bench Press', type: 'weight' },
      { id: 2, name: 'Squat', type: 'weight' },
    ],
  };
  const logs = {
    1: [{ done: true, r: 10, w: 40 }, { done: true, r: 10, w: 45 }, { done: true, r: 8, w: 45 }],
    2: [{ done: true, r: 12, w: 60 }],
  };
  const { segments, notes } = buildHcSessionDetail(w, logs, T0, T1);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].reps, 28, 'reps harus dijumlah dari semua set');
  assert.equal(segments[0].type, 'Bench Press');
  assert.match(notes, /Bench Press — 3x9 @45kg/, `notes: ${notes}`);
  assert.match(notes, /Squat — 1x12 @60kg/, `notes: ${notes}`);
  // Satu baris per latihan, bukan satu paragraf padat dipisah titik-tengah.
  assert.equal(notes.split('\n').length, 2, `notes: ${notes}`);
}

// 15. Segmen TIDAK BOLEH tumpang tindih dan wajib di dalam rentang sesi — Health Connect
//     menolak SELURUH record kalau satu saja melanggar.
{
  const w = { id: 'w1', exercises: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }] };
  const logs = { 1: [{ done: true, r: 5 }], 2: [{ done: true, r: 5 }], 3: [{ done: true, r: 5 }] };
  const { segments } = buildHcSessionDetail(w, logs, T0, T1);
  assert.equal(segments.length, 3);
  segments.forEach((s, i) => {
    assert.ok(new Date(s.startDate).getTime() >= T0, `segmen ${i} mulai sebelum sesi`);
    assert.ok(new Date(s.endDate).getTime() <= T1, `segmen ${i} selesai sesudah sesi`);
    assert.ok(new Date(s.startDate) < new Date(s.endDate), `segmen ${i} panjangnya nol/mundur`);
    if (i > 0) assert.ok(new Date(s.startDate).getTime() >= new Date(segments[i - 1].endDate).getTime(), `segmen ${i} tumpang tindih`);
  });
}

// 16. Latihan yang TIDAK dikerjakan tidak ikut ditulis — kalau ikut, Samsung Health menampilkan
//     latihan yang tidak pernah terjadi.
{
  const w = { id: 'w1', exercises: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] };
  const { segments, notes } = buildHcSessionDetail(w, { 1: [{ done: true, r: 5 }], 2: [{ done: false, r: 5 }] }, T0, T1);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].type, 'A');
  assert.ok(!notes.includes('B'));
}

// 17. Latihan tanpa beban (bodyweight/plank) tetap dapat segmen, notes-nya tanpa "@kg".
{
  const w = { id: 'w1', exercises: [{ id: 1, name: 'Plank', type: 'time' }] };
  const { segments, notes } = buildHcSessionDetail(w, { 1: [{ done: true, d: 60 }] }, T0, T1);
  assert.equal(segments.length, 1);
  assert.ok(!notes.includes('@'), `tidak boleh ada beban palsu: ${notes}`);
}

// 18. Kunci log bentuk sesi program (`${ex.id}-${workout.id}`) tetap kena — sama seperti
//     perhitungan kalori, kalau tidak seluruh sesi program tertulis tanpa rincian.
{
  const w = { id: 'w9', exercises: [{ id: 1, name: 'Bench Press' }] };
  const { segments } = buildHcSessionDetail(w, { '1-w9': [{ done: true, r: 10, w: 40 }] }, T0, T1);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].reps, 10);
}

// 19. Masukan kosong/durasi nol tidak melahirkan segmen invalid.
assert.deepEqual(buildHcSessionDetail(null, null, T0, T1), { segments: [], notes: '' });
assert.deepEqual(buildHcSessionDetail({ exercises: [] }, {}, T0, T1), { segments: [], notes: '' });
assert.deepEqual(buildHcSessionDetail({ exercises: [{ id: 1, name: 'A' }] }, { 1: [{ done: true }] }, T0, T0), { segments: [], notes: '' });

console.log('workoutCalc OK', { cardioKcal, plankKcal, liftKcal });

// ---- buildHcSessionDetail: apa yang benar-benar dikirim ke Health Connect ----
{
  const { buildHcSessionDetail } = await import('./workoutCalc.js');
  const start = new Date('2026-08-13T20:00:00').getTime();
  const end = new Date('2026-08-13T21:00:00').getTime();

  const workout = { id: 'w1', exercises: [
    { id: 101, name: 'Bench Press' },
    { id: 123, name: 'Plank' },
    { id: 999, name: 'Tidak Dikerjakan' },
  ] };
  const logs = {
    101: [ { w: 40, r: 10, done: true }, { w: 40, r: 10, done: true }, { w: 45, r: 8, done: true } ],
    123: [ { d: 45, done: true }, { d: 45, done: true } ],
    999: [ { w: 20, r: 10, done: false } ],
  };
  const { segments, notes } = buildHcSessionDetail(workout, logs, start, end);

  // Satu baris per latihan, bukan satu paragraf padat.
  const baris = notes.split('\n');
  assert.equal(baris.length, 2, `harus 2 baris (latihan tanpa set dilewati), dapat: ${notes}`);
  assert.ok(baris[0].includes('Bench Press') && baris[0].includes('@45kg'), baris[0]);

  // REGRESI: Plank dulu tampil "Plank 3x0" — terbaca seperti nol repetisi alias tidak dikerjakan.
  assert.ok(!/x0\b/.test(notes), `latihan berbasis waktu tidak boleh tampil "x0": ${notes}`);
  assert.ok(baris[1].includes('Plank') && /dtk|mnt/.test(baris[1]), baris[1]);

  // Segmen: hanya latihan yang dikerjakan, tidak tumpang tindih, dan di dalam rentang sesi —
  // syarat keras Health Connect. Kalau dilanggar, record DITOLAK dan plugin diam-diam
  // mengirim ulang tanpa segmen sama sekali.
  assert.equal(segments.length, 2);
  let prevEnd = start;
  for (const s of segments) {
    const a = new Date(s.startDate).getTime();
    const b = new Date(s.endDate).getTime();
    assert.ok(a >= start && b <= end, 'segmen harus di dalam rentang sesi');
    assert.ok(a < b, 'segmen harus punya durasi positif');
    assert.ok(a >= prevEnd, 'segmen tidak boleh tumpang tindih');
    prevEnd = b;
  }
  assert.equal(segments[0].reps, 28, 'total reps Bench Press = 10+10+8');

  console.log('buildHcSessionDetail OK');
}
