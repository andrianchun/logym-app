// Cek perapihan nama program/sesi dan pertahanan nama hasil rename.
// Jalankan: node src/utils/programNaming.test.mjs
import assert from 'node:assert/strict';
import { rapikanNamaProgram, rapikanNamaSesi, pertahankanNamaSesi } from './programNaming.js';

// --- nama program ---------------------------------------------------------------
assert.equal(rapikanNamaProgram('Program Full Body 3 Hari Logym'), 'Full Body');
assert.equal(rapikanNamaProgram('Program Latihan Upper Lower'), 'Upper Lower');
assert.equal(rapikanNamaProgram('Full Body Gainz 3x Seminggu'), 'Full Body Gainz');
assert.equal(rapikanNamaProgram('Push Pull Legs 5 Days/Week'), 'Push Pull Legs');
assert.equal(rapikanNamaProgram('Bro Split'), 'Bro Split');           // sudah ringkas, jangan diutak-atik
assert.equal(rapikanNamaProgram('Upper/Lower Split'), 'Upper/Lower Split');
assert.equal(rapikanNamaProgram(''), 'Program');                       // fallback
assert.equal(rapikanNamaProgram('Program'), 'Program');                // jangan jadi kosong
assert.ok(rapikanNamaProgram('Program Hipertrofi Dada Punggung Bahu Lengan Kaki Perut').length <= 28);

// --- nama sesi ------------------------------------------------------------------
assert.equal(rapikanNamaSesi('Rabu: Full Body A'), 'Full Body A');
assert.equal(rapikanNamaSesi('Full Body A (Rab)'), 'Full Body A');
assert.equal(rapikanNamaSesi('Hari 1: Push'), 'Push');
assert.equal(rapikanNamaSesi('Day 2 - Pull'), 'Pull');
assert.equal(rapikanNamaSesi('Sen - Upper A'), 'Upper A');
assert.equal(rapikanNamaSesi('Push Day'), 'Push Day');                 // "Day" di sini bagian nama
assert.equal(rapikanNamaSesi('Legs Day'), 'Legs Day');
assert.equal(rapikanNamaSesi('Full Body B'), 'Full Body B');
assert.equal(rapikanNamaSesi(''), 'Sesi');

// --- rename dipertahankan saat Logy mengedit program ----------------------------
const lama = [
  { name: 'Dada Gue', assignedDays: ['Sen'] },
  { name: 'Kaki Neraka', assignedDays: ['Rab'] },
];
// AI mengirim ulang semua rutin dengan nama karangannya sendiri.
const baru = [
  { name: 'Push Day', assignedDays: ['Sen'], exercises: [1] },
  { name: 'Leg Day', assignedDays: ['Rab'], exercises: [2] },
];
let hasil = pertahankanNamaSesi(baru, lama);
assert.deepEqual(hasil.map(r => r.name), ['Dada Gue', 'Kaki Neraka'], 'nama hasil rename tidak boleh balik');
assert.deepEqual(hasil.map(r => r.exercises), [[1], [2]], 'isi latihan tetap dari AI, bukan dari yang lama');

// Hari digeser (user minta "pindah kaki ke Jumat") -> pasangan sisa dicocokkan urutan.
hasil = pertahankanNamaSesi(
  [{ name: 'Push Day', assignedDays: ['Sen'] }, { name: 'Leg Day', assignedDays: ['Jum'] }],
  lama
);
assert.deepEqual(hasil.map(r => r.name), ['Dada Gue', 'Kaki Neraka']);

// Rutin BARU (lebih banyak dari sebelumnya) tetap pakai nama dari AI.
hasil = pertahankanNamaSesi(
  [{ name: 'Push Day', assignedDays: ['Sen'] }, { name: 'Leg Day', assignedDays: ['Rab'] }, { name: 'Pull Day', assignedDays: ['Jum'] }],
  lama
);
assert.deepEqual(hasil.map(r => r.name), ['Dada Gue', 'Kaki Neraka', 'Pull Day']);

// Tanpa program lama sama sekali -> apa adanya.
assert.deepEqual(pertahankanNamaSesi(baru, []).map(r => r.name), ['Push Day', 'Leg Day']);

console.log('programNaming OK');
