// Cek turunan "menit aktif dari langkah". Jalankan: node src/utils/stepMinutes.test.mjs
// Angka ini masuk ke Durasi Aktif di dasbor, jadi kalau salah user melihat durasi palsu.
import assert from 'node:assert/strict';
import { stepMinutesFromHourly } from './workoutCalc.js';

// 1. Jam kosong tidak menyumbang menit — hari tanpa langkah harus 0, bukan angka mengambang.
assert.equal(stepMinutesFromHourly([]), 0);
assert.equal(stepMinutesFromHourly([0, 0, 0]), 0);
assert.equal(stepMinutesFromHourly(undefined), 0);

// 2. Kadensi dasar: 100 langkah = 1 menit.
assert.equal(stepMinutesFromHourly([100]), 1);
assert.equal(stepMinutesFromHourly([3000]), 30);

// 3. REGRESI UTAMA: satu jam padat DI-CAP 60 menit. Tanpa cap, 12.000 langkah dalam sejam
//    jadi "120 menit" — durasi yang mustahil dan bikin total harian menggelembung.
assert.equal(stepMinutesFromHourly([12000]), 60);

// 4. Cap-nya per jam, bukan per hari: dua jam padat = 120 menit, tetap wajar.
assert.equal(stepMinutesFromHourly([12000, 12000]), 120);

// 5. Beberapa jam biasa dijumlah apa adanya.
assert.equal(stepMinutesFromHourly([500, 1200, 0, 300]), 20);

// 6. Nilai kotor dari plugin (null/undefined/string) tidak boleh bikin NaN — satu NaN merusak
//    seluruh total dan tampil sebagai "-" tanpa jejak kenapa.
assert.equal(stepMinutesFromHourly([null, undefined, '600', 400]), 10);

console.log('stepMinutes OK');
