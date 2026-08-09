// Cek jendela waktu sesi + peringkasan nadi. Jalankan: node src/utils/heartRate.test.mjs
// Kalau jendelanya meleset, kurva nadi satu sesi diambil dari menit milik sesi lain.
import assert from 'node:assert/strict';
import { workoutWindow, summarizeHeartRate } from './workoutCalc.js';

// --- workoutWindow -------------------------------------------------------

// 1. `startedAt` adalah sumber yang benar kalau ada.
{
  const startedAt = new Date('2026-08-09T17:30:00').getTime();
  const { start, end } = workoutWindow({ startedAt, duration: '45:00' }, '2026-08-09');
  assert.equal(start.getTime(), startedAt);
  assert.equal((end - start) / 60000, 45);
}

// 2. Sesi lama tanpa `startedAt`: mundur dari `timestamp` (jam SELESAI) sebanyak durasinya.
{
  const { start, end } = workoutWindow({ timestamp: '18:15', duration: '45:00' }, '2026-08-09');
  assert.equal(end.getTime(), new Date('2026-08-09T18:15:00').getTime());
  assert.equal(start.getTime(), new Date('2026-08-09T17:30:00').getTime());
}

// 3. REGRESI: tanpa timestamp DAN tanpa startedAt harus tetap tanggal yang valid (bukan NaN) —
//    tanggal invalid diteruskan ke Health Connect jadi kueri yang gagal diam-diam.
{
  const { start, end } = workoutWindow({ duration: 30 }, '2026-08-09');
  assert.ok(Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()));
  assert.equal(end.getTime(), new Date('2026-08-09T12:00:00').getTime());
  assert.equal((end - start) / 60000, 30);
}

// 3b. REGRESI UTAMA: sesi yang jamnya TIDAK diketahui wajib ditandai `guessed`. Tanpa penanda
//     ini, penarik nadi mengambil detak pukul 12 siang lalu menampilkannya berlabel sumber asli —
//     data karangan yang menyamar jadi data sungguhan.
{
  assert.equal(workoutWindow({ duration: 30 }, '2026-08-09').guessed, true);
  assert.equal(workoutWindow({ duration: 30, timestamp: 'ngawur' }, '2026-08-09').guessed, true);
  assert.equal(workoutWindow({ duration: 30, timestamp: '18:15' }, '2026-08-09').guessed, false);
  assert.equal(workoutWindow({ duration: 30, startedAt: Date.now() }, '2026-08-09').guessed, false);
}

// 4. Durasi numerik selalu MENIT (konvensi parseWorkoutDurationMinutes).
{
  const { start, end } = workoutWindow({ timestamp: '10:00', duration: 20 }, '2026-08-09');
  assert.equal((end - start) / 60000, 20);
}

// --- summarizeHeartRate --------------------------------------------------

const at = (mins, v) => ({ t: new Date('2026-08-09T17:00:00').getTime() + mins * 60000, v });

// 5. Tidak ada data sama sekali → null, bukan objek kosong yang bikin UI menggambar garis nol.
assert.equal(summarizeHeartRate([]), null);
assert.equal(summarizeHeartRate(undefined), null);
assert.equal(summarizeHeartRate([{ t: NaN, v: 120 }, { t: 1, v: 0 }]), null);

// 6. Sampel lebih sedikit dari target → dipakai apa adanya, tidak diringkas.
{
  const out = summarizeHeartRate([at(0, 100), at(1, 120), at(2, 140)], 60);
  assert.equal(out.points.length, 3);
  assert.equal(out.avg, 120);
  assert.equal(out.min, 100);
  assert.equal(out.max, 140);
}

// 7. REGRESI UTAMA: min/maks diambil dari sampel ASLI, bukan dari hasil ringkasan. Puncak yang
//    cuma bertahan sedetik harus tetap terbaca — itu justru angka yang paling dicari user.
{
  const samples = [];
  for (let i = 0; i < 600; i++) samples.push(at(i / 10, 120));
  samples[300] = at(30, 185); // satu puncak sesaat di tengah
  const out = summarizeHeartRate(samples, 60);
  assert.equal(out.max, 185, 'puncak sesaat hilang tertelan rata-rata ember');
  assert.equal(out.min, 120);
  assert.ok(out.points.length <= 60);
  assert.ok(out.points.every(p => p.v < 185), 'kurva memang dihaluskan, itu yang diinginkan');
}

// 8. Peringkasan menahan jumlah titik agar dokumen tahunan tidak jebol.
{
  const samples = [];
  for (let i = 0; i < 3600; i++) samples.push(at(i / 60, 100 + (i % 40)));
  const out = summarizeHeartRate(samples, 60);
  assert.ok(out.points.length <= 60, `titik ${out.points.length} melebihi target`);
  assert.ok(out.points.length >= 55, 'terlalu sedikit — sebaran embernya salah');
}

// 9. Semua sampel di detik yang sama (jam tangan mengirim satu batch) → tidak boleh bagi nol.
{
  const out = summarizeHeartRate(Array.from({ length: 100 }, () => at(5, 130)), 60);
  assert.equal(out.points.length, 1);
  assert.equal(out.avg, 130);
}

// 10. Sampel acak urutannya tetap terurut waktu di hasilnya.
{
  const out = summarizeHeartRate([at(5, 150), at(1, 100), at(3, 120)], 60);
  assert.deepEqual(out.points.map(p => p.v), [100, 120, 150]);
}

// 11. `t` disimpan sebagai DETIK sejak titik pertama, bukan epoch ms — epoch 13 digit per titik
//     menggemukkan dokumen tahunan yang berbatas 1 MiB.
{
  const out = summarizeHeartRate([at(0, 100), at(1, 110), at(2.5, 120)], 60);
  assert.deepEqual(out.points.map(p => p.t), [0, 60, 150]);
}
{
  const many = Array.from({ length: 600 }, (_, i) => at(i / 10, 120));
  const out = summarizeHeartRate(many, 60);
  assert.equal(out.points[0].t, 0);
  assert.ok(out.points.every(p => p.t < 4000), 'ada titik yang masih epoch ms');
}

console.log('heartRate OK');
