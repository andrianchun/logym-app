// BMR harus stabil: hari dengan berat yang sama menghasilkan angka yang sama, apa pun alat yang
// kebetulan mengisi bioData hari itu. Jalankan: node src/utils/bmr.test.mjs
//
// Gejala yang dijaga di sini bukan error, melainkan grafik BMR yang meloncat 1600/1700/2900
// karena lima produsen menulis rumus berbeda ke satu field.
import assert from 'node:assert/strict';
import { calcBMR, dayBmr } from './bmr.js';

const profil = { height: 170, dob: '1996-01-01', gender: 'male', weight: 70 };
const umur = Math.floor((Date.now() - new Date('1996-01-01').getTime()) / 31557600000);
const harapan = calcBMR({ weight: 70, height: 170, age: umur, gender: 'male' });

// 1. Berat sama -> BMR sama, walau hari itu ada angka asing tersimpan (scan AI TDEE 2900).
assert.equal(dayBmr({ weight: 70 }, profil), harapan);
assert.equal(dayBmr({ weight: 70, bmr: 2900 }, profil), harapan, 'angka scan AI tidak boleh menang');
assert.equal(dayBmr({ weight: 70, bmr: 1685 }, profil), harapan, 'angka timbangan tidak boleh menang');

// 2. Hari tanpa berat memakai berat profil, bukan nol atau 1600.
assert.equal(dayBmr({}, profil), harapan);

// 3. Berat berbeda -> BMR ikut bergerak, tapi mulus (10 kg = 100 kkal di Mifflin).
assert.equal(dayBmr({ weight: 80 }, profil) - dayBmr({ weight: 70 }, profil), 100);

// 4. Profil belum lengkap -> jatuh ke nilai tersimpan, BUKAN mengarang dengan tinggi/umur default.
assert.equal(dayBmr({ weight: 70, bmr: 1685 }, { weight: 70 }), 1685);
assert.equal(dayBmr({ weight: 70, bmr: 1685 }, { height: 170, gender: 'male' }), 1685, 'tanpa tanggal lahir jangan menebak umur');

// 5. Tidak ada apa pun -> 0, bukan NaN. Pemanggil yang menentukan lantainya.
assert.equal(dayBmr(null, null), 0);
assert.ok(!Number.isNaN(dayBmr({ weight: 'x' }, { height: 'y' })));

// 6. Tinggi di bioData hari itu menang atas tinggi profil (user mengoreksi hari itu).
assert.equal(dayBmr({ weight: 70, height: 180 }, profil),
  calcBMR({ weight: 70, height: 180, age: umur, gender: 'male' }));

console.log('bmr OK', { harapan });
