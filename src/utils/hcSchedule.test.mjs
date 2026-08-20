// Penjadwalan sinkron Health Connect. Jalankan: node src/utils/hcSchedule.test.mjs
//
// Dua kegagalan yang dijaga di sini tidak memunculkan error apa pun — cuma data tidur yang telat
// muncul, dan sesi latihan yang tidak pernah sampai ke Health Connect.
import assert from 'node:assert/strict';
import { hcThrottleMs, bolehSync, gabungAntrean } from './hcSchedule.js';

const DETIK = 1000, MENIT = 60 * DETIK;

// 1. Jendela sempit dijaga 60 detik, jendela lebar 10 menit.
assert.equal(hcThrottleMs(1), 60 * DETIK);
assert.equal(hcThrottleMs(2), 60 * DETIK);
assert.equal(hcThrottleMs(7), 10 * MENIT);
assert.equal(hcThrottleMs(30), 10 * MENIT);

// 2. REGRESI UTAMA — pagi hari. Buka app 06.00 (Samsung belum menulis tidur), buka lagi 06.03.
//    Dengan satu jeda 10 menit untuk semuanya, 06.03 ditolak dan tidurnya baru muncul lewat 06.10.
{
  const jam6 = new Date('2026-08-20T06:00:00').getTime();
  const jam603 = jam6 + 3 * MENIT;
  assert.equal(bolehSync(2, jam6, jam6, jam603), true, 'penyegaran tidur harus boleh jalan lagi');
  assert.equal(bolehSync(7, jam6, jam6, jam603), false, 'sapuan lebar tetap ditahan');
}

// 3. Tapi jangan dobel kalau app bolak-balik dalam hitungan detik.
{
  const t = 1_000_000;
  assert.equal(bolehSync(2, t, 0, t + 10 * DETIK), false);
  assert.equal(bolehSync(2, t, 0, t + 61 * DETIK), true);
}

// 4. Belum pernah sinkron sama sekali (0/undefined) -> selalu boleh. "Sekarang" harus stempel
//    waktu sungguhan: 0 berarti "belum pernah", bukan "epoch".
{
  const kini = Date.now();
  assert.equal(bolehSync(2, 0, 0, kini), true);
  assert.equal(bolehSync(30, 0, 0, kini), true);
  assert.equal(bolehSync(2, undefined, null, kini), true);
  assert.equal(bolehSync(30, undefined, null, kini), true);
}

// 5. REGRESI UTAMA — sesi latihan tidak boleh hilang. Permintaan yang datang saat sinkron lain
//    berjalan harus terkumpul, dan jendela terlebar yang menang supaya yang sempit ikut tercakup.
assert.deepEqual(gabungAntrean(null, { days: 1, silent: true }), { days: 1, silent: true });
assert.deepEqual(gabungAntrean({ days: 1, silent: true }, { days: 7, silent: true }), { days: 7, silent: true });
assert.deepEqual(gabungAntrean({ days: 30, silent: true }, { days: 1, silent: true }), { days: 30, silent: true });

// 6. Sekali ada permintaan manual (non-silent), hasil gabungannya non-silent — kalau tidak,
//    sinkron manual kehilangan laporan hasilnya.
assert.equal(gabungAntrean({ days: 1, silent: true }, { days: 1, silent: false }).silent, false);
assert.equal(gabungAntrean({ days: 1, silent: false }, { days: 1, silent: true }).silent, false);

// 7. Masukan kosong tidak menghasilkan NaN.
assert.equal(gabungAntrean(undefined, undefined).days, 0);
assert.ok(!Number.isNaN(gabungAntrean({ days: 'x' }, { days: 'y' }).days));

console.log('hcSchedule OK');
