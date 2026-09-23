import assert from 'node:assert/strict';
import { calculateBodyComposition, enrichBioWithImpedance } from './xiaomiScaleCalc.js';

// Tes dengan data nyata dari Zepp Life (Timbangan Xiaomi Mi Body Composition Scale 2):
// Berat: 80.7 kg, Tinggi: 171 cm, Umur: 31 th, Pria, Impedansi ~455 Ohm
const res = calculateBodyComposition(80.7, 455, 171, 31, 'male');

assert.ok(res, 'Hasil perhitungan tidak boleh null');
assert.equal(res.bmi, 27.6, 'BMI harus sesuai (27.6)');
assert.ok(Math.abs(res.bodyFat - 27.1) <= 0.3, `Kadar lemak harus mendekati 27.1% (didapat: ${res.bodyFat})`);
assert.ok(Math.abs(res.muscleMass - 55.89) <= 0.3, `Massa otot harus mendekati 55.89 kg (didapat: ${res.muscleMass})`);
assert.ok(Math.abs(res.waterPercent - 50.0) <= 0.3, `Kadar air harus mendekati 50.0% (didapat: ${res.waterPercent})`);
assert.ok(Math.abs(res.proteinPercent - 19.1) <= 0.3, `Kadar protein harus mendekati 19.1% (didapat: ${res.proteinPercent})`);
assert.ok(Math.abs(res.boneMass - 2.99) <= 0.1, `Massa tulang harus mendekati 2.99 kg (didapat: ${res.boneMass})`);
assert.equal(res.visceralFat, 12, `Lemak visceral harus tepat 12 (didapat: ${res.visceralFat})`);
assert.ok(Math.abs(res.bmr - 1680) <= 5, `BMR harus mendekati 1680 kcal (didapat: ${res.bmr})`);
assert.equal(res.bodyAge, 37, `Usia tubuh harus tepat 37 (didapat: ${res.bodyAge})`);

// --- Tes enrichBioWithImpedance SSOT ---
// Kasus 1: bioData historis dengan nilai bodyFat lama (~30.5%) dan impedansi 455 Ohm
const oldStaleBio = {
  weight: 80.7,
  impedance: 455,
  bodyFat: 30.5,
  musclePercent: 62.0,
  visceralFat: 14,
  height: 171
};
const profile = { dob: '1995-05-15', gender: 'male', height: 171 };
const enriched = enrichBioWithImpedance(oldStaleBio, profile, null, '2026-09-21');

assert.ok(enriched, 'Hasil enrich tidak boleh null');
assert.ok(Math.abs(enriched.bodyFat - 27.1) <= 0.3, `Kadar lemak lama 30.5% harus terkalibrasi menjadi ~27.1% (didapat: ${enriched.bodyFat})`);
assert.equal(enriched.bodyFatStatus, 'Sangat Tinggi');
assert.equal(enriched.bmiStatus, 'Obese');

// Kasus 2: Data manual tanpa impedansi TIDAK boleh diubah
const manualBio = { weight: 75, bodyFat: 18.5, impedance: null };
const enrichedManual = enrichBioWithImpedance(manualBio, profile);
assert.equal(enrichedManual.bodyFat, 18.5, 'Data manual tanpa impedansi harus tetap 18.5%');

// Kasus 3: Null / empty handling
assert.equal(enrichBioWithImpedance(null, profile), null);
assert.deepEqual(enrichBioWithImpedance({}, profile), {});

console.log('xiaomiScaleCalc OK', res);
