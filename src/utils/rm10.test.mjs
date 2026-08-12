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
