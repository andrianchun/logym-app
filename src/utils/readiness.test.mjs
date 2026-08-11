// Cek mesin skor kesiapan latihan (Readiness).
// Jalankan: node src/utils/readiness.test.mjs
//
// Kenapa ini dites: skornya menggerakkan saran yang dibaca user ("deload hari ini", "hajar PR"),
// dan salahnya tidak kelihatan — angka 82 yang keliru tetap terlihat seperti angka yang benar.
import assert from 'node:assert/strict';
import { calculateReadiness, restingHrBaseline } from './readinessEngine.js';

const hari = (ymd, bio) => ({ [ymd]: { bioData: bio } });

// 1. Baseline butuh minimal 3 hari, dan TIDAK memasukkan hari yang dinilai.
{
  const h = {
    ...hari('2026-08-10', { restingHeartRate: 50 }),
    ...hari('2026-08-09', { restingHeartRate: 52 }),
    ...hari('2026-08-08', { restingHeartRate: 51 }),
    ...hari('2026-08-11', { restingHeartRate: 99 }), // hari yang dinilai — jangan ikut
  };
  assert.equal(restingHrBaseline(h, '2026-08-11'), 51);

  const kurang = { ...hari('2026-08-10', { restingHeartRate: 50 }), ...hari('2026-08-09', { restingHeartRate: 52 }) };
  assert.equal(restingHrBaseline(kurang, '2026-08-11'), null, 'baseline 2 hari harus ditolak');
}

// 2. Tanpa data tidur: status unknown, skor 80, tidak pernah menuduh apa pun.
{
  const r = calculateReadiness({ restingHeartRate: 80 }, 50);
  assert.equal(r.status, 'unknown');
  assert.equal(r.score, 80);
}

// 3. Tidur cukup + nadi normal = prima.
{
  const r = calculateReadiness({ sleep: 8, restingHeartRate: 51 }, 50);
  assert.equal(r.score, 100);
  assert.equal(r.status, 'optimal');
}

// 4. REGRESI UTAMA: yang dilaporkan adalah alasan TERBERAT, bukan yang terakhir dicek.
//    Tidur 4 jam (-35) harus mengalahkan tahap tidur dangkal (-15).
{
  const r = calculateReadiness({ sleep: 4, sleepDeep: 10, sleepRem: 10, sleepLight: 200, sleepAwake: 20 }, null);
  assert.equal(r.status, 'critical');
  assert.ok(r.message.includes('4 jam'), `pesan salah: ${r.message}`);
  assert.equal(r.score, 100 - 35 - 15);
}

// 5. Lonjakan RHR mengalahkan tidur yang cuma sedikit kurang.
{
  const r = calculateReadiness({ sleep: 6.5, restingHeartRate: 62 }, 50); // +12 bpm
  assert.equal(r.status, 'critical');
  assert.ok(r.message.includes('62'), `pesan salah: ${r.message}`);
  assert.equal(r.score, 100 - 10 - 40);
}

// 6. Tanpa baseline, RHR tidak boleh menghukum apa pun — angka mutlak tidak berarti sendiri.
{
  const tanpa = calculateReadiness({ sleep: 8, restingHeartRate: 75 }, null);
  assert.equal(tanpa.score, 100, 'RHR dipakai padahal baseline belum ada');
  const dengan = calculateReadiness({ sleep: 8, restingHeartRate: 75 }, 60);
  assert.ok(dengan.score < 100, 'RHR diabaikan padahal baseline sudah ada');
}

// 7. RHR di BAWAH baseline itu kabar baik — jangan sampai dihukum.
{
  const r = calculateReadiness({ sleep: 8, restingHeartRate: 44 }, 52);
  assert.equal(r.score, 100);
}

// 8. Skor tidak pernah keluar dari 0-100 walau semua penaltinya kena sekaligus.
{
  const r = calculateReadiness({ sleep: 3, restingHeartRate: 70, sleepDeep: 1, sleepRem: 1, sleepLight: 150, sleepAwake: 30 }, 50);
  assert.ok(r.score >= 0 && r.score <= 100, `skor di luar batas: ${r.score}`);
}

console.log('readiness OK');
