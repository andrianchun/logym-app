// Cek pemulihan durasi latihan setelah app mati mendadak.
// Jalankan: node src/utils/crashRecovery.test.mjs
// Kalau ini salah, sesi 40 menit bisa tercatat berjam-jam — dan kalori serta jendela nadi
// (yang berangkat dari durasi) ikut rusak mengikutinya.
import assert from 'node:assert/strict';
import { recoveredWorkoutSeconds } from './workoutCalc.js';

const T0 = new Date('2026-08-09T17:00:00').getTime();
const mins = (n) => n * 60 * 1000;

// 1. Kasus normal: denyut terakhir 40 menit setelah mulai → 40 menit dipulihkan.
assert.equal(recoveredWorkoutSeconds(T0, T0 + mins(40)), 40 * 60);

// 2. REGRESI UTAMA: waktu SELAMA app mati tidak pernah dihitung. HP mati semalam lalu dibuka
//    lagi tetap memulihkan 40 menit, bukan 8 jam.
{
  const savedAt = T0 + mins(40);
  const bukaLagi = T0 + mins(60 * 8);
  assert.equal(recoveredWorkoutSeconds(T0, savedAt), 40 * 60);
  // `now` memang tidak jadi parameter — dipastikan di sini supaya tidak diam-diam dipakai lagi.
  assert.equal(recoveredWorkoutSeconds(T0, savedAt, bukaLagi), 40 * 60);
}

// 3. Crash sedetik setelah mulai → nyaris nol, bukan angka negatif atau melompat.
assert.equal(recoveredWorkoutSeconds(T0, T0 + 1000), 1);

// 4. Data rusak/hilang → 0, jangan NaN. NaN merembet jadi durasi "-" lalu kalori kacau.
assert.equal(recoveredWorkoutSeconds(0, T0), 0);
assert.equal(recoveredWorkoutSeconds(T0, 0), 0);
assert.equal(recoveredWorkoutSeconds(undefined, undefined), 0);
assert.equal(recoveredWorkoutSeconds('bukan angka', T0), 0);

// 5. Jam perangkat mundur (ganti zona waktu/koreksi NTP) → 0, bukan durasi negatif yang
//    membuat jendela nadi berakhir sebelum dimulai.
assert.equal(recoveredWorkoutSeconds(T0, T0 - mins(10)), 0);

console.log('crashRecovery OK');
