// Cek getDayWorkouts. Jalankan: node src/data/dayWorkouts.test.mjs
// Ini logika yang kalau salah, sesi yang dihapus di kalender tetap nongol di tab latihan.
import assert from 'node:assert/strict';
import { getDayWorkouts, deletedProjectedMap, hasDeletedProjected } from './constants.js';

// 2026-08-10 = Senin
const DATE = '2026-08-10';
const programs = [{ id: 'p1', name: 'Push', planId: 'plan1', assignedDays: ['Sen'] }];
const active = ['plan1'];

// 1. REGRESI UTAMA: sesi terjadwal yang dihapus user tidak boleh diproyeksikan ulang.
{
  const hist = { [DATE]: { deletedProjected: { p1: true } } };
  assert.equal(getDayWorkouts(hist, programs, active, DATE).length, 0);
}

// 1b. Bentuk lama (array) dari data yang sudah tersimpan harus tetap dihormati.
{
  const hist = { [DATE]: { deletedProjected: ['p1'] } };
  assert.equal(getDayWorkouts(hist, programs, active, DATE).length, 0);
}

// 1c. Normalisasi array -> map, dan cek "hari ini masih menyimpan penanda hapus".
{
  assert.deepEqual(deletedProjectedMap(['p1', 2]), { p1: true, 2: true });
  assert.deepEqual(deletedProjectedMap(undefined), {});
  assert.equal(hasDeletedProjected({ deletedProjected: { p1: true } }), true);
  assert.equal(hasDeletedProjected({ deletedProjected: [] }), false);
  assert.equal(hasDeletedProjected({}), false);
}

// 2. Tanpa penanda hapus, sesi terjadwal tetap muncul.
{
  assert.deepEqual(
    getDayWorkouts({}, programs, active, DATE).map(w => w.programId),
    ['p1']
  );
}

// 3. Hari lain (Selasa) tidak kena proyeksi rutin Senin.
{
  assert.equal(getDayWorkouts({}, programs, active, '2026-08-11').length, 0);
}

// 4. Sesi tersimpan tidak diduplikasi oleh proyeksi program yang sama.
{
  const hist = { [DATE]: { workouts: [{ id: 'w1', programId: 'p1', status: 'planned' }] } };
  assert.deepEqual(getDayWorkouts(hist, programs, active, DATE).map(w => w.id), ['w1']);
}

// 5. Sesi adhoc kosong dibuang; yang berisi tetap ada meski programnya sudah tidak ada.
{
  const hist = { [DATE]: { workouts: [
    { id: 'a1', programId: 'adhoc', exercises: [] },
    { id: 'a2', programId: 'adhoc', exercises: [{ id: 1 }] }
  ] } };
  assert.deepEqual(getDayWorkouts(hist, [], [], DATE).map(w => w.id), ['a2']);
}

// 6. Sesi selesai tetap tampil walau programnya sudah dihapus dari daftar program.
{
  const hist = { [DATE]: { workouts: [{ id: 'w9', programId: 'gone', status: 'completed' }] } };
  assert.deepEqual(getDayWorkouts(hist, [], [], DATE).map(w => w.id), ['w9']);
}

console.log('OK: dayWorkouts');
