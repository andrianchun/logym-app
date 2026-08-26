// Cek rumus 10RM dan pembulatan beban. Jalankan: node src/utils/rm10.test.mjs
//
// Ini angka yang dipakai Coach Logy untuk menyarankan beban dan yang dipakai aplikasi untuk
// mengisi kolom kg. Kalau salah, tidak ada yang error — user cuma diberi beban yang keliru,
// dan rekornya bisa hilang tanpa jejak.
import assert from 'node:assert/strict';
import { estimate10RM, roundDownToStep, recomputeStrengthRecords } from './workoutCalc.js';

// 1. Nilai dasar. 100 kg x 10 reps: Epley 1RM = 133,33 -> /1,3333 = 100,0.
assert.equal(estimate10RM(100, 10), 100);

// 2. REGRESI UTAMA: kalkulator manual dulu membulatkan 1RM ke bilangan bulat DULU
//    (Math.round(133,33) = 133 -> 99,8), sementara jalur riwayat memberi 100,0 dari data yang
//    sama. Itu keluhan "10RM calc kok ga sinkron". Sekarang satu rumus, satu jawaban.
assert.notEqual(estimate10RM(100, 10), 99.8);

// 3. Satu repetisi = beban itu sendiri. Epley polos akan menggelembungkannya 3,3%.
assert.equal(estimate10RM(80, 1), Math.round((80 / 1.3333) * 10) / 10);
assert.ok(estimate10RM(80, 1) < estimate10RM(80, 2));

// 4. Masukan tidak masuk akal -> 0, bukan NaN. NaN merambat diam-diam ke seluruh kolom beban.
for (const bad of [[0, 10], [100, 0], [-5, 10], [null, null], [undefined, 5], ['', 10]]) {
  assert.equal(estimate10RM(bad[0], bad[1]), 0, `estimate10RM(${bad}) harus 0`);
}
assert.ok(!Number.isNaN(estimate10RM('abc', 'def')));

// 5. Reps lebih banyak pada beban sama = 10RM lebih tinggi (monoton naik).
assert.ok(estimate10RM(50, 12) > estimate10RM(50, 8));

// 6. Pembulatan ke kelipatan alat, selalu KE BAWAH — menawarkan beban lebih berat dari
//    kemampuan terukur itu saran yang bisa mencederai.
assert.equal(roundDownToStep(42.5, 5), 40);
assert.equal(roundDownToStep(42.5, 2.5), 42.5);
assert.equal(roundDownToStep(47.4, 5), 45);
assert.equal(roundDownToStep(100, 5), 100);   // pas di kelipatan, jangan turun
assert.equal(roundDownToStep(3, 5), 0);       // di bawah kelipatan terkecil
assert.equal(roundDownToStep(42.5, 0), 42.5); // tanpa info alat, biarkan apa adanya
assert.equal(roundDownToStep(0, 5), 0);

// 7. recomputeStrengthRecords memakai rumus yang sama, dan hanya membaca sesi 'completed'.
const lookup = { 101: { id: 101, name: 'Bench Press' } };
const history = {
  '2026-08-01': { workouts: [{ status: 'completed', id: 'w1', log: { 101: [
    { w: 100, r: 10, done: true },
    { w: 60, r: 10, done: true },
  ] } }] },
  '2026-08-02': { workouts: [{ status: 'in_progress', id: 'w2', log: { 101: [
    { w: 200, r: 10, done: true },   // sesi belum selesai — TIDAK boleh jadi rekor
  ] } }] },
};
const rec = recomputeStrengthRecords(history, ['101'], lookup);
assert.equal(rec['101'].rm10, 100, 'rekor harus dari set terberat sesi yang selesai');
assert.equal(rec['101'].lastWeight, 100);

// 8. Set yang di-skip tidak dihitung.
const skipHist = { '2026-08-01': { workouts: [{ status: 'completed', id: 'w1', log: { 101: [
  { w: 500, r: 10, skipped: true },
  { w: 50, r: 10, done: true },
] } }] } };
assert.equal(recomputeStrengthRecords(skipHist, ['101'], lookup).rm10, undefined);
assert.equal(recomputeStrengthRecords(skipHist, ['101'], lookup)['101'].rm10, estimate10RM(50, 10));

console.log('rm10 OK', { r100x10: estimate10RM(100, 10), bulat42_5step5: roundDownToStep(42.5, 5) });

