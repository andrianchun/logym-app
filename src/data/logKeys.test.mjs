// Cek penerjemahan kunci log -> latihan. Jalankan: node src/data/logKeys.test.mjs
// Kalau ini salah, latihannya tidak salah hitung — dia HILANG diam-diam dari grafik progres.
import assert from 'node:assert/strict';
import { resolveLoggedExercise } from './constants.js';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const UUID2 = '3fa85f64-9999-0000-1111-222233334444'; // sengaja sepotong awal SAMA dengan UUID

const lookup = {
  101: { id: 101, name: 'Bench Press' },
  123: { id: 123, name: 'Cardio' },
  [UUID]: { id: UUID, name: 'Cable Pull-Through' },
  [UUID2]: { id: UUID2, name: 'Lat Pulldown' },
};

// 1. Id angka polos.
assert.equal(resolveLoggedExercise('101', lookup).name, 'Bench Press');
assert.equal(resolveLoggedExercise(101, lookup).name, 'Bench Press');

// 2. Id angka + id sesi (bentuk sesi program).
assert.equal(resolveLoggedExercise('101-prog-1', lookup).name, 'Bench Press');

// 3. REGRESI UTAMA: id UUID polos. Cara lama memotong di tanda hubung pertama lalu Number() →
//    NaN → latihannya hilang sepenuhnya dari Progress.
assert.equal(resolveLoggedExercise(UUID, lookup).name, 'Cable Pull-Through');

// 4. REGRESI UTAMA: id UUID + id sesi.
assert.equal(resolveLoggedExercise(`${UUID}-w1`, lookup).name, 'Cable Pull-Through');
assert.equal(resolveLoggedExercise(`${UUID}-adhoc_123`, lookup).name, 'Cable Pull-Through');

// 5. Dua UUID dengan potongan awal sama TIDAK boleh tertukar — makanya pencocokan dimulai dari
//    yang terpanjang, bukan terpendek.
assert.equal(resolveLoggedExercise(`${UUID2}-w9`, lookup).name, 'Lat Pulldown');

// 6. Latihan ekstra: id + stempel waktu.
assert.equal(resolveLoggedExercise('123-1786258529614', lookup).name, 'Cardio');

// 7. Tidak ketemu → undefined, bukan lemparan error atau latihan asal.
assert.equal(resolveLoggedExercise('999', lookup), undefined);
assert.equal(resolveLoggedExercise('', lookup), undefined);
assert.equal(resolveLoggedExercise(null, lookup), undefined);
assert.equal(resolveLoggedExercise('101', null), undefined);

console.log('logKeys OK');
