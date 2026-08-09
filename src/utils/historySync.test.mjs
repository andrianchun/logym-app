// Cek rekonsiliasi history. Jalankan: node src/utils/historySync.test.mjs
// Ini jalur yang kalau salah, sesi latihan hilang permanen antar device.
import assert from 'node:assert/strict';
import { reconcileHistory, serializeDay, dayFingerprint, migrateBaseline, workoutsToArray, workoutsToMap, workoutIdsFromBaseline, diffFields } from './historySync.js';

const day = (...names) => ({ workouts: names.map(n => ({ id: n, status: 'completed' })) });

// 1. REGRESI UTAMA: lokal basi + server lebih baru → ambil server, JANGAN pertahankan lokal.
//    Dulu snapshot ditolak (guard waktu) tapi baseline tetap digeser ke versi server, sehingga
//    auto-save berikutnya mengirim [A] menimpa [A,B] di server.
{
  const prev = { '2026-08-05': day('A') };
  const baseline = { '2026-08-05': dayFingerprint(day('A')) }; // lokal == terakhir tersimpan
  const server = { '2026-08-05': day('A', 'B') };            // device lain menambah B

  const { next, baseline: nb, taken } = reconcileHistory(prev, server, baseline);
  assert.deepEqual(next['2026-08-05'].workouts.map(w => w.id), ['A', 'B'], 'sesi B dari device lain harus masuk');
  assert.deepEqual(taken, ['2026-08-05']);
  assert.equal(nb['2026-08-05'], dayFingerprint(server['2026-08-05']), 'baseline harus ikut versi yang benar-benar diambil');
}

// 2. Lokal punya perubahan yang BELUM terkirim → pertahankan lokal, dan baseline TIDAK digeser
//    (kalau digeser, auto-save mengira sudah tersimpan dan perubahan itu hilang diam-diam).
{
  const prev = { '2026-08-05': day('A', 'LOKAL') };
  const baseline = { '2026-08-05': dayFingerprint(day('A')) };
  const server = { '2026-08-05': day('A', 'B') };

  const { next, baseline: nb, kept } = reconcileHistory(prev, server, baseline);
  assert.deepEqual(next['2026-08-05'].workouts.map(w => w.id), ['A', 'LOKAL'], 'perubahan lokal tidak boleh ditimpa');
  assert.deepEqual(kept, ['2026-08-05']);
  assert.equal(nb['2026-08-05'], baseline['2026-08-05'], 'baseline harus tetap lama supaya tanggal ini tetap dikirim');
}

// 3. Tanggal yang belum pernah ada di device ini selalu aman diambil.
{
  const { next, taken } = reconcileHistory({}, { '2026-08-06': day('X') }, null);
  assert.deepEqual(next['2026-08-06'].workouts.map(w => w.id), ['X']);
  assert.deepEqual(taken, ['2026-08-06']);
}

// 4. _activeSession (sesi berjalan, per-device) tidak boleh hilang saat mengambil versi server.
{
  const prev = { '2026-08-05': { ...day('A'), _activeSession: { exerciseLogs: { 1: [{ done: true }] } } } };
  const baseline = { '2026-08-05': dayFingerprint(day('A')) }; // serializeDay mengabaikan _activeSession
  const { next } = reconcileHistory(prev, { '2026-08-05': day('A', 'B') }, baseline);
  assert.deepEqual(next['2026-08-05'].workouts.map(w => w.id), ['A', 'B']);
  assert.ok(next['2026-08-05']._activeSession, 'sesi berjalan harus bertahan');
}

// 5. Tanggal lokal yang tidak disebut server tidak boleh ikut terhapus.
{
  const prev = { '2026-08-01': day('LAMA'), '2026-08-05': day('A') };
  const { next } = reconcileHistory(prev, { '2026-08-05': day('A') }, { '2026-08-05': dayFingerprint(day('A')) });
  assert.ok(next['2026-08-01'], 'tanggal lain harus utuh');
}

// 6. serializeDay stabil terhadap urutan key (objek lokal vs hasil decode Firestore).
assert.equal(
  serializeDay({ workouts: [], bioData: { steps: 10 } }),
  serializeDay({ bioData: { steps: 10 }, workouts: [] })
);

// ── Format kabel: array (app) <-> map ber-key id (Firestore) ───────────────────────────────

