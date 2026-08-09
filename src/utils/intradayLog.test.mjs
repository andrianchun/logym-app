// Cek peringkasan log intraday (nadi/tensi/SpO2) dari Health Connect.
// Jalankan: node src/utils/intradayLog.test.mjs
//
// Kenapa ini dites: log ini disimpan di dokumen history_years/<tahun> yang berbatas 1 MiB dan
// menampung SELURUH tanggal di tahun itu. Kalau peringkasannya rusak dan sampel mentah kembali
// tersimpan, batasnya tertabrak di tengah tahun dan SEMUA latihan tahun itu berhenti tersimpan —
// bukan cuma grafiknya yang rusak. Ini penjaga batas itu.
import assert from 'node:assert/strict';
import { logPerDay, capIntradayLog } from './healthConnect.js';

const hr = (iso, value) => ({ startDate: iso, value });
const val = (s) => ({ value: Math.round(s.value) });

// 1. REGRESI UTAMA: sampel serapat satu per menit (1440 sehari, seperti jam tangan sungguhan)
//    harus turun ke maksimal 96 titik. Sebelum perbaikan ini semuanya tersimpan apa adanya.
{
  const dense = [];
  for (let m = 0; m < 1440; m++) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    dense.push(hr(`2026-08-09T${h}:${mm}:00`, 60 + (m % 40)));
  }
  const out = logPerDay(dense, val);
  assert.equal(Object.keys(out).length, 1);
  assert.equal(out['2026-08-09'].length, 96, 'sehari penuh harus jadi tepat 96 ember');
  // Ukurannya yang jadi soal: ~4 KB/hari, bukan ~60 KB.
  assert.ok(JSON.stringify(out['2026-08-09']).length < 6000, 'satu hari harus di bawah 6 KB');
}

// 2. Nilai per ember adalah RATA-RATA sampel di dalamnya, bukan sampel pertama — kalau cuma
//    diambil satu, 14 dari 15 menit datanya terbuang diam-diam.
{
  const out = logPerDay([
    hr('2026-08-09T08:00:00', 100),
    hr('2026-08-09T08:05:00', 110),
    hr('2026-08-09T08:10:00', 120),
  ], val);
  assert.equal(out['2026-08-09'].length, 1, 'tiga sampel dalam 15 menit = satu ember');
  assert.equal(out['2026-08-09'][0].value, 110);
}

// 3. Ember diikat ke JAM DINDING: 08:14 dan 08:16 jatuh di ember berbeda, apa pun sebaran
//    sampel hari itu. Kalau diikat ke rentang sampel, sumbu waktunya melar antar hari.
{
  const out = logPerDay([hr('2026-08-09T08:14:00', 100), hr('2026-08-09T08:16:00', 200)], val);
  assert.equal(out['2026-08-09'].length, 2);
}

// 4. Ember kosong DIBUANG, tidak diisi nol — nol bikin kurva terjun ke lantai di jam tanpa
//    rekaman, dan itu terbaca sebagai nadi 0 bpm.
{
  const out = logPerDay([hr('2026-08-09T08:00:00', 100), hr('2026-08-09T20:00:00', 100)], val);
  assert.equal(out['2026-08-09'].length, 2, 'jam kosong di antaranya tidak boleh jadi titik');
}

// 5. Hasilnya urut menaik. Health Connect tidak menjamin urutan (lihat catatan `ascending` yang
//    diabaikan plugin), dan grafik yang datanya tidak urut menggambar garis bolak-balik.
{
  const out = logPerDay([
    hr('2026-08-09T20:00:00', 100),
    hr('2026-08-09T06:00:00', 100),
    hr('2026-08-09T13:00:00', 100),
  ], val);
  const ts = out['2026-08-09'].map((p) => p.ts);
  assert.deepEqual(ts, [...ts].sort((a, b) => a - b));
}

// 6. Bentuk keluarannya tidak berubah — VitalsChart/ActivityChart/DashboardTab membaca
//    { time, ts, value } langsung. Yang boleh berubah cuma jumlah titiknya.
{
  const out = logPerDay([hr('2026-08-09T08:00:00', 77)], val);
  const p = out['2026-08-09'][0];
  assert.deepEqual(Object.keys(p).sort(), ['time', 'ts', 'value']);
  assert.equal(p.time, '08:00');
  assert.equal(typeof p.ts, 'number');
}

