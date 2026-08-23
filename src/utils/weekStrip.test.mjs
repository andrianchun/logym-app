// Strip kalender mingguan multi-minggu. Jalankan: node src/utils/weekStrip.test.mjs
import assert from 'node:assert/strict';
import { weekStripDates } from '../data/constants.js';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const MINGGU_23 = new Date(2026, 7, 23); // 23 Agu 2026 jatuh hari Minggu

// 1. Satu minggu, pekan mulai Senin: 17..23 (persis yang tampil sekarang).
{
  const r = weekStripDates(MINGGU_23, 1, 1).map(ymd);
  assert.equal(r.length, 7);
  assert.equal(r[0], '2026-08-17');
  assert.equal(r[6], '2026-08-23');
}

// 2. Pekan mulai Minggu: 23 Agu jadi hari PERTAMA, bukan terakhir.
{
  const r = weekStripDates(MINGGU_23, 0, 1).map(ymd);
  assert.equal(r[0], '2026-08-23');
  assert.equal(r[6], '2026-08-29');
}

// 3. Dua minggu: minggu tambahan diambil ke belakang, minggu acuan tetap TERAKHIR.
{
  const r = weekStripDates(MINGGU_23, 1, 2).map(ymd);
  assert.equal(r.length, 14);
  assert.equal(r[0], '2026-08-10');
  assert.equal(r[13], '2026-08-23', 'minggu acuan harus jadi yang terakhir');
  assert.ok(r.includes('2026-08-17'));
}

// 4. Tiga minggu.
{
  const r = weekStripDates(MINGGU_23, 1, 3).map(ymd);
  assert.equal(r.length, 21);
  assert.equal(r[0], '2026-08-03');
  assert.equal(r[20], '2026-08-23');
}

// 5. Menyeberang batas bulan DAN tahun tanpa tanggal rusak.
{
  const r = weekStripDates(new Date(2027, 0, 2), 1, 3).map(ymd); // 2 Jan 2027, Sabtu
  assert.equal(r.length, 21);
  assert.equal(r[20], '2027-01-03', 'akhir pekan yang memuat 2 Jan');
  assert.equal(r[0], '2026-12-14');
  // Tidak boleh ada tanggal kembar atau lompat.
  assert.equal(new Set(r).size, 21);
  for (let i = 1; i < r.length; i++) {
    const beda = (new Date(r[i]) - new Date(r[i-1])) / 86400000;
    assert.equal(beda, 1, `lompatan tanggal di indeks ${i}`);
  }
}

// 6. Masukan ngawur tidak melempar dan tidak menghasilkan Invalid Date.
{
  assert.equal(weekStripDates(new Date('busuk'), 1, 2).length, 14);
  assert.equal(weekStripDates(MINGGU_23, 1, 0).length, 7, 'minimal satu minggu');
  assert.equal(weekStripDates(MINGGU_23, 1, -5).length, 7);
  assert.ok(weekStripDates(null, 1, 1).every(d => !Number.isNaN(d.getTime())));
}

console.log('weekStrip OK');