// 7. Bolak-balik harus utuh, termasuk URUTANNYA (map tidak punya urutan, makanya ada _i).
{
  const list = [{ id: 'w2', name: 'B' }, { id: 'w1', name: 'A' }];
  const back = workoutsToArray(workoutsToMap(list));
  assert.deepEqual(back, list, 'urutan dan isi harus utuh setelah bolak-balik');
  assert.ok(!('_i' in back[0]), '_i tidak boleh bocor ke state app');
}

// 8. Riwayat lama masih berbentuk array di server — harus tetap terbaca.
assert.deepEqual(workoutsToArray([{ id: 'w1' }]), [{ id: 'w1' }]);

// 9. Hari tanpa workouts (mis. cuma bioData dari Health Connect) jangan dipaksa jadi array —
//    kalau dipaksa, serializeDay berubah dan hari itu jadi dirty selamanya.
assert.equal(workoutsToArray(undefined), undefined);

// 10. Sesi yang dihapus user HARUS disebut eksplisit — dengan merge map, key yang tidak
//     disebut dibiarkan hidup, jadi tanpa ini sesi terhapus akan muncul lagi.
{
  const DEL = '<<delete>>';
  const map = workoutsToMap([{ id: 'w1' }], ['w1', 'w2'], DEL);
  assert.equal(map.w2, DEL, 'sesi yang hilang dari lokal harus dikirim sebagai penghapusan');
  assert.equal(map.w1._i, 0, 'sesi yang masih ada jangan ikut terhapus');
}

// 11. Id sesi dibaca balik dari baseline (dipakai untuk mendeteksi penghapusan di atas).
assert.deepEqual(workoutIdsFromBaseline(dayFingerprint(day('a', 'b'))), ['a', 'b']);
assert.deepEqual(workoutIdsFromBaseline(null), []);
assert.deepEqual(workoutIdsFromBaseline('{bukan json'), []);

// 12. Snapshot server dalam bentuk MAP harus masuk ke state app sebagai ARRAY terurut,
//     dan baseline yang dihasilkan harus dalam bentuk app juga (kalau tidak, tiap snapshot
//     bikin hari itu terlihat berubah dan ditulis ulang tanpa henti).
{
  const server = { '2026-08-05': { workouts: { w2: { id: 'w2', _i: 1 }, w1: { id: 'w1', _i: 0 } } } };
  const { next, baseline: nb } = reconcileHistory({}, server, null);
  assert.deepEqual(next['2026-08-05'].workouts.map(w => w.id), ['w1', 'w2']);
  assert.equal(nb['2026-08-05'], dayFingerprint(next['2026-08-05']), 'baseline harus cocok dengan bentuk app');
}

// ── Diff per-field dokumen utama (S12) ─────────────────────────────────────────────────────

// 13. REGRESI UTAMA: field yang tidak berubah TIDAK boleh ikut terkirim. Dulu seluruh isi
//     dokumen dikirim tiap menyimpan, jadi device yang cuma mengubah tema ikut membawa daftar
//     gym versi lamanya dan menimpa gym baru dari device lain.
{
  const gyms = [{ id: 'g1', name: 'Gym A' }];
  const baseline = { theme: '"dark"', gymProfiles: JSON.stringify(gyms) };
  const { changed, changedKeys } = diffFields({ theme: 'light', gymProfiles: gyms }, baseline);
  assert.deepEqual(changedKeys, ['theme'], 'hanya tema yang berubah');
  assert.ok(!('gymProfiles' in changed), 'gymProfiles tidak boleh ikut terkirim');
}

// 14. Tidak ada perubahan sama sekali → tidak menulis apa pun.
{
  const { changedKeys } = diffFields({ theme: 'dark' }, { theme: '"dark"' });
  assert.deepEqual(changedKeys, []);
}

// 15. Baseline kosong (device baru) → semua terkirim sekali, lalu baselinenya terisi.
{
  const { changedKeys, nextBaseline } = diffFields({ theme: 'dark', units: { weight: 'kg' } }, null);
  assert.deepEqual(changedKeys.sort(), ['theme', 'units']);
  const second = diffFields({ theme: 'dark', units: { weight: 'kg' } }, nextBaseline);
  assert.deepEqual(second.changedKeys, [], 'save kedua tidak boleh mengirim ulang');
}

