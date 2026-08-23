// Penyaring alat gym: latihan mana yang boleh hilang dari "Ganti Latihan"/Database.
// Jalankan: node src/utils/gymFilter.test.mjs
//
// Keluhan 23/08/2026: "plank ga masuk ke alternative exercise, harus lewat extra exercise".
// Sebabnya penyaring gym membuang semua latihan yang alatnya tidak tercentang — termasuk
// latihan berat badan, yang sebenarnya tidak butuh alat apa pun.
import assert from 'node:assert/strict';
import { filterByGymEquipment, equipmentOptions, defaultMasterExercises } from '../data/constants.js';

const gym = (eq) => ({ id: 'g1', equipment: eq });
const nama = (list) => list.map(e => e.name);

// 1. Gym "semua alat" tidak menyaring apa pun.
assert.equal(filterByGymEquipment(defaultMasterExercises, gym('all')).length, defaultMasterExercises.length);
assert.equal(filterByGymEquipment(defaultMasterExercises, {}).length, defaultMasterExercises.length);
assert.equal(filterByGymEquipment(defaultMasterExercises, null).length, defaultMasterExercises.length);

// 2. KASUS UTAMA: gym yang cuma punya Dumbbell tetap menyisakan Plank.
const cumaDumbbell = filterByGymEquipment(defaultMasterExercises, gym(['Dumbbell']));
assert.ok(nama(cumaDumbbell).includes('Plank'), 'Plank harus tetap ada — berat badan tidak butuh alat gym');

// 3. Semua latihan berat badan ikut selamat, bukan cuma Plank.
const bw = defaultMasterExercises.filter(e => e.equipment === 'Body Weight').map(e => e.name);
assert.ok(bw.length >= 7, `sanity: pustaka punya ${bw.length} latihan berat badan`);
bw.forEach(n => assert.ok(nama(cumaDumbbell).includes(n), `${n} (berat badan) tidak boleh hilang`));

// 4. Alat yang TIDAK ADA di equipmentOptions tidak pernah disembunyikan: tidak bisa dicentang,
//    jadi ketidakhadirannya bukan keputusan user. "Pool" dan "Bicycle" dulu hilang selamanya.
const yatim = defaultMasterExercises.filter(e => !equipmentOptions.includes(e.equipment));
assert.ok(yatim.length >= 2, `sanity: ada ${yatim.length} latihan beralat tak dikenal`);
yatim.forEach(e => assert.ok(nama(cumaDumbbell).includes(e.name),
  `${e.name} (alat "${e.equipment}" tidak ada di equipmentOptions) tidak boleh hilang`));
assert.ok(nama(cumaDumbbell).includes('Swimming (Renang)'));
assert.ok(nama(cumaDumbbell).includes('Cycling / Sepeda'));

// 5. Latihan online beralat asing (translateEquipment mengembalikan Title Case apa pun) ikut aman.
const online = [{ id: 'x', name: 'Sledgehammer Swing', equipment: 'Sledgehammer' }];
assert.equal(filterByGymEquipment(online, gym(['Dumbbell'])).length, 1);

// 6. Tapi alat yang DIKENAL dan sengaja tidak dicentang tetap disaring — penyaringnya harus
//    tetap berguna, bukan dilumpuhkan.
assert.equal(nama(cumaDumbbell).includes('Cable Seated Row'), false, 'Cable tidak dicentang, harus hilang');
assert.ok(nama(cumaDumbbell).includes('Dumbbell Biceps Curl'));

// 7. Gym tanpa alat sama sekali: yang tersisa hanya berat badan + alat tak dikenal.
const kosong = filterByGymEquipment(defaultMasterExercises, gym([]));
assert.ok(nama(kosong).includes('Plank'));
assert.equal(nama(kosong).includes('Smith Machine Squat'), false);

// 8. Masukan rusak tidak melempar.
assert.deepEqual(filterByGymEquipment(null, gym(['Dumbbell'])), []);
assert.equal(filterByGymEquipment([{ name: 'tanpa equipment' }], gym(['Dumbbell'])).length, 1);

console.log('gymFilter OK', {
  totalPustaka: defaultMasterExercises.length,
  lolosGymDumbbellSaja: cumaDumbbell.length,
  beratBadan: bw.length,
  alatTakDikenal: yatim.map(e => `${e.name} (${e.equipment})`),
});