// ---- mergeRm10: override manual vs rekor dari riwayat ----
{
  const { mergeRm10 } = await import('./workoutCalc.js');
  const KEMARIN = new Date('2026-08-12T00:00:00').getTime();
  const HARI_INI = new Date('2026-08-13T00:00:00').getTime();
  const BESOK = new Date('2026-08-14T00:00:00').getTime();

  // 1. Tanpa override manual -> pakai angka dari sesi TERAKHIR, termasuk kalau lebih rendah.
  //    REGRESI UTAMA: dulu di sini Math.max, jadi 10RM tidak pernah bisa turun seumur hidup akun —
  //    deload tidak tercermin dan satu salah ketik (100 kg padahal 10) merusak saran beban selamanya.
  assert.equal(mergeRm10(100, null, 80, KEMARIN), 80, '10RM harus boleh turun (deload / salah input)');
  assert.equal(mergeRm10(80, null, 100, KEMARIN), 100);
  assert.equal(mergeRm10(0, 0, 90, KEMARIN), 90);

  // 2. Riwayat kosong (belum tersinkron / dipangkas) -> yang tersimpan dipertahankan, bukan dinolkan.
  assert.equal(mergeRm10(100, null, 0, KEMARIN), 100);

  // 3. REGRESI: user menurunkan acuan manual hari ini setelah jeda panjang. Sesi lama TIDAK BOLEH
  //    menimpanya — kalau boleh, tombol simpan di kalkulator 10RM tidak ada artinya.
  assert.equal(mergeRm10(60, HARI_INI, 100, KEMARIN), 60,
    'sesi lama tidak boleh menimpa acuan yang baru ditetapkan manual');

  // 4. Tapi override bukan plafon permanen: sesi SESUDAH tanggal override tetap menang,
  //    naik maupun turun.
  assert.equal(mergeRm10(60, HARI_INI, 100, BESOK), 100, 'sesi sesudah override harus menang');
  assert.equal(mergeRm10(60, HARI_INI, 50, BESOK), 50, 'sesi sesudah override yang lebih ringan juga menang');

  // 5. Masukan kosong tidak menghasilkan NaN.
  assert.equal(mergeRm10(undefined, undefined, undefined, undefined), 0);
  assert.ok(!Number.isNaN(mergeRm10('x', 'y', 'z', 'w')));

  console.log('mergeRm10 OK');
}

// ---- 10RM mengikuti sesi TERAKHIR, rekor sepanjang masa disimpan terpisah ----
{
  const lookup2 = { 101: { id: 101, name: 'Bench Press' } };
  const hist2 = {
    '2026-08-01': { workouts: [{ status: 'completed', id: 'a', log: { 101: [{ w: 100, r: 10, done: true }] } }] },
    '2026-08-05': { workouts: [{ status: 'completed', id: 'b', log: { 101: [{ w: 60, r: 10, done: true }] } }] },
  };
  const r = recomputeStrengthRecords(hist2, ['101'], lookup2)['101'];
  assert.equal(r.rm10, estimate10RM(60, 10), '10RM = sesi terakhir (deload), bukan rekor lama');
  assert.equal(r.rm10Best, estimate10RM(100, 10), 'rekor sepanjang masa tetap tersimpan');
  assert.equal(r.rm10At, new Date('2026-08-05').getTime(), 'rm10At = tanggal sesi terakhir');
  console.log('rm10 terakhir OK');
}

// ---- rm10Series: bahan grafik progressive overload ----
{
  const { rm10Series } = await import('./workoutCalc.js');
  const lookup3 = { 101: { id: 101, name: 'Bench Press' } };
  const hist3 = {
    '2026-08-05': { workouts: [{ status: 'completed', id: 'b', log: { 101: [{ w: 60, r: 10, done: true }] } }] },
    '2026-08-01': { workouts: [{ status: 'completed', id: 'a', log: { 101: [
      { w: 50, r: 10, done: true }, { w: 55, r: 10, done: true },
    ] } }] },
    '2026-08-03': { workouts: [{ status: 'in_progress', id: 'x', log: { 101: [{ w: 999, r: 10, done: true }] } }] },
    '2026-08-04': { workouts: [{ status: 'completed', id: 'c', log: { 202: [{ w: 80, r: 10, done: true }] } }] },
  };
  const seri = rm10Series(hist3, 101, lookup3);
  assert.deepEqual(seri.map(p => p.date), ['2026-08-01', '2026-08-05'],
    'urut lama->baru, sesi belum selesai & latihan lain tidak ikut');
  assert.equal(seri[0].rm10, estimate10RM(55, 10), 'per sesi diambil set terbaiknya');
  assert.equal(seri[1].weight, 60);
  assert.deepEqual(rm10Series({}, 101, lookup3), []);
  console.log('rm10Series OK');
}