// 16. undefined tidak boleh pernah dikirim — Firestore menolak SELURUH dokumen kalau ada,
//     dan dulu itu bikin semua auto-save gagal diam-diam.
{
  const { changed, changedKeys } = diffFields({ theme: 'dark', userProfile: undefined }, null);
  assert.deepEqual(changedKeys, ['theme']);
  assert.ok(!('userProfile' in changed));
}

// 17. Urutan key di dalam objek tidak boleh dianggap perubahan.
{
  const { changedKeys } = diffFields(
    { units: { weight: 'kg', height: 'cm' } },
    { units: stableStringifyLike({ height: 'cm', weight: 'kg' }) }
  );
  assert.deepEqual(changedKeys, [], 'urutan key bukan perubahan');
}
// 18. REGRESI 9 Agu 2026 — sesi hilang waktu Firebase down.
//     Saat offline, setDoc TIDAK menolak; promise-nya menggantung. Dulu baseline digeser SEBELUM
//     tulisannya sampai, jadi tanggal itu dianggap tersimpan padahal antreannya mati begitu app
//     ditutup. Boot berikutnya lokal == baseline → rekonsiliasi mengambil versi server yang lebih
//     tua → sesi yang sudah selesai lenyap.
//
//     Aturannya sekarang: baseline hanya digeser setelah tulisan sukses. Tes ini menjaga akibat
//     yang penting — selama baseline BELUM digeser, versi lokal wajib dipertahankan.
{
  const lokal = { '2026-08-09': day('sesi-selesai') };
  const server = { '2026-08-09': { workouts: {} } }; // server belum pernah menerima sesinya

  // Baseline masih versi lama (hari itu belum ada isinya) karena tulisannya tidak pernah sampai.
  const baselineBelumDigeser = { '2026-08-09': dayFingerprint({ workouts: [] }) };
  const r1 = reconcileHistory(lokal, server, baselineBelumDigeser);
  assert.deepEqual(r1.kept, ['2026-08-09'], 'sesi lokal harus dipertahankan saat tulisan belum sampai');
  assert.equal(r1.next['2026-08-09'].workouts.length, 1, 'sesi tidak boleh hilang');

  // Kebalikannya: kalau baseline TERLANJUR digeser (perilaku lama), sesinya lenyap. Ini yang
  // dulu terjadi — dipertahankan sebagai tes supaya bahayanya tidak pernah dianggap teoretis.
  const baselineTerlanjur = { '2026-08-09': dayFingerprint(lokal['2026-08-09']) };
  const r2 = reconcileHistory(lokal, server, baselineTerlanjur);
  assert.deepEqual(r2.taken, ['2026-08-09']);
  assert.equal(r2.next['2026-08-09'].workouts.length, 0, 'inilah kehilangan datanya');
}

// ── Sidik jari baseline (T2) ────────────────────────────────────────────────────────────────
// Baseline dulu menyimpan serializeDay UTUH — salinan kedua seluruh riwayat di localStorage yang
// jatahnya ~5 MB. Saat jatahnya habis, baseline membeku dan rekonsiliasi mengirim salinan basi
// menimpa data device lain. Sidik jari ini yang mencegahnya; tes berikut menjaga sifatnya.

// 19. UKURAN: itu seluruh alasan perubahan ini ada. Hari dengan log intraday harus menyusut drastis.
{
  const berat = {
    workouts: [{ id: 'w1', status: 'completed', log: { 1: Array.from({ length: 20 }, () => ({ done: true, w: 40, r: 10 })) } }],
    bioData: { steps: 8000, heartRateLog: Array.from({ length: 96 }, (_, i) => ({ time: '08:00', ts: 1786258529614 + i * 900000, value: 70 + i })) },
  };
  const fp = dayFingerprint(berat);
  assert.ok(fp.length < 200, `sidik jari kegemukan: ${fp.length} byte`);
  assert.ok(serializeDay(berat).length > 4000, 'prasyarat tes: hari contohnya memang besar');
}

