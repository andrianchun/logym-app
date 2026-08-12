// Cek parser byte BLE. Jalankan: node src/utils/ble.test.mjs
//
// Kenapa ini dites: satu offset meleset di sini tidak bikin error apa pun — angkanya cuma jadi
// salah, lalu ikut tertulis ke Health Connect (yang tidak bisa dihapus lewat plugin) dan ke
// riwayat Firestore. Tensi 2047 mmHg atau berat 43 kg untuk orang 70 kg terlihat "berhasil".
import assert from 'node:assert/strict';
import { parseSFloat, parseBloodPressure, parseWeightMeasurement, parseXiaomiBodyComposition } from './ble.js';

const view = (bytes) => new DataView(Uint8Array.from(bytes).buffer);

// --- SFLOAT ---
assert.equal(parseSFloat(view([0x78, 0x00]), 0), 120);          // eksponen 0
assert.equal(parseSFloat(view([0xa0, 0xf0]), 0), 16);           // eksponen -1, mantissa 160
assert.equal(parseSFloat(view([0xff, 0x07]), 0), null);         // NaN, BUKAN 2047
assert.equal(parseSFloat(view([0x00, 0x08]), 0), null);         // NRes
assert.equal(parseSFloat(view([0xf6, 0x0f]), 0), -10);          // mantissa negatif

// --- Tensimeter 0x2A35: mmHg + stempel waktu + nadi (bentuk yang dikirim Yuwell) ---
{
  const r = parseBloodPressure(view([
    0x06,                                      // flags: stempel waktu + nadi, satuan mmHg
    0x78, 0x00, 0x50, 0x00, 0x5d, 0x00,        // 120 / 80 / MAP 93
    0xea, 0x07, 8, 12, 9, 30, 0,               // 2026-08-12 09:30:00
    0x48, 0x00,                                // nadi 72
  ]));
  assert.equal(r.systolic, 120);
  assert.equal(r.diastolic, 80);
  assert.equal(r.meanArterial, 93);
  assert.equal(r.pulse, 72);
  assert.equal(r.at.getFullYear(), 2026);
  assert.equal(r.at.getMonth(), 7);
  assert.equal(r.at.getDate(), 12);
}

// Tanpa stempel waktu: nadi ada di byte 7 — REGRESI kalau offsetnya dipatok ke 14.
{
  const r = parseBloodPressure(view([0x04, 0x78, 0x00, 0x50, 0x00, 0x5d, 0x00, 0x48, 0x00]));
  assert.equal(r.pulse, 72);
  assert.equal(r.at, null);
}

// Satuan kPa dikonversi, bukan disimpan apa adanya (16 kPa = 120 mmHg).
{
  const r = parseBloodPressure(view([0x01, 0xa0, 0xf0, 0x6a, 0xf0, 0x00, 0x00]));
  assert.equal(r.systolic, 120);
  assert.equal(r.diastolic, 80);
  assert.equal(r.pulse, null);
}

// --- Timbangan standar 0x2A9D ---
assert.equal(parseWeightMeasurement(view([0x00, 0xb0, 0x36])).weight, 70);            // SI: resolusi 5 g
assert.equal(parseWeightMeasurement(view([0x01, 0x48, 0x3c])).weight, 70);         // imperial: 154,32 lb
{
  // BMI ada SETELAH stempel waktu — offsetnya ikut flags, bukan tetap.
  const r = parseWeightMeasurement(view([0x0a, 0xb0, 0x36, 0xea, 0x07, 8, 12, 9, 30, 0, 0xe6, 0x00]));
  assert.equal(r.weight, 70);
  assert.equal(r.bmi, 23);
  assert.equal(r.at.getFullYear(), 2026);
}

// --- Xiaomi 13 byte ---
{
  const r = parseXiaomiBodyComposition(view([0x02, 0x22, 0, 0, 0, 0, 0, 0, 0, 0xf4, 0x01, 0xb0, 0x36]));
  assert.equal(r.weight, 70);        // kg = mentah / 200
  assert.equal(r.impedance, 500);
  assert.equal(r.stable, true);
}
{
  // Berat belum stabil: harus ditandai, bukan disimpan diam-diam.
  const r = parseXiaomiBodyComposition(view([0x02, 0x02, 0, 0, 0, 0, 0, 0, 0, 0xf4, 0x01, 0xb0, 0x36]));
  assert.equal(r.stable, false);
}
{
  // Impedansi belum terukur (bit status mati) -> null, jangan mengarang komposisi tubuh.
  const r = parseXiaomiBodyComposition(view([0x02, 0x20, 0, 0, 0, 0, 0, 0, 0, 0x00, 0x00, 0xb0, 0x36]));
  assert.equal(r.impedance, null);
}
{
  // Satuan lb dikonversi ke kg.
  const r = parseXiaomiBodyComposition(view([0x01, 0x20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x48, 0x3c]));
  assert.equal(r.weight, 70);
}

console.log('ble.test.mjs OK');
