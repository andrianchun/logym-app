// Cek penambalan lubang Health Connect -> Logym (fillOnlyPatch).
// Jalankan: node src/utils/hcHeal.test.mjs
//
// Kenapa ini dites: fungsi ini jalan OTOMATIS, senyap, atas 365 hari sekaligus, dan tulisannya
// tidak punya jalur batal. Satu kebocoran "boleh menimpa" di sini berarti ratusan hari data lama
// tertimpa angka Health Connect tanpa ada yang melihat. Batas amannya cuma tes ini.
import assert from 'node:assert/strict';
import { fillOnlyPatch, HC_HEAL_FIELDS, HC_FIELDS } from './healthConnect.js';

const hc = { steps: 5000, weight: 70, sleep: 7.5, heartRateLog: [{ ts: 1, value: 60 }] };

// 1. Hari kosong melompong — semua angka ringkasan masuk.
{
  const patch = fillOnlyPatch({}, hc);
  assert.equal(patch.steps, 5000);
  assert.equal(patch.weight, 70);
  assert.equal(patch.sleep, 7.5);
}

// 2. REGRESI UTAMA: field yang SUDAH ada isinya tidak pernah tersentuh.
{
  const patch = fillOnlyPatch({ steps: 123, weight: 68 }, hc);
  assert.ok(!('steps' in patch), 'steps yang sudah terisi ikut ditimpa');
  assert.ok(!('weight' in patch), 'weight yang sudah terisi ikut ditimpa');
  assert.equal(patch.sleep, 7.5, 'yang benar-benar kosong malah tidak terisi');
}

// 3. _manualFlags dihormati — angka yang diketik user sendiri bukan lubang, walau nilainya kosong.
{
  const patch = fillOnlyPatch({ _manualFlags: { steps: 0, weight: true } }, hc);
  assert.ok(!('steps' in patch));
  assert.ok(!('weight' in patch));
  assert.equal(patch.sleep, 7.5);
}

// 4. Kosong itu bukan cuma undefined: '' dan null juga lubang (bioData menyimpan sebagian
//    field tidur sebagai string, dan hari lama bisa punya null sisa migrasi).
{
  const patch = fillOnlyPatch({ steps: null, weight: '', sleep: 0 }, hc);
  assert.equal(patch.steps, 5000);
  assert.equal(patch.weight, 70);
  // 0 itu ANGKA yang sah (nol langkah beneran), bukan lubang.
  assert.ok(!('sleep' in patch), 'nol dianggap kosong — itu menghapus angka nol yang sah');
}

// 5. Kurva intraday tidak pernah ikut. Ini yang menjaga dokumen tahunan dari batas 1 MiB.
{
  const patch = fillOnlyPatch({}, hc);
  assert.ok(!('heartRateLog' in patch), 'log intraday bocor ke penambalan hari lampau');
  HC_HEAL_FIELDS.forEach((k) => assert.ok(!k.endsWith('Log'), `${k} tidak boleh ada di HC_HEAL_FIELDS`));
  assert.ok(HC_FIELDS.includes('heartRateLog'), 'HC_FIELDS (sinkron rutin) tetap harus bawa log');
}

// 6. Field yang tidak dikirim Health Connect tidak pernah muncul sebagai undefined —
//    Firestore menolak undefined dan menggagalkan SELURUH tulisan tahun itu.
{
  const patch = fillOnlyPatch({}, { steps: 10 });
  assert.deepEqual(Object.keys(patch), ['steps']);
}

console.log('hcHeal OK');