// ---- rm10Best: acuan REKOR tidak boleh ikut turun saat rm10 turun ----
{
  const lookup4 = { 101: { id: 101, name: 'Bench Press' } };
  const sesi = (tanggal, w) => ({ [tanggal]: { workouts: [
    { status: 'completed', id: 'w-' + tanggal, log: { 101: [{ w, r: 10, done: true }] } },
  ] } });

  // Salah ketik 100 kg (harusnya 10), lalu dikoreksi di sesi berikutnya.
  const salahKetik = { ...sesi('2026-08-01', 10), ...sesi('2026-08-02', 100) };
  const a = recomputeStrengthRecords(salahKetik, ['101'], lookup4)['101'];
  assert.equal(a.rm10, estimate10RM(100, 10), 'sesi terakhir menang, walau nilainya keliru');
  assert.equal(a.rm10Best, estimate10RM(100, 10));

  // User memperbaiki sesi itu lewat Edit Riwayat -> 10RM ikut turun.
  const setelahKoreksi = { ...sesi('2026-08-01', 10), ...sesi('2026-08-02', 10) };
  const b = recomputeStrengthRecords(setelahKoreksi, ['101'], lookup4)['101'];
  assert.equal(b.rm10, estimate10RM(10, 10), '10RM harus ikut terkoreksi turun');
  // rm10Best diturunkan dari riwayat yang tersisa, dan App.jsx menggabungnya dengan nilai lama
  // pakai Math.max — jadi rekor lama tetap hidup di pustaka meski riwayatnya sudah dibetulkan.
  assert.equal(Math.max(a.rm10Best, b.rm10Best), a.rm10Best, 'rekor sepanjang masa tidak boleh turun');

  // Deload sengaja: 10RM turun, rekor bertahan.
  const deload = { ...sesi('2026-08-01', 100), ...sesi('2026-08-08', 70) };
  const c = recomputeStrengthRecords(deload, ['101'], lookup4)['101'];
  assert.equal(c.rm10, estimate10RM(70, 10));
  assert.equal(c.rm10Best, estimate10RM(100, 10));
  assert.ok(c.rm10 < c.rm10Best, 'rm10 dan rm10Best memang boleh berbeda — itu intinya');

  console.log('rm10Best OK');
}

