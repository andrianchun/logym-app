import assert from 'node:assert/strict';
import { calculateBodyComposition } from './xiaomiScaleCalc.js';

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

console.log('xiaomiScaleCalc OK', res);
