// Cek penentu kategori latihan. Jalankan: node src/utils/exerciseKind.test.mjs
// Kalau ini salah, tidak ada yang error — satuan durasi diam-diam terbaca menit padahal detik
// (atau sebaliknya), dan kalori sesi meleset puluhan kali lipat.
import assert from 'node:assert/strict';
import { resolveExerciseKind, durationUnitOf } from './workoutCalc.js';

// 1. Tipe non-'time' diteruskan apa adanya — tidak pernah dipromosikan.
assert.equal(resolveExerciseKind({ name: 'Bench Press', type: 'weight' }), 'weight');
assert.equal(resolveExerciseKind({ name: 'Push Up', type: 'reps' }), 'reps');
assert.equal(resolveExerciseKind({ name: 'Treadmill Running', type: 'cardio' }), 'cardio');
assert.equal(resolveExerciseKind({}), 'weight'); // tanpa type -> beban

// 2. Plank tetap 'time'. Ini inti, bukan kardio — kalau salah, 30 detik plank dibaca 30 menit.
assert.equal(resolveExerciseKind({ name: 'Plank', type: 'time', target: ['Core'] }), 'time');
assert.equal(durationUnitOf({ name: 'Plank', type: 'time', target: ['Core'] }), 'detik');

// 3. Impor ExerciseDB bertipe 'time' tapi jelas kardio -> dipromosikan.
//    (exerciseDbApi.js memberi 'time' ke semua impor kardio, bukan 'cardio'.)
assert.equal(resolveExerciseKind({ name: 'Running', type: 'time' }), 'cardio');
assert.equal(resolveExerciseKind({ name: 'Stationary Bike', type: 'time' }), 'cardio');
assert.equal(resolveExerciseKind({ name: 'Latihan A', type: 'time', target: ['Cardio'] }), 'cardio');
assert.equal(durationUnitOf({ name: 'Running', type: 'time' }), 'menit');

// 4. REGRESI: mode immersive dulu memakai daftar kata kunci lebih pendek (tanpa 'renang'/'swim'),
//    jadi latihan yang sama dibaca kardio di satu layar dan bukan kardio di layar lain.
assert.equal(resolveExerciseKind({ name: 'Swimming (Renang)', type: 'time' }), 'cardio');
assert.equal(resolveExerciseKind({ name: 'Rowing Machine', type: 'time' }), 'cardio');

// 5. REGRESI UTAMA: "Crunch" mengandung potongan "run" di TENGAH kata. Pencocokan substring lama
//    menjadikannya kardio; begitu ada Crunch berbasis waktu, durasinya dibaca menit.
assert.equal(resolveExerciseKind({ name: 'Cable Crunch', type: 'time', target: ['Core'] }), 'time');
assert.equal(resolveExerciseKind({ name: 'Reverse Crunch', type: 'time' }), 'time');

// 6. "Row" (latihan punggung) bukan "Rowing" (mesin dayung). Jangan sampai Cable Seated Row
//    dianggap kardio.
assert.equal(resolveExerciseKind({ name: 'Cable Seated Row', type: 'time' }), 'time');
assert.equal(resolveExerciseKind({ name: 'Cable Seated Row', type: 'weight' }), 'weight');

// 7. target boleh string, bukan cuma array — beberapa latihan custom menyimpannya begitu.
assert.equal(resolveExerciseKind({ name: 'Sesi X', type: 'time', target: 'Cardio' }), 'cardio');

console.log('exerciseKind OK');