// ---- Latihan yang sama di program BERBEDA harus tetap terbaca 10RM-nya ----
// Gejala: "Smith Machine Squat" punya riwayat di Full Body A (05/08) dan PPL Legs (03/08), modal
// detail menampilkannya (dia mencocokkan nama), tapi kartu Coach bilang "10RM terakhir: -".
// Sebabnya pencocokan per-id: tiap program menyimpan SALINAN ber-id sendiri, dan setiap
// Tambah/Ganti Latihan membuat crypto.randomUUID() baru.
{
  const { buildExLookupByName, canonicalExId, rm10Series } = await import('./workoutCalc.js');

  const NAMA = 'Smith Machine Squat';
  const dariFullBody = { id: 'uuid-fullbody', name: NAMA };   // salinan di program A
  const dariPPL = { id: 'uuid-ppl', name: NAMA };             // salinan di program B
  const sudahDihapus = { id: 'uuid-lama', name: NAMA };       // sudah diganti user, hanya ada di riwayat

  const hist = {
    '2026-08-03': { workouts: [{ status: 'completed', id: 'w-ppl', exercises: [dariPPL],
      log: { 'uuid-ppl-w-ppl': [{ w: 60, r: 10, done: true }] } }] },
    '2026-08-05': { workouts: [{ status: 'completed', id: 'w-fb', exercises: [dariFullBody],
      log: { 'uuid-fullbody-w-fb': [{ w: 70, r: 10, done: true }] } }] },
    // Riwayat dari salinan yang sudah tidak ada di program mana pun. Satu-satunya jejak namanya
    // ada di snapshot w.exercises — kalau itu tidak dipindai, sesi ini hilang selamanya.
    '2026-08-01': { workouts: [{ status: 'completed', id: 'w-x', exercises: [sudahDihapus],
      log: { 'uuid-lama-w-x': [{ w: 50, r: 10, done: true }] } }] },
  };

  const lookup = buildExLookupByName(hist, [{ id: 901, name: NAMA }], [], [dariFullBody]);
  const seri = rm10Series(hist, canonicalExId(NAMA), lookup);
  assert.deepEqual(seri.map(p => p.date), ['2026-08-01', '2026-08-03', '2026-08-05'],
    'ketiga sesi harus terbaca, dari program mana pun asalnya');
  assert.equal(seri[seri.length - 1].rm10, estimate10RM(70, 10), '10RM terakhir = sesi 05/08');
  assert.equal(seri.reduce((m, p) => Math.max(m, p.rm10), 0), estimate10RM(70, 10));

  // Id pustaka juga harus menunjuk ke objek kanonik yang sama, supaya App.jsx bisa menulis
  // rm10 balik ke pustaka lewat records[canonicalExId(e.name)].
  assert.equal(lookup['901'].id, canonicalExId(NAMA));
  assert.equal(lookup['uuid-lama'].id, canonicalExId(NAMA));
  assert.equal(canonicalExId('  Smith Machine SQUAT '), canonicalExId(NAMA), 'nama tidak case/spasi sensitif');

  // Latihan lain tidak boleh ikut tersedot.
  assert.deepEqual(rm10Series(hist, canonicalExId('Bench Press'), lookup), []);

  // Tanpa nama / tanpa id -> diabaikan, bukan bikin entri sampah.
  const kotor = buildExLookupByName(null, [{ id: 1 }, { name: 'X' }, null]);
  assert.deepEqual(Object.keys(kotor), []);

  // Beban aktual (total_w) ikut dipakai, sama seperti grafik progres.
  const histBar = { '2026-08-05': { workouts: [{ status: 'completed', id: 'w1', exercises: [dariPPL],
    log: { 'uuid-ppl-w1': [{ w: 80, input_w: 80, base_w: 20, ratio: 1, total_w: 100, r: 10, done: true }] } }] } };
  const lookupBar = buildExLookupByName(histBar, [dariPPL]);
  assert.equal(rm10Series(histBar, canonicalExId(NAMA), lookupBar)[0].rm10, estimate10RM(100, 10),
    '10RM dari beban aktual 100 kg, bukan input 80 kg');

  console.log('10RM lintas program OK');
}

// ---- Saran beban ikut turun setelah koreksi (gejala yang dilaporkan user) ----
{
  const { defaultSetWeight, estimate10RM, canonicalExId, buildExLookupByName, recomputeStrengthRecords } = await import('./workoutCalc.js');
  const ex = { reps: 10 };
  assert.equal(defaultSetWeight({ rm10: estimate10RM(100, 10) }, ex, 2.5), 100, 'sebelum dikoreksi');
  assert.equal(defaultSetWeight({ rm10: estimate10RM(10, 10) }, ex, 2.5), 10, 'sesudah dikoreksi');
  console.log('saran beban OK');

  // Latihan baru pertama kali (misal Close Grip Front Lat Pulldown)
  const NEW_EX = 'Close Grip Front Lat Pulldown';
  const exItem = { id: 'uuid-cgflp', name: NEW_EX };
  const histFirst = {
    '2026-08-26': {
      workouts: [{
        id: 'w-adhoc',
        status: 'completed',
        exercises: [exItem],
        log: {
          'uuid-cgflp-w-adhoc': [
            { w: 50, r: 10, done: true },
            { w: 55, r: 10, done: true }
          ]
        }
      }]
    }
  };
  const lookupNew = buildExLookupByName(histFirst, [exItem]);
  const recNew = recomputeStrengthRecords(histFirst, ['uuid-cgflp-w-adhoc'], lookupNew);
  const canonKey = canonicalExId(NEW_EX);
  const rResult = recNew[canonKey] || recNew['uuid-cgflp'];
  assert.ok(rResult, 'rekor latihan baru harus ditemukan');
  assert.equal(rResult.rm10, estimate10RM(55, 10), '10RM harus dari set terberat 55 kg');
  assert.equal(rResult.rm10Best, estimate10RM(55, 10), 'rm10Best pertama kali harus sama dengan 10RM');
  console.log('10RM pertama latihan baru OK');
}
