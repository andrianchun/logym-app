// Batas sesi: log satu HARI dipisah per sesi sebelum disimpan.
// Jalankan: node src/data/sessionLogs.test.mjs
//
// Kalau ini gagal, gejalanya bukan error — sesi latihan user hilang diam-diam. Kasus nomor 1
// adalah kejadian nyata yang dilaporkan: treadmill di sesi Ekstra lenyap begitu sesi beban
// disimpan.
import assert from 'node:assert/strict';
import { splitSessionLogs } from './constants.js';

const extras = [{ id: '900-1786258529614', name: 'Treadmill' }];

// 1. REGRESI UTAMA. Sesi beban disimpan sementara treadmill ekstra belum. Log treadmill TIDAK
//    boleh ikut ke sesi beban, dan harus tetap tinggal sebagai sisa.
{
  const logs = {
    '101-w_beban': [{ w: 60, r: 10, done: true }],
    '102-w_beban': [{ w: 40, r: 12, done: true }],
    '900-1786258529614': [{ duration: 8, distance: 1.2, done: true }],
  };
  const { milikSesi, sisa } = splitSessionLogs(logs, {
    progId: 'w_beban', workoutId: 'w_beban', extraExercises: extras,
  });
  assert.deepEqual(Object.keys(milikSesi).sort(), ['101-w_beban', '102-w_beban']);
  assert.deepEqual(Object.keys(sisa), ['900-1786258529614'], 'treadmill harus selamat');
}

// 2. Giliran sesi Ekstra yang disimpan: cuma kuncinya sendiri yang ikut.
{
  const logs = {
    '101-w_beban': [{ w: 60, r: 10, done: true }],
    '900-1786258529614': [{ duration: 8, done: true }],
  };
  const { milikSesi, sisa } = splitSessionLogs(logs, {
    progId: 'extra', workoutId: 'extra', extraExercises: extras,
  });
  assert.deepEqual(Object.keys(milikSesi), ['900-1786258529614']);
  assert.deepEqual(Object.keys(sisa), ['101-w_beban']);
}

// 3. Dua sesi program di hari yang sama tidak saling menelan.
{
  const logs = {
    '101-w_pagi': [{ w: 60, r: 10, done: true }],
    '101-w_sore': [{ w: 50, r: 10, done: true }],
  };
  const { milikSesi, sisa } = splitSessionLogs(logs, { progId: 'w_pagi', workoutId: 'w_pagi' });
  assert.deepEqual(Object.keys(milikSesi), ['101-w_pagi']);
  assert.deepEqual(Object.keys(sisa), ['101-w_sore']);
}

// 4. Riwayat lama berkunci polos ("101", tanpa id sesi). Tidak ada yang cocok dengan sufiks —
//    semuanya harus dianggap milik sesi itu. Menyimpan log KOSONG jauh lebih merusak daripada
//    menyimpan log kelebihan.
{
  const logs = { '101': [{ w: 60, r: 10, done: true }], '102': [{ w: 40, r: 10, done: true }] };
  const { milikSesi, sisa } = splitSessionLogs(logs, { progId: 'w_lama', workoutId: 'w_lama' });
  assert.deepEqual(Object.keys(milikSesi).sort(), ['101', '102']);
  assert.deepEqual(Object.keys(sisa), []);
}

// 5. Kunci UUID (latihan hasil Tambah/Ganti) tidak boleh terpotong di tanda hubung pertama.
{
  const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const logs = {
    [`${uuid}-w1`]: [{ w: 30, r: 10, done: true }],
    [`${uuid}-w2`]: [{ w: 35, r: 10, done: true }],
  };
  const { milikSesi } = splitSessionLogs(logs, { progId: 'w1', workoutId: 'w1' });
  assert.deepEqual(Object.keys(milikSesi), [`${uuid}-w1`]);
}

// 6. Masukan kosong tidak melempar.
assert.deepEqual(splitSessionLogs(null, {}), { milikSesi: {}, sisa: {} });
assert.deepEqual(splitSessionLogs({}, undefined), { milikSesi: {}, sisa: {} });

console.log('sessionLogs OK');