// 20. Isi berbeda -> sidik jari berbeda. Kalau ini gagal, perubahan tidak pernah terkirim.
{
  assert.notEqual(dayFingerprint(day('A')), dayFingerprint(day('A', 'B')));
  assert.notEqual(dayFingerprint({ bioData: { steps: 10 } }), dayFingerprint({ bioData: { steps: 11 } }));
  // Perubahan sekecil satu set yang dicentang pun harus terdeteksi.
  const a = { workouts: [{ id: 'w1', log: { 1: [{ done: false, r: 10 }] } }] };
  const b = { workouts: [{ id: 'w1', log: { 1: [{ done: true, r: 10 }] } }] };
  assert.notEqual(dayFingerprint(a), dayFingerprint(b));
}

// 21. Isi sama -> sidik jari sama, apa pun urutan key-nya (objek lokal vs hasil decode Firestore).
assert.equal(
  dayFingerprint({ workouts: [], bioData: { steps: 10, weight: 70 } }),
  dayFingerprint({ bioData: { weight: 70, steps: 10 }, workouts: [] })
);

// 22. _activeSession tetap diabaikan — itu state per-device, bukan bagian isi hari.
assert.equal(
  dayFingerprint(day('A')),
  dayFingerprint({ ...day('A'), _activeSession: { exerciseLogs: { 1: [{ done: true }] } } })
);

// 23. Id sesi tetap terbaca dari sidik jari — dipakai mendeteksi penghapusan. Tanpa ini, sesi
//     yang dihapus user muncul lagi karena merge map membiarkan key yang tidak disebut hidup.
assert.deepEqual(workoutIdsFromBaseline(dayFingerprint(day('a', 'b'))), ['a', 'b']);
assert.deepEqual(workoutIdsFromBaseline(dayFingerprint({ bioData: { steps: 1 } })), []);

// 24. Baseline format LAMA (serializeDay utuh) masih terbaca sampai migrasi sempat jalan.
assert.deepEqual(workoutIdsFromBaseline(serializeDay(day('a', 'b'))), ['a', 'b']);
assert.deepEqual(workoutIdsFromBaseline(null), []);
assert.deepEqual(workoutIdsFromBaseline('{bukan json'), []);

// 25. migrateBaseline: nilai lama -> sidik jari yang SAMA PERSIS dengan hasil hitung langsung.
//     Kalau meleset, semua tanggal terlihat berubah dan seluruh riwayat setahun dikirim ulang.
{
  const lama = { '2026-08-05': serializeDay(day('A', 'B')), '2026-08-06': serializeDay({ bioData: { steps: 1 } }) };
  const baru = migrateBaseline(lama);
  assert.equal(baru['2026-08-05'], dayFingerprint(day('A', 'B')));
  assert.equal(baru['2026-08-06'], dayFingerprint({ bioData: { steps: 1 } }));
  assert.deepEqual(workoutIdsFromBaseline(baru['2026-08-05']), ['A', 'B']);
}

// 26. migrateBaseline idempoten — dijalankan tiap boot, jadi entri yang sudah baru harus lewat
//     tanpa disentuh. Kalau di-hash lagi, seluruh riwayat jadi dirty setiap kali app dibuka.
{
  const baru = { '2026-08-05': dayFingerprint(day('A')) };
  assert.deepEqual(migrateBaseline(baru), baru);
  assert.deepEqual(migrateBaseline(migrateBaseline(migrateBaseline(baru))), baru);
  assert.equal(migrateBaseline(null), null);
}

// 27. RANGKAIAN UTUH dengan sidik jari: simpan -> baseline digeser -> tidak ada yang dikirim lagi.
{
  const lokal = { '2026-08-05': day('A') };
  const base = { '2026-08-05': dayFingerprint(lokal['2026-08-05']) };
  // Server mengirim balik isi yang sama persis: tidak boleh dianggap perubahan lokal.
  const r = reconcileHistory(lokal, { '2026-08-05': day('A') }, base);
  assert.deepEqual(r.kept, [], 'isi identik tidak boleh terlihat sebagai perubahan lokal');
  assert.deepEqual(r.taken, ['2026-08-05']);
  assert.equal(r.baseline['2026-08-05'], base['2026-08-05'], 'baseline tidak boleh bergeser tanpa perubahan');
}

function stableStringifyLike(o) {
  // sama seperti stableStringify: key di-sort
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + JSON.stringify(o[k])).join(',') + '}';
}

console.log('historySync OK');
