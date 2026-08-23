// Urutan sesi dalam satu hari. Jalankan: node src/utils/dayWorkoutOrder.test.mjs
//
// Keluhan 23/08/2026: "sesi ekstra kenapa jadi di atas? harusnya tetap di bawah sesi utama".
// Sebabnya getDayWorkouts menaruh yang TERSIMPAN dulu lalu menempel yang TERJADWAL di belakang —
// sesi Ekstra tersimpan, sesi utama masih terjadwal, jadi Ekstra naik ke atas.
import assert from 'node:assert/strict';
import { getDayWorkouts } from '../data/constants.js';

const TGL = '2026-08-23'; // Minggu
const prog = { id: 'p1', name: 'Full Body A', planId: 'custom', assignedDays: ['Min'], exercises: [{ id: 'e1' }] };
const ekstra = { id: 'a1', programId: 'adhoc', programName: 'Ekstra', status: 'completed', exercises: [{ id: 'e9' }], log: {} };
const urut = (r) => r.map(w => w.programId);

// 1. KASUS UTAMA: Ekstra tersimpan + sesi utama masih terjadwal -> Ekstra tetap di bawah.
{
  const hist = { [TGL]: { workouts: [ekstra] } };
  assert.deepEqual(urut(getDayWorkouts(hist, [prog], ['custom'], TGL)), ['p1', 'adhoc'],
    'sesi program terjadwal harus di atas sesi Ekstra');
}

// 2. Sesi utama sudah tersimpan -> tetap di atas.
{
  const selesai = { id: 'w1', programId: 'p1', status: 'completed', log: {} };
  const hist = { [TGL]: { workouts: [ekstra, selesai] } };
  assert.deepEqual(urut(getDayWorkouts(hist, [prog], ['custom'], TGL)), ['p1', 'adhoc'],
    'urutan di dalam array tidak boleh membuat Ekstra naik');
}

// 3. Beberapa Ekstra tetap urut relatif satu sama lain, semuanya di bawah.
{
  const e2 = { ...ekstra, id: 'a2' };
  const hist = { [TGL]: { workouts: [ekstra, e2] } };
  const r = getDayWorkouts(hist, [prog], ['custom'], TGL);
  assert.deepEqual(r.map(w => w.id), ['projected_p1_' + TGL, 'a1', 'a2']);
}

// 4. Hari tanpa sesi Ekstra tidak berubah perilakunya.
{
  const selesai = { id: 'w1', programId: 'p1', status: 'completed', log: {} };
  assert.deepEqual(urut(getDayWorkouts({ [TGL]: { workouts: [selesai] } }, [prog], ['custom'], TGL)), ['p1']);
  assert.deepEqual(getDayWorkouts({}, [prog], ['custom'], TGL).map(w => w.status), ['planned']);
}

// 5. Ekstra tanpa latihan tetap dibuang seperti sebelumnya (aturan lama, jangan regresi).
{
  const kosong = { id: 'a3', programId: 'adhoc', status: 'completed', exercises: [], log: {} };
  assert.equal(getDayWorkouts({ [TGL]: { workouts: [kosong] } }, [prog], ['custom'], TGL)
    .some(w => w.id === 'a3'), false);
}

console.log('dayWorkoutOrder OK');
