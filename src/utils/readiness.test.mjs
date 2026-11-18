// Cek mesin skor kesiapan latihan (Readiness) — termasuk kurva intraday & kafein Lomeal.
// Jalankan: node src/utils/readiness.test.mjs
//
// Kenapa ini dites: skornya menggerakkan saran yang dibaca user ("deload hari ini", "hajar PR"),
// dan salahnya tidak kelihatan — angka 82 yang keliru tetap terlihat seperti angka yang benar.
import assert from 'node:assert/strict';
import {
  calculateReadiness,
  restingHrBaseline,
  sleepHistoryBaseline,
  extractCaffeineEvents,
  caffeineBoostAtHour,
  generateIntradayEnergyCurve,
  calculateDynamicReadiness,
} from './readinessEngine.js';

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

// 9. Multi-day sleep buffer: 3 hari sebelumnya tidur 8 jam -> pagi hari tetap lebih tahan meski semalam 5.5 jam.
{
  const h = {
    ...hari('2026-11-15', { sleep: 8 }),
    ...hari('2026-11-16', { sleep: 8 }),
    ...hari('2026-11-17', { sleep: 7.5 }),
  };
  const buf = sleepHistoryBaseline(h, '2026-11-18');
  assert.ok(buf && buf.avgSleep >= 7.5, 'sleep buffer harus dihitung dari 3 hari sebelumnya');

  const tanpaBuf = generateIntradayEnergyCurve({ bio: { sleep: 5.5 }, sleepBuffer: null });
  const denganBuf = generateIntradayEnergyCurve({ bio: { sleep: 5.5 }, sleepBuffer: buf });
  assert.ok(denganBuf.morningScore > tanpaBuf.morningScore, 'sleep buffer harus memberi resiliensi pagi');
}

// 10. Kurva sirkadian intraday: kurang tidur terasa segar di pagi hari, tapi sore hari (15:00-16:00) turun lebih curam.
{
  const pendek = generateIntradayEnergyCurve({ bio: { sleep: 5.5 }, wakeHour: 6 });
  const pagi = pendek.points.find((p) => p.hour === 8);
  const sore = pendek.points.find((p) => p.hour === 16);
  assert.ok(pagi && sore, 'titik pagi dan sore harus ada');
  assert.ok(pagi.score > sore.score + 15, `energi sore kurang tidur harus jauh lebih rendah dari pagi (${pagi.score} vs ${sore.score})`);
}

// 11. Ekstraksi kafein Lomeal: dukung caffeineLogs, objek caffeine, dan deteksi nama menu (kopi/matcha/preworkout).
{
  const ev1 = extractCaffeineEvents(null, {
    meals: [
      { name: 'Iced Americano', time: '08:30' },
      { name: 'Pre-Workout C4', time: '15:00' },
      { name: 'Nasi Dada Ayam', time: '12:00' },
    ],
  });
  assert.equal(ev1.length, 2, 'hanya kopi & pre-workout yang terdeteksi sebagai kafein');
  assert.equal(ev1[0].source, 'Kopi');
  assert.equal(ev1[1].source, 'Pre-Workout');

  const ev2 = extractCaffeineEvents(null, {
    caffeine: { totalMg: 120, hour: 14.5, source: 'Matcha Latte' },
  });
  assert.equal(ev2.length, 1);
  assert.equal(ev2[0].mg, 120);
}

// 12. Kurva farmakokinetik kafein: 0 sebelum minum, puncak ~45 menit setelah minum, melandai setelah 5 jam.
{
  const events = [{ hour: 14, mg: 150, source: 'Pre-Workout' }];
  const sebelum = caffeineBoostAtHour(events, 13);
  const puncak = caffeineBoostAtHour(events, 15);
  const malam = caffeineBoostAtHour(events, 21);
  assert.equal(sebelum.boost, 0, 'belum diminum = boost 0');
  assert.ok(puncak.boost >= 10 && puncak.boost <= 18, `puncak boost tidak wajar: ${puncak.boost}`);
  assert.ok(malam.boost < puncak.boost, 'boost kafein harus melandai seiring half-life');
}

// 13. Dynamic Readiness terintegrasi: minum Pre-Workout jam 15:00 mengangkat skor sore jam 16:00.
{
  const tanpaKopi = calculateDynamicReadiness({ sleep: 5.5 }, null, { hour: 16, isToday: true });
  const denganKopi = calculateDynamicReadiness({ sleep: 5.5 }, null, {
    hour: 16,
    isToday: true,
    lomealDay: { caffeineLogs: [{ mg: 180, hour: 15, source: 'Pre-Workout' }] },
  });
  assert.ok(denganKopi.score > tanpaKopi.score, `kafein harus menaikkan skor sore (${denganKopi.score} vs ${tanpaKopi.score})`);
  assert.ok(denganKopi.caffeineBoost > 0);
  assert.equal(denganKopi.caffeineSource, 'Pre-Workout');
}

console.log('readiness OK');