// 7. Tensi punya DUA nilai — keduanya harus dirata-rata sendiri, bukan salah satu ikut hilang.
{
  const bp = (iso, systolic, diastolic) => ({ startDate: iso, systolic, diastolic });
  const out = logPerDay(
    [bp('2026-08-09T08:00:00', 120, 80), bp('2026-08-09T08:05:00', 130, 90)],
    (s) => ({ sys: Math.round(s.systolic), dia: Math.round(s.diastolic) })
  );
  assert.deepEqual(
    { sys: out['2026-08-09'][0].sys, dia: out['2026-08-09'][0].dia },
    { sys: 125, dia: 85 }
  );
}

// 8. Hari dipisah dari JAM LOKAL, bukan potongan string ISO UTC. Untuk WIB (UTC+7), sampel
//    pukul 00:30 lokal masih "kemarin" di UTC dan dulu nyasar ke tanggal sebelumnya.
{
  const out = logPerDay([hr('2026-08-09T08:00:00', 70), hr('2026-08-10T08:00:00', 70)], val);
  assert.deepEqual(Object.keys(out).sort(), ['2026-08-09', '2026-08-10']);
}

// 9. Masukan kotor tidak boleh melahirkan titik NaN — satu NaN merusak seluruh grafik.
{
  const out = logPerDay([hr('bukan-tanggal', 70), hr('2026-08-09T08:00:00', 70)], val);
  assert.equal(out['2026-08-09'].length, 1);
  assert.equal(Object.keys(out).length, 1);
}

// ── capIntradayLog: menyembuhkan hari yang TERLANJUR tersimpan gemuk ──────────────────────
// Tanpa ini, batas 1 MiB tetap tertabrak oleh data lama; peringkasan di atas cuma menjaga
// data baru, dan sinkron rutin cuma menyentuh 7–30 hari terakhir.

// 10. REFERENSI IDENTIK kalau sudah cukup pendek. Ini bukan sekadar optimasi: efek heal
//     memakai perbandingan referensi untuk memutuskan hari mana yang berubah. Kalau selalu
//     mengembalikan array baru, SELURUH riwayat ditandai kotor dan dikirim ulang ke Firestore
//     tanpa satu byte pun yang isinya berbeda.
{
  const short = [{ time: '08:00', ts: 1786258529614, value: 70 }];
  assert.equal(capIntradayLog(short), short);
  const empty = [];
  assert.equal(capIntradayLog(empty), empty);
  assert.equal(capIntradayLog(undefined), undefined);
  assert.equal(capIntradayLog(null), null);
}

// 11. Hari gemuk versi lama (1440 titik mentah) turun ke <= 96, isinya tetap masuk akal.
{
  const base = new Date('2026-08-09T00:00:00').getTime();
  const fat = [];
  for (let m = 0; m < 1440; m++) fat.push({ time: 'x', ts: base + m * 60000, value: 100 });
  const capped = capIntradayLog(fat);
  assert.ok(capped.length <= 96, `harus <= 96, dapat ${capped.length}`);
  assert.ok(capped.every((p) => p.value === 100), 'rata-rata dari nilai konstan harus konstan');
  assert.deepEqual(capped.map((p) => p.ts), [...capped.map((p) => p.ts)].sort((a, b) => a - b));
}

// 12. Idempoten: menyembuhkan hari yang sudah sembuh tidak boleh mengubah apa pun lagi, kalau
//     tidak efek heal-nya bisa memantul (tulis → history berubah → heal lagi → tulis lagi).
{
  const base = new Date('2026-08-09T00:00:00').getTime();
  const fat = [];
  for (let m = 0; m < 1440; m++) fat.push({ time: 'x', ts: base + m * 60000, value: 60 + (m % 30) });
  const once = capIntradayLog(fat);
  assert.equal(capIntradayLog(once), once, 'hasil peringkasan harus lolos tanpa disentuh lagi');
}

// 13. Tensi lama (dua nilai) ikut tersembuhkan, keduanya utuh.
{
  const base = new Date('2026-08-09T00:00:00').getTime();
  const fat = [];
  for (let m = 0; m < 200; m++) fat.push({ time: 'x', ts: base + m * 60000, sys: 120, dia: 80 });
  const capped = capIntradayLog(fat);
  assert.ok(capped.length <= 96);
  assert.ok(capped.every((p) => p.sys === 120 && p.dia === 80));
  assert.deepEqual(Object.keys(capped[0]).sort(), ['dia', 'sys', 'time', 'ts']);
}

console.log('intradayLog OK');
